import { useAuth } from '@/providers/auth-provider';
import {
  useActivateSemester,
  useCreateSemester,
  useDeleteSemester,
  useSemestersQuery,
  useUpdateSemester,
} from '@/services/semesters/semesters.hooks';

/**
 * The screens' semester API, unchanged in shape. It now adapts the
 * `services/semesters` module (REST) instead of Firestore.
 */
export function useSemesters() {
  const { user } = useAuth();
  const query = useSemestersQuery(user?.uid);

  return {
    semesters: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createSemester: useCreateSemester(),
    updateSemester: useUpdateSemester(),
    deleteSemester: useDeleteSemester(),
    activateSemester: useActivateSemester(),
  };
}
