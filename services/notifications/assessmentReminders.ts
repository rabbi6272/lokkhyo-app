import {
  ASSESSMENT_NOTIFICATION_PREFIX,
  cancelNotificationsByPrefix,
  ensureNotificationChannels,
  setGlobalNotificationHandler,
} from '@/services/notifications/notificationsCore';

/**
 * Fetches upcoming assessments from the API and schedules reminders.
 * Idempotent: cancel all previous assessment reminders, then reschedule.
 */
export async function syncAssessmentReminders(_userId: string): Promise<void> {
  try {
    setGlobalNotificationHandler();
    await ensureNotificationChannels();

    // Android and iOS both receive server-side deadline reminders via Expo push (Phase 4).
    // Cancel any local scheduled assessment notifications to prevent duplicates.
    await cancelNotificationsByPrefix(ASSESSMENT_NOTIFICATION_PREFIX);
  } catch (e) {
    console.warn('[assessmentReminders] Sync failed:', e);
  }
}

/**
 * Cancels all assessment reminder notifications.
 */
export async function cancelAssessmentReminders(): Promise<void> {
  try {
    await cancelNotificationsByPrefix(ASSESSMENT_NOTIFICATION_PREFIX);
  } catch (e) {
    console.warn('[assessmentReminders] Cancel failed:', e);
  }
}

/**
 * Returns all currently scheduled assessment reminders (for dev/debug).
 */
export async function getScheduledAssessmentReminders() {
  try {
    const { getScheduledNotificationsByPrefix } = await import('@/services/notifications/notificationsCore');
    return getScheduledNotificationsByPrefix(ASSESSMENT_NOTIFICATION_PREFIX);
  } catch (e) {
    console.warn('[assessmentReminders] getScheduled failed:', e);
    return [];
  }
}
