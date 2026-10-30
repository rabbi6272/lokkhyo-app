import { useQueries, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AttendanceMeter } from '@/components/AttendanceMeter';
import { CourseCard } from '@/components/CourseCard';
import { ReminderRow } from '@/components/ReminderRow';
import { ThemedText } from '@/components/ThemedText';
import { Blobs } from '@/components/ui/Blobs';
import { Card, Divider } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Wrapper } from '@/components/ui/Wrapper';
import { useTheme } from '@/providers/theme-provider';
import { useAllCoursesAttendance } from '@/hooks/useAllCoursesAttendance';
import { useAllUpcomingReminders } from '@/hooks/useAllUpcomingReminders';
import { useCourses } from '@/hooks/useCourses';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useRoutines } from '@/hooks/useRoutines';
import { useDeleteUpcomingReminder } from '@/hooks/useUpcomingReminders';
import { useProfile } from '@/hooks/useUserProfile';
import { DAY_NAMES, MONTH_NAMES } from '@/lib/constants';
import { buildReminderLine } from '@/lib/reminders';
import { findSpotlightClass, formatTime12h, getTodayOfWeek } from '@/lib/routine';
import { parseTime } from '@/lib/validate';
import { useAuth } from '@/providers/auth-provider';
import { courseAssessmentsQuery } from '@/services/assessments/assessments.hooks';
import { courseResultsQuery } from '@/services/grades/grades.hooks';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profileData } = useProfile();
  const { courses } = useCourses();
  const { slots } = useRoutines();
  const { reminders } = useAllUpcomingReminders();
  const deleteUpcoming = useDeleteUpcomingReminder();
  const prefs = useNotificationPreferences();
  const { palette, radius, space } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const now = useMinuteClock();

  // Home screen presents at most 3 courses. Only query details for those 3 to
  // avoid massive parallel network fan-out on cold start.
  const homeCourses = useMemo(() => courses.slice(0, 3), [courses]);
  const { courseAttendance } = useAllCoursesAttendance(homeCourses);

  const progressQueries = useQueries({
    queries: homeCourses.map((course) => courseAssessmentsQuery(user?.uid, course.id)),
  });
  const resultQueries = useQueries({
    queries: homeCourses.map((course) => courseResultsQuery(user?.uid, course.id)),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  const firstName = profileData?.fullName?.split(' ')[0] || 'there';
  const today = getTodayOfWeek();
  const todayLabel = `${DAY_NAMES[today]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySlots = slots
    .filter((s) => s.dayOfWeek === today)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  const spotlight = findSpotlightClass(slots, today, nowMinutes);

  const todayIso = toIsoDate(now);
  const nextDeadlines = reminders.filter((r) => r.date >= todayIso).slice(0, 3);

  const openCourse = (courseId: string) => router.push({ pathname: '/course/[id]', params: { id: courseId } });
  const confirmDeleteReminder = (reminderId: string, name: string, courseId: string) =>
    Alert.alert('Delete reminder', `Remove the reminder for "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUpcoming.mutate({ courseId, reminderId }) },
    ]);

  return (
    <Wrapper>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl + 72 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.teal}
            colors={[palette.teal]}
          />
        }>
        <PageHeader eyebrow={todayLabel} title={`${greeting(now)}, ${firstName}`} />

        {spotlight ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${spotlight.live ? 'Now' : 'Next class'}: ${spotlight.slot.courseLabel}, ${spotlight.status}. Opens the course.`}
            onPress={() => openCourse(spotlight.slot.courseId)}
            style={({ pressed }) => [
              styles.hero,
              { borderRadius: radius.lg, borderColor: palette.line },
              pressed && styles.pressed,
            ]}>
            <LinearGradient
              colors={[palette.tealSoft, palette.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: space.lg + 4, gap: space.xs }}>
              <Blobs />
              <View style={styles.heroTop}>
                <ThemedText type="eyebrow" color={palette.teal}>
                  {spotlight.live ? 'HAPPENING NOW' : `NEXT CLASS · ${spotlight.when.toUpperCase()}`}
                </ThemedText>
                <View
                  style={[
                    styles.pill,
                    styles.pillOutlined,
                    { backgroundColor: palette.surface, borderColor: palette.line },
                  ]}>
                  <ThemedText type="caption" color={palette.teal}>
                    {spotlight.status}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.heroRow, { gap: space.md, marginTop: space.xs }]}>
                <ThemedText type="figure" color={palette.ink}>
                  {formatTime12h(spotlight.slot.startTime)}
                </ThemedText>
                <ThemedText type="heading" color={palette.ink} style={styles.shrink} numberOfLines={1}>
                  {spotlight.slot.courseLabel}
                </ThemedText>
              </View>
              <ThemedText type="caption" color={palette.muted}>
                Until {formatTime12h(spotlight.slot.endTime)}
                {spotlight.slot.room ? ` · Room ${spotlight.slot.room}` : ''}
              </ThemedText>
            </LinearGradient>
          </Pressable>
        ) : (
          <EmptyState
            title="No classes in your routine"
            body="Add your weekly classes to see what's next."
            actionLabel="Add a class"
            onAction={() => router.push('/routine/new')}
          />
        )}

        {todaySlots.length > 0 && (
          <>
            <SectionHeader title="Today" actionLabel="Routine" href="/routine" />
            <Card dense>
              {todaySlots.map((slot, index) => {
                const start = parseTime(slot.startTime);
                const end = parseTime(slot.endTime);
                const done = end <= nowMinutes;
                const live = start <= nowMinutes && nowMinutes < end;
                return (
                  <View key={slot.id}>
                    {index > 0 && <Divider />}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${slot.courseLabel} at ${formatTime12h(slot.startTime)}${live ? ', happening now' : done ? ', finished' : ''}`}
                      onPress={() => openCourse(slot.courseId)}
                      style={({ pressed }) => [
                        styles.slotRow,
                        { gap: space.md, paddingVertical: space.md },
                        done && styles.done,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="number" style={[styles.slotTime, { color: palette.teal }]}>
                        {formatTime12h(slot.startTime)}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.flex} numberOfLines={1}>
                        {slot.courseLabel}
                      </ThemedText>
                      {live ? (
                        <View style={[styles.pill, { backgroundColor: palette.tealSoft }]}>
                          <ThemedText type="caption" color={palette.teal}>
                            Now
                          </ThemedText>
                        </View>
                      ) : slot.room ? (
                        <ThemedText type="caption">{slot.room}</ThemedText>
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {nextDeadlines.length > 0 && (
          <>
            <SectionHeader title="Coming up" actionLabel="All" href="/routine" />
            <Card dense style={styles.listCard}>
              {nextDeadlines.map((r, index) => (
                <View key={r.id}>
                  {index > 0 && <Divider />}
                  <ReminderRow
                    name={r.name}
                    type={r.type}
                    date={r.date}
                    courseCode={r.courseCode}
                    reminderLine={buildReminderLine(r, prefs)}
                    onPress={() =>
                      router.push({ pathname: '/reminder/new', params: { courseId: r.courseId, reminderId: r.id } })
                    }
                    onDelete={() => confirmDeleteReminder(r.id, r.name, r.courseId)}
                  />
                </View>
              ))}
            </Card>
          </>
        )}

        <SectionHeader title="Courses" actionLabel="See all" href="/courses" />
        {courses.length === 0 ? (
          <EmptyState
            title="No courses yet"
            body="Add a course to start tracking CT marks."
            actionLabel="Add a course"
            onAction={() => router.push('/course/new')}
          />
        ) : (
          <Card dense style={styles.listCard}>
            {homeCourses.map((course, index) => (
              <View key={course.id}>
                {index > 0 && <Divider />}
                <CourseCard
                  course={course}
                  assessments={progressQueries[index]?.data}
                  results={resultQueries[index]?.data}
                  inline
                />
              </View>
            ))}
          </Card>
        )}

        {courses.length > 0 && (
          <>
            <SectionHeader title="Attendance" actionLabel="See all" href="/attendance" />
            <Card dense style={styles.listCard}>
              {homeCourses.map((course, index) => (
                <View key={course.id}>
                  {index > 0 && <Divider />}
                  <AttendanceMeter
                    code={course.code}
                    stats={courseAttendance.find((a) => a.course.id === course.id)?.stats}
                  />
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </Wrapper>
  );
}

/** Re-renders once a minute, so "Now" and the countdowns stay true while the screen is open. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return 'Hello';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  hero: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline' },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillOutlined: { borderWidth: StyleSheet.hairlineWidth },
  listCard: { paddingVertical: 0 },
  slotRow: { flexDirection: 'row', alignItems: 'center' },
  slotTime: { width: 72 },
  done: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
