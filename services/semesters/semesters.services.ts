import type { Semester } from '@/lib/types';

import { createSemester, listSemesters } from './semesters.api';
import type { CreateSemesterDto, SemesterDto } from './semesters.types';

/** Weeks in a term when the server has none stored (a term created by dates only). */
const FALLBACK_WEEKS = 13;

/** Server `SemesterDto` → the app's `Semester`. */
export function toSemester(dto: SemesterDto): Semester {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.status === 'ACTIVE' ? 'active' : 'archived',
    targetGpa: dto.targetGpa ?? 0,
    startDate: dto.startDate,
    totalWeeks: dto.totalWeeks ?? weeksBetween(dto.startDate, dto.endDate),
    createdAt: dto.createdAt,
  };
}

/** The fields a semester form collects → `POST /semesters`. */
export type NewSemester = Pick<Semester, 'name' | 'targetGpa' | 'startDate' | 'totalWeeks'>;

/**
 * Sort weight for a term: the one the student is in first, then other live
 * terms, then the archive, and terms the course list does not recognise last.
 */
export function semesterRank(semester: Semester | undefined, currentSemesterId?: string): number {
  if (!semester) return 3;
  if (semester.id === currentSemesterId) return 0;
  return semester.status === 'active' ? 1 : 2;
}

/** Newest terms first within a band, so the list reads like a history. */
export function orderSemesters(semesters: Semester[], currentSemesterId?: string): Semester[] {
  return [...semesters].sort(
    (a, b) =>
      semesterRank(a, currentSemesterId) - semesterRank(b, currentSemesterId) ||
      b.startDate.localeCompare(a.startDate) ||
      a.id.localeCompare(b.id),
  );
}

export function toCreateSemesterInput(data: NewSemester): CreateSemesterDto {
  return {
    name: data.name.trim(),
    startDate: data.startDate,
    totalWeeks: data.totalWeeks,
    // 0 is how the forms say "no target"; the server's word for that is null.
    targetGpa: data.targetGpa > 0 ? data.targetGpa : null,
    status: 'ACTIVE',
  };
}

function weeksBetween(startDate: string, endDate: string): number {
  const days = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
  return Number.isFinite(days) && days > 0 ? Math.ceil(days / 7) : FALLBACK_WEEKS;
}

/** The first semester every new account starts with. */
const DEFAULT_SEMESTER = {
  name: 'Semester 1',
  targetGpa: 4,
  totalWeeks: 13,
} as const;

/**
 * Make sure a fresh account has one semester to put courses in. Idempotent, so
 * it is safe on both sign-up and sign-in: it only writes when the list is empty.
 */
export async function ensureDefaultSemester(): Promise<void> {
  const semesters = await listSemesters();
  if (semesters.length > 0) return;
  await createSemester(
    toCreateSemesterInput({
      ...DEFAULT_SEMESTER,
      startDate: new Date().toISOString().slice(0, 10),
    }),
  );
}
