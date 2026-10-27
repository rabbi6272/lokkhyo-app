import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackStep } from '@/components/ui/BackStep';
import { Button } from '@/components/ui/Button';
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
 * A new term. It becomes the current semester on save — that is what creating
 * one is for — so the server archives the previous term in the same request.
 */
export default function NewSemesterScreen() {
  const router = useRouter();
  const { createSemester, activateSemester } = useSemesters();
  const { palette } = useTheme();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [totalWeeks, setTotalWeeks] = useState('13');
  const [targetGpa, setTargetGpa] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitError(null);
    const weeks = Number(totalWeeks);
    const gpa = Number(targetGpa);
    const next: Record<string, string | null> = {
      name: required(name, 'Semester name'),
      startDate: required(startDate, 'Start date') ?? isDate(startDate),
      totalWeeks: isNumeric(totalWeeks, 'Total weeks') ?? (weeks > 0 ? null : 'Total weeks must be positive.'),
      targetGpa: targetGpa.trim() ? (Number.isNaN(gpa) ? 'Target GPA must be a number.' : gpaRange(gpa)) : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      const id = await createSemester.mutateAsync({
        name: name.trim(),
        startDate: startDate.trim(),
        totalWeeks: weeks,
        targetGpa: targetGpa.trim() ? gpa : 0,
      });
      await activateSemester.mutateAsync(id);
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
          </Section>

          <ThemedText type="caption" style={styles.hint}>
            The new term becomes your current semester; the previous one is archived and keeps its courses and grades.
          </ThemedText>
          {submitError ? <Text style={[styles.error, { color: palette.risk }]}>{submitError}</Text> : null}

          <Button
            title="Create semester"
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
  error: { fontSize: 13, paddingHorizontal: Space.xs },
});
