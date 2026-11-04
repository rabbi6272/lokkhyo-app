import { useCallback } from 'react';

import type { UpcomingReminder } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import {
  useCreateReminder,
  useDeleteReminder,
  useRemindersQuery,
  useUpdateReminder,
} from '@/services/reminders/reminders.hooks';
import type { CourseReminder } from '@/services/reminders/reminders.services';

/**
 * One course's upcoming reminders — the screens' API, unchanged in shape. It
 * now adapts the `services/reminders` module (`/deadlines`) instead of Firestore.
 */
export function useUpcomingReminders(courseId: string) {
  const { user } = useAuth();
  const select = useCallback(
    (all: CourseReminder[]): UpcomingReminder[] =>
      all.filter((r) => r.courseId === courseId).map(({ courseId: _courseId, ...reminder }) => reminder),
    [courseId],
  );
  const query = useRemindersQuery(courseId ? user?.uid : null, select);

  return {
    reminders: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createReminder: useCreateReminder(user?.uid, courseId),
    updateReminder: useUpdateReminder(user?.uid),
    deleteReminder: useDeleteReminder(user?.uid),
  };
}

/**
 * Course-agnostic delete (for the Routine screen, where reminders from every
 * course are listed together). Keeps the `{ courseId, reminderId }` argument
 * the screen passes; a deadline id alone identifies it on the server.
 */
export function useDeleteUpcomingReminder() {
  const { user } = useAuth();
  const remove = useDeleteReminder(user?.uid);
  return {
    ...remove,
    mutate: ({ reminderId }: { courseId: string; reminderId: string }) => remove.mutate(reminderId),
    mutateAsync: ({ reminderId }: { courseId: string; reminderId: string }) =>
      remove.mutateAsync(reminderId),
  };
}
