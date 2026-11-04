import { useAuth } from '@/providers/auth-provider';
import { useCoursesQuery, useCreateCourse, useDeleteCourse } from '@/services/courses/courses.hooks';

/**
 * The screens' course API, unchanged in shape. It now adapts the
 * `services/courses` module (REST) instead of Firestore.
 */
export function useCourses() {
  const { user } = useAuth();
  const query = useCoursesQuery(user?.uid);

  return {
    courses: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createCourse: useCreateCourse(),
    deleteCourse: useDeleteCourse(),
  };
}
