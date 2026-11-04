import { paginateAll, request } from '@/lib/api';

import type {
  CgpaDto,
  CreateResultDto,
  DegreeStatusDto,
  GradingScaleDto,
  ResultDto,
  ResultWriteDto,
  SemesterGpaDto,
  TranscriptDto,
} from './grades.types';

async function getData<T>(path: string, query?: Record<string, string>): Promise<T> {
  const { data } = await request<{ data: T }>({ path, query });
  return data;
}

/** `GET /api/v1/me/cgpa` — the stored cumulative. */
export const getCgpa = () => getData<CgpaDto>('/me/cgpa');

/** `GET /api/v1/me/gpa?semesterId=` — one term's stored GPA. */
export const getSemesterGpa = (semesterId: string) =>
  getData<SemesterGpaDto>('/me/gpa', { semesterId });

/** `GET /api/v1/me/degree-status` */
export const getDegreeStatus = () => getData<DegreeStatusDto>('/me/degree-status');

/** `GET /api/v1/me/transcript` */
export const getTranscript = () => getData<TranscriptDto>('/me/transcript');

/** `GET /api/v1/grading-scale` — the band table the server grades with. */
export const getGradingScale = () => getData<GradingScaleDto>('/grading-scale');

/** `GET /api/v1/results?courseId=` — the course's counted attempts. */
export function listCourseResults(courseId: string): Promise<ResultDto[]> {
  return paginateAll<ResultDto>({ path: '/results', query: { courseId } });
}

/**
 * `POST /api/v1/results`. Appends an attempt and moves the CGPA, so it carries
 * an `Idempotency-Key`: the caller makes one per user intent and reuses it on
 * retry, and a replayed request returns the first response instead of a second
 * attempt.
 */
export async function createResult(input: CreateResultDto, idempotencyKey: string): Promise<ResultWriteDto> {
  const { data } = await request<{ data: ResultWriteDto }>({
    path: '/results',
    method: 'POST',
    body: input,
    idempotencyKey,
  });
  return data;
}

/** `PUT /api/v1/results/:id` — amend a mark; a retry converges, so no key. */
export async function updateResult(
  id: string,
  input: { marksObtained?: number; incomplete?: boolean },
): Promise<ResultWriteDto> {
  const { data } = await request<{ data: ResultWriteDto }>({
    path: `/results/${id}`,
    method: 'PUT',
    body: input,
  });
  return data;
}

/** `DELETE /api/v1/results/:id` — the previous attempt is promoted back. */
export async function deleteResult(id: string): Promise<void> {
  await request<void>({ path: `/results/${id}`, method: 'DELETE' });
}
