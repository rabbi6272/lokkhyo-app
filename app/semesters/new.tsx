import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackStep } from '@/components/ui/BackStep';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/InputField';
import { Section } from '@/components/ui/Section';
import { Wrapper } from '@/components/ui/Wrapper';
import { Space } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { useSemesters } from '@/hooks/useSemesters';
import { FirebaseError } from '@/services/FirebaseError';
import { gpaRange, isDate, isNumeric, required } from '@/lib/validate';

/** A local-time `YYYY-MM-DD`; `toISOString()` is UTC and can be a day out. */
function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * A new term. A current term becomes the current semester on save, so the
 * server archives the previous one. A past term is added archived with its
 * official GPA, so earlier semesters count toward the CGPA.
 */
export default function NewSemesterScreen() {
  const router = useRouter();
  const { createSemester, activateSemester } = useSemesters();
  const { palette } = useTheme();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [totalWeeks, setTotalWeeks] = useState('13');
  const [targetGpa, setTargetGpa] = useState('');
  const [isPast, setIsPast] = useState(false);
  const [recordedGpa, setRecordedGpa] = useState('');
  const [recordedCredits, setRecordedCredits] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitError(null);
    const weeks = Number(totalWeeks);
    const gpa = Number(targetGpa);
    const termGpa = Number(recordedGpa);
    const termCredits = Number(recordedCredits);
    const next: Record<string, string | null> = {
      name: required(name, 'Semester name'),
      startDate: required(startDate, 'Start date') ?? isDate(startDate),
      totalWeeks: isNumeric(totalWeeks, 'Total weeks') ?? (weeks > 0 ? null : 'Total weeks must be positive.'),
      targetGpa:
        !isPast && targetGpa.trim() ? (Number.isNaN(gpa) ? 'Target GPA must be a number.' : gpaRange(gpa)) : null,
      recordedGpa: isPast ? (isNumeric(recordedGpa, 'GPA') ?? gpaRange(termGpa)) : null,
      recordedCredits: isPast
        ? (isNumeric(recordedCredits, 'Credits') ??
          (termCredits > 0 && termCredits <= 60 ? null : 'Credits must be between 0 and 60.'))
        : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      const id = await createSemester.mutateAsync({
        name: name.trim(),
        startDate: startDate.trim(),
        totalWeeks: weeks,
        targetGpa: !isPast && targetGpa.trim() ? gpa : 0,
        ...(isPast ? { past: true, recordedGpa: termGpa, recordedCredits: termCredits } : {}),
      });
      if (!isPast) await activateSemester.mutateAsync(id);
      router.back();
    } catch (error) {
      setSubmitError(FirebaseError(error));
    }
  };

  return (
    <>
      <BackStep title="New semester" onBack={() => router.back()} />
      <Wrapper noTopMargin keyboardAvoiding style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Section title="TERM">
            <View style={styles.chips}>
              <Chip label="Current semester" selected={!isPast} onPress={() => setIsPast(false)} />
              <Chip label="Past semester" selected={isPast} onPress={() => setIsPast(true)} />
            </View>
            <Field
              label="Semester name"
              placeholder="e.g. Fall 2026"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setErrors((e) => ({ ...e, name: null }));
              }}
              error={errors.name}
            />
            <Field
              label="Start date (YYYY-MM-DD)"
              placeholder="2026-08-03"
              value={startDate}
              onChangeText={(v) => {
                setStartDate(v);
                setErrors((e) => ({ ...e, startDate: null }));
              }}
              error={errors.startDate}
            />
            <Field
              label="Total weeks"
              placeholder="13"
              keyboardType="numeric"
              value={totalWeeks}
              onChangeText={(v) => {
                setTotalWeeks(v);
                setErrors((e) => ({ ...e, totalWeeks: null }));
              }}
              error={errors.totalWeeks}
            />
            {!isPast && (
              <Field
                label="Target GPA (optional)"
                placeholder="e.g. 3.80"
                keyboardType="numeric"
                value={targetGpa}
                onChangeText={(v) => {
                  setTargetGpa(v);
                  setErrors((e) => ({ ...e, targetGpa: null }));
                }}
                error={errors.targetGpa}
              />
            )}
          </Section>

          {isPast && (
            <Section title="RESULT">
              <Field
                label="GPA (out of 4.00)"
                placeholder="e.g. 3.62"
                keyboardType="decimal-pad"
                value={recordedGpa}
                onChangeText={(v) => {
                  setRecordedGpa(v);
                  setErrors((e) => ({ ...e, recordedGpa: null }));
                }}
                error={errors.recordedGpa}
                required
              />
              <Field
                label="Credits completed"
                placeholder="e.g. 21"
                keyboardType="decimal-pad"
                value={recordedCredits}
                onChangeText={(v) => {
                  setRecordedCredits(v);
                  setErrors((e) => ({ ...e, recordedCredits: null }));
                }}
                error={errors.recordedCredits}
                required
              />
            </Section>
          )}

          <ThemedText type="caption" style={styles.hint}>
            {isPast
              ? 'Enter the official GPA from your result sheet. It counts toward your CGPA; your current semester stays as it is.'
              : 'The new term becomes your current semester; the previous one is archived and keeps its courses and grades.'}
          </ThemedText>
          {submitError ? <Text style={[styles.error, { color: palette.risk }]}>{submitError}</Text> : null}

          <Button
            title={isPast ? 'Add past semester' : 'Create semester'}
            onPress={handleSubmit}
            loading={createSemester.isPending || activateSemester.isPending}
          />
        </ScrollView>
      </Wrapper>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: Space.md, paddingBottom: Space.xxl, gap: Space.md },
  hint: { paddingHorizontal: Space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { fontSize: 13, paddingHorizontal: Space.xs },
});
