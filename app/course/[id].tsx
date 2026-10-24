import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, findNodeHandle, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AttendanceMeter } from '@/components/AttendanceMeter';
import { FinalGradeCard } from '@/components/grades/FinalGradeCard';
import { ReminderRow } from '@/components/ReminderRow';
import { ThemedText } from '@/components/ThemedText';
import { BackStep } from '@/components/ui/BackStep';
import { Card, Divider } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { Radius, Space } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useAllCoursesAttendance } from '@/hooks/useAllCoursesAttendance';
import { useAssessments } from '@/hooks/useAssessments';
import { useCourses } from '@/hooks/useCourses';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useUpcomingReminders } from '@/hooks/useUpcomingReminders';
import { ASSESSMENT_TYPE_LABELS } from '@/lib/constants';
import { courseProgress } from '@/lib/gpa';
import { buildReminderLine, formatDateLabel } from '@/lib/reminders';

export default function CourseDetailScreen() {
  const { id, assessmentId: highlightAssessmentId, reminderId: highlightReminderId } = useLocalSearchParams<{
    id: string;
    assessmentId?: string;
    reminderId?: string;
  }>();
  const router = useRouter();
  const { palette } = useTheme();

  const { courses, isLoading: isCoursesLoading } = useCourses();
  const course = courses.find((c) => c.id === id);
  const { assessments, isLoading: isAssessmentsLoading, deleteAssessment } = useAssessments(id ?? '');
  const { reminders, isLoading: isRemindersLoading, deleteReminder } = useUpcomingReminders(id ?? '');
  const targetCourses = useMemo(() => (course ? [course] : []), [course]);
  const { courseAttendance } = useAllCoursesAttendance(targetCourses);
  const prefs = useNotificationPreferences();

  const sortedReminders = [...reminders].sort((a, b) => a.date.localeCompare(b.date));

  const scrollRef = useRef<ScrollView>(null);
  const rowRefs = useRef<Record<string, View | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const highlightKey = highlightReminderId
    ? `rm:${highlightReminderId}`
    : highlightAssessmentId
      ? `as:${highlightAssessmentId}`
      : null;

  // Opened from a notification: scroll to the row it is about and flash it.
  useEffect(() => {
    if (!highlightKey || isAssessmentsLoading || isRemindersLoading) return;
    setHighlightId(highlightKey);
    const t = setTimeout(() => {
      const row = rowRefs.current[highlightKey];
      const scroll = scrollRef.current;
      if (row && scroll) {
        const relative = findNodeHandle(scroll);
        if (relative === null) return;
        row.measureLayout(relative, (_x, y) => {
          scroll.scrollTo({ y: Math.max(y - 80, 0), animated: true });
        }, () => {});
      }
    }, 350);
    const clear = setTimeout(() => setHighlightId(null), 3000);
    return () => {
      clearTimeout(t);
      clearTimeout(clear);
    };
  }, [highlightKey, isAssessmentsLoading, isRemindersLoading, assessments, reminders]);

  const attendanceStats = courseAttendance.find((c) => c.course.id === id)?.stats;
  const { percent, obtained, max } = courseProgress(assessments, attendanceStats?.mark ?? 0);
  const passMarks = course?.passMarks && course.passMarks > 0 ? course.passMarks : undefined;
  const belowPass = passMarks !== undefined && percent < passMarks;

  const handleDelete = (assessmentId: string, name: string) => {
    Alert.alert('Delete mark', `Delete "${name}"? This also removes it from your CT progress.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAssessment.mutate(assessmentId) },
    ]);
  };

  const handleDeleteReminder = (reminderId: string, name: string) => {
    Alert.alert('Delete reminder', `Remove the reminder for "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteReminder.mutate(reminderId) },
    ]);
  };

  if (isCoursesLoading || isAssessmentsLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.mist }]}>
        <ActivityIndicator size="large" color={palette.teal} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.page, { backgroundColor: palette.mist }]}>
        <BackStep title="Course" onBack={() => router.back()} />
        <View style={[styles.centered, { backgroundColor: palette.mist }]}>
          <ThemedText type="caption">This course no longer exists.</ThemedText>
        </View>
      </View>
    );
  }

  const meta = [`${course.credits} credits`, course.isLab ? 'Lab' : `${course.ctWeight}% CT weight`]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.page, { backgroundColor: palette.mist }]}>
      <BackStep title={course.code} onBack={() => router.back()} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.courseTitle}>
            {course.title}
          </ThemedText>
          <ThemedText type="caption">{meta}</ThemedText>
          {course.courseTeachers && course.courseTeachers.length > 0 && (
            <ThemedText type="caption">Taught by {course.courseTeachers.join(', ')}</ThemedText>
          )}
        </View>

        <Card style={styles.progress}>
          <ProgressRing
            percent={percent}
            target={passMarks}
            size={88}
            color={belowPass ? palette.warn : palette.teal}
            showValue={false}
          />
          <View style={styles.progressText}>
            <ThemedText type="eyebrow">CT PROGRESS</ThemedText>
            <View style={styles.progressFigure}>
              <ThemedText type="figure">{Math.round(obtained)}</ThemedText>
              <ThemedText type="caption">/ {max}</ThemedText>
            </View>
            <ThemedText type="caption" color={belowPass ? palette.warn : palette.muted}>
              {passMarks === undefined
                ? 'CTs, assignments and attendance mark'
                : belowPass
                  ? `${Math.ceil(passMarks - obtained)} below the pass mark of ${passMarks}`
                  : `Above the pass mark of ${passMarks}`}
            </ThemedText>
          </View>
        </Card>

        <SectionHeader
          title="Upcoming"
          actionLabel="Add"
          onAction={() => router.push({ pathname: '/reminder/new', params: { courseId: course.id } })}
        />
        {isRemindersLoading ? (
          <ActivityIndicator color={palette.teal} />
        ) : sortedReminders.length === 0 ? (
          <EmptyState title="Nothing scheduled" body="Add an upcoming CT, quiz or assignment to get a reminder." />
        ) : (
          <Card dense style={styles.list}>
            {sortedReminders.map((r, index) => (
              <View
                key={r.id}
                ref={(el) => {
                  rowRefs.current[`rm:${r.id}`] = el;
                }}>
                {index > 0 && <Divider />}
                <ReminderRow
                  name={r.name}
                  type={r.type}
                  date={r.date}
                  reminderLine={buildReminderLine(r, prefs)}
                  highlighted={highlightId === `rm:${r.id}`}
                  onPress={() =>
                    router.push({ pathname: '/reminder/new', params: { courseId: course.id, reminderId: r.id } })
                  }
                  onDelete={() => handleDeleteReminder(r.id, r.name)}
                />
              </View>
            ))}
          </Card>
        )}

        <SectionHeader
          title="Marks"
          actionLabel="Add"
          onAction={() => router.push({ pathname: '/assessment/new', params: { courseId: course.id } })}
        />
        {assessments.length === 0 ? (
          <EmptyState
            title="No marks yet"
            body="Record a CT, quiz or assignment mark to see your progress."
            actionLabel="Add a mark"
            onAction={() => router.push({ pathname: '/assessment/new', params: { courseId: course.id } })}
          />
        ) : (
          <Card dense style={styles.list}>
            {assessments.map((a, index) => {
              const highlighted = highlightId === `as:${a.id}`;
              return (
                <View
                  key={a.id}
                  ref={(el) => {
                    rowRefs.current[`as:${a.id}`] = el;
                  }}>
                  {index > 0 && <Divider />}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${a.name}, ${a.marksObtained} of ${a.maxMarks}`}
                    onPress={() =>
                      router.push({ pathname: '/assessment/new', params: { courseId: course.id, assessmentId: a.id } })
                    }
                    style={({ pressed }) => [
                      styles.mark,
                      highlighted && [styles.highlighted, { backgroundColor: palette.tealSoft }],
                      pressed && { opacity: 0.7 },
                    ]}>
                    <View style={styles.markText}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {a.name}
                      </ThemedText>
                      <ThemedText type="caption" numberOfLines={1}>
                        {ASSESSMENT_TYPE_LABELS[a.type]} · {formatDateLabel(a.date)}
                        {a.teacherName ? ` · ${a.teacherName}` : ''}
                      </ThemedText>
                    </View>
                    <ThemedText type="number">
                      {a.marksObtained}
                      <ThemedText type="caption"> / {a.maxMarks}</ThemedText>
                    </ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${a.name}`}
                      onPress={() => handleDelete(a.id, a.name)}
                      hitSlop={10}>
                      <SvgIcon size={18} name="trash" color={palette.faint} />
                    </Pressable>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}

        <FinalGradeCard courseId={course.id} />

        <SectionHeader title="Attendance" actionLabel="Open" href="/attendance" />
        <Card dense style={styles.list}>
          <AttendanceMeter code={course.code} stats={attendanceStats} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Space.lg, paddingBottom: Space.xxl },
  header: { gap: 2, marginTop: Space.xs, marginBottom: Space.lg },
  courseTitle: { fontSize: 22, lineHeight: 28 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  progressText: { flex: 1, gap: 2 },
  progressFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  list: { paddingVertical: 0 },
  mark: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: Space.md },
  markText: { flex: 1, gap: 1 },
  highlighted: {
    borderRadius: Radius.md,
    marginHorizontal: -Space.sm,
    paddingHorizontal: Space.sm,
  },
});
