import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/providers/theme-provider';
import type { Palette, Theme } from '@/constants/theme';
import { courseProgress } from '@/lib/gpa';
import type { Assessment, Course } from '@/lib/types';
import { formatGpa } from '@/services/grades/grades.services';
import type { ResultDto, ResultStatusDto } from '@/services/grades/grades.types';

type CourseCardProps = {
  course: Course;
  assessments?: Assessment[];
  /**
   * The course's official results. When the server has graded the course, its
   * letter grade takes the mark slot and the CT ring steps aside — the grade is
   * the authoritative figure, the ring is only coursework-in-progress.
   */
  results?: ResultDto[];
  /** Render as a row inside a shared card instead of its own card. */
  inline?: boolean;
};

/**
 * A course at a glance. Ungraded: CT progress as a ring with the pass mark
 * drawn on it, so "am I safe?" reads before the number does. Graded: the letter
 * grade the server's GPA engine recorded, with the grade point and percentage
 * under the title.
 */
export function CourseCard({ course, assessments = [], results, inline }: CourseCardProps) {
  const router = useRouter();
  const { palette, radius, space } = useTheme();

  const graded = results?.find((r) => r.isLatestAttempt);
  const { percent } = courseProgress(assessments);
  const target = course.passMarks > 0 ? course.passMarks : undefined;
  const belowTarget = target !== undefined && percent < target;
  const backlog = graded?.status === 'BACKLOG';
  const color = backlog ? palette.risk : graded ? palette.good : belowTarget ? palette.warn : palette.teal;

  const accessibilityLabel = graded
    ? `${course.code}, ${graded.letterGrade}, ${formatGpa(graded.gradePoint)} grade point`
    : `${course.code}, ${percent}% CT progress`;

  const rowStyle = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.md } }).row;
  const textStyle = StyleSheet.create({ text: { flex: 1, gap: 2 } }).text;
  const titleRowStyle = StyleSheet.create({ titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm } }).titleRow;

  const body = (
    <View style={rowStyle}>
      {graded ? (
        <GradeBadge letterGrade={graded.letterGrade} status={graded.status} palette={palette} radius={radius} />
      ) : (
        <ProgressRing percent={percent} target={target} color={color} size={48} />
      )}
      <View style={textStyle}>
        <View style={titleRowStyle}>
          <ThemedText type="defaultSemiBold">{course.code}</ThemedText>
          <ThemedText type="caption">{course.credits} cr</ThemedText>
        </View>
        <ThemedText type="caption" numberOfLines={1}>
          {course.title}
        </ThemedText>
        {graded && (
          <ThemedText type="caption" color={backlog ? palette.risk : palette.muted}>
            {formatGpa(graded.gradePoint)} GP · {graded.percentage}%
            {graded.attempt > 1 ? ` · attempt ${graded.attempt}` : ''}
          </ThemedText>
        )}
      </View>
      <SvgIcon name="chevron" size={18} color={palette.faint} />
    </View>
  );

  const open = () => router.push(`/course/${course.id}`);
  if (inline) {
    const inlineStyle = StyleSheet.create({ inline: { borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: space.md } }).inline;
    return (
      <Card onPress={open} style={inlineStyle} accessibilityLabel={accessibilityLabel}>
        {body}
      </Card>
    );
  }
  const cardStyle = StyleSheet.create({ card: { marginBottom: space.sm } }).card;
  return (
    <Card onPress={open} dense style={cardStyle} accessibilityLabel={accessibilityLabel}>
      {body}
    </Card>
  );
}

/**
 * The graded course's mark. Sits in the ring's 48px slot so a list stays even,
 * but says what was recorded rather than how far along it is.
 */
function GradeBadge({
  letterGrade,
  status,
  palette,
  radius,
}: { letterGrade: string; status: ResultStatusDto; palette: Palette; radius: Theme['radius'] }) {
  const failed = status !== 'PASSED';
  const badgeStyle = StyleSheet.create({
    badge: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }).badge;

  return (
    <View
      style={[badgeStyle, { backgroundColor: failed ? palette.riskSoft : palette.tealSoft }]}
      accessible
      accessibilityLabel={`Grade ${letterGrade}`}>
      <ThemedText type="number" color={failed ? palette.risk : palette.teal}>
        {letterGrade}
      </ThemedText>
    </View>
  );
}