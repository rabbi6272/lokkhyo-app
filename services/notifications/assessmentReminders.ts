import {
  ASSESSMENT_NOTIFICATION_PREFIX,
  cancelNotificationsByPrefix,
  ensureNotificationChannels,
  setGlobalNotificationHandler,
} from '@/services/notifications/notificationsCore';
import { fetchCourses } from '@/services/courses/courses.hooks';
import { fetchCourseAssessments } from '@/services/assessments/assessments.services';
import { fetchAllReminders } from '@/services/reminders/reminders.services';
import { getUpcomingAssessmentReminders } from '@/lib/reminders';
import { getNotificationPreferences } from '@/lib/notificationPreferences';
import type { Assessment, UpcomingReminder } from '@/lib/types';

type ReminderSource = 'assessment' | 'upcoming';
type ScheduledReminder = ReturnType<typeof getUpcomingAssessmentReminders>[number] & {
  source: ReminderSource;
};

/**
 * Fetches all courses, their graded assessments, and their standalone
 * upcoming reminders, then computes which ones still have a future trigger.
 */
export async function getUpcomingAssessmentRemindersForUser(userId: string) {
  const courses = await fetchCourses();
  const courseMap = new Map(courses.map((c) => [c.id, c.code]));

  const [assessmentLists, reminderLists] = await Promise.all([
    Promise.allSettled(
      courses.map((course) =>
        fetchCourseAssessments(course.id).then((assessments) =>
          assessments.map((a) => ({ ...a, courseId: course.id })),
        ),
      ),
    ),
    // One request for every course's reminders; kept settled-shaped so a
    // failure degrades to "no reminders" exactly like a failed course did.
    Promise.allSettled([fetchAllReminders()]),
  ]);

  const allAssessments = assessmentLists
    .filter((r): r is PromiseFulfilledResult<(Assessment & { courseId: string })[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  const allReminders = reminderLists
    .filter(
      (r): r is PromiseFulfilledResult<(UpcomingReminder & { courseId: string })[]> =>
        r.status === 'fulfilled',
    )
    .flatMap((r) => r.value);

  const { assessmentHour, assessmentMinute } = await getNotificationPreferences();
  const now = new Date();
  const fromAssessments = getUpcomingAssessmentReminders(allAssessments, now, assessmentHour, assessmentMinute);
  const fromReminders = getUpcomingAssessmentReminders(allReminders, now, assessmentHour, assessmentMinute);

  const upcoming: ScheduledReminder[] = [
    ...fromAssessments.map((r) => ({ ...r, source: 'assessment' as const })),
    ...fromReminders.map((r) => ({ ...r, source: 'upcoming' as const })),
  ];

  return { upcoming, courseMap };
}

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
