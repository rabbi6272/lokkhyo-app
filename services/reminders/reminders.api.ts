import { paginateAll, request } from '@/lib/api';

import type { CreateDeadlineDto, DeadlineDto, DeadlineTypeDto, UpdateDeadlineDto } from './reminders.types';

/** `GET /api/v1/deadlines` — every page, past and future (`upcoming` defaults off). */
export function listDeadlines(type?: DeadlineTypeDto): Promise<DeadlineDto[]> {
  return paginateAll<DeadlineDto>({ path: '/deadlines', query: { type } });
}

/** `POST /api/v1/deadlines` */
export async function createDeadline(input: CreateDeadlineDto): Promise<DeadlineDto> {
  const { data } = await request<{ data: DeadlineDto }>({
    path: '/deadlines',
    method: 'POST',
    body: input,
  });
  return data;
}

/** `PATCH /api/v1/deadlines/:id` */
export async function updateDeadline(id: string, input: UpdateDeadlineDto): Promise<DeadlineDto> {
  const { data } = await request<{ data: DeadlineDto }>({
    path: `/deadlines/${id}`,
    method: 'PATCH',
    body: input,
  });
  return data;
}

/** `DELETE /api/v1/deadlines/:id` */
export async function deleteDeadline(id: string): Promise<void> {
  await request<void>({ path: `/deadlines/${id}`, method: 'DELETE' });
}
