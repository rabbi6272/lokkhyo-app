import { useMemo } from 'react';

import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/providers/auth-provider';
import { useRemindersQuery } from '@/services/reminders/reminders.hooks';
import type { UpcomingReminder } from '@/lib/types';

export type UpcomingReminderWithCourse = UpcomingReminder & {
  courseId: string;
  courseCode: string;
};

/**
 * All upcoming reminders across every course (for the Routine screen), sorted
 * by date ascending. Shares the reminders cache with the per-course views.
 */
export function useAllUpcomingReminders() {
  const { user } = useAuth();
  const { courses } = useCourses();
  const query = useRemindersQuery(user?.uid);

  const reminders = useMemo((): UpcomingReminderWithCourse[] => {
    const codes = new Map(courses.map((c) => [c.id, c.code]));
    return (query.data ?? [])
      .filter((r) => codes.has(r.courseId))
      .map((r) => ({ ...r, courseCode: codes.get(r.courseId) ?? '' }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [courses, query.data]);

  return {
    reminders,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
