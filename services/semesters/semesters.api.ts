import { paginateAll, request } from '@/lib/api';

import type { CreateSemesterDto, SemesterDto, UpdateSemesterDto } from './semesters.types';

/** `GET /api/v1/semesters` — every page, as one array. */
export function listSemesters(): Promise<SemesterDto[]> {
  return paginateAll<SemesterDto>({ path: '/semesters' });
}

/** `POST /api/v1/semesters` — `endDate` is derived server-side from `totalWeeks`. */
export async function createSemester(input: CreateSemesterDto): Promise<SemesterDto> {
  const { data } = await request<{ data: SemesterDto }>({
    path: '/semesters',
    method: 'POST',
    body: input,
  });
  return data;
}

/** `PATCH /api/v1/semesters/:id` */
export async function updateSemester(id: string, input: UpdateSemesterDto): Promise<SemesterDto> {
  const { data } = await request<{ data: SemesterDto }>({
    path: `/semesters/${id}`,
    method: 'PATCH',
    body: input,
  });
  return data;
}

/**
 * `DELETE /api/v1/semesters/:id`. Without `cascade` the server refuses (409)
 * while courses still belong to the term.
 */
export async function deleteSemester(id: string, cascade = false): Promise<void> {
  await request<void>({
    path: `/semesters/${id}`,
    method: 'DELETE',
    query: cascade ? { cascade: true } : undefined,
  });
}

/**
 * `POST /api/v1/semesters/:id/activate` — archives the other terms and points
 * the profile's `currentSemesterId` here, atomically on the server.
 */
export async function activateSemester(id: string): Promise<SemesterDto> {
  const { data } = await request<{ data: SemesterDto }>({
    path: `/semesters/${id}/activate`,
    method: 'POST',
  });
  return data;
}
