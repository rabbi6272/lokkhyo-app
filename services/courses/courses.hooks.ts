import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createCourse, deleteCourse, listCourses } from './courses.api';
import { oldestFirst, toCourse, toCreateCourseInput, type NewCourse } from './courses.services';

export const courseKeys = {
  all: ['courses'] as const,
  list: (userId?: string | null) => [...courseKeys.all, 'list', userId ?? 'anonymous'] as const,
};

export async function fetchCourses() {
  return oldestFirst((await listCourses()).map(toCourse));
}

export function useCoursesQuery(userId?: string | null) {
  return useQuery({
    queryKey: courseKeys.list(userId),
    queryFn: fetchCourses,
    enabled: !!userId,
  });
}

/** Resolves to the new course's id. */
export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewCourse) => (await createCourse(toCreateCourseInput(data))).id,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

/**
 * Deletes the course with everything filed under it. The server refuses a
 * plain delete while children exist; callers that want to show the counts first
 * can call `deleteCourse(id)` and read the 409's `details`.
 */
export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId, true),
    onSuccess: () => {
      // Children of the course live in other features' caches.
      void queryClient.invalidateQueries();
    },
  });
}
