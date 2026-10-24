import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ATTENDANCE_MARK_LINE, AttendanceMeter } from '@/components/AttendanceMeter';
import { ThemedText } from '@/components/ThemedText';
import { Card, Divider } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Wrapper } from '@/components/ui/Wrapper';
import { UnifiedAttendanceCalendar } from '@/components/UnifiedAttendanceCalendar';
import { Space } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useAllCoursesAttendance, useMarkAttendance, type DaySession } from '@/hooks/useAllCoursesAttendance';
import { EXAM_ELIGIBILITY_THRESHOLD, todayStr } from '@/lib/attendance';
import { formatTime12h } from '@/lib/routine';
import { parseTime } from '@/lib/validate';

export default function AttendanceScreen() {
  const { courseAttendance, sessionsByDate, overall, isLoading } = useAllCoursesAttendance();
  const markAttendance = useMarkAttendance();
  const { palette, statusColor } = useTheme();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const today = todayStr();

  const filteredSessionsByDate = useMemo(() => {
    if (!selectedCourseId) return sessionsByDate;
    const filtered = new Map<string, DaySession[]>();
    sessionsByDate.forEach((entries, date) => {
      const match = entries.filter((e) => e.courseId === selectedCourseId);
      if (match.length > 0) filtered.set(date, match);
    });
    return filtered;
  }, [sessionsByDate, selectedCourseId]);

  const bounds = useMemo(() => {
    const relevant = selectedCourseId
      ? courseAttendance.filter((c) => c.course.id === selectedCourseId)
      : courseAttendance;
    const starts = relevant.map((c) => c.sessions[0]?.date).filter(Boolean) as string[];
    const ends = relevant.map((c) => c.sessions[c.sessions.length - 1]?.date).filter(Boolean) as string[];
    if (starts.length === 0 || ends.length === 0) return null;
    return {
      start: starts.reduce((a, b) => (a < b ? a : b)),
      end: ends.reduce((a, b) => (a > b ? a : b)),
    };
  }, [courseAttendance, selectedCourseId]);

  const pendingToday = useMemo(() => {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return (sessionsByDate.get(today) ?? []).filter(
      (d) => d.session.status === 'unmarked' && parseTime(d.session.endTime) <= nowMinutes,
    );
  }, [sessionsByDate, today]);

  const sortedCourses = useMemo(
    () => [...courseAttendance].sort((a, b) => a.stats.percent - b.stats.percent),
    [courseAttendance],
  );

  const overallTone = statusColor(overall.percent, EXAM_ELIGIBILITY_THRESHOLD, ATTENDANCE_MARK_LINE - EXAM_ELIGIBILITY_THRESHOLD);

  return (
    <Wrapper>
      <PageHeader title="Attendance" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={palette.teal} style={styles.loading} />}

        {courseAttendance.length === 0 && !isLoading ? (
          <EmptyState
            title="Nothing to track yet"
            body="Add a course and its weekly classes, and each class will show up here to mark."
          />
        ) : (
          <>
            <Card style={styles.overview}>
              <ThemedText type="eyebrow">OVERALL</ThemedText>
              <View style={styles.overviewRow}>
                <ThemedText type="figure" color={overall.held > 0 ? overallTone.fg : palette.faint}>
                  {overall.held > 0 ? `${overall.percent}%` : '—'}
                </ThemedText>
                <ThemedText type="caption" style={styles.overviewNote}>
                  {overall.held > 0 ? `of ${overall.held} classes held` : 'No classes held yet'}
                </ThemedText>
              </View>
              {overall.held > 0 && (
                <ProgressBar percent={overall.percent} color={overallTone.fg} target={ATTENDANCE_MARK_LINE} />
              )}
              {overall.atRiskCount > 0 && (
                <ThemedText type="caption" color={palette.risk}>
                  {overall.atRiskCount} {overall.atRiskCount > 1 ? 'courses are' : 'course is'} below exam eligibility.
                </ThemedText>
              )}
            </Card>

            {pendingToday.length > 0 && (
              <Card style={[styles.pending, { borderColor: palette.warnSoft }]}>
                <ThemedText type="eyebrow" color={palette.warn}>
                  MARK TODAY · {pendingToday.length} {pendingToday.length === 1 ? 'CLASS' : 'CLASSES'}
                </ThemedText>
                {pendingToday.map((d, index) => (
                  <View key={`${d.courseId}_${d.session.slotId}`} style={styles.pendingRow}>
                    {index > 0 && <Divider />}
                    <View style={styles.pendingHead}>
                      <ThemedText type="defaultSemiBold">{d.courseCode}</ThemedText>
                      <ThemedText type="caption">
                        {formatTime12h(d.session.startTime)} – {formatTime12h(d.session.endTime)}
                      </ThemedText>
                    </View>
                    <View style={styles.chips}>
                      {(['present', 'absent', 'cancelled'] as const).map((status) => (
                        <Chip
                          key={status}
                          label={status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Cancelled'}
                          selected={false}
                          onPress={() =>
                            markAttendance.mutate({
                              courseId: d.courseId,
                              date: d.session.date,
                              slotId: d.session.slotId,
                              status,
                            })
                          }
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </Card>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <Chip label="All courses" selected={!selectedCourseId} onPress={() => setSelectedCourseId(null)} />
              {courseAttendance.map(({ course }) => (
                <Chip
                  key={course.id}
                  label={course.code}
                  selected={selectedCourseId === course.id}
                  onPress={() => setSelectedCourseId(course.id)}
                />
              ))}
            </ScrollView>

            <UnifiedAttendanceCalendar
              sessionsByDate={filteredSessionsByDate}
              bounds={bounds}
              onMark={(courseId, date, slotId, status) => markAttendance.mutate({ courseId, date, slotId, status })}
            />

            <SectionHeader title="By course" />
            <Card dense style={styles.list}>
              {sortedCourses.map(({ course, stats }, index) => (
                <View key={course.id}>
                  {index > 0 && <Divider />}
                  <AttendanceMeter code={course.code} title={course.title} stats={stats} />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Space.xxl },
  loading: { marginVertical: Space.lg },
  overview: { gap: Space.sm, marginBottom: Space.md },
  overviewRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.sm },
  overviewNote: { flexShrink: 1 },
  pending: { gap: Space.sm, marginBottom: Space.md, borderWidth: 1 },
  pendingRow: { gap: Space.sm },
  pendingHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: Space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  filterRow: { gap: Space.sm, marginTop: Space.sm, marginBottom: Space.md },
  list: { paddingVertical: 0 },
});
