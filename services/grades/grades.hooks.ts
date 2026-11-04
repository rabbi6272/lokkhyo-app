import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getCgpa,
  getDegreeStatus,
  getGradingScale,
  getSemesterGpa,
  getTranscript,
  listCourseResults,
} from './grades.api';
import { recordFinalGrade, type FinalGradeInput } from './grades.services';

/**
 * Everything the GPA engine computes hangs under one root, so a result write
 * refreshes CGPA, transcript and degree status together.
 */
export const gradeKeys = {
  all: ['grades'] as const,
  cgpa: (userId?: string | null) => [...gradeKeys.all, 'cgpa', userId ?? 'anonymous'] as const,
  semesterGpa: (userId: string | null | undefined, semesterId: string) =>
    [...gradeKeys.all, 'semesterGpa', userId ?? 'anonymous', semesterId] as const,
  degreeStatus: (userId?: string | null) => [...gradeKeys.all, 'degreeStatus', userId ?? 'anonymous'] as const,
  transcript: (userId?: string | null) => [...gradeKeys.all, 'transcript', userId ?? 'anonymous'] as const,
  courseResults: (userId: string | null | undefined, courseId: string) =>
    [...gradeKeys.all, 'courseResults', userId ?? 'anonymous', courseId] as const,
  /** Institutional policy, the same for every user. */
  scale: ['gradingScale'] as const,
};

export function useCgpa(userId?: string | null) {
  return useQuery({ queryKey: gradeKeys.cgpa(userId), queryFn: getCgpa, enabled: !!userId });
}

/**
 * The query object for one term's GPA, exposed as a factory so a list of terms
 * can fan out through `useQueries` instead of mounting one hook per row.
 */
export function semesterGpaQuery(userId: string | null | undefined, semesterId: string | null | undefined) {
  return {
    queryKey: gradeKeys.semesterGpa(userId, semesterId ?? ''),
    queryFn: () => getSemesterGpa(semesterId as string),
    enabled: !!userId && !!semesterId,
  };
}

export function useSemesterGpa(userId: string | null | undefined, semesterId: string | undefined) {
  return useQuery(semesterGpaQuery(userId, semesterId));
}

export function useDegreeStatus(userId?: string | null) {
  return useQuery({ queryKey: gradeKeys.degreeStatus(userId), queryFn: getDegreeStatus, enabled: !!userId });
}

export function useTranscript(userId?: string | null) {
  return useQuery({ queryKey: gradeKeys.transcript(userId), queryFn: getTranscript, enabled: !!userId });
}

/**
 * One course's official results, as a factory for the same reason: a course
 * list fans out with `useQueries` rather than a hook per card.
 */
export function courseResultsQuery(userId: string | null | undefined, courseId: string) {
  return {
    queryKey: gradeKeys.courseResults(userId, courseId),
    queryFn: () => listCourseResults(courseId),
    enabled: !!userId && !!courseId,
  };
}

export function useCourseResults(userId: string | null | undefined, courseId: string) {
  return useQuery(courseResultsQuery(userId, courseId));
}

export function useGradingScale() {
  return useQuery({ queryKey: gradeKeys.scale, queryFn: getGradingScale, staleTime: Infinity });
}

export function useRecordFinalGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FinalGradeInput) => recordFinalGrade(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gradeKeys.all }),
  });
}
