import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackStep } from '@/components/ui/BackStep';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { Wrapper } from '@/components/ui/Wrapper';
import { useTheme } from '@/providers/theme-provider';
import { useSemesters } from '@/hooks/useSemesters';
import { useAuth } from '@/providers/auth-provider';
import { useDegreeStatus, useTranscript } from '@/services/grades/grades.hooks';
import { CLASSIFICATION_LABELS, formatGpa } from '@/services/grades/grades.services';
import type { TranscriptEntryDto } from '@/services/grades/grades.types';

/**
 * Transcript and degree status, straight from the server's GPA engine. Nothing
 * here is computed on the device: these are the official figures.
 */
export default function TranscriptScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { semesters } = useSemesters();
  const { palette } = useTheme();
  const status = useDegreeStatus(user?.uid);
  const transcript = useTranscript(user?.uid);

  const semesterName = (id: string) => semesters.find((s) => s.id === id)?.name ?? 'Semester';
  const bySemester = new Map<string, TranscriptEntryDto[]>();
  for (const entry of transcript.data?.entries ?? []) {
    bySemester.set(entry.semesterId, [...(bySemester.get(entry.semesterId) ?? []), entry]);
  }

  const loading = status.isLoading || transcript.isLoading;
  const failed = status.isError || transcript.isError;

  return (
    <>
      <BackStep title="Transcript" onBack={() => router.back()} />
      <Wrapper noTopMargin style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={palette.teal} />
            </View>
          ) : failed ? (
            <ThemedText style={styles.muted}>Could not load your transcript. Check your connection.</ThemedText>
          ) : (
            <>
              {status.data && (
                <Section title="DEGREE STATUS">
                  <Row label="CGPA" value={formatGpa(status.data.cgpa)} />
                  <Row label="Classification" value={CLASSIFICATION_LABELS[status.data.classification]} />
                  <Row
                    label="Credits earned"
                    value={`${status.data.totalCreditsEarned} / ${status.data.totalCreditsAttempted}`}
                  />
                  <Row label="Backlogs" value={String(status.data.backlogCount)} />
                  <Row label="Incomplete" value={String(status.data.incompleteCount)} />
                  <Row
                    label="Degree eligible"
                    value={
                      status.data.isDegreeEligible
                        ? 'Yes'
                        : `No (needs ${status.data.degreeCgpaThreshold.toFixed(2)})`
                    }
                    last={status.data.improvementCandidates.length === 0}
                  />
                  {status.data.improvementCandidates.length > 0 && (
                    <Row
                      label="Can improve"
                      value={status.data.improvementCandidates.map((c) => c.courseCode).join(', ')}
                      last
                    />
                  )}
                </Section>
              )}

              {bySemester.size === 0 ? (
                <ThemedText style={styles.muted}>
                  No graded courses yet. Record a final grade from a course&apos;s page.
                </ThemedText>
              ) : (
                [...bySemester].map(([semesterId, entries]) => (
                  <Section key={semesterId} title={semesterName(semesterId).toUpperCase()}>
                    {entries.map((entry, index) => (
                      <Row
                        key={entry.courseId}
                        label={`${entry.courseCode} · ${entry.credits} cr`}
                        value={`${entry.letterGrade}  ${formatGpa(entry.gradePoint)}${
                          entry.attempts.length > 1 ? `  (${entry.attempts.length} attempts)` : ''
                        }`}
                        danger={entry.status === 'BACKLOG'}
                        last={index === entries.length - 1}
                      />
                    ))}
                  </Section>
                ))
              )}

              <Button
                title="Open What-If Simulator"
                variant="secondary"
                onPress={() => router.push('/profile/simulator')}
                style={{ marginTop: 16 }}
              />
            </>
          )}
        </ScrollView>
      </Wrapper>
    </>
  );
}

function Row({ label, value, last, danger }: { label: string; value: string; last?: boolean; danger?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.row, !last && [styles.divider, { borderBottomColor: palette.line }]]}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText
        type="defaultSemiBold"
        style={[styles.value, danger && { color: palette.risk }]}
        numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  muted: {
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    opacity: 0.7,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
