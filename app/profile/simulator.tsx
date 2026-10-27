import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackStep } from '@/components/ui/BackStep';
import { BlurredModal } from '@/components/ui/AppBlur';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/InputField';
import { Section } from '@/components/ui/Section';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { Wrapper } from '@/components/ui/Wrapper';
import { useCourses } from '@/hooks/useCourses';
import { useProfile } from '@/hooks/useUserProfile';
import {
  calculateWhatIfScenario,
  classifyCgpa,
  round2,
  type WhatIfCourse,
} from '@/lib/projectedGpa';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { useCgpa, useGradingScale, useTranscript } from '@/services/grades/grades.hooks';
import { CLASSIFICATION_LABELS, formatGpa } from '@/services/grades/grades.services';
import type { LetterGradeDto } from '@/services/grades/grades.types';

const SELECTABLE_GRADES: readonly LetterGradeDto[] = [
  'A+',
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D',
  'F',
  'I',
];

export default function WhatIfSimulatorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { palette, space, radius } = useTheme();

  const { data: cgpaData, isLoading: isCgpaLoading } = useCgpa(user?.uid);
  const { data: scaleDto, isLoading: isScaleLoading } = useGradingScale();
  const { data: transcript, isLoading: isTranscriptLoading } = useTranscript(user?.uid);
  const { courses: registeredCourses, isLoading: isCoursesLoading } = useCourses();
  const { profileData } = useProfile();

  // Modal for adding a custom hypothetical course
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCredits, setNewCredits] = useState('3.0');
  const [newGrade, setNewGrade] = useState<LetterGradeDto>('A');

  // Track initialised courses
  const [courses, setCourses] = useState<WhatIfCourse[] | null>(null);

  // Initialize what-if courses once registered courses load
  const initialCourses = useMemo(() => {
    if (!registeredCourses || registeredCourses.length === 0) {
      return [];
    }

    // Candidates for improvement/retake from transcript
    const improvementEntries = new Map(
      transcript?.entries
        ?.filter((e) => e.gradePoint !== null && (e.letterGrade === 'D' || e.status === 'BACKLOG'))
        .map((e) => [e.courseCode, e]) ?? [],
    );

    return registeredCourses.map((c) => {
      const prior = improvementEntries.get(c.code);
      const isRetakeCandidate = !!prior;

      return {
        id: c.id,
        courseId: c.id,
        code: c.code,
        title: c.title,
        credits: c.credits,
        targetGrade: 'A' as LetterGradeDto,
        isRetake: isRetakeCandidate,
        previousCredits: prior?.credits ?? c.credits,
        previousGradePoint: prior?.gradePoint ?? undefined,
      };
    });
  }, [registeredCourses, transcript]);

  const activeCourses = courses ?? initialCourses;

  // Real-time projected summary calculation
  const currentSummary = useMemo(() => {
    if (!cgpaData) return null;
    return {
      totalCredits: cgpaData.totalCredits,
      totalWeightedPoints: cgpaData.totalWeightedPoints,
    };
  }, [cgpaData]);

  const projection = useMemo(() => {
    return calculateWhatIfScenario(activeCourses, currentSummary, scaleDto);
  }, [activeCourses, currentSummary, scaleDto]);

  const currentClassification = useMemo(() => {
    const rawCgpa = cgpaData?.cgpa ?? null;
    const { classification } = classifyCgpa(
      rawCgpa,
      scaleDto?.classificationBoundaries,
      scaleDto?.degreeCgpaThreshold,
    );
    return classification;
  }, [cgpaData, scaleDto]);

  // Handle grade change for a course
  const setCourseGrade = (courseId: string, grade: LetterGradeDto) => {
    setCourses((prev) => {
      const list = prev ?? initialCourses;
      return list.map((item) => (item.id === courseId ? { ...item, targetGrade: grade } : item));
    });
  };

  // Toggle retake for a course
  const toggleCourseRetake = (courseId: string) => {
    setCourses((prev) => {
      const list = prev ?? initialCourses;
      return list.map((item) => {
        if (item.id !== courseId) return item;
        const willBeRetake = !item.isRetake;
        return {
          ...item,
          isRetake: willBeRetake,
          previousCredits: willBeRetake ? item.previousCredits ?? item.credits : undefined,
          previousGradePoint: willBeRetake ? item.previousGradePoint ?? 1.5 : undefined,
        };
      });
    });
  };

  // Remove custom course
  const removeCourse = (courseId: string) => {
    setCourses((prev) => {
      const list = prev ?? initialCourses;
      return list.filter((item) => item.id !== courseId);
    });
  };

  const parsedNewCredits = Number.parseFloat(newCredits);
  const canAddCourse = newCode.trim() !== '' && parsedNewCredits > 0 && parsedNewCredits <= 10;

  // Add custom course
  const handleAddCustomCourse = () => {
    const newItem: WhatIfCourse = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      code: newCode.trim(),
      title: newTitle.trim() || 'Custom Course',
      credits: parsedNewCredits,
      targetGrade: newGrade,
      isRetake: false,
    };

    setCourses((prev) => [...(prev ?? initialCourses), newItem]);
    setNewCode('');
    setNewTitle('');
    setNewCredits('3.0');
    setNewGrade('A');
    setAddModalVisible(false);
  };

  // Reset to initial courses
  const handleReset = () => {
    setCourses(initialCourses);
  };

  const isLoading = isCgpaLoading || isScaleLoading || isTranscriptLoading || isCoursesLoading;

  const currentCgpa = cgpaData?.cgpa ?? null;
  const projectedCgpa = projection.projectedCgpa;
  const deltaCgpa =
    currentCgpa !== null && projectedCgpa !== null ? round2(projectedCgpa - currentCgpa) : null;

  const targetCgpa = profileData?.targetCgpa ?? null;

  const isEdited = courses !== null;
  const closeAddModal = () => setAddModalVisible(false);

  return (
    <>
      <BackStep title="What-If Simulator" onBack={() => router.back()} />
      <Wrapper noTopMargin keyboardAvoiding style={styles.flex}>
        {/* The projection card sticks to the top so every grade change shows its effect immediately. */}
        <ScrollView
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingTop: space.sm, paddingBottom: space.xl * 2 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: palette.mist, paddingBottom: space.md }}>
            {isLoading ? (
              <View style={{ paddingVertical: space.xl, alignItems: 'center' }}>
                <ActivityIndicator color={palette.teal} size="large" />
                <ThemedText style={{ marginTop: space.md, color: palette.muted }}>
                  Loading your results…
                </ThemedText>
              </View>
            ) : (
              <Card>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <ThemedText style={[styles.caption, { color: palette.muted }]}>Now</ThemedText>
                    <ThemedText type="title" style={{ fontSize: 24, color: palette.ink }}>
                      {formatGpa(currentCgpa)}
                    </ThemedText>
                    <ThemedText style={[styles.small, { color: palette.muted }]}>
                      {cgpaData?.totalCredits ?? 0} cr · {CLASSIFICATION_LABELS[currentClassification]}
                    </ThemedText>
                  </View>

                  <SvgIcon name="chevron" size={20} color={palette.faint} />

                  <View style={[styles.flex, { alignItems: 'flex-end' }]}>
                    <View style={styles.inline}>
                      {deltaCgpa !== null && deltaCgpa !== 0 && (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: deltaCgpa > 0 ? palette.goodSoft : palette.riskSoft, borderRadius: radius.pill },
                          ]}>
                          <Text style={[styles.badgeText, { color: deltaCgpa > 0 ? palette.good : palette.risk }]}>
                            {deltaCgpa > 0 ? `+${deltaCgpa.toFixed(2)}` : deltaCgpa.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <ThemedText style={[styles.caption, { color: palette.teal }]}>Projected</ThemedText>
                    </View>
                    <ThemedText type="title" style={{ fontSize: 28, color: palette.teal }}>
                      {formatGpa(projectedCgpa)}
                    </ThemedText>
                    <ThemedText style={[styles.small, { color: palette.muted }]}>
                      {projection.projectedCredits} cr · {CLASSIFICATION_LABELS[projection.classification]}
                    </ThemedText>
                  </View>
                </View>

                {targetCgpa !== null && projectedCgpa !== null && (
                  <View style={[styles.row, styles.targetRow, { borderColor: palette.line }]}>
                    <ThemedText style={[styles.small, { color: palette.muted }]}>
                      Target {targetCgpa.toFixed(2)}
                    </ThemedText>
                    <ThemedText
                      style={[styles.small, { fontWeight: '600', color: projectedCgpa >= targetCgpa ? palette.good : palette.warn }]}>
                      {projectedCgpa >= targetCgpa
                        ? `Met (+${(projectedCgpa - targetCgpa).toFixed(2)})`
                        : `${(targetCgpa - projectedCgpa).toFixed(2)} short`}
                    </ThemedText>
                  </View>
                )}
              </Card>
            )}
          </View>

          {!isLoading && (
            <Section
              title={`COURSES (${activeCourses.length})`}
              action={
                isEdited ? (
                  <Button title="Reset" variant="ghost" onPress={handleReset} />
                ) : undefined
              }>
              {activeCourses.length === 0 ? (
                <ThemedText style={{ color: palette.muted, textAlign: 'center', paddingVertical: space.lg }}>
                  No courses yet. Add one to see how it moves your CGPA.
                </ThemedText>
              ) : (
                <View style={{ paddingVertical: space.lg }}>
                  {activeCourses.map((c) => (
                    <Card key={c.id} style={{ marginBottom: space.md }}>
                      <View style={[styles.row, { alignItems: 'flex-start', marginBottom: space.sm }]}>
                        <View style={[styles.flex, { marginRight: space.sm }]}>
                          <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
                            {c.code} <Text style={[styles.small, { color: palette.muted }]}>· {c.credits} cr</Text>
                          </ThemedText>
                          <ThemedText style={[styles.small, { color: palette.muted }]} numberOfLines={1}>
                            {c.title}
                          </ThemedText>
                        </View>

                        <View style={styles.inline}>
                          <Pressable
                            onPress={() => toggleCourseRetake(c.id)}
                            accessibilityRole="switch"
                            accessibilityState={{ checked: c.isRetake }}
                            hitSlop={6}
                            style={({ pressed }) => [
                              styles.retake,
                              pressed && styles.pressed,
                              {
                                borderRadius: radius.pill,
                                borderColor: c.isRetake ? palette.warn : palette.line,
                                backgroundColor: c.isRetake ? palette.warnSoft : palette.surface,
                              },
                            ]}>
                            <Text style={[styles.badgeText, { color: c.isRetake ? palette.warn : palette.muted }]}>
                              {c.isRetake ? '✓ Retake' : 'Retake'}
                            </Text>
                          </Pressable>

                          {c.id.startsWith('custom-') && (
                            <Pressable
                              onPress={() => removeCourse(c.id)}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${c.code}`}
                              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                              <SvgIcon name="trash" size={16} color={palette.risk} />
                            </Pressable>
                          )}
                        </View>
                      </View>

                      <GradePicker value={c.targetGrade} onChange={(grade) => setCourseGrade(c.id, grade)} />
                    </Card>
                  ))}
                </View>
              )}

              <Button title="+ Add a course" variant="secondary" onPress={() => setAddModalVisible(true)} style={{ marginBottom: space.lg }} />
            </Section>
          )}

          <ThemedText style={[styles.small, { color: palette.faint, textAlign: 'center', marginTop: space.lg }]}>
            Projection only. Your official record is never changed.
          </ThemedText>
        </ScrollView>
      </Wrapper>

      <BlurredModal visible={addModalVisible} onClose={closeAddModal} placement="bottom">
        <View
          style={{
            backgroundColor: palette.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: space.xl,
            gap: space.md,
          }}>
          <ThemedText type="title" style={{ fontSize: 18 }}>
            Add a course
          </ThemedText>
          <Field label="Course code" required value={newCode} onChangeText={setNewCode} placeholder="e.g. CSE 4101" autoCapitalize="characters" />
          <Field label="Course title" value={newTitle} onChangeText={setNewTitle} placeholder="e.g. Machine Learning" />
          <Field label="Credits" required value={newCredits} onChangeText={setNewCredits} placeholder="3.0" keyboardType="decimal-pad" />
          <View style={{ gap: space.xs }}>
            <ThemedText style={[styles.small, { color: palette.muted }]}>Expected grade</ThemedText>
            <GradePicker value={newGrade} onChange={setNewGrade} />
          </View>
          <View style={[styles.inline, { gap: space.md, marginTop: space.sm }]}>
            <Button title="Cancel" variant="secondary" onPress={closeAddModal} style={styles.flex} />
            <Button title="Add" onPress={handleAddCustomCourse} disabled={!canAddCourse} style={styles.flex} />
          </View>
        </View>
      </BlurredModal>
    </>
  );
}

/** All grades visible at once (wrapped), F in red, I in grey. */
function GradePicker({ value, onChange }: { value: LetterGradeDto; onChange: (grade: LetterGradeDto) => void }) {
  const { palette, radius } = useTheme();

  return (
    <View style={styles.grades}>
      {SELECTABLE_GRADES.map((grade) => {
        const selected = value === grade;
        const activeBg = grade === 'F' ? palette.risk : grade === 'I' ? palette.muted : palette.teal;
        return (
          <Pressable
            key={grade}
            onPress={() => onChange(grade)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.grade,
              pressed && styles.pressed,
              {
                borderRadius: radius.sm,
                backgroundColor: selected ? activeBg : palette.mist,
                borderColor: selected ? activeBg : palette.line,
              },
            ]}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: selected ? '700' : '500',
                color: selected ? (grade === 'F' || grade === 'I' ? '#FFFFFF' : palette.onTeal) : palette.ink,
              }}>
              {grade}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caption: { fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  small: { fontSize: 12 },
  badge: { paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  targetRow: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  retake: { minHeight: 32, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1 },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grade: { minWidth: 40, height: 34, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
