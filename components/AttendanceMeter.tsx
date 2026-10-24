import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/providers/theme-provider';
import { EXAM_ELIGIBILITY_THRESHOLD, type AttendanceStats } from '@/lib/attendance';

/** Below this, the attendance mark is 0 — the line drawn on the bar. */
export const ATTENDANCE_MARK_LINE = 60;

/**
 * One course's attendance: the percentage against the 60% mark line, coloured
 * by how close it is to losing exam eligibility.
 */
export function AttendanceMeter({ code, title, stats }: { code: string; title?: string; stats?: AttendanceStats }) {
  const { space, statusColor } = useTheme();
  const held = stats?.held ?? 0;
  const percent = stats?.percent ?? 0;
  const tone = statusColor(percent, EXAM_ELIGIBILITY_THRESHOLD, ATTENDANCE_MARK_LINE - EXAM_ELIGIBILITY_THRESHOLD);

  const wrapStyle = StyleSheet.create({ wrap: { gap: 6, paddingVertical: space.md } }).wrap;
  const rowStyle = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md } }).row;
  const namesStyle = StyleSheet.create({ names: { flex: 1 } }).names;

  return (
    <View style={wrapStyle}>
      <View style={rowStyle}>
        <View style={namesStyle}>
          <ThemedText type="defaultSemiBold">{code}</ThemedText>
          {title ? (
            <ThemedText type="caption" numberOfLines={1}>
              {title}
            </ThemedText>
          ) : null}
        </View>
        {held > 0 ? (
          <ThemedText type="number" color={tone.fg}>
            {percent}%
          </ThemedText>
        ) : (
          <ThemedText type="caption">No sessions yet</ThemedText>
        )}
      </View>
      {held > 0 ? (
        <>
          <ProgressBar percent={percent} color={tone.fg} target={ATTENDANCE_MARK_LINE} />
          <ThemedText type="caption">
            {stats?.eligible
              ? `${stats.present} of ${held} attended · mark ${stats.mark}/10`
              : `${stats?.present ?? 0} of ${held} attended · below exam eligibility`}
          </ThemedText>
        </>
      ) : null}
    </View>
  );
}