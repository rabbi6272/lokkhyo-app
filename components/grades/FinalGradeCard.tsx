import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BlurredModal } from '@/components/ui/AppBlur';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/InputField';
import { Radius, Space } from '@/constants/theme';
import { newIdempotencyKey } from '@/lib/api';
import { isNumeric } from '@/lib/validate';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { useCourseResults, useRecordFinalGrade } from '@/services/grades/grades.hooks';
import { formatGpa } from '@/services/grades/grades.services';
import { FirebaseError } from '@/services/FirebaseError';

/**
 * The course's official grade, from the server's GPA engine — separate from
 * the CT-progress bar above it, which is coursework the student tracks.
 *
 * Recording a grade appends an attempt and moves the CGPA, so the request
 * carries an idempotency key minted when the dialog opens: a retried save of
 * the same entry replays instead of recording a second attempt.
 */
export function FinalGradeCard({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { data: results } = useCourseResults(user?.uid, courseId);
  const record = useRecordFinalGrade();
  const { palette } = useTheme();

  const counted = results?.find((r) => r.isLatestAttempt);

  const [visible, setVisible] = useState(false);
  const [marks, setMarks] = useState('');
  const [outOf, setOutOf] = useState('100');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [intentKey, setIntentKey] = useState('');

  const open = () => {
    setMarks('');
    setOutOf('100');
    setErrors({});
    setIntentKey(newIdempotencyKey());
    setVisible(true);
  };

  const save = async () => {
    const max = Number(outOf);
    const obtained = Number(marks);
    const next: Record<string, string | null> = {
      outOf: isNumeric(outOf, 'Out of') ?? (max > 0 ? null : 'Out of must be above 0.'),
      marks:
        isNumeric(marks, 'Marks') ??
        (obtained < 0 || obtained > max ? `Marks must be between 0 and ${outOf}.` : null),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      await record.mutateAsync({ courseId, marksObtained: obtained, maxMarks: max, idempotencyKey: intentKey });
      setVisible(false);
    } catch (error) {
      setErrors({ marks: FirebaseError(error) });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
      <View style={styles.header}>
        <View style={styles.text}>
          <ThemedText type="eyebrow">FINAL GRADE · OFFICIAL</ThemedText>
          {counted ? (
            <View style={styles.gradeRow}>
              <ThemedText type="figure" color={counted.status === 'BACKLOG' ? palette.risk : palette.ink}>
                {counted.letterGrade}
              </ThemedText>
              <ThemedText type="caption">
                {formatGpa(counted.gradePoint)} GP · {counted.percentage}%
                {counted.attempt > 1 ? ` · attempt ${counted.attempt}` : ''}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="caption">Not graded yet. Record it once results are out.</ThemedText>
          )}
          {counted?.status === 'BACKLOG' && (
            <ThemedText type="caption" color={palette.risk}>
              Backlog — this course must be repeated
            </ThemedText>
          )}
          {counted?.isGradeImprovementEligible && (
            <ThemedText type="caption" color={palette.teal}>
              Eligible for grade improvement
            </ThemedText>
          )}
        </View>
        <Button title={counted ? 'Regrade' : 'Record'} variant="secondary" onPress={open} style={styles.action} />
      </View>

      <BlurredModal visible={visible} onClose={() => setVisible(false)} placement="bottom">
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <ThemedText type="eyebrow">{counted ? 'NEW ATTEMPT' : 'FINAL GRADE'}</ThemedText>
          <ThemedText type="heading" style={styles.sheetTitle}>
            {counted ? 'Record a new attempt' : 'Record your final grade'}
          </ThemedText>
          <Field
            label="Marks obtained"
            keyboardType="numeric"
            value={marks}
            onChangeText={(v) => {
              setMarks(v);
              setErrors((e) => ({ ...e, marks: null }));
            }}
            error={errors.marks}
            required
          />
          <Field
            label="Out of"
            keyboardType="numeric"
            value={outOf}
            onChangeText={(v) => {
              setOutOf(v);
              setErrors((e) => ({ ...e, outOf: null }));
            }}
            error={errors.outOf}
            required
          />
          <ThemedText type="caption">
            The letter grade and GPA are calculated by the server on the RUET scale.
          </ThemedText>
          <View style={styles.buttons}>
            <Button title="Cancel" variant="secondary" onPress={() => setVisible(false)} style={styles.flex} />
            <Button title="Save grade" onPress={save} loading={record.isPending} style={styles.flex} />
          </View>
        </View>
      </BlurredModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Space.lg,
    marginTop: Space.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  text: { flex: 1, gap: 2 },
  gradeRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.sm },
  action: { minHeight: 40, paddingHorizontal: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,30,36,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.lg + 4,
    borderTopRightRadius: Radius.lg + 4,
    padding: Space.xl,
    paddingBottom: Space.xxl,
    gap: Space.xs,
  },
  sheetTitle: { marginBottom: Space.md },
  buttons: { flexDirection: 'row', gap: Space.md, marginTop: Space.lg },
  flex: { flex: 1 },
});
