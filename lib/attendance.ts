import type { AttendanceRecord, AttendanceStatus, RoutineSlot } from '@/lib/types';
import { parseTime } from '@/lib/validate';
import { dateToWeekdayIndex } from '@/lib/routine';

export interface AttendanceOccurrence {
  date: string;
  slotId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AttendanceSession extends AttendanceOccurrence {
  status: AttendanceStatus | 'unmarked';
  isFuture: boolean;
}

export interface AttendanceStats {
  held: number;
  present: number;
  absent: number;
  cancelled: number;
  percent: number;
  mark: number;
  eligible: boolean;
}

const MARK_THRESHOLDS: { min: number; mark: number }[] = [
  { min: 90, mark: 10 },
  { min: 80, mark: 9 },
  { min: 70, mark: 8 },
  { min: 60, mark: 7 },
  { min: 0, mark: 0 },
];

export const EXAM_ELIGIBILITY_THRESHOLD = 50;

/** Length of one class period. A 100-minute class is a double period. */
export const PERIOD_MINUTES = 50;

/**
 * How many attendances one session counts as: whole periods in its length,
 * never less than one. 50 min → 1, 100 min → 2, 150 min → 3.
 * Lab courses skip this: one lab session is one attendance.
 * Mirrors `slotPeriods` in `lokkhyo-server/lib/digest.ts`; keep them equal.
 */
export function slotPeriods(startTime: string, endTime: string): number {
  const minutes = parseTime(endTime) - parseTime(startTime);
  if (!Number.isFinite(minutes) || minutes <= 0) return 1;
  return Math.max(1, Math.floor(minutes / PERIOD_MINUTES));
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function dateToDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return dateToWeekdayIndex(new Date(y, m - 1, d));
}

/**
 * Projects every class occurrence for the given routine slots across the
 * semester's window, starting from the slot's first matching weekday on/after
 * `startDate` and repeating weekly for `totalWeeks`.
 */
export function generateSessionOccurrences(
  slots: RoutineSlot[],
  startDate: string,
  totalWeeks: number,
): AttendanceOccurrence[] {
  if (!startDate || !slots.length || totalWeeks <= 0) return [];

  const semesterStartDow = dateToDayOfWeek(startDate);
  const occurrences: AttendanceOccurrence[] = [];

  for (const slot of slots) {
    const diff = (slot.dayOfWeek - semesterStartDow + 7) % 7;
    const firstOccurrence = addDays(startDate, diff);

    for (let week = 0; week < totalWeeks; week++) {
      occurrences.push({
        date: addDays(firstOccurrence, week * 7),
        slotId: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }

  return occurrences.sort((a, b) => a.date.localeCompare(b.date) || parseTime(a.startTime) - parseTime(b.startTime));
}

/**
 * Merges projected occurrences with saved attendance records, marking
 * unrecorded ones as 'unmarked' and flagging occurrences after `today`.
 */
export function mergeSessionsWithRecords(
  occurrences: AttendanceOccurrence[],
  records: AttendanceRecord[],
  today: string = todayStr(),
): AttendanceSession[] {
  const recordMap = new Map(records.map((r) => [`${r.date}_${r.slotId}`, r]));

  return occurrences.map((occurrence) => {
    const record = recordMap.get(`${occurrence.date}_${occurrence.slotId}`);
    return {
      ...occurrence,
      status: record?.status ?? 'unmarked',
      isFuture: occurrence.date > today,
    };
  });
}

/**
 * Builds a 7-column month grid of date strings, padded with `null` for the
 * leading/trailing blanks before the 1st and after the last day of the month.
 */
export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const startDow = dateToWeekdayIndex(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];

  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

/**
 * Computes held/present/absent/cancelled counts and the resulting
 * attendance percentage, mark (0/7/8/9/10), and exam eligibility.
 * Future and unmarked sessions are excluded from the percentage; cancelled
 * sessions don't count against the student either way.
 */
export function computeAttendanceStats(
  sessions: AttendanceSession[],
  { isLab = false }: { isLab?: boolean } = {},
): AttendanceStats {
  // Counts are in periods, so a double-period class counts as two attendances.
  // A lab session is one attendance however long it runs (labs are 150 min).
  const weight = (s: AttendanceSession) => (isLab ? 1 : slotPeriods(s.startTime, s.endTime));
  const sum = (match: (s: AttendanceSession) => boolean) =>
    sessions.reduce((total, s) => (match(s) ? total + weight(s) : total), 0);
  const cancelled = sum((s) => s.status === 'cancelled');
  const present = sum((s) => !s.isFuture && s.status === 'present');
  const absent = sum((s) => !s.isFuture && s.status === 'absent');
  const held = present + absent;
  const percent = held > 0 ? Math.round((present / held) * 100) : 0;
  const mark = MARK_THRESHOLDS.find((t) => percent >= t.min)?.mark ?? 0;
  const eligible = percent >= EXAM_ELIGIBILITY_THRESHOLD;

  return { held, present, absent, cancelled, percent, mark, eligible };
}
