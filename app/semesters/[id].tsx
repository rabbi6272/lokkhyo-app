import { useQueries } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { CourseCard } from '@/components/CourseCard';
import { ThemedText } from '@/components/ThemedText';
import { BackStep } from '@/components/ui/BackStep';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Section } from '@/components/ui/Section';
import { Wrapper } from '@/components/ui/Wrapper';
import { Space } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useCourses } from '@/hooks/useCourses';
import { useProfile } from '@/hooks/useUserProfile';
import { useSemesters } from '@/hooks/useSemesters';
import { useAuth } from '@/providers/auth-provider';
import { courseAssessmentsQuery } from '@/services/assessments/assessments.hooks';
import { courseResultsQuery, useSemesterGpa } from '@/services/grades/grades.hooks';
import { formatGpa } from '@/services/grades/grades.services';

/**
 * One term in full: what the server's GPA engine recorded for it, and the
 * courses filed under it. The courses are the same cards the courses tab
 * shows, so a term's standing and its marks read side by side.
 */
export default function SemesterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette } = useTheme();
  const { user } = useAuth();
  const { semesters, isLoading, activateSemester, deleteSemester } = useSemesters();
  const { courses, isLoading: isCoursesLoading } = useCourses();
  const { profileData } = useProfile();
  const gpa = useSemesterGpa(user?.uid, id);

  const semester = semesters.find((s) => s.id === id);
  const termCourses = courses.filter((c) => c.semesterId === id);
  const credits = termCourses.reduce((sum, c) => sum + c.credits, 0);
  const isCurrent = semester?.id === profileData?.currentSemesterId;

  const progressQueries = useQueries({
    queries: termCourses.map((course) => courseAssessmentsQuery(user?.uid, course.id)),
  });
  const resultQueries = useQueries({
    queries: termCourses.map((course) => courseResultsQuery(user?.uid, course.id)),
  });

  const confirmDelete = () => {
    if (!semester) return;
    Alert.alert(
      'Delete semester',
      termCourses.length === 0
        ? `Delete "${semester.name}"?`
        : `Delete "${semester.name}" and its ${termCourses.length} ${
            termCourses.length === 1 ? 'course' : 'courses'
          }? Attendance, CT marks and grades filed under them are removed too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSemester.mutate(semester.id) },
      ],
    );
  };

  if (isLoading || isCoursesLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.mist }]}>
        <ActivityIndicator size="large" color={palette.teal} />
      </View>
    );
  }

  if (!semester) {
    return (
      <View style={[styles.page, { backgroundColor: palette.mist }]}>
        <BackStep title="Semester" onBack={() => router.back()} />
        <View style={[styles.centered, { backgroundColor: palette.mist }]}>
          <ThemedText type="caption">This semester no longer exists.</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <>
      <BackStep title={semester.name} onBack={() => router.back()} />
      <Wrapper noTopMargin style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Section title="STANDING">
            <Row label="Semester GPA" value={formatGpa(gpa.data?.gpa)} />
            <Row label="Courses" value={String(termCourses.length)} />
            <Row label="Credits" value={String(credits)} last />
          </Section>

          <Section title="TERM">
            <Row label="Status" value={isCurrent ? 'Current' : semester.status === 'active' ? 'Active' : 'Archived'} />
            <Row label="Starts" value={semester.startDate} />
            <Row label="Length" value={`${semester.totalWeeks} weeks`} />
            <Row
              label="Target GPA"
              value={semester.targetGpa > 0 ? formatGpa(semester.targetGpa) : '—'}
              last
            />
          </Section>

          <Section title="COURSES">
            {termCourses.length === 0 ? (
              <EmptyState
                title="No courses in this term"
                body="Add one to start filing CT marks and grades against it."
                actionLabel="Add a course"
                onAction={() =>
                  router.push({ pathname: '/course/new', params: { semesterId: semester.id } })
                }
              />
            ) : (
              <View style={styles.courses}>
                {termCourses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    assessments={progressQueries[index]?.data}
                    results={resultQueries[index]?.data}
                  />
                ))}
              </View>
            )}
          </Section>

          <View style={styles.actions}>
            {!isCurrent && (
              <Button
                title="Make current semester"
                onPress={() => activateSemester.mutate(semester.id)}
                loading={activateSemester.isPending}
                style={styles.flex}
              />
            )}
            <Button
              title="Delete"
              variant="destructive"
              onPress={confirmDelete}
              loading={deleteSemester.isPending}
              style={styles.flex}
            />
          </View>
        </ScrollView>
      </Wrapper>
    </>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.row, !last && [styles.rowDivider, { borderBottomColor: palette.line }]]}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.rowValue} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: Space.md, paddingBottom: Space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15 },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 15, textAlign: 'right', flexShrink: 1, marginLeft: Space.lg },
  courses: { paddingVertical: Space.sm },
  actions: { flexDirection: 'row', gap: Space.md, marginTop: Space.lg },
});
