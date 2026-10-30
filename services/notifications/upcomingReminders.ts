import type { QueryClient } from '@tanstack/react-query';

import { courseAssessmentsQuery } from '@/services/assessments/assessments.hooks';
import { courseKeys, fetchCourses } from '@/services/courses/courses.hooks';
import { reminderKeys } from '@/services/reminders/reminders.hooks';
import { fetchAllReminders } from '@/services/reminders/reminders.services';
import { getUpcomingAssessmentReminders } from '@/lib/reminders';
import { notificationPrefsQuery } from '@/lib/notificationPreferences';
import type { Assessment, UpcomingReminder } from '@/lib/types';

type ReminderSource = 'assessment' | 'upcoming';
type ScheduledReminder = ReturnType<typeof getUpcomingAssessmentReminders>[number] & {
  source: ReminderSource;
};

/**
 * All courses, their graded assessments, and their standalone upcoming
 * reminders, narrowed to the ones that still have a future trigger.
 *
 * Reads through the query cache the screens already filled, so opening
 * Settings costs no requests when that data is cached.
 */
export async function getUpcomingAssessmentRemindersForUser(queryClient: QueryClient, userId: string) {
  const courses = await queryClient.ensureQueryData({ queryKey: courseKeys.list(userId), queryFn: fetchCourses });
  const courseMap = new Map(courses.map((c) => [c.id, c.code]));

  const [assessmentLists, reminderLists] = await Promise.all([
    Promise.allSettled(
      courses.map((course) =>
        queryClient.ensureQueryData(courseAssessmentsQuery(userId, course.id)).then((assessments) =>
          assessments.map((a) => ({ ...a, courseId: course.id })),
        ),
      ),
    ),
    // One request for every course's reminders; kept settled-shaped so a
    // failure degrades to "no reminders" exactly like a failed course did.
    Promise.allSettled([
      queryClient.ensureQueryData({ queryKey: reminderKeys.list(userId), queryFn: fetchAllReminders }),
    ]),
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

  const { assessmentHour, assessmentMinute } = await queryClient.ensureQueryData(notificationPrefsQuery(userId));
  const now = new Date();
  const fromAssessments = getUpcomingAssessmentReminders(allAssessments, now, assessmentHour, assessmentMinute);
  const fromReminders = getUpcomingAssessmentReminders(allReminders, now, assessmentHour, assessmentMinute);

  const upcoming: ScheduledReminder[] = [
    ...fromAssessments.map((r) => ({ ...r, source: 'assessment' as const })),
    ...fromReminders.map((r) => ({ ...r, source: 'upcoming' as const })),
  ];

  return { upcoming, courseMap };
}
