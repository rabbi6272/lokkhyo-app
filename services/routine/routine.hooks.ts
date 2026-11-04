import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addRoutineSlot, fetchWeekRoutine, removeRoutineSlot, type NewRoutineSlot } from './routine.services';

export const routineKeys = {
  all: ['routine'] as const,
  week: (userId?: string | null) => [...routineKeys.all, 'week', userId ?? 'anonymous'] as const,
};

export function useWeekRoutineQuery(userId?: string | null) {
  return useQuery({
    queryKey: routineKeys.week(userId),
    queryFn: fetchWeekRoutine,
    enabled: !!userId,
  });
}

export function useAddRoutineSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewRoutineSlot) => addRoutineSlot(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routineKeys.all }),
  });
}

export function useRemoveRoutineSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => removeRoutineSlot(slotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routineKeys.all }),
  });
}
