import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { syncAssessmentReminders } from '@/services/notifications/assessmentReminders';

import { createDeadline, deleteDeadline, updateDeadline } from './reminders.api';
import {
  fetchAllReminders,
  toCreateDeadlineInput,
  toUpdateDeadlineInput,
  type CourseReminder,
  type NewUpcomingReminder,
} from './reminders.services';

export const reminderKeys = {
  all: ['reminders'] as const,
  list: (userId?: string | null) => [...reminderKeys.all, 'list', userId ?? 'anonymous'] as const,
};

/**
 * All reminders, optionally narrowed with `select`. Every view shares the one
 * cached list, so the routine page and each course screen cost one request.
 */
export function useRemindersQuery<T = CourseReminder[]>(
  userId: string | null | undefined,
  select?: (reminders: CourseReminder[]) => T,
) {
  return useQuery({
    queryKey: reminderKeys.list(userId),
    queryFn: fetchAllReminders,
    enabled: !!userId,
    select,
  });
}

/**
 * Every write refreshes the reminders list, the Settings screen's scheduled
 * count, and the local notifications — as the Firestore version did.
 */
function useReminderWrite<TVars, TResult>(
  userId: string | null | undefined,
  write: (vars: TVars) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reminderKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['upcomingAssessmentReminders'] });
      if (userId) void syncAssessmentReminders(userId);
    },
  });
}

/** Resolves to the new reminder's id. */
export function useCreateReminder(userId: string | null | undefined, courseId: string) {
  return useReminderWrite(userId, async (data: NewUpcomingReminder) =>
    (await createDeadline(toCreateDeadlineInput(courseId, data))).id,
  );
}

export function useUpdateReminder(userId: string | null | undefined) {
  return useReminderWrite(userId, ({ id, data }: { id: string; data: Partial<NewUpcomingReminder> }) =>
    updateDeadline(id, toUpdateDeadlineInput(data)),
  );
}

export function useDeleteReminder(userId: string | null | undefined) {
  return useReminderWrite(userId, (reminderId: string) => deleteDeadline(reminderId));
}
