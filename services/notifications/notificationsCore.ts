import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const ROUTINE_CHANNEL_ID = 'daily-routine';
export const ROUTINE_CHANNEL_NAME = 'Daily Routine';

export const ASSESSMENT_CHANNEL_ID = 'assessment-reminders';
export const ASSESSMENT_CHANNEL_NAME = 'Assessment Reminders';

/**
 * Channel for notifications the *server* sends over FCM (evening attendance
 * digest, attendance-risk alerts). The id must match `SERVER_PUSH_CHANNEL` in
 * `lokkhyo-server/services/push.ts`.
 */
export const SERVER_PUSH_CHANNEL_ID = 'server-alerts';
export const SERVER_PUSH_CHANNEL_NAME = 'Attendance Alerts';

export const ROUTINE_NOTIFICATION_PREFIX = 'lokkhyo-routine.';
export const ASSESSMENT_NOTIFICATION_PREFIX = 'lokkhyo-assessment.';

export const NOTIFICATION_TYPE_DAILY_ROUTINE = 'daily-routine';
export const NOTIFICATION_TYPE_ASSESSMENT_REMINDER = 'assessment-reminder';
/** `data.type` of a server-sent push; `data.link` is the route to open. */
export const NOTIFICATION_TYPE_SERVER_PUSH = 'server-push';

let handlerInitialized = false;
let channelsEnsured = false;

/**
 * Sets the global foreground notification handler.
 * Safe to call multiple times (idempotent).
 */
export function setGlobalNotificationHandler(): void {
  if (handlerInitialized) return;
  handlerInitialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Ensures Android notification channels exist.
 * Safe to call multiple times (idempotent).
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (channelsEnsured) return;
  if (Platform.OS !== 'android') {
    channelsEnsured = true;
    return;
  }

  try {
    const routineChannel = await Notifications.getNotificationChannelAsync(ROUTINE_CHANNEL_ID);
    if (!routineChannel) {
      await Notifications.setNotificationChannelAsync(ROUTINE_CHANNEL_ID, {
        name: ROUTINE_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
      });
    }

    const assessmentChannel = await Notifications.getNotificationChannelAsync(ASSESSMENT_CHANNEL_ID);
    if (!assessmentChannel) {
      await Notifications.setNotificationChannelAsync(ASSESSMENT_CHANNEL_ID, {
        name: ASSESSMENT_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
      });
    }

    const serverChannel = await Notifications.getNotificationChannelAsync(SERVER_PUSH_CHANNEL_ID);
    if (!serverChannel) {
      await Notifications.setNotificationChannelAsync(SERVER_PUSH_CHANNEL_ID, {
        name: SERVER_PUSH_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
      });
    }

    channelsEnsured = true;
  } catch (e) {
    console.warn('[notifications] Failed to ensure channels:', e);
  }
}

/**
 * Requests notification permissions.
 * Prompts unless already granted, or unless the OS forbids re-asking
 * (permanently denied, or iOS denied).
 * Returns true if notifications are allowed.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') return true;

    if (Platform.OS === 'ios') {
      const iosStatus = (existingStatus as unknown as string);
      if (iosStatus === 'provisional') return true;
    }

    // Android 13+/targetSdk >= 33 reports 'denied' for the default-deny,
    // pre-prompt state too. Only bail when the OS forbids re-asking, or on
    // iOS (which never re-prompts after a denial).
    if (existingStatus === 'denied' && (Platform.OS === 'ios' || canAskAgain === false)) return false;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[notifications] Permission request failed:', e);
    return false;
  }
}

/**
 * Cancels all scheduled notifications whose identifier starts with the given prefix.
 * Never calls cancelAllScheduledNotificationsAsync.
 */
export async function cancelNotificationsByPrefix(prefix: string): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = all.filter((n) => n.identifier.startsWith(prefix));

    for (const n of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch (e) {
    console.warn(`[notifications] Failed to cancel notifications with prefix "${prefix}":`, e);
  }
}

/**
 * Returns all scheduled notifications whose identifier starts with the given prefix.
 */
export async function getScheduledNotificationsByPrefix(prefix: string) {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.filter((n) => n.identifier.startsWith(prefix));
  } catch (e) {
    console.warn(`[notifications] Failed to get scheduled notifications with prefix "${prefix}":`, e);
    return [];
  }
}

/**
 * Wraps an async operation so errors are caught and logged instead of thrown.
 */
export async function withSafePrefix<T>(prefix: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn(`[notifications] Operation failed for prefix "${prefix}":`, e);
    return null;
  }
}
