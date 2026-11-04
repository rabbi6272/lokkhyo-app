import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { syncAssessmentReminders } from '@/services/notifications/assessmentReminders';

import { createAssessment, deleteAssessment, updateAssessment } from './assessments.api';
import {
  fetchCourseAssessments,
  toCreateAssessmentInput,
  toUpdateAssessmentInput,
  type NewAssessment,
} from './assessments.services';

export const assessmentKeys = {
  all: ['assessments'] as const,
  byCourse: (userId: string | null | undefined, courseId: string) =>
    [...assessmentKeys.all, 'course', userId ?? 'anonymous', courseId] as const,
};

/** One `useQueries` entry per course — the course list and dashboard fan these out. */
export function courseAssessmentsQuery(userId: string | null | undefined, courseId: string) {
  return {
    queryKey: assessmentKeys.byCourse(userId, courseId),
    queryFn: () => fetchCourseAssessments(courseId),
    enabled: !!userId && !!courseId,
  };
}

export function useCourseAssessmentsQuery(userId: string | null | undefined, courseId: string) {
  return useQuery(courseAssessmentsQuery(userId, courseId));
}

/**
 * Every write invalidates the course's list and re-syncs the local reminder
 * notifications, as the Firestore version did.
 */
function useAssessmentWrite<TVars, TResult>(
  userId: string | null | undefined,
  courseId: string,
  write: (vars: TVars) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.byCourse(userId, courseId) });
      if (userId) void syncAssessmentReminders(userId);
    },
  });
}

/** Resolves to the new assessment's id. */
export function useCreateAssessment(userId: string | null | undefined, courseId: string) {
  return useAssessmentWrite(userId, courseId, async (data: NewAssessment) =>
    (await createAssessment(toCreateAssessmentInput(courseId, data))).id,
  );
}

export function useUpdateAssessment(userId: string | null | undefined, courseId: string) {
  return useAssessmentWrite(userId, courseId, ({ id, data }: { id: string; data: Partial<NewAssessment> }) =>
    updateAssessment(id, toUpdateAssessmentInput(data)),
  );
}

export function useDeleteAssessment(userId: string | null | undefined, courseId: string) {
  return useAssessmentWrite(userId, courseId, (assessmentId: string) =>
    deleteAssessment(assessmentId, true),
  );
}
