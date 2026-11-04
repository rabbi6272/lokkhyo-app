import { paginateAll, request } from '@/lib/api';

import type { AttendanceDto, PutAttendanceDto } from './attendance.types';

/** `GET /api/v1/courses/:id/attendance` — every page. */
export function listCourseAttendance(courseId: string): Promise<AttendanceDto[]> {
  return paginateAll<AttendanceDto>({ path: `/courses/${courseId}/attendance` });
}

/**
 * `PUT /api/v1/courses/:id/attendance` — re-marking the same `(date, slotId)`
 * overwrites one record, so a retry is safe without an idempotency key.
 */
export async function putAttendance(courseId: string, input: PutAttendanceDto): Promise<AttendanceDto> {
  const { data } = await request<{ data: AttendanceDto }>({
    path: `/courses/${courseId}/attendance`,
    method: 'PUT',
    body: input,
  });
  return data;
}

/** `DELETE /api/v1/attendance/:id` */
export async function deleteAttendance(id: string): Promise<void> {
  await request<void>({ path: `/attendance/${id}`, method: 'DELETE' });
}
