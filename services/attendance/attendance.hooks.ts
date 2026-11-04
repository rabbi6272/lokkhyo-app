import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AttendanceStatus } from '@/lib/types';

import { fetchCourseAttendance, markAttendance } from './attendance.services';

export const attendanceKeys = {
  all: ['attendance'] as const,
  byCourse: (userId: string | null | undefined, courseId: string) =>
    [...attendanceKeys.all, 'course', userId ?? 'anonymous', courseId] as const,
};

/** One `useQueries` entry per course — the cross-course hook fans these out. */
export function courseAttendanceQuery(userId: string | null | undefined, courseId: string) {
  return {
    queryKey: attendanceKeys.byCourse(userId, courseId),
    queryFn: () => fetchCourseAttendance(courseId),
    enabled: !!userId && !!courseId,
  };
}

export interface MarkAttendanceVars {
  courseId: string;
  date: string;
  slotId: string;
  status: AttendanceStatus;
}

export function useMarkAttendanceMutation(userId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, date, slotId, status }: MarkAttendanceVars) =>
      markAttendance(courseId, date, slotId, status),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: attendanceKeys.byCourse(userId, vars.courseId) }),
  });
}
