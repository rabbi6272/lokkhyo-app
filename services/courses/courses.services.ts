import type { Course } from '@/lib/types';

import type { CourseDto, CreateCourseDto } from './courses.types';

/** Server `CourseDto` → the app's `Course`. Unset numbers read as 0, as before. */
export function toCourse(dto: CourseDto): Course {
  return {
    id: dto.id,
    semesterId: dto.semesterId,
    code: dto.code,
    title: dto.title,
    credits: dto.credits,
    passMarks: dto.passMarks ?? 0,
    ctWeight: dto.ctWeight ?? 0,
    isLab: dto.isLab,
    courseTeachers: dto.courseTeachers,
    createdAt: dto.createdAt,
  };
}

export type NewCourse = Omit<Course, 'id' | 'createdAt'>;

/** A finite number, or null — the server's schema is strict and rejects `NaN`. */
function numberOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function toCreateCourseInput(data: NewCourse): CreateCourseDto {
  return {
    semesterId: data.semesterId,
    code: data.code.trim(),
    title: data.title.trim(),
    credits: data.credits,
    passMarks: numberOrNull(data.passMarks),
    ctWeight: numberOrNull(data.ctWeight),
    isLab: data.isLab,
    courseTeachers: data.courseTeachers ?? [],
  };
}

/**
 * The server lists newest first; the screens were built on Firestore's
 * oldest-first `createdAt` order, so it is restored here.
 */
export function oldestFirst(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}
