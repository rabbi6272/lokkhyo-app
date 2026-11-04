import { request } from '@/lib/api';

import type { RoutineSlotDto, RoutineSlotInputDto, ScheduledClassDto } from './routine.types';

/** `GET /api/v1/me/routine/week` — every slot of every course, joined to its course. */
export async function getWeekRoutine(): Promise<ScheduledClassDto[]> {
  const { data } = await request<{ data: ScheduledClassDto[] }>({ path: '/me/routine/week' });
  return data;
}

/** `GET /api/v1/courses/:id/routine` — one course's slot set. */
export async function getCourseRoutine(courseId: string): Promise<RoutineSlotDto[]> {
  const { data } = await request<{ data: RoutineSlotDto[] }>({
    path: `/courses/${courseId}/routine`,
  });
  return data;
}

/**
 * `PUT /api/v1/courses/:id/routine` — replace the course's whole slot set.
 * Slots sent with their `id` are kept (with their attendance); slots left out
 * are deleted.
 */
export async function replaceCourseRoutine(
  courseId: string,
  slots: RoutineSlotInputDto[],
): Promise<RoutineSlotDto[]> {
  const { data } = await request<{ data: RoutineSlotDto[] }>({
    path: `/courses/${courseId}/routine`,
    method: 'PUT',
    body: { slots },
  });
  return data;
}
