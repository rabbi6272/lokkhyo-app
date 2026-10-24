import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackStep } from '@/components/ui/BackStep';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { Wrapper } from '@/components/ui/Wrapper';
import { FontFamily } from '@/constants/theme';
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

  // Add custom course
  const handleAddCustomCourse = () => {
    const parsedCredits = Number.parseFloat(newCredits) || 3.0;
    const newItem: WhatIfCourse = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      code: newCode.trim() || 'NEW 000',
      title: newTitle.trim() || 'Custom Course',
      credits: parsedCredits,
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

  return (
    <>
      <BackStep title="What-If Simulator" onBack={() => router.back()} />
      <Wrapper noTopMargin style={{ flex: 1, backgroundColor: palette.mist }}>
        <ScrollView
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 2 }}
          showsVerticalScrollIndicator={false}>
          {/* Unofficial Banner */}
          <View
            style={{
              backgroundColor: palette.tealSoft,
              borderRadius: radius.md,
              padding: space.md,
              marginBottom: space.lg,
              borderWidth: 1,
              borderColor: palette.teal,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: 4 }}>
              <View
                style={{
                  backgroundColor: palette.teal,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                }}>
                <Text style={{ fontFamily: FontFamily.display, fontSize: 10, color: palette.onTeal }}>
                  PROJECTED — UNOFFICIAL
                </Text>
              </View>
            </View>
            <ThemedText style={{ fontSize: 13, color: palette.ink, lineHeight: 18 }}>
              This what-if simulator calculates projected GPA locally using official RUET/BUET
              grading policies and server sums. Scenarios are purely exploratory and never alter
              your official record.
            </ThemedText>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: space.xl, alignItems: 'center' }}>
              <ActivityIndicator color={palette.teal} size="large" />
              <ThemedText style={{ marginTop: space.md, color: palette.muted }}>
                Loading academic aggregate…
              </ThemedText>
            </View>
          ) : (
            <>
              {/* Projection Comparison Card */}
              <Card style={{ marginBottom: space.lg }}>
                <ThemedText type="subtitle" style={{ marginBottom: space.md }}>
                  Projected CGPA
                </ThemedText>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: space.md,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderColor: palette.line,
                  }}>
                  {/* Current */}
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 12, color: palette.muted, textTransform: 'uppercase' }}>
                      Current CGPA
                    </ThemedText>
                    <ThemedText type="title" style={{ fontSize: 26, color: palette.ink, marginTop: 4 }}>
                      {formatGpa(currentCgpa)}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: palette.muted }}>
                      {cgpaData?.totalCredits ?? 0} cr · {CLASSIFICATION_LABELS[currentClassification]}
                    </ThemedText>
                  </View>

                  <View style={{ paddingHorizontal: space.sm }}>
                    <SvgIcon name="chevron" size={20} color={palette.muted} />
                  </View>

                  {/* Projected */}
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ThemedText style={{ fontSize: 12, color: palette.teal, textTransform: 'uppercase', fontWeight: '700' }}>
                        Projected
                      </ThemedText>
                      {deltaCgpa !== null && deltaCgpa !== 0 && (
                        <View
                          style={{
                            backgroundColor: deltaCgpa > 0 ? palette.goodSoft : palette.riskSoft,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: radius.pill,
                          }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: deltaCgpa > 0 ? palette.good : palette.risk,
                            }}>
                            {deltaCgpa > 0 ? `+${deltaCgpa.toFixed(2)}` : deltaCgpa.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <ThemedText
                      type="title"
                      style={{ fontSize: 28, color: palette.teal, marginTop: 4 }}>
                      {formatGpa(projectedCgpa)}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: palette.muted }}>
                      {projection.projectedCredits} cr · {CLASSIFICATION_LABELS[projection.classification]}
                    </ThemedText>
                  </View>
                </View>

                {/* Target progress row */}
                {targetCgpa !== null && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: space.md,
                    }}>
                    <ThemedText style={{ fontSize: 13, color: palette.muted }}>
                      Target CGPA: <Text style={{ color: palette.ink, fontWeight: '600' }}>{targetCgpa.toFixed(2)}</Text>
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color:
                          projectedCgpa !== null && projectedCgpa >= targetCgpa
                            ? palette.good
                            : palette.warn,
                      }}>
                      {projectedCgpa !== null
                        ? projectedCgpa >= targetCgpa
                          ? `Target met (+${(projectedCgpa - targetCgpa).toFixed(2)})`
                          : `${(targetCgpa - projectedCgpa).toFixed(2)} needed`
                        : '—'}
                    </ThemedText>
                  </View>
                )}
              </Card>

              {/* Course list with grade selectors */}
              <Section
                title={`COURSES IN SCENARIO (${activeCourses.length})`}
                action={
                  <Pressable onPress={handleReset} hitSlop={8}>
                    <ThemedText style={{ fontSize: 12, color: palette.teal, fontWeight: '600' }}>
                      Reset
                    </ThemedText>
                  </Pressable>
                }>
                {activeCourses.length === 0 ? (
                  <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
                    <ThemedText style={{ color: palette.muted, marginBottom: space.md }}>
                      No active courses in this scenario.
                    </ThemedText>
                    <Button
                      title="+ Add Custom Course"
                      variant="secondary"
                      onPress={() => setAddModalVisible(true)}
                    />
                  </Card>
                ) : (
                  activeCourses.map((c) => (
                    <Card key={c.id} style={{ marginBottom: space.md }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: space.sm,
                        }}>
                        <View style={{ flex: 1, marginRight: space.sm }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                            <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
                              {c.code}
                            </ThemedText>
                            <View
                              style={{
                                backgroundColor: palette.mist,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: radius.sm,
                                borderWidth: StyleSheet.hairlineWidth,
                                borderColor: palette.line,
                              }}>
                              <Text style={{ fontSize: 11, color: palette.muted, fontWeight: '600' }}>
                                {c.credits} cr
                              </Text>
                            </View>
                            {c.isRetake && (
                              <View
                                style={{
                                  backgroundColor: palette.warnSoft,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: radius.sm,
                                }}>
                                <Text style={{ fontSize: 11, color: palette.warn, fontWeight: '700' }}>
                                  RETAKE
                                </Text>
                              </View>
                            )}
                          </View>
                          <ThemedText
                            style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}
                            numberOfLines={1}>
                            {c.title}
                          </ThemedText>
                        </View>

                        {/* Actions: Retake toggle & delete if custom */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                          <Pressable
                            onPress={() => toggleCourseRetake(c.id)}
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: radius.sm,
                              borderWidth: 1,
                              borderColor: c.isRetake ? palette.warn : palette.line,
                              backgroundColor: c.isRetake ? palette.warnSoft : palette.surface,
                            }}>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: c.isRetake ? palette.warn : palette.muted,
                              }}>
                              {c.isRetake ? 'Replacing prior grade' : 'Retake?'}
                            </Text>
                          </Pressable>

                          {c.id.startsWith('custom-') && (
                            <Pressable
                              onPress={() => removeCourse(c.id)}
                              hitSlop={8}
                              style={{ padding: 4 }}>
                              <SvgIcon name="trash" size={16} color={palette.risk} />
                            </Pressable>
                          )}
                        </View>
                      </View>

                      {/* Grade Selector Pills */}
                      <ThemedText style={{ fontSize: 11, color: palette.muted, marginBottom: 6 }}>
                        What if you score:
                      </ThemedText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                        {SELECTABLE_GRADES.map((grade) => {
                          const isSelected = c.targetGrade === grade;
                          const isFail = grade === 'F';
                          const isInc = grade === 'I';

                          let activeBg = palette.teal;
                          if (isFail) activeBg = palette.risk;
                          if (isInc) activeBg = palette.muted;

                          return (
                            <Pressable
                              key={grade}
                              onPress={() => setCourseGrade(c.id, grade)}
                              style={{
                                minWidth: 38,
                                height: 32,
                                borderRadius: radius.sm,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingHorizontal: 8,
                                backgroundColor: isSelected ? activeBg : palette.mist,
                                borderWidth: 1,
                                borderColor: isSelected ? activeBg : palette.line,
                              }}>
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: isSelected ? '700' : '500',
                                  color: isSelected
                                    ? (isFail || isInc ? '#FFFFFF' : palette.onTeal)
                                    : palette.ink,
                                }}>
                                {grade}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </Card>
                  ))
                )}

                {/* Add Custom Course Button */}
                <Button
                  title="+ Add Custom Hypothetical Course"
                  variant="secondary"
                  onPress={() => setAddModalVisible(true)}
                  style={{ marginTop: space.sm }}
                />
              </Section>
            </>
          )}
        </ScrollView>
      </Wrapper>

      {/* Add Custom Course Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 30, 36, 0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: space.lg,
          }}>
          <View
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: palette.surface,
              borderRadius: radius.lg,
              padding: space.xl,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: palette.line,
            }}>
            <ThemedText type="title" style={{ fontSize: 18, marginBottom: space.sm }}>
              Add Course to Scenario
            </ThemedText>
            <ThemedText style={{ fontSize: 13, color: palette.muted, marginBottom: space.lg }}>
              Add a future or hypothetical course to project your CGPA.
            </ThemedText>

            <ThemedText style={{ fontSize: 12, color: palette.muted, marginBottom: 4 }}>
              COURSE CODE
            </ThemedText>
            <TextInput
              value={newCode}
              onChangeText={setNewCode}
              placeholder="e.g. CSE 4101"
              placeholderTextColor={palette.faint}
              style={{
                height: 44,
                backgroundColor: palette.mist,
                borderRadius: radius.sm,
                paddingHorizontal: space.md,
                color: palette.ink,
                marginBottom: space.md,
                borderWidth: 1,
                borderColor: palette.line,
              }}
            />

            <ThemedText style={{ fontSize: 12, color: palette.muted, marginBottom: 4 }}>
              COURSE TITLE
            </ThemedText>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Machine Learning"
              placeholderTextColor={palette.faint}
              style={{
                height: 44,
                backgroundColor: palette.mist,
                borderRadius: radius.sm,
                paddingHorizontal: space.md,
                color: palette.ink,
                marginBottom: space.md,
                borderWidth: 1,
                borderColor: palette.line,
              }}
            />

            <ThemedText style={{ fontSize: 12, color: palette.muted, marginBottom: 4 }}>
              CREDITS
            </ThemedText>
            <TextInput
              value={newCredits}
              onChangeText={setNewCredits}
              placeholder="3.0"
              keyboardType="decimal-pad"
              placeholderTextColor={palette.faint}
              style={{
                height: 44,
                backgroundColor: palette.mist,
                borderRadius: radius.sm,
                paddingHorizontal: space.md,
                color: palette.ink,
                marginBottom: space.md,
                borderWidth: 1,
                borderColor: palette.line,
              }}
            />

            <ThemedText style={{ fontSize: 12, color: palette.muted, marginBottom: 4 }}>
              TARGET GRADE
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, marginBottom: space.xl, paddingVertical: 4 }}>
              {SELECTABLE_GRADES.map((grade) => {
                const isSelected = newGrade === grade;
                return (
                  <Pressable
                    key={grade}
                    onPress={() => setNewGrade(grade)}
                    style={{
                      minWidth: 38,
                      height: 32,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 8,
                      backgroundColor: isSelected ? palette.teal : palette.mist,
                      borderWidth: 1,
                      borderColor: isSelected ? palette.teal : palette.line,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? palette.onTeal : palette.ink,
                      }}>
                      {grade}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setAddModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Add to Scenario"
                variant="primary"
                onPress={handleAddCustomCourse}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

