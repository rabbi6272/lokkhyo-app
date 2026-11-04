import { useAuth } from '@/providers/auth-provider';
import {
  useCourseAssessmentsQuery,
  useCreateAssessment,
  useDeleteAssessment,
  useUpdateAssessment,
} from '@/services/assessments/assessments.hooks';

/**
 * The screens' assessment API, unchanged in shape. It now adapts the
 * `services/assessments` module (REST) instead of Firestore.
 */
export function useAssessments(courseId: string) {
  const { user } = useAuth();
  const query = useCourseAssessmentsQuery(user?.uid, courseId);

  return {
    assessments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createAssessment: useCreateAssessment(user?.uid, courseId),
    updateAssessment: useUpdateAssessment(user?.uid, courseId),
    deleteAssessment: useDeleteAssessment(user?.uid, courseId),
  };
}
