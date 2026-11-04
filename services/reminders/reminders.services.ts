import type { UpcomingReminder } from '@/lib/types';
import { toAppAssessmentType, toServerAssessmentType } from '@/services/assessments/assessments.services';

import { listDeadlines } from './reminders.api';
import type { CreateDeadlineDto, DeadlineDto, UpdateDeadlineDto } from './reminders.types';

/**
 * An app "upcoming reminder" is a server deadline of type `ASSESSMENT`: a
 * dated, mark-less event for one course. The app's calendar `date` is stored as
 * that day's UTC midnight and read back by its date part, so it round-trips
 * exactly whatever the device's timezone.
 */
export type CourseReminder = UpcomingReminder & { courseId: string };

function toDueAt(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function toCourseReminder(dto: DeadlineDto): CourseReminder | null {
  if (!dto.courseId) return null;
  return {
    id: dto.id,
    courseId: dto.courseId,
    type: dto.assessmentType ? toAppAssessmentType(dto.assessmentType) : 'ct',
    name: dto.title,
    date: dto.dueAt.slice(0, 10),
    createdAt: dto.createdAt,
  };
}

export type NewUpcomingReminder = Omit<UpcomingReminder, 'id' | 'createdAt'>;

export function toCreateDeadlineInput(courseId: string, data: NewUpcomingReminder): CreateDeadlineDto {
  return {
    type: 'ASSESSMENT',
    courseId,
    assessmentType: toServerAssessmentType(data.type),
    title: data.name.trim(),
    dueAt: toDueAt(data.date),
  };
}

export function toUpdateDeadlineInput(data: Partial<NewUpcomingReminder>): UpdateDeadlineDto {
  const input: UpdateDeadlineDto = {};
  if (data.type !== undefined) input.assessmentType = toServerAssessmentType(data.type);
  if (data.name !== undefined) input.title = data.name.trim();
  if (data.date !== undefined) input.dueAt = toDueAt(data.date);
  return input;
}

/**
 * Every course's reminders in one request, oldest-created first (the order the
 * per-course lists were built on). Per-course views filter this one list.
 */
export async function fetchAllReminders(): Promise<CourseReminder[]> {
  return (await listDeadlines('ASSESSMENT'))
    .map(toCourseReminder)
    .filter((reminder): reminder is CourseReminder => reminder !== null)
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}
