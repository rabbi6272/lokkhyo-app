import { useMemo } from 'react';

import { useAllUpcomingReminders } from '@/hooks/useAllUpcomingReminders';
import { useCourses } from '@/hooks/useCourses';
import { useRoutines } from '@/hooks/useRoutines';
import { useProfile } from '@/hooks/useUserProfile';

/**
 * The active semester's slice of the student's data: the courses in the
 * profile's `currentSemesterId`, and only the routine slots and reminders that
 * belong to those courses. Home, Routine and Attendance show just this term.
 */
export function useActiveSemester() {
  const { profileData } = useProfile();
  const { courses: allCourses, isLoading: isCoursesLoading } = useCourses();
  const { slots: allSlots, isLoading: isSlotsLoading, deleteRoutineSlot } = useRoutines();
  const { reminders: allReminders, isLoading: isRemindersLoading } = useAllUpcomingReminders();

  const currentSemesterId = profileData?.currentSemesterId;
  const courses = useMemo(
    () => allCourses.filter((c) => c.semesterId === currentSemesterId),
    [allCourses, currentSemesterId],
  );
  const courseIds = useMemo(() => new Set(courses.map((c) => c.id)), [courses]);
  const slots = useMemo(() => allSlots.filter((s) => courseIds.has(s.courseId)), [allSlots, courseIds]);
  const reminders = useMemo(
    () => allReminders.filter((r) => courseIds.has(r.courseId)),
    [allReminders, courseIds],
  );

  return {
    currentSemesterId,
    courses,
    slots,
    reminders,
    isCoursesLoading,
    isSlotsLoading,
    isRemindersLoading,
    deleteRoutineSlot,
  };
}
