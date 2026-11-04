import type { Assessment, AssessmentType } from '@/lib/types';

import { listCourseAssessments } from './assessments.api';
import type { AssessmentDto, AssessmentTypeDto, CreateAssessmentDto, UpdateAssessmentDto } from './assessments.types';

const TO_SERVER: Record<AssessmentType, AssessmentTypeDto> = {
  ct: 'CT',
  quiz: 'QUIZ',
  assignment: 'ASSIGNMENT',
  labFinal: 'LAB',
};

/** Server-only types fold into the nearest app type; the app never writes them. */
const FROM_SERVER: Record<AssessmentTypeDto, AssessmentType> = {
  CT: 'ct',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
  LAB: 'labFinal',
  MIDTERM: 'ct',
  FINAL: 'labFinal',
  PROJECT: 'assignment',
  OTHER: 'assignment',
};

export function toServerAssessmentType(type: AssessmentType): AssessmentTypeDto {
  return TO_SERVER[type];
}

export function toAppAssessmentType(type: AssessmentTypeDto): AssessmentType {
  return FROM_SERVER[type];
}

export function toAssessment(dto: AssessmentDto): Assessment {
  return {
    id: dto.id,
    type: toAppAssessmentType(dto.type),
    name: dto.title,
    marksObtained: dto.marksObtained ?? 0,
    maxMarks: dto.maxMarks,
    weight: dto.weight ?? 0,
    date: dto.date,
    ...(dto.teacherName ? { teacherName: dto.teacherName } : {}),
    createdAt: dto.createdAt,
  };
}

export type NewAssessment = Omit<Assessment, 'id' | 'createdAt'>;

export function toCreateAssessmentInput(courseId: string, data: NewAssessment): CreateAssessmentDto {
  return {
    courseId,
    type: toServerAssessmentType(data.type),
    title: data.name.trim(),
    date: data.date,
    maxMarks: data.maxMarks,
    marksObtained: data.marksObtained,
    weight: Number.isFinite(data.weight) ? data.weight : null,
    teacherName: data.teacherName?.trim() || null,
  };
}

export function toUpdateAssessmentInput(data: Partial<NewAssessment>): UpdateAssessmentDto {
  const input: UpdateAssessmentDto = {};
  if (data.type !== undefined) input.type = toServerAssessmentType(data.type);
  if (data.name !== undefined) input.title = data.name.trim();
  if (data.date !== undefined) input.date = data.date;
  if (data.maxMarks !== undefined) input.maxMarks = data.maxMarks;
  if (data.marksObtained !== undefined) input.marksObtained = data.marksObtained;
  if (data.weight !== undefined) input.weight = Number.isFinite(data.weight) ? data.weight : null;
  if (data.teacherName !== undefined) input.teacherName = data.teacherName.trim() || null;
  return input;
}

/**
 * Coursework types — the ones the app records and the CT-progress view sums.
 * Others (a `FINAL` written by `recordFinalGrade`) belong to the GPA engine's
 * graded results and are kept out of the coursework list, so recording a final
 * grade can never move the CT-progress bar.
 */
const COURSEWORK_TYPES = new Set<AssessmentTypeDto>(['CT', 'QUIZ', 'ASSIGNMENT', 'LAB']);

/** Oldest first, the order the screens were built on (the server lists by date). */
export async function fetchCourseAssessments(courseId: string): Promise<Assessment[]> {
  return (await listCourseAssessments(courseId))
    .filter((dto) => COURSEWORK_TYPES.has(dto.type))
    .map(toAssessment)
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
}
