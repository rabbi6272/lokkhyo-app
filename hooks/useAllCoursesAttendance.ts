import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import { useCourses } from '@/hooks/useCourses';
import { useRoutines } from '@/hooks/useRoutines';
import { useSemesters } from '@/hooks/useSemesters';
import {
  courseAttendanceQuery,
  useMarkAttendanceMutation,
} from '@/services/attendance/attendance.hooks';
import {
  computeAttendanceStats,
  generateSessionOccurrences,
  mergeSessionsWithRecords,
  type AttendanceSession,
  type AttendanceStats,
} from '@/lib/attendance';
import type { Course } from '@/lib/types';

export interface CourseAttendance {
  course: Course;
  sessions: AttendanceSession[];
  stats: AttendanceStats;
}

export interface DaySession {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  session: AttendanceSession;
}

/**
 * Loads and computes attendance across courses: per-course
 * stats, a date-indexed map of sessions (for a unified
 * calendar), and an aggregate percent/at-risk count.
 *
 * Pass `targetCourses` to limit attendance queries to only the displayed
 * courses (e.g. on Dashboard or a single Course screen), preventing massive
 * parallel network fan-out on cold start.
 */
export function useAllCoursesAttendance(targetCourses?: Course[]) {
  const { user } = useAuth();
  const { courses: allCourses } = useCourses();
  const { slots } = useRoutines();
  const { semesters } = useSemesters();

  const courses = targetCourses ?? allCourses;

  const attendanceQueries = useQueries({
    queries: courses.map((course) => courseAttendanceQuery(user?.uid, course.id)),
  });

  const isLoading = attendanceQueries.some((q) => q.isLoading);

  const courseAttendance: CourseAttendance[] = useMemo(() => {
    return courses.map((course, index) => {
      const semester = semesters.find((s) => s.id === course.semesterId);
      const courseSlots = slots.filter((s) => s.courseId === course.id);
      const records = attendanceQueries[index]?.data ?? [];
      const occurrences = semester?.startDate && semester.totalWeeks
        ? generateSessionOccurrences(courseSlots, semester.startDate, semester.totalWeeks)
        : [];
      const sessions = mergeSessionsWithRecords(occurrences, records);
      const stats = computeAttendanceStats(sessions);
      return { course, sessions, stats };
    });
  }, [courses, semesters, slots, attendanceQueries]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, DaySession[]>();
    courseAttendance.forEach(({ course, sessions }) => {
      sessions.forEach((session) => {
        const list = map.get(session.date) ?? [];
        list.push({ courseId: course.id, courseCode: course.code, courseTitle: course.title, session });
        map.set(session.date, list);
      });
    });
    return map;
  }, [courseAttendance]);

  const overall = useMemo(() => {
    const totals = courseAttendance.reduce(
      (acc, c) => {
        acc.present += c.stats.present;
        acc.absent += c.stats.absent;
        return acc;
      },
      { present: 0, absent: 0 },
    );
    const held = totals.present + totals.absent;
    const percent = held > 0 ? Math.round((totals.present / held) * 100) : 0;
    const atRiskCount = courseAttendance.filter((c) => c.stats.held > 0 && !c.stats.eligible).length;
    return { percent, held, atRiskCount };
  }, [courseAttendance]);

  return { courseAttendance, sessionsByDate, overall, isLoading };
}

/**
 * Sets an attendance status for a single session on any course, invalidating
 * that course's cached attendance so every screen reading it stays in sync.
 */
export function useMarkAttendance() {
  const { user } = useAuth();
  return useMarkAttendanceMutation(user?.uid);
}
