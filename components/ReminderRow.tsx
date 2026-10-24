import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { useTheme } from '@/providers/theme-provider';
import { ASSESSMENT_TYPE_LABELS, MONTH_NAMES } from '@/lib/constants';
import type { AssessmentType } from '@/lib/types';

type ReminderRowProps = {
  name: string;
  type: AssessmentType;
  /** `YYYY-MM-DD`. */
  date: string;
  /** Course code, shown when the list mixes courses. */
  courseCode?: string;
  /** When the local notification fires, if one is scheduled. */
  reminderLine?: string | null;
  highlighted?: boolean;
  onPress: () => void;
  onDelete: () => void;
};

/** An upcoming CT/quiz/assignment: a date tile, what it is, when you'll be reminded. */
export function ReminderRow({ name, type, date, courseCode, reminderLine, highlighted, onPress, onDelete }: ReminderRowProps) {
  const { palette, radius, space, fontFamily } = useTheme();
  const [, month, day] = date.split('-').map(Number);
  const daysLeft = daysUntil(date);

  const rowStyle = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md } }).row;
  const highlightedStyle = StyleSheet.create({
    highlighted: {
      backgroundColor: palette.tealSoft,
      borderRadius: radius.md,
      marginHorizontal: -space.sm,
      paddingHorizontal: space.sm,
    },
  }).highlighted;
  const tileStyle = StyleSheet.create({
    tile: {
      width: 46,
      height: 50,
      borderRadius: radius.sm,
      backgroundColor: palette.mist,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }).tile;
  const tileSoonStyle = StyleSheet.create({ tileSoon: { backgroundColor: palette.warnSoft } }).tileSoon;
  const tileDayStyle = StyleSheet.create({ tileDay: { fontFamily: fontFamily.display, fontSize: 18, lineHeight: 22, color: palette.ink } }).tileDay;
  const tileMonthStyle = StyleSheet.create({ tileMonth: { fontFamily: fontFamily.semibold, fontSize: 10, letterSpacing: 0.8, color: palette.muted } }).tileMonth;
  const textStyle = StyleSheet.create({ text: { flex: 1, gap: 1 } }).text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${ASSESSMENT_TYPE_LABELS[type]}, ${date}`}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, highlighted && highlightedStyle, pressed && { opacity: 0.7 }]}>
      <View style={[tileStyle, daysLeft <= 2 && daysLeft >= 0 && tileSoonStyle]}>
        <ThemedText style={[tileDayStyle, daysLeft <= 2 && daysLeft >= 0 && { color: palette.warn }]}>{day}</ThemedText>
        <ThemedText style={tileMonthStyle}>{MONTH_NAMES[month - 1]?.slice(0, 3).toUpperCase()}</ThemedText>
      </View>
      <View style={textStyle}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText type="caption" numberOfLines={1}>
          {ASSESSMENT_TYPE_LABELS[type]}
          {courseCode ? ` · ${courseCode}` : ''} · {relativeDay(daysLeft)}
        </ThemedText>
        {reminderLine ? (
          <ThemedText type="caption" color={palette.teal} numberOfLines={1}>
            {reminderLine}
          </ThemedText>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${name}`}
        onPress={onDelete}
        hitSlop={10}>
        <SvgIcon size={18} name="trash" color={palette.faint} />
      </Pressable>
    </Pressable>
  );
}

function daysUntil(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

function relativeDay(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 0) return `${-days} ${days === -1 ? 'day' : 'days'} ago`;
  return `in ${days} days`;
}