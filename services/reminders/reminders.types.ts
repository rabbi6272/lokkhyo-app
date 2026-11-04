/** Wire types for deadlines — mirror `lokkhyo-server/schemas/deadline.ts`. */

import type { AssessmentTypeDto } from '@/services/assessments/assessments.types';

export type DeadlineTypeDto = 'ASSESSMENT' | 'REGISTRATION' | 'WITHDRAWAL' | 'EXAM' | 'OTHER';

export interface DeadlineDto {
  id: string;
  type: DeadlineTypeDto;
  courseId: string | null;
  assessmentId: string | null;
  assessmentType: AssessmentTypeDto | null;
  title: string;
  /** UTC instant. */
  dueAt: string;
  reminderLeadTimes: number[];
  remindersSent: { leadTimeHours: number; sentAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeadlineDto {
  type: DeadlineTypeDto;
  courseId: string | null;
  assessmentType: AssessmentTypeDto | null;
  title: string;
  dueAt: string;
}

export type UpdateDeadlineDto = Partial<Pick<CreateDeadlineDto, 'assessmentType' | 'title' | 'dueAt'>>;
