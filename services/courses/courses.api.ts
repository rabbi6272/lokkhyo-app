import { paginateAll, request } from '@/lib/api';

import type { CourseDto, CreateCourseDto, UpdateCourseDto } from './courses.types';

/** `GET /api/v1/courses` — every page; optionally one semester's. */
export function listCourses(semesterId?: string): Promise<CourseDto[]> {
  return paginateAll<CourseDto>({ path: '/courses', query: { semesterId } });
}

/** `POST /api/v1/courses` */
export async function createCourse(input: CreateCourseDto): Promise<CourseDto> {
  const { data } = await request<{ data: CourseDto }>({
    path: '/courses',
    method: 'POST',
    body: input,
  });
  return data;
}

/** `PATCH /api/v1/courses/:id` */
export async function updateCourse(id: string, input: UpdateCourseDto): Promise<CourseDto> {
  const { data } = await request<{ data: CourseDto }>({
    path: `/courses/${id}`,
    method: 'PATCH',
    body: input,
  });
  return data;
}

/**
 * `DELETE /api/v1/courses/:id`. Without `cascade` the server answers 409 with
 * a `CourseDependentsDto` while attendance, assessments, results, slots or
 * deadlines still reference the course.
 */
export async function deleteCourse(id: string, cascade = false): Promise<void> {
  await request<void>({
    path: `/courses/${id}`,
    method: 'DELETE',
    query: cascade ? { cascade: true } : undefined,
  });
}
