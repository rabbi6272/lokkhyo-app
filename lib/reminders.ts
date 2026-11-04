import type { AssessmentType } from '@/lib/types';
import { DAY_SHORT_NAMES, MONTH_NAMES } from '@/lib/constants';
import { dateToWeekdayIndex, formatTime12h } from '@/lib/routine';

export interface AssessmentReminder {
  assessmentId: string;
  courseId: string;
  type: AssessmentType;
  name: string;
  date: string;
  /**
   * One entry per day the reminder still fires, ascending, never empty.
   *
   * A reminder runs daily from `leadDays` before the event through the event
   * day itself, so a CT on the 20th with a two-day lead notifies on the 18th,
   * 19th and 20th. Days already past are dropped, which is what lets an event
   * added on the eve of its own window start reminding immediately instead of
   * being discarded for having a start date in the past.
   */
  triggerDates: Date[];
}

const REMINDER_LEAD_DAYS: Partial<Record<AssessmentType, number>> = {
  ct: 2,
  assignment: 2,
  quiz: 3,
  labFinal: 5,
};

const REMINDER_TYPES: AssessmentType[] = ['ct', 'assignment', 'quiz', 'labFinal'];

export function isReminderType(type: string): type is AssessmentType {
  return REMINDER_TYPES.includes(type as AssessmentType);
}

export function getReminderLeadDays(type: AssessmentType): number | undefined {
  return REMINDER_LEAD_DAYS[type];
}

/**
 * Every future fire time for an assessment, one per day at the given
 * hour:minute, from (eventDate − leadDays) through the event day inclusive.
 *
 * Returns an empty array for an unknown type, an unparseable date, or an event
 * whose whole window is behind us — which is also the signal that the event is
 * over and nothing is left to schedule.
 */
export function getAssessmentReminderDates(
  dateStr: string,
  type: AssessmentType,
  now: Date = new Date(),
  hour: number = 7,
  minute: number = 0,
): Date[] {
  const leadDays = REMINDER_LEAD_DAYS[type];
  if (leadDays === undefined) return [];

  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return [];

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return [];

  const dates: Date[] = [];
  // Ascending by construction: walk back from the start of the window to the
  // event day. `day - offset` lets Date roll over month and year ends.
  for (let offset = leadDays; offset >= 0; offset -= 1) {
    const trigger = new Date(year, month, day - offset, hour, minute, 0, 0);
    if (Number.isNaN(trigger.getTime())) continue;
    if (trigger.getTime() > now.getTime()) dates.push(trigger);
  }
  return dates;
}

/**
 * Returns assessments that still have at least one reminder left to fire.
 */
export function getUpcomingAssessmentReminders(
  assessments: { id: string; type: string; name: string; date: string; courseId: string }[],
  now: Date = new Date(),
  hour: number = 7,
  minute: number = 0,
): AssessmentReminder[] {
  const upcoming: AssessmentReminder[] = [];

  for (const a of assessments) {
    if (!isReminderType(a.type)) continue;
    if (typeof a.date !== 'string' || !a.date.trim()) continue;

    const triggerDates = getAssessmentReminderDates(a.date.trim(), a.type, now, hour, minute);
    if (triggerDates.length > 0) {
      upcoming.push({
        assessmentId: a.id,
        courseId: a.courseId,
        type: a.type,
        name: a.name || 'Assessment',
        date: a.date.trim(),
        triggerDates,
      });
    }
  }

  return upcoming;
}

/**
 * Converts a Date to a local "YYYY-MM-DD" key (same format as Assessment.date).
 */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type ReminderPrefs = {
  assessmentRemindersEnabled: boolean;
  assessmentHour: number;
  assessmentMinute: number;
};

const toClock = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/**
 * One-line "⏰ Daily from … until … · <time>" label for an assessment or
 * upcoming reminder. Returns null when reminders are off or none remain.
 */
export function buildReminderLine(
  item: { date: string; type: AssessmentType },
  prefs: ReminderPrefs,
): string | null {
  if (!prefs.assessmentRemindersEnabled) return null;
  const dates = getAssessmentReminderDates(
    item.date,
    item.type,
    new Date(),
    prefs.assessmentHour,
    prefs.assessmentMinute,
  );
  if (dates.length === 0) return null;

  const time = formatTime12h(toClock(prefs.assessmentHour, prefs.assessmentMinute));
  const first = toDateKey(dates[0]);
  const last = toDateKey(dates[dates.length - 1]);

  // A single remaining fire — usually the event day itself — reads better as a
  // plain date than as a "from … until …" range on one day.
  if (first === last) return `Reminder ${formatDateLabel(first)} · ${time}`;
  return `Daily from ${formatDateLabel(first)} until ${formatDateLabel(last)} · ${time}`;
}

/**
 * The hint shown under a date field on the assessment and reminder forms:
 * how far the daily series actually reaches. Returns null when the date is
 * empty, which is the caller's signal not to show a hint at all.
 */
export function buildReminderRangeHint(
  dateStr: string,
  type: AssessmentType,
  prefs: ReminderPrefs,
  now: Date = new Date(),
): string | null {
  if (!dateStr.trim()) return null;

  const dates = getAssessmentReminderDates(
    dateStr,
    type,
    now,
    prefs.assessmentHour,
    prefs.assessmentMinute,
  );
  // With a daily series an invalid or already-passed date is the only way to
  // end up empty, so this is the honest message rather than "too close".
  if (dates.length === 0) return 'No reminder — this date has passed.';

  const time = formatTime12h(toClock(prefs.assessmentHour, prefs.assessmentMinute));
  const first = toDateKey(dates[0]);
  const last = toDateKey(dates[dates.length - 1]);
  const lead = getReminderLeadDays(type);
  const leadLabel = lead ? ` · ${lead} day${lead > 1 ? 's' : ''} before` : '';

  if (first === last) return `Reminder ${formatDateLabel(first)} at ${time}${leadLabel}`;
  return `Daily ${formatDateLabel(first)} – ${formatDateLabel(last)} at ${time}${leadLabel}`;
}

/**
 * Whole days between today and the event's date, or null if unparseable.
 * Zero means the event is today; negative means it has been and gone.
 */
function daysUntil(dateStr: string, now: Date): number | null {
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;

  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/**
 * The same reminder fires every day in the window, so it has to say how close
 * the event is — repeating "has a CT on Tue, Oct 20" three mornings running
 * reads like a notification stuck in a loop.
 */
function distancePhrase(days: number | null, dateLabel: string): string {
  if (days === null || days < 0) return `on ${dateLabel}`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/**
 * Formats a "YYYY-MM-DD" date string to a friendly label like "Fri, Sep 12".
 */
export function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;

  return `${DAY_SHORT_NAMES[dateToWeekdayIndex(d)]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Type-specific notification titles.
 */
const REMINDER_TITLES: Record<AssessmentType, string> = {
  ct: 'CT Reminder 📝',
  assignment: 'Assignment Reminder 📝',
  quiz: 'Quiz Reminder 📝',
  labFinal: 'Lab Final Reminder 📝',
};

/**
 * Builds notification content for an upcoming assessment reminder. `now` is
 * only used to word the distance from the event.
 */
export function buildAssessmentReminderContent(
  assessment: { type: AssessmentType; name: string; date: string },
  courseCode?: string,
  now: Date = new Date(),
): { title: string; body: string } {
  const title = REMINDER_TITLES[assessment.type] || 'Assessment Reminder 📝';
  const label = courseCode || assessment.name;
  const dateLabel = formatDateLabel(assessment.date);
  const when = distancePhrase(daysUntil(assessment.date, now), dateLabel);

  switch (assessment.type) {
    case 'ct':
      return {
        title,
        body: `${label} has a CT ${when}. Tap to view details.`,
      };
    case 'assignment':
      return {
        title,
        body: `${label} · "${assessment.name}" is due ${when}. Tap to view details.`,
      };
    case 'quiz':
      return {
        title,
        body: `${label} has a quiz ${when}. Tap to view details.`,
      };
    case 'labFinal':
      return {
        title,
        body: `${label} has a lab final ${when}. Tap to view details.`,
      };
    default:
      return {
        title: 'Assessment Reminder 📝',
        body: `${label} has an upcoming assessment ${when}. Tap to view details.`,
      };
  }
}
