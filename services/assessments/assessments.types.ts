/** Wire types for assessments — mirror `lokkhyo-server/schemas/assessment.ts`. */

export type AssessmentTypeDto =
  | 'CT'
  | 'ASSIGNMENT'
  | 'QUIZ'
  | 'MIDTERM'
  | 'FINAL'
  | 'LAB'
  | 'PROJECT'
  | 'OTHER';

export interface AssessmentDto {
  id: string;
  courseId: string;
  type: AssessmentTypeDto;
  title: string;
  /** `YYYY-MM-DD`. */
  date: string;
  maxMarks: number;
  /** The component mark as recorded; null before it is known. */
  marksObtained: number | null;
  weight: number | null;
  teacherName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssessmentDto {
  courseId: string;
  type: AssessmentTypeDto;
  title: string;
  date: string;
  maxMarks: number;
  marksObtained?: number | null;
  weight?: number | null;
  teacherName?: string | null;
}

export type UpdateAssessmentDto = Partial<Omit<CreateAssessmentDto, 'courseId'>>;
