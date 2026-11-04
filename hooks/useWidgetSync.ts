import { useEffect, useMemo } from 'react';

import type { CourseAttendance } from '@/hooks/useAllCoursesAttendance';
import type { UpcomingReminderWithCourse } from '@/hooks/useAllUpcomingReminders';
import { useAuth } from '@/providers/auth-provider';
import { buildWidgetSnapshot } from '@/lib/widgetSnapshot';
import { useCgpa } from '@/services/grades/grades.hooks';
import { saveWidgetSnapshot } from '@/services/widgets/widgets.services';

/**
 * Writes the widget snapshot from the data Home has just rendered, so a widget
 * shows the same numbers. Waits for everything to load: a half-loaded screen must
 * not overwrite a good snapshot, and a failed CGPA read keeps the last one.
 */
export function useWidgetSync(
  courses: CourseAttendance[],
  reminders: UpcomingReminderWithCourse[],
  isLoading: boolean,
) {
  const { user } = useAuth();
  const { data: cgpa } = useCgpa(user?.uid);

  // Without the timestamp, so an unchanged sync does not redraw every widget.
  const content = useMemo(() => {
    if (!cgpa || isLoading) return null;
    const { updatedAt: _updatedAt, ...rest } = buildWidgetSnapshot({
      cgpa: cgpa.cgpa,
      courses,
      reminders,
      now: new Date(),
    });
    return JSON.stringify(rest);
  }, [cgpa, courses, reminders, isLoading]);

  useEffect(() => {
    if (!content) return;
    const snapshot = { ...JSON.parse(content), updatedAt: new Date().toISOString() };
    saveWidgetSnapshot(snapshot).catch((error: unknown) => console.warn('[widgets] Save failed:', error));
  }, [content]);
}
