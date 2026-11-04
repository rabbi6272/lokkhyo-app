import { paginateAll, request } from '@/lib/api';

import type { AssessmentDto, CreateAssessmentDto, UpdateAssessmentDto } from './assessments.types';

/** `GET /api/v1/assessments?courseId=` — every page of one course's assessments. */
export function listCourseAssessments(courseId: string): Promise<AssessmentDto[]> {
  return paginateAll<AssessmentDto>({ path: '/assessments', query: { courseId } });
}

/** `POST /api/v1/assessments` */
export async function createAssessment(input: CreateAssessmentDto): Promise<AssessmentDto> {
  const { data } = await request<{ data: AssessmentDto }>({
    path: '/assessments',
    method: 'POST',
    body: input,
  });
  return data;
}

/** `PATCH /api/v1/assessments/:id` */
export async function updateAssessment(id: string, input: UpdateAssessmentDto): Promise<AssessmentDto> {
  const { data } = await request<{ data: AssessmentDto }>({
    path: `/assessments/${id}`,
    method: 'PATCH',
    body: input,
  });
  return data;
}

/**
 * `DELETE /api/v1/assessments/:id`. A component mark has no results, so the
 * cascade only matters for an assessment that also carries a graded result.
 */
export async function deleteAssessment(id: string, cascade = false): Promise<void> {
  await request<void>({
    path: `/assessments/${id}`,
    method: 'DELETE',
    query: cascade ? { cascade: true } : undefined,
  });
}
