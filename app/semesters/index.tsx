import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackStep } from '@/components/ui/BackStep';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Wrapper } from '@/components/ui/Wrapper';
import { Space } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useCourses } from '@/hooks/useCourses';
import { useProfile } from '@/hooks/useUserProfile';
import { useSemesters } from '@/hooks/useSemesters';
import { useAuth } from '@/providers/auth-provider';
import { orderSemesters } from '@/services/semesters/semesters.services';
import { semesterGpaQuery } from '@/services/grades/grades.hooks';
import { formatGpa } from '@/services/grades/grades.services';
import type { Semester } from '@/lib/types';

/**
 * Every term the student has, newest and current first, each with the credit
 * load and the GPA the server's engine recorded for it. This is the "where do
 * I switch terms?" screen; the courses tab only orders itself by this list.
 */
export default function SemestersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { semesters, isLoading } = useSemesters();
  const { courses } = useCourses();
  const { profileData } = useProfile();
  const { palette } = useTheme();

  // One GPA request per term, fanned out rather than a hook per row. Keyed by
  // id: the list below is reordered for display, so indices would not line up.
  const gpaQueries = useQueries({
    queries: semesters.map((semester) => semesterGpaQuery(user?.uid, semester.id)),
  });
  const gpaById = new Map(semesters.map((s, i) => [s.id, gpaQueries[i]?.data]));

  const ordered = orderSemesters(semesters, profileData?.currentSemesterId);
  const isCurrent = (semester: Semester) => semester.id === profileData?.currentSemesterId;

  const courseCount = (semesterId: string) => courses.filter((c) => c.semesterId === semesterId);

  return (
    <>
      <BackStep title="Semesters" onBack={() => router.back()} />
      <Wrapper noTopMargin style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator color={palette.teal} style={styles.loading} />
          ) : ordered.length === 0 ? (
            <EmptyState
              title="No semesters yet"
              body="Create one to start filing courses and grades by term."
              actionLabel="Create a semester"
              onAction={() => router.push('/semesters/new')}
            />
          ) : (
            <>
              <ThemedText type="caption" style={styles.summary}>
                {ordered.length} {ordered.length === 1 ? 'term' : 'terms'} ·{' '}
                {courses.length} {courses.length === 1 ? 'course' : 'courses'}
              </ThemedText>

              {ordered.map((semester) => {
                const termCourses = courseCount(semester.id);
                const credits = termCourses.reduce((sum, c) => sum + c.credits, 0);
                const gpa = gpaById.get(semester.id);

                return (
                  <Card
                    key={semester.id}
                    dense
                    style={styles.card}
                    onPress={() => router.push(`/semesters/${semester.id}`)}
                    accessibilityLabel={`${semester.name}, ${termCourses.length} courses, GPA ${formatGpa(gpa?.gpa)}`}>
                    <View style={styles.row}>
                      <View style={styles.text}>
                        <View style={styles.titleRow}>
                          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.name}>
                            {semester.name}
                          </ThemedText>
                          {isCurrent(semester) ? (
                            <ThemedText type="eyebrow" color={palette.teal}>
                              CURRENT
                            </ThemedText>
                          ) : semester.status === 'active' ? (
                            <ThemedText type="eyebrow" color={palette.good}>
                              ACTIVE
                            </ThemedText>
                          ) : null}
                        </View>
                        <ThemedText type="caption" numberOfLines={1}>
                          {semester.startDate} · {semester.totalWeeks} weeks · {termCourses.length}{' '}
                          {termCourses.length === 1 ? 'course' : 'courses'} · {credits} cr
                        </ThemedText>
                      </View>
                      <View style={styles.gpa}>
                        <ThemedText type="number">{formatGpa(gpa?.gpa)}</ThemedText>
                        <ThemedText type="caption">GPA</ThemedText>
                      </View>
                    </View>
                  </Card>
                );
              })}

              <Button
                title="Add semester"
                variant="secondary"
                onPress={() => router.push('/semesters/new')}
                style={styles.add}
              />
            </>
          )}
        </ScrollView>
      </Wrapper>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: Space.xxl, paddingTop: Space.md },
  loading: { marginTop: Space.xxl },
  summary: { paddingHorizontal: Space.xs, marginBottom: Space.md },
  card: { marginBottom: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, flexShrink: 1 },
  name: { flexShrink: 1 },
  gpa: { alignItems: 'flex-end', gap: 0 },
  add: { marginTop: Space.md },
});
