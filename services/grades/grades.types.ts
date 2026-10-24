/**
 * Wire types for the GPA engine — mirror `lokkhyo-server/schemas/{grade,result}.ts`.
 * Grades are server-authoritative: the app displays these, it never derives them.
 */

export type LetterGradeDto = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F' | 'I';
export type ResultStatusDto = 'PASSED' | 'BACKLOG' | 'INCOMPLETE';
export type ClassificationDto =
  | 'FIRST_CLASS_WITH_HONORS'
  | 'FIRST_CLASS'
  | 'SECOND_CLASS'
  | 'FAIL'
  | 'IN_PROGRESS';

/** `GET /me/cgpa` */
export interface CgpaDto {
  cgpa: number | null;
  totalCredits: number;
  totalWeightedPoints: number;
  coursesCounted: number;
}

/** `GET /me/gpa?semesterId=` */
export interface SemesterGpaDto {
  semesterId: string;
  gpa: number | null;
}

/** `GET /me/degree-status` */
export interface DegreeStatusDto {
  cgpa: number | null;
  degreeCgpaThreshold: number;
  classification: ClassificationDto;
  isDegreeEligible: boolean;
  totalCreditsEarned: number;
  totalCreditsAttempted: number;
  backlogCount: number;
  incompleteCount: number;
  improvementCandidates: { courseId: string; courseCode: string }[];
}

export interface TranscriptEntryDto {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  semesterId: string;
  credits: number;
  letterGrade: LetterGradeDto;
  gradePoint: number | null;
  status: ResultStatusDto;
  countsAsEarnedCredit: boolean;
  attempts: {
    resultId: string;
    attempt: number;
    marksObtained: number;
    maxMarks: number;
    letterGrade: LetterGradeDto;
    status: ResultStatusDto;
    recordedAt: string;
  }[];
}

/** `GET /me/transcript` */
export interface TranscriptDto {
  entries: TranscriptEntryDto[];
  cgpa: number | null;
}

export interface GradeBandDto {
  letterGrade: LetterGradeDto;
  minPercentage: number | null;
  gradePoint: number | null;
  countsTowardGPA: boolean;
  countsAsEarnedCredit: boolean;
}

export interface ClassificationBoundaryDto {
  classification: ClassificationDto;
  minCgpa: number | null;
}

/** `GET /grading-scale` */
export interface GradingScaleDto {
  scale: GradeBandDto[];
  degreeCgpaThreshold: number;
  classificationBoundaries: ClassificationBoundaryDto[];
}

export interface ResultDto {
  id: string;
  courseId: string;
  assessmentId: string;
  semesterId: string;
  attempt: number;
  isLatestAttempt: boolean;
  credits: number;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  letterGrade: LetterGradeDto;
  gradePoint: number | null;
  status: ResultStatusDto;
  countsTowardGPA: boolean;
  countsAsEarnedCredit: boolean;
  isGradeImprovementEligible: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `POST /results` and `PUT /results/:id` return the recomputed figures too. */
export interface ResultWriteDto {
  result: ResultDto;
  semesterGpa: number | null;
  cgpa: number | null;
}

export interface CreateResultDto {
  assessmentId: string;
  marksObtained?: number;
  incomplete?: boolean;
}
