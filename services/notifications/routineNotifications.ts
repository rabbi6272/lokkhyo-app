import {
  cancelNotificationsByPrefix,
  ensureNotificationChannels,
  ROUTINE_NOTIFICATION_PREFIX,
  setGlobalNotificationHandler,
} from '@/services/notifications/notificationsCore';

/**
 * Android and iOS receive the morning routine as a server push via Expo Push
 * (Phase 4), built from the timetable as it stands that morning and controlled
 * by notification preferences. Scheduling it locally too would notify twice, so
 * any local schedules are cleared without triggering redundant network calls.
 */
export async function syncRoutineNotifications(_userId: string): Promise<void> {
  try {
    setGlobalNotificationHandler();
    await ensureNotificationChannels();
    await cancelNotificationsByPrefix(ROUTINE_NOTIFICATION_PREFIX);
  } catch (e) {
    console.warn('[routineNotifications] Sync failed:', e);
  }
}

/**
 * Cancels all daily routine notifications.
 */
export async function cancelRoutineNotifications(): Promise<void> {
  try {
    await cancelNotificationsByPrefix(ROUTINE_NOTIFICATION_PREFIX);
  } catch (e) {
    console.warn('[routineNotifications] Cancel failed:', e);
  }
}

/**
 * Returns all currently scheduled daily routine notifications (for dev/debug).
 */
export async function getScheduledRoutineNotifications() {
  try {
    const { getScheduledNotificationsByPrefix } = await import('@/services/notifications/notificationsCore');
    return getScheduledNotificationsByPrefix(ROUTINE_NOTIFICATION_PREFIX);
  } catch (e) {
    console.warn('[routineNotifications] getScheduled failed:', e);
    return [];
  }
}
