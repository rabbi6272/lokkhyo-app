import type {
  ClassificationBoundaryDto,
  ClassificationDto,
  GradeBandDto,
  GradingScaleDto,
  LetterGradeDto,
  ResultStatusDto,
} from '@/services/grades/grades.types';

export const DEGREE_CGPA_THRESHOLD = 2.2;

export const DEFAULT_GRADING_SCALE: readonly GradeBandDto[] = Object.freeze([
  { letterGrade: 'A+', minPercentage: 80, gradePoint: 4.0, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'A', minPercentage: 75, gradePoint: 3.75, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'A-', minPercentage: 70, gradePoint: 3.5, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'B+', minPercentage: 65, gradePoint: 3.25, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'B', minPercentage: 60, gradePoint: 3.0, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'B-', minPercentage: 55, gradePoint: 2.75, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'C+', minPercentage: 50, gradePoint: 2.5, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'C', minPercentage: 45, gradePoint: 2.25, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'C-', minPercentage: 40, gradePoint: 2.0, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'D', minPercentage: 35, gradePoint: 1.5, countsTowardGPA: true, countsAsEarnedCredit: true },
  { letterGrade: 'F', minPercentage: 0, gradePoint: 0.0, countsTowardGPA: false, countsAsEarnedCredit: false },
  { letterGrade: 'I', minPercentage: null, gradePoint: null, countsTowardGPA: false, countsAsEarnedCredit: false },
]);

export const DEFAULT_CLASSIFICATION_BOUNDARIES: readonly ClassificationBoundaryDto[] = Object.freeze([
  { classification: 'FIRST_CLASS_WITH_HONORS', minCgpa: 3.75 },
  { classification: 'FIRST_CLASS', minCgpa: 3.0 },
  { classification: 'SECOND_CLASS', minCgpa: DEGREE_CGPA_THRESHOLD },
  { classification: 'FAIL', minCgpa: null },
]);

/**
 * Round to 2 decimal places.
 * Exactly matches the server implementation (`toFixed(2)`).
 */
export function round2(value: number): number {
  return Number.parseFloat(value.toFixed(2));
}

export interface DerivedProjectedGrade {
  letterGrade: LetterGradeDto;
  gradePoint: number | null;
  percentage: number;
  status: ResultStatusDto;
  countsTowardGPA: boolean;
  countsAsEarnedCredit: boolean;
}

/**
 * Pure grade derivation matching server's `deriveGrade`.
 */
export function deriveProjectedGrade(
  marksObtained: number,
  maxMarks: number,
  incomplete = false,
  scale: readonly GradeBandDto[] = DEFAULT_GRADING_SCALE,
): DerivedProjectedGrade {
  if (incomplete) {
    return {
      letterGrade: 'I',
      gradePoint: null,
      percentage: 0,
      status: 'INCOMPLETE',
      countsTowardGPA: false,
      countsAsEarnedCredit: false,
    };
  }

  if (!(maxMarks > 0)) {
    throw new RangeError('maxMarks must be greater than zero');
  }

  const percentage = (marksObtained / maxMarks) * 100;
  // Exclude `I` band (which has null minPercentage) when matching numeric percentages
  const numericBands = scale.filter((b) => b.minPercentage !== null && b.letterGrade !== 'I');
  const band =
    numericBands.find((candidate) => percentage >= (candidate.minPercentage ?? 0)) ??
    numericBands[numericBands.length - 1];

  return {
    letterGrade: band.letterGrade,
    gradePoint: band.gradePoint,
    percentage,
    status: band.letterGrade === 'F' ? 'BACKLOG' : 'PASSED',
    countsTowardGPA: band.countsTowardGPA,
    countsAsEarnedCredit: band.countsAsEarnedCredit,
  };
}

export interface ProjectedEntry {
  credits: number;
  gradePoint: number | null;
  countsTowardGPA: boolean;
}

export interface ProjectedGpaSummary {
  gpa: number | null;
  totalCredits: number;
  totalWeightedPoints: number;
  coursesCounted: number;
}

/**
 * Credit-weighted GPA computation.
 * Excludes F and I from both numerator and denominator.
 */
export function computeProjectedGpa(entries: readonly ProjectedEntry[]): ProjectedGpaSummary {
  let totalWeightedPoints = 0;
  let totalCredits = 0;
  let coursesCounted = 0;

  for (const entry of entries) {
    if (!entry.countsTowardGPA || entry.gradePoint === null) {
      continue;
    }
    totalWeightedPoints += entry.credits * entry.gradePoint;
    totalCredits += entry.credits;
    coursesCounted += 1;
  }

  return {
    gpa: totalCredits === 0 ? null : round2(totalWeightedPoints / totalCredits),
    totalWeightedPoints,
    totalCredits,
    coursesCounted,
  };
}

export function classifyCgpa(
  cgpa: number | null,
  boundaries: readonly ClassificationBoundaryDto[] = DEFAULT_CLASSIFICATION_BOUNDARIES,
  degreeThreshold = DEGREE_CGPA_THRESHOLD,
): { classification: ClassificationDto; isDegreeEligible: boolean } {
  if (cgpa === null) {
    return { classification: 'IN_PROGRESS', isDegreeEligible: false };
  }

  const honors = boundaries.find((b) => b.classification === 'FIRST_CLASS_WITH_HONORS');
  const first = boundaries.find((b) => b.classification === 'FIRST_CLASS');
  const second = boundaries.find((b) => b.classification === 'SECOND_CLASS');

  const minHonors = honors?.minCgpa ?? 3.75;
  const minFirst = first?.minCgpa ?? 3.0;
  const minSecond = second?.minCgpa ?? degreeThreshold;

  if (cgpa >= minHonors) {
    return { classification: 'FIRST_CLASS_WITH_HONORS', isDegreeEligible: true };
  }
  if (cgpa >= minFirst) {
    return { classification: 'FIRST_CLASS', isDegreeEligible: true };
  }
  if (cgpa >= minSecond) {
    return { classification: 'SECOND_CLASS', isDegreeEligible: true };
  }
  return { classification: 'FAIL', isDegreeEligible: false };
}

export interface RetakeEntry {
  oldCredits: number;
  oldGradePoint: number;
}

export interface ProjectCgpaParams {
  currentSummary?: {
    totalCredits: number;
    totalWeightedPoints: number;
  } | null;
  entries: readonly ProjectedEntry[];
  retakes?: readonly RetakeEntry[];
  scale?: GradingScaleDto;
}

export interface ProjectedCgpaSummary {
  projectedCgpa: number | null;
  projectedCredits: number;
  projectedWeightedPoints: number;
  coursesCounted: number;
  classification: ClassificationDto;
  isDegreeEligible: boolean;
}

/**
 * Projects cumulative CGPA from starting unrounded sums.
 * Starts from server's official `totalWeightedPoints` and `totalCredits` to prevent floating-point drift.
 */
export function projectCgpa(params: ProjectCgpaParams): ProjectedCgpaSummary {
  let baseWeightedPoints = params.currentSummary?.totalWeightedPoints ?? 0;
  let baseCredits = params.currentSummary?.totalCredits ?? 0;

  // If retaking courses, deduct their prior contribution
  if (params.retakes) {
    for (const retake of params.retakes) {
      baseWeightedPoints -= retake.oldCredits * retake.oldGradePoint;
      baseCredits -= retake.oldCredits;
    }
  }

  const addedSummary = computeProjectedGpa(params.entries);
  const finalWeightedPoints = baseWeightedPoints + addedSummary.totalWeightedPoints;
  const finalCredits = baseCredits + addedSummary.totalCredits;
  const projectedCgpa = finalCredits === 0 ? null : round2(finalWeightedPoints / finalCredits);

  const boundaries = params.scale?.classificationBoundaries ?? DEFAULT_CLASSIFICATION_BOUNDARIES;
  const threshold = params.scale?.degreeCgpaThreshold ?? DEGREE_CGPA_THRESHOLD;
  const { classification, isDegreeEligible } = classifyCgpa(projectedCgpa, boundaries, threshold);

  return {
    projectedCgpa,
    projectedCredits: finalCredits,
    projectedWeightedPoints: finalWeightedPoints,
    coursesCounted: addedSummary.coursesCounted,
    classification,
    isDegreeEligible,
  };
}

export interface WhatIfCourse {
  id: string;
  courseId?: string;
  code: string;
  title: string;
  credits: number;
  targetGrade: LetterGradeDto;
  isRetake?: boolean;
  previousGradePoint?: number;
  previousCredits?: number;
}

/**
 * What-if calculator scenario runner for UI.
 */
export function calculateWhatIfScenario(
  courses: readonly WhatIfCourse[],
  currentCgpa: { totalCredits: number; totalWeightedPoints: number } | null | undefined,
  scaleDto?: GradingScaleDto,
): ProjectedCgpaSummary {
  const bands = scaleDto?.scale ?? DEFAULT_GRADING_SCALE;
  const entries: ProjectedEntry[] = [];
  const retakes: RetakeEntry[] = [];

  for (const course of courses) {
    const band = bands.find((b) => b.letterGrade === course.targetGrade);
    const gradePoint = band?.gradePoint ?? null;
    const countsTowardGPA = band?.countsTowardGPA ?? false;

    entries.push({
      credits: course.credits,
      gradePoint,
      countsTowardGPA,
    });

    if (course.isRetake && course.previousGradePoint !== undefined && course.previousCredits !== undefined) {
      retakes.push({
        oldCredits: course.previousCredits,
        oldGradePoint: course.previousGradePoint,
      });
    }
  }

  return projectCgpa({
    currentSummary: currentCgpa,
    entries,
    retakes,
    scale: scaleDto,
  });
}

