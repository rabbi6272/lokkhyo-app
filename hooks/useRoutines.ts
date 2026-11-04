import { useAuth } from '@/providers/auth-provider';
import {
  useAddRoutineSlot,
  useRemoveRoutineSlot,
  useWeekRoutineQuery,
} from '@/services/routine/routine.hooks';

/**
 * The screens' routine API, unchanged in shape. It now adapts the
 * `services/routine` module (REST) instead of Firestore.
 */
export function useRoutines() {
  const { user } = useAuth();
  const query = useWeekRoutineQuery(user?.uid);

  return {
    slots: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createRoutineSlot: useAddRoutineSlot(),
    deleteRoutineSlot: useRemoveRoutineSlot(),
  };
}
