import AsyncStorage from '@react-native-async-storage/async-storage';

import { getNotificationPrefs, updateNotificationPrefs } from '@/services/notification-prefs/notification-prefs.api';
import {
  toAppPrefs,
  toPrefsPatch,
  type AppNotificationPrefs,
} from '@/services/notification-prefs/notification-prefs.services';

/**
 * Notification preferences: the server (`/me/notification-prefs`) is the
 * source of truth, so they follow the student across devices; AsyncStorage is
 * the offline cache. Scheduling runs outside React and must work offline, so
 * every read falls back to the cache and every write lands in the cache first.
 */

const DAILY_ROUTINE_KEY = 'lokkhyo.pref.dailyRoutineNotifications';
const ASSESSMENT_REMINDERS_KEY = 'lokkhyo.pref.assessmentReminderNotifications';
const ATTENDANCE_DIGEST_KEY = 'lokkhyo.pref.attendanceDigestNotifications';
const ATTENDANCE_RISK_KEY = 'lokkhyo.pref.attendanceRiskNotifications';

const MORNING_HOUR_KEY = 'lokkhyo.pref.morningHour';
const MORNING_MINUTE_KEY = 'lokkhyo.pref.morningMinute';
const EVENING_HOUR_KEY = 'lokkhyo.pref.eveningHour';
const EVENING_MINUTE_KEY = 'lokkhyo.pref.eveningMinute';
const ASSESSMENT_HOUR_KEY = 'lokkhyo.pref.assessmentHour';
const ASSESSMENT_MINUTE_KEY = 'lokkhyo.pref.assessmentMinute';

/**
 * Defaults mirror the server's, so a first launch that never reaches the API
 * agrees with what the API would have said.
 */
export const DEFAULT_MORNING_HOUR = 7;
export const DEFAULT_MORNING_MINUTE = 0;
export const DEFAULT_EVENING_HOUR = 20;
export const DEFAULT_EVENING_MINUTE = 0;
export const DEFAULT_ASSESSMENT_HOUR = 7;
export const DEFAULT_ASSESSMENT_MINUTE = 0;

export type NotificationPreferences = AppNotificationPrefs;

async function readBoolPref(key: string, fallback: boolean): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored === null) return fallback;
    return stored === 'true';
  } catch {
    return fallback;
  }
}

async function readNumberPref(key: string, fallback: number): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function readCache(): Promise<NotificationPreferences> {
  const [
    dailyRoutineEnabled,
    attendanceDigestEnabled,
    attendanceRiskEnabled,
    assessmentRemindersEnabled,
    morningHour,
    morningMinute,
    eveningHour,
    eveningMinute,
    assessmentHour,
    assessmentMinute,
  ] = await Promise.all([
    readBoolPref(DAILY_ROUTINE_KEY, true),
    readBoolPref(ATTENDANCE_DIGEST_KEY, true),
    readBoolPref(ATTENDANCE_RISK_KEY, true),
    readBoolPref(ASSESSMENT_REMINDERS_KEY, true),
    readNumberPref(MORNING_HOUR_KEY, DEFAULT_MORNING_HOUR),
    readNumberPref(MORNING_MINUTE_KEY, DEFAULT_MORNING_MINUTE),
    readNumberPref(EVENING_HOUR_KEY, DEFAULT_EVENING_HOUR),
    readNumberPref(EVENING_MINUTE_KEY, DEFAULT_EVENING_MINUTE),
    readNumberPref(ASSESSMENT_HOUR_KEY, DEFAULT_ASSESSMENT_HOUR),
    readNumberPref(ASSESSMENT_MINUTE_KEY, DEFAULT_ASSESSMENT_MINUTE),
  ]);
  return {
    dailyRoutineEnabled,
    attendanceDigestEnabled,
    attendanceRiskEnabled,
    assessmentRemindersEnabled,
    morningHour,
    morningMinute,
    eveningHour,
    eveningMinute,
    assessmentHour,
    assessmentMinute,
  };
}

async function writeCache(prefs: Partial<NotificationPreferences>): Promise<void> {
  const entries: [string, string][] = [];
  const bools: [string, boolean | undefined][] = [
    [DAILY_ROUTINE_KEY, prefs.dailyRoutineEnabled],
    [ATTENDANCE_DIGEST_KEY, prefs.attendanceDigestEnabled],
    [ATTENDANCE_RISK_KEY, prefs.attendanceRiskEnabled],
    [ASSESSMENT_REMINDERS_KEY, prefs.assessmentRemindersEnabled],
  ];
  for (const [key, value] of bools) {
    if (value !== undefined) entries.push([key, String(value)]);
  }

  const numbers: [string, number | undefined][] = [
    [MORNING_HOUR_KEY, prefs.morningHour],
    [MORNING_MINUTE_KEY, prefs.morningMinute],
    [EVENING_HOUR_KEY, prefs.eveningHour],
    [EVENING_MINUTE_KEY, prefs.eveningMinute],
    [ASSESSMENT_HOUR_KEY, prefs.assessmentHour],
    [ASSESSMENT_MINUTE_KEY, prefs.assessmentMinute],
  ];
  for (const [key, value] of numbers) {
    if (value !== undefined) entries.push([key, String(value)]);
  }

  try {
    await AsyncStorage.multiSet(entries);
  } catch {
    // The cache is best-effort; the server copy is authoritative.
  }
}

/** Server first (refreshing the cache); the cache when offline or signed out. */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const prefs = toAppPrefs(await getNotificationPrefs());
    await writeCache(prefs);
    return prefs;
  } catch {
    return readCache();
  }
}

/** The one shared query entry, so every screen reading prefs costs one request per stale window. */
export function notificationPrefsQuery(userId?: string | null) {
  return {
    queryKey: ['notificationPrefs', userId ?? 'anonymous'] as const,
    queryFn: getNotificationPreferences,
  };
}

/**
 * Cache first, so the scheduling that follows a toggle sees it immediately;
 * then the server. A failed server write is not fatal — the device keeps the
 * choice until the next successful read, which takes the server's value.
 */
async function savePreferences(patch: Partial<NotificationPreferences>): Promise<void> {
  await writeCache(patch);
  try {
    await updateNotificationPrefs(toPrefsPatch(patch));
  } catch (error) {
    console.warn('[notificationPreferences] Server save failed, kept locally:', error);
  }
}

export async function setDailyRoutineEnabled(enabled: boolean): Promise<void> {
  await savePreferences({ dailyRoutineEnabled: enabled });
}

export async function setAttendanceDigestEnabled(enabled: boolean): Promise<void> {
  await savePreferences({ attendanceDigestEnabled: enabled });
}

export async function setAttendanceRiskEnabled(enabled: boolean): Promise<void> {
  await savePreferences({ attendanceRiskEnabled: enabled });
}

export async function setAssessmentRemindersEnabled(enabled: boolean): Promise<void> {
  await savePreferences({ assessmentRemindersEnabled: enabled });
}

export async function setMorningTime(hour: number, minute: number): Promise<void> {
  await savePreferences({ morningHour: hour, morningMinute: minute });
}

export async function setEveningTime(hour: number, minute: number): Promise<void> {
  await savePreferences({ eveningHour: hour, eveningMinute: minute });
}

export async function setAssessmentReminderTime(hour: number, minute: number): Promise<void> {
  await savePreferences({ assessmentHour: hour, assessmentMinute: minute });
}
