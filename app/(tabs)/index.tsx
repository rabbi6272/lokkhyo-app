import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AttendanceMeter } from '@/components/AttendanceMeter';
import { CourseCard } from '@/components/CourseCard';
import { ThemedText } from '@/components/ThemedText';
import { Card, Divider } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Wrapper } from '@/components/ui/Wrapper';
import { useTheme } from '@/providers/theme-provider';
import { useAllCoursesAttendance } from '@/hooks/useAllCoursesAttendance';
import { useCourses } from '@/hooks/useCourses';
import { useRoutines } from '@/hooks/useRoutines';
import { useProfile } from '@/hooks/useUserProfile';
import { DAY_NAMES, MONTH_NAMES } from '@/lib/constants';
import { formatTime12h, getTodayOfWeek } from '@/lib/routine';
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
  const { palette, radius, space, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

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
  const now = new Date();
  const today = getTodayOfWeek();
  const todayLabel = `${DAY_NAMES[today]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  const todaySlots = slots
    .filter((s) => s.dayOfWeek === today)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  const nextClass = findNextClass(slots);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const contentStyle = StyleSheet.create({ content: { paddingBottom: space.xxl + 72 } }).content;
  const heroStyle = StyleSheet.create({
    hero: {
      backgroundColor: isDark ? palette.surface : palette.teal,
      borderRadius: radius.lg,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? palette.line : undefined,
      padding: space.lg + 4,
      gap: space.xs,
    },
  }).hero;
  const heroRowStyle = StyleSheet.create({ heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, marginTop: space.xs } }).heroRow;
  const heroCourseStyle = StyleSheet.create({ heroCourse: { flexShrink: 1 } }).heroCourse;
  const listCardStyle = StyleSheet.create({ listCard: { paddingVertical: 0 } }).listCard;
  const slotRowStyle = StyleSheet.create({ slotRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md } }).slotRow;
  const slotTimeStyle = StyleSheet.create({ slotTime: { width: 72, color: palette.teal } }).slotTime;
  const doneStyle = StyleSheet.create({ done: { opacity: 0.45 } }).done;

  return (
    <Wrapper>
      <ScrollView
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.teal}
            colors={[palette.teal]}
          />
        }>
        <PageHeader eyebrow={todayLabel} title={`Hello, ${firstName}`} />

        {nextClass ? (
          <View style={heroStyle} accessible accessibilityLabel={`Next class ${nextClass.courseLabel} ${nextClass.when} at ${nextClass.startTime}`}>
            <ThemedText type="eyebrow" color={isDark ? palette.teal : palette.tealOnDark}>
              NEXT CLASS · {nextClass.when.toUpperCase()}
            </ThemedText>
            <View style={heroRowStyle}>
              <ThemedText type="figure" color={isDark ? palette.ink : '#FFFFFF'}>
                {formatTime12h(nextClass.startTime)}
              </ThemedText>
              <ThemedText type="heading" color={isDark ? palette.ink : '#FFFFFF'} style={heroCourseStyle} numberOfLines={1}>
                {nextClass.courseLabel}
              </ThemedText>
            </View>
            <ThemedText type="caption" color={isDark ? palette.muted : palette.tealOnDark}>
              Until {formatTime12h(nextClass.endTime)}
              {nextClass.room ? ` · Room ${nextClass.room}` : ''}
            </ThemedText>
          </View>
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
                const done = parseTime(slot.endTime) <= nowMinutes;
                return (
                  <View key={slot.id}>
                    {index > 0 && <Divider />}
                    <View style={[slotRowStyle, done && doneStyle]}>
                      <ThemedText type="number" style={slotTimeStyle}>
                        {formatTime12h(slot.startTime)}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.flex} numberOfLines={1}>
                        {slot.courseLabel}
                      </ThemedText>
                      {slot.room ? <ThemedText type="caption">{slot.room}</ThemedText> : null}
                    </View>
                  </View>
                );
              })}
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
          <Card dense style={listCardStyle}>
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
            <Card dense style={listCardStyle}>
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

function findNextClass(slots: ReturnType<typeof useRoutines>['slots']) {
  if (slots.length === 0) return null;
  const now = new Date();
  const today = getTodayOfWeek();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (today + offset) % 7;
    const match = slots
      .filter((s) => s.dayOfWeek === dayIndex)
      .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime))
      .find((s) => offset > 0 || parseTime(s.startTime) >= nowMinutes);
    if (match) {
      const when = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : DAY_NAMES[dayIndex];
      return { ...match, when };
    }
  }
  return null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});