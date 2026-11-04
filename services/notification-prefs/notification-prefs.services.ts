import type { NotificationPrefsDto, UpdateNotificationPrefsDto } from './notification-prefs.types';

/**
 * The app's toggles and times, as the server stores them.
 *
 * Each reminder type has its own clock: the daily routine notification is the
 * `ROUTINE` category at `morningRoutineTime`, assessment reminders are
 * `DEADLINE` at `assessmentReminderTime`, and the attendance digest
 * (`ATTENDANCE`) plus its risk alerts (`ATTENDANCE_RISK`) share
 * `eveningAttendanceTime` — the server gates both on that one time, so they
 * take one row rather than pretending to be independent.
 */
export interface AppNotificationPrefs {
  dailyRoutineEnabled: boolean;
  attendanceDigestEnabled: boolean;
  attendanceRiskEnabled: boolean;
  assessmentRemindersEnabled: boolean;
  morningHour: number;
  morningMinute: number;
  eveningHour: number;
  eveningMinute: number;
  assessmentHour: number;
  assessmentMinute: number;
}

/** Splits the wire `HH:mm` into clock parts, falling back on malformed input. */
function splitTime(value: string | undefined, fallbackHour: number, fallbackMinute: number): [number, number] {
  const [hour, minute] = (value ?? '').split(':').map(Number);
  return [
    Number.isInteger(hour) ? hour : fallbackHour,
    Number.isInteger(minute) ? minute : fallbackMinute,
  ];
}

export function toAppPrefs(dto: NotificationPrefsDto): AppNotificationPrefs {
  // `assessmentReminderTime` is absent when the app is talking to a server
  // that predates the field, which is expected for one release. The fallback
  // keeps it on the same clock as before instead of crashing the Settings
  // screen; the update input rejects the new key against that old server, and
  // `savePreferences` already treats a failed server write as non-fatal.
  const [morningHour, morningMinute] = splitTime(dto.morningRoutineTime, 7, 0);
  const [eveningHour, eveningMinute] = splitTime(dto.eveningAttendanceTime, 20, 0);
  const [assessmentHour, assessmentMinute] = splitTime(dto.assessmentReminderTime, 7, 0);

  return {
    dailyRoutineEnabled: dto.categoriesEnabled.ROUTINE,
    attendanceDigestEnabled: dto.categoriesEnabled.ATTENDANCE,
    attendanceRiskEnabled: dto.categoriesEnabled.ATTENDANCE_RISK,
    assessmentRemindersEnabled: dto.categoriesEnabled.DEADLINE,
    morningHour,
    morningMinute,
    eveningHour,
    eveningMinute,
    assessmentHour,
    assessmentMinute,
  };
}

const pad = (value: number) => String(value).padStart(2, '0');

const toHHMM = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;

export function toPrefsPatch(patch: Partial<AppNotificationPrefs>): UpdateNotificationPrefsDto {
  const input: UpdateNotificationPrefsDto = {};
  const categories: UpdateNotificationPrefsDto['categoriesEnabled'] = {};
  if (patch.dailyRoutineEnabled !== undefined) categories.ROUTINE = patch.dailyRoutineEnabled;
  if (patch.attendanceDigestEnabled !== undefined) categories.ATTENDANCE = patch.attendanceDigestEnabled;
  if (patch.attendanceRiskEnabled !== undefined) categories.ATTENDANCE_RISK = patch.attendanceRiskEnabled;
  if (patch.assessmentRemindersEnabled !== undefined) categories.DEADLINE = patch.assessmentRemindersEnabled;
  // Per key, and only when both halves are present: a toggle must never be
  // written as a half-formed time.
  if (Object.keys(categories).length > 0) input.categoriesEnabled = categories;

  if (patch.morningHour !== undefined && patch.morningMinute !== undefined) {
    input.morningRoutineTime = toHHMM(patch.morningHour, patch.morningMinute);
  }
  if (patch.eveningHour !== undefined && patch.eveningMinute !== undefined) {
    input.eveningAttendanceTime = toHHMM(patch.eveningHour, patch.eveningMinute);
  }
  if (patch.assessmentHour !== undefined && patch.assessmentMinute !== undefined) {
    input.assessmentReminderTime = toHHMM(patch.assessmentHour, patch.assessmentMinute);
  }
  return input;
}
