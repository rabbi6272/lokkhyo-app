import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BlurredModal } from '@/components/ui/AppBlur';
import { Chip } from '@/components/ui/Chip';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { useTheme } from '@/providers/theme-provider';
import type { Palette, Theme } from '@/constants/theme';
import { buildMonthGrid, todayStr, type AttendanceSession } from '@/lib/attendance';
import { DAY_SHORT_NAMES, MONTH_NAMES } from '@/lib/constants';
import { formatTime12h } from '@/lib/routine';
import type { AttendanceStatus } from '@/lib/types';
import type { DaySession } from '@/hooks/useAllCoursesAttendance';

export function UnifiedAttendanceCalendar({
  sessionsByDate,
  bounds,
  onMark,
}: {
  sessionsByDate: Map<string, DaySession[]>;
  bounds: { start: string; end: string } | null;
  onMark: (courseId: string, date: string, slotId: string, status: AttendanceStatus) => void;
}) {
  const { palette, radius, space, fontFamily } = useTheme();
  const today = todayStr();

  const STATUS_COLORS: Record<'present' | 'absent' | 'cancelled' | 'needsAction' | 'future', string> = {
    present: palette.good,
    absent: palette.risk,
    cancelled: palette.faint,
    needsAction: palette.warn,
    future: palette.line,
  };

  const STATUS_OPTIONS: { label: string; value: AttendanceStatus }[] = [
    { label: 'Present', value: 'present' },
    { label: 'Absent', value: 'absent' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  function dayCellStatus(sessions: AttendanceSession[]): keyof typeof STATUS_COLORS | null {
    if (sessions.length === 0) return null;
    if (sessions[0].isFuture) return 'future';
    if (sessions.some((s) => s.status === 'unmarked')) return 'needsAction';
    if (sessions.some((s) => s.status === 'absent')) return 'absent';
    if (sessions.some((s) => s.status === 'present')) return 'present';
    return 'cancelled';
  }

  const initial = today.slice(0, 7);
  const [viewMonth, setViewMonth] = useState(() => {
    const clampedStart = bounds?.start.slice(0, 7);
    const clampedEnd = bounds?.end.slice(0, 7);
    if (clampedStart && initial < clampedStart) return clampedStart;
    if (clampedEnd && initial > clampedEnd) return clampedEnd;
    return initial;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const clampedStart = bounds?.start.slice(0, 7);
    const clampedEnd = bounds?.end.slice(0, 7);
    if (clampedStart && viewMonth < clampedStart) setViewMonth(clampedStart);
    else if (clampedEnd && viewMonth > clampedEnd) setViewMonth(clampedEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds?.start, bounds?.end]);

  const [year, month] = viewMonth.split('-').map(Number);
  const grid = useMemo(() => buildMonthGrid(year, month - 1), [year, month]);

  const canGoPrev = !bounds || `${viewMonth}-01` > bounds.start;
  const canGoNext = !bounds || `${viewMonth}-01` < bounds.end;

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const selectedSessions = selectedDate ? sessionsByDate.get(selectedDate) ?? [] : [];

  return (
    <View style={styles.card(palette, radius, space)}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => canGoPrev && changeMonth(-1)} hitSlop={8} disabled={!canGoPrev}>
          <SvgIcon name="arrowLeft" size={18} color={canGoPrev ? palette.ink : palette.line} />
        </Pressable>
        <ThemedText type="defaultSemiBold">{MONTH_NAMES[month - 1]} {year}</ThemedText>
        <Pressable onPress={() => canGoNext && changeMonth(1)} hitSlop={8} disabled={!canGoNext}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <SvgIcon name="arrowLeft" size={18} color={canGoNext ? palette.ink : palette.line} />
          </View>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {DAY_SHORT_NAMES.map((d) => (
          <ThemedText key={d} style={styles.weekLabel(fontFamily, palette)}>{d}</ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((date, i) => {
          if (!date) return <View key={i} style={styles.cell} />;
          const daySessions = (sessionsByDate.get(date) ?? []).map((d) => d.session);
          const status = dayCellStatus(daySessions);
          const isToday = date === today;
          const dayNum = Number(date.slice(8, 10));

          return (
            <Pressable
              key={i}
              style={[styles.cell, isToday && styles.cellToday(palette, radius)]}
              disabled={daySessions.length === 0}
              onPress={() => setSelectedDate(date)}>
              <ThemedText style={[styles.cellText(fontFamily), isToday && styles.cellTextToday(palette, fontFamily)]}>{dayNum}</ThemedText>
              {status && <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend(space, palette)}>
        {(['present', 'absent', 'cancelled', 'needsAction', 'future'] as const).map((key) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[key] }]} />
            <ThemedText style={styles.legendLabel(palette)}>
              {key === 'needsAction' ? 'Needs marking' : key[0].toUpperCase() + key.slice(1)}
            </ThemedText>
          </View>
        ))}
      </View>

      <BlurredModal
        visible={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        placement="bottom"
        animationType='fade'
      >
        <View style={styles.modalContent(palette, radius, space)}>
          <ThemedText type="eyebrow">MARK ATTENDANCE</ThemedText>
          <ThemedText type="heading" style={styles.modalTitle}>
            {selectedDate ? formatDateHeading(selectedDate) : ''}
          </ThemedText>
          {selectedSessions.map((d) => (
            <View key={`${d.courseId}_${d.session.slotId}`} style={styles.sessionRow(palette, space)}>
              <ThemedText type="defaultSemiBold">{d.courseCode}</ThemedText>
              <ThemedText type="caption">
                {formatTime12h(d.session.startTime)} – {formatTime12h(d.session.endTime)}
              </ThemedText>
              <View style={styles.chips(space)}>
                {STATUS_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={d.session.status === opt.value}
                    onPress={() => onMark(d.courseId, d.session.date, d.session.slotId, opt.value)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </BlurredModal>
    </View>
  );
}

/** `2026-10-11` → `Sunday, 11 October`. */
function formatDateHeading(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long' });
  return `${weekday}, ${d} ${MONTH_NAMES[m - 1]}`;
}

const styles = {
  card: (
    palette: Palette,
    radius: Theme['radius'],
    space: Theme['space'],
  ): ViewStyle => ({
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    padding: space.lg,
  }),
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  } as ViewStyle,
  weekLabel: (fontFamily: Theme['fontFamily'], palette: Palette): TextStyle => ({
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: palette.faint,
  }),
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  } as ViewStyle,
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  } as ViewStyle,
  cellToday: (
    palette: Palette,
    radius: Theme['radius'],
  ): ViewStyle => ({
    backgroundColor: palette.tealSoft,
    borderRadius: radius.sm,
  }),
  cellText: (fontFamily: Theme['fontFamily']): TextStyle => ({
    fontFamily: fontFamily.medium,
    fontSize: 13,
  }),
  cellTextToday: (
    palette: Palette,
    fontFamily: Theme['fontFamily'],
  ): TextStyle => ({
    fontFamily: fontFamily.semibold,
    color: palette.teal,
  }),
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  } as ViewStyle,
  legend: (
    space: Theme['space'],
    palette: Palette,
  ): ViewStyle => ({
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  }),
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  } as ViewStyle,
  legendLabel: (palette: Palette): TextStyle => ({
    fontSize: 11,
    color: palette.muted,
  }),
  modalOverlay: (palette: Palette): ViewStyle => {
    const hex = palette.ink.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 15;
    const g = parseInt(hex.slice(2, 4), 16) || 30;
    const b = parseInt(hex.slice(4, 6), 16) || 36;
    return {
      flex: 1,
      backgroundColor: `rgba(${r},${g},${b},0.45)`,
      justifyContent: 'flex-end',
    };
  },
  modalContent: (
    palette: Palette,
    radius: Theme['radius'],
    space: Theme['space'],
  ): ViewStyle => ({
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    padding: space.xl,
    paddingBottom: space.xxl,
    width: '100%',
    gap: space.md,
  }),
  modalTitle: {
    marginBottom: 8,
  } as TextStyle,
  sessionRow: (
    palette: Palette,
    space: Theme['space'],
  ): ViewStyle => ({
    gap: 6,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  }),
  chips: (space: Theme['space']): ViewStyle => ({
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  }),
};