import type { RoutineSlot } from '@/lib/types';
import { DAY_NAMES } from '@/lib/constants';
import { parseTime } from '@/lib/validate';

/**
 * Lokkhyo day-of-week convention is 0=Saturday … 6=Friday (week starts on
 * Saturday). This converts a JS Date to that index.
 */
export function dateToWeekdayIndex(date: Date): number {
  return (date.getDay() + 1) % 7;
}

/**
 * Converts a Lokkhyo dayOfWeek (0=Sat … 6=Fri) to Expo's WEEKLY trigger
 * weekday (1=Sun … 7=Sat).
 */
export function toExpoWeekday(dayOfWeek: number): number {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Invalid Lokkhyo dayOfWeek: ${dayOfWeek}`);
  }
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

/**
 * Returns the Lokkhyo day-of-week index for today (device-local).
 */
export function getTodayOfWeek(): number {
  return dateToWeekdayIndex(new Date());
}

/**
 * Validates and normalizes a raw routine slot.
 * Returns null if the slot is too malformed to use.
 */
export function normalizeRoutineSlot(raw: Partial<RoutineSlot> & { id: string }): RoutineSlot | null {
  if (typeof raw.dayOfWeek !== 'number' || raw.dayOfWeek < 0 || raw.dayOfWeek > 6 || !Number.isInteger(raw.dayOfWeek)) {
    return null;
  }

  if (typeof raw.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.startTime.trim())) {
    return null;
  }

  const courseLabel = typeof raw.courseLabel === 'string' && raw.courseLabel.trim()
    ? raw.courseLabel.trim()
    : 'Class';

  return {
    id: raw.id,
    courseId: typeof raw.courseId === 'string' ? raw.courseId : '',
    courseLabel,
    dayOfWeek: raw.dayOfWeek,
    startTime: raw.startTime.trim(),
    endTime: typeof raw.endTime === 'string' ? raw.endTime.trim() : raw.startTime.trim(),
    room: typeof raw.room === 'string' ? raw.room.trim() : '',
    createdAt: raw.createdAt ?? null,
  };
}

/**
 * Groups normalized routine slots by dayOfWeek (0–6), skipping malformed ones.
 */
export function groupRoutineByDay(slots: RoutineSlot[]): Record<number, RoutineSlot[]> {
  const groups: Record<number, RoutineSlot[]> = {};
  for (let d = 0; d <= 6; d++) {
    groups[d] = [];
  }

  for (const slot of slots) {
    const normalized = normalizeRoutineSlot(slot);
    if (normalized && groups[normalized.dayOfWeek]) {
      groups[normalized.dayOfWeek].push(normalized);
    }
  }

  for (let d = 0; d <= 6; d++) {
    groups[d].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  }

  return groups;
}

/**
 * Sorts routine slots chronologically by startTime.
 */
export function sortRoutineSlotsByTime(slots: RoutineSlot[]): RoutineSlot[] {
  return [...slots].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
}

/**
 * Converts a 24h "HH:MM" string to a user-friendly "h:MM AM/PM" format.
 */
export function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;

  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${displayHour} ${period}` : `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Builds notification title and body for a given day's routine slots.
 * When a student name is provided, the title is personalized.
 */
export function buildDailyRoutineNotificationContent(
  daySlots: RoutineSlot[],
  studentName?: string,
): { title: string; body: string; } {
  const firstName = studentName?.trim().split(/\s+/)[0];
  const title = firstName ? `Good morning, ${firstName}! 🌅` : 'Good morning! 🌅';
  const normalized = daySlots
    .map((s) => normalizeRoutineSlot(s))
    .filter((s): s is RoutineSlot => s !== null)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  if (normalized.length === 0) {
    return { title, body: 'No classes scheduled today. Have a productive day! 🎯' };
  }

  const first = normalized[0];
  const time = formatTime12h(first.startTime);
  const room = first.room ? ` in Room ${first.room}` : '';

  if (normalized.length === 1) {
    return {
      title,
      body: `You have 1 class today. ${first.courseLabel} starts at ${time}${room}.`,
    };
  }

  return {
    title,
    body: `You have ${normalized.length} classes today.\n
    ${normalized.map((s) => `${s.courseLabel} at ${formatTime12h(s.startTime)}`).join('\n    ')}
    ${room}.`,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * The class to feature: the one in progress if any, else the next one within
 * the coming week. `status` is the short countdown shown in the pill.
 */
export function findSpotlightClass(slots: RoutineSlot[], today: number, nowMinutes: number) {
  if (slots.length === 0) return null;

  const byStart = (a: RoutineSlot, b: RoutineSlot) => parseTime(a.startTime) - parseTime(b.startTime);
  const todays = slots.filter((s) => s.dayOfWeek === today).sort(byStart);

  const ongoing = todays.find((s) => parseTime(s.startTime) <= nowMinutes && nowMinutes < parseTime(s.endTime));
  if (ongoing) {
    return { slot: ongoing, live: true, when: 'Today', status: `Ends in ${formatDuration(parseTime(ongoing.endTime) - nowMinutes)}` };
  }

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (today + offset) % 7;
    const match = (offset === 0 ? todays : slots.filter((s) => s.dayOfWeek === dayIndex).sort(byStart)).find(
      (s) => offset > 0 || parseTime(s.startTime) >= nowMinutes,
    );
    if (match) {
      const when = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : DAY_NAMES[dayIndex];
      const status = offset === 0 ? `In ${formatDuration(parseTime(match.startTime) - nowMinutes)}` : when;
      return { slot: match, live: false, when, status };
    }
  }
  return null;
}
