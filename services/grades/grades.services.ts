import {
  createAssessment,
  listCourseAssessments,
  updateAssessment,
} from '@/services/assessments/assessments.api';

import { createResult } from './grades.api';
import type { ClassificationDto, ResultWriteDto } from './grades.types';

export const CLASSIFICATION_LABELS: Record<ClassificationDto, string> = {
  FIRST_CLASS_WITH_HONORS: 'First Class with Honours',
  FIRST_CLASS: 'First Class',
  SECOND_CLASS: 'Second Class',
  FAIL: 'Not awarded',
  IN_PROGRESS: 'In progress',
};

/** A GPA for display: two decimals, or an em dash before anything is graded. */
export function formatGpa(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(2);
}

export interface FinalGradeInput {
  courseId: string;
  /** Marks out of `maxMarks` for the whole course. */
  marksObtained: number;
  maxMarks: number;
  /** One key per "save" tap, reused on retry — see `newIdempotencyKey`. */
  idempotencyKey: string;
}

/**
 * Record a course's final grade.
 *
 * The engine grades a result against an assessment, so the course's final is
 * a `FINAL` assessment that each attempt is graded against. It is created once
 * and reused — a regrade or a retried save must not leave a second one behind.
 * The server snapshots `maxMarks` onto each result, so moving it for a new
 * attempt does not restate an earlier one.
 *
 * Coursework (CTs, quizzes) is never sent here: the server counts one result
 * per course toward the GPA, and that result is the final grade.
 */
export async function recordFinalGrade(input: FinalGradeInput): Promise<ResultWriteDto> {
  const existing = (await listCourseAssessments(input.courseId)).find((a) => a.type === 'FINAL');

  let assessmentId: string;
  if (!existing) {
    assessmentId = (
      await createAssessment({
        courseId: input.courseId,
        type: 'FINAL',
        title: 'Final grade',
        date: new Date().toISOString().slice(0, 10),
        maxMarks: input.maxMarks,
      })
    ).id;
  } else {
    assessmentId = existing.id;
    if (existing.maxMarks !== input.maxMarks) {
      await updateAssessment(existing.id, { maxMarks: input.maxMarks });
    }
  }

  return createResult({ assessmentId, marksObtained: input.marksObtained }, input.idempotencyKey);
}
