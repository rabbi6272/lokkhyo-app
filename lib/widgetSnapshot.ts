import { toDateKey } from '@/lib/reminders';
import { formatTime12h } from '@/lib/routine';

/**
 * What the home-screen widgets show. The app writes it after a sync and widgets
 * only ever read it, so they work offline and cannot disagree with the app.
 * It holds no tokens, profile data or photos.
 */
export const WIDGET_SNAPSHOT_VERSION = 1;

export interface WidgetAttendance {
  courseId: string;
  code: string;
  /** Null until a session has been held. */
  percent: number | null;
  eligible: boolean;
}

export interface WidgetDeadline {
  id: string;
  title: string;
  courseId: string;
  courseCode: string;
  /** `YYYY-MM-DD`: reminders are calendar days, not instants. */
  date: string;
}

export interface WidgetSnapshot {
  version: number;
  updatedAt: string;
  cgpa: number | null;
  attendance: WidgetAttendance[];
  /** Upcoming reminders, soonest first; a widget skips any that have since passed. */
  deadlines: WidgetDeadline[];
}

export const MAX_WIDGET_DEADLINES = 5;

export function buildWidgetSnapshot(input: {
  cgpa: number | null;
  courses: {
    course: { id: string; code: string };
    stats: { held: number; percent: number; eligible: boolean };
  }[];
  reminders: { id: string; name: string; date: string; courseId: string; courseCode: string }[];
  now: Date;
}): WidgetSnapshot {
  const today = toDateKey(input.now);
  return {
    version: WIDGET_SNAPSHOT_VERSION,
    updatedAt: input.now.toISOString(),
    cgpa: input.cgpa,
    attendance: input.courses.map(({ course, stats }) => ({
      courseId: course.id,
      code: course.code,
      percent: stats.held > 0 ? stats.percent : null,
      eligible: stats.eligible,
    })),
    deadlines: input.reminders
      .filter((r) => r.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, MAX_WIDGET_DEADLINES)
      .map((r) => ({ id: r.id, title: r.name, courseId: r.courseId, courseCode: r.courseCode, date: r.date })),
  };
}

/** Null for anything unreadable or from another version, which shows "open the app". */
export function parseWidgetSnapshot(raw: string | null): WidgetSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WidgetSnapshot;
    return parsed?.version === WIDGET_SNAPSHOT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function nextDeadline(snapshot: WidgetSnapshot, now: Date): WidgetDeadline | null {
  const today = toDateKey(now);
  return snapshot.deadlines.find((d) => d.date >= today) ?? null;
}

export function deadlineDistance(date: string, now: Date): string {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${toDateKey(now)}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** `Updated 2:05 PM` today, `Updated Nov 3` before that: how stale the numbers are. */
export function updatedLabel(updatedAt: string, now: Date): string {
  const updated = new Date(updatedAt);
  if (toDateKey(updated) === toDateKey(now)) {
    const clock = `${String(updated.getHours()).padStart(2, '0')}:${String(updated.getMinutes()).padStart(2, '0')}`;
    return `Updated ${formatTime12h(clock)}`;
  }
  return `Updated ${updated.getDate()}/${updated.getMonth() + 1}`;
}

export type AttendanceTone = 'good' | 'warn' | 'risk' | 'muted';

/** The same lines as the app: below 50% loses eligibility, below 60% loses the mark. */
export function attendanceTone(percent: number | null): AttendanceTone {
  if (percent === null) return 'muted';
  if (percent < 50) return 'risk';
  return percent < 60 ? 'warn' : 'good';
}
