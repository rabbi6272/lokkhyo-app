import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { CourseCard } from '@/components/CourseCard';
import { ThemedText } from '@/components/ThemedText';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Wrapper } from '@/components/ui/Wrapper';
import { Space } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useActiveSemester } from '@/hooks/useActiveSemester';
import { useCourses } from '@/hooks/useCourses';
import { useSemesters } from '@/hooks/useSemesters';
import { useAuth } from '@/providers/auth-provider';
import { courseAssessmentsQuery } from '@/services/assessments/assessments.hooks';
import { courseResultsQuery } from '@/services/grades/grades.hooks';

export default function CoursesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { courses, currentSemesterId } = useActiveSemester();
  const { isLoading } = useCourses();
  const { semesters, isLoading: isSemestersLoading } = useSemesters();
  const { palette } = useTheme();
  const semester = semesters.find((s) => s.id === currentSemesterId);

  const progressQueries = useQueries({
    queries: courses.map((course) => courseAssessmentsQuery(user?.uid, course.id)),
  });
  const resultQueries = useQueries({
    queries: courses.map((course) => courseResultsQuery(user?.uid, course.id)),
  });

  const assessmentsById = new Map(courses.map((c, i) => [c.id, progressQueries[i]?.data]));
  const resultsById = new Map(courses.map((c, i) => [c.id, resultQueries[i]?.data]));

  const credits = courses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <Wrapper>
      <PageHeader
        title="Courses"
        actions="/course/new"
        actionLabel="Add course"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading || isSemestersLoading ? (
          <ActivityIndicator color={palette.teal} style={styles.loading} />
        ) : courses.length === 0 ? (
          <EmptyState
            title="No courses yet"
            body="Add a course to start tracking your CT marks."
            actionLabel="Add a course"
            onAction={() => router.push('/course/new')}
          />
        ) : (
          <>
            <View style={styles.summary}>
              <ThemedText type="caption">
                {courses.length} {courses.length === 1 ? 'course' : 'courses'} · {credits} credits
              </ThemedText>
              <ThemedText type="caption">Ring: CT · Badge: final grade</ThemedText>
            </View>

            <View style={styles.group}>
              <View style={[styles.groupHeader, { borderBottomColor: palette.line }]}>
                <View style={styles.groupTitle}>
                  <ThemedText type="defaultSemiBold" style={styles.groupName}>
                    {semester?.name ?? 'Current semester'}
                  </ThemedText>
                  <ThemedText type="eyebrow" color={palette.teal}>
                    ACTIVE
                  </ThemedText>
                </View>
              </View>

              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  assessments={assessmentsById.get(course.id)}
                  results={resultsById.get(course.id)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Space.xxl + 72 },
  loading: { marginTop: Space.xxl },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Space.md,
  },
  group: { marginBottom: Space.lg },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Space.sm,
    paddingHorizontal: Space.xs,
    paddingBottom: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Space.md,
  },
  groupTitle: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, flex: 1 },
  groupName: { flexShrink: 1 },
});
