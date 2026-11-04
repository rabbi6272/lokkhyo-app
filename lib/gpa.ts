import type { Assessment } from '@/lib/types';

export interface Progress {
  obtained: number;
  max: number;
  percent: number;
}

export function courseProgress(assessments: Assessment[], attendanceMark: number = 0): Progress {
  const obtained = CtAverage(assessments) + AssignmentAverage(assessments) + assessments.filter((a) => a.type !== 'ct' && a.type !== 'assignment').reduce((sum, a) => sum + a.marksObtained, 0) + attendanceMark;
  const max = 100; // Assuming max marks for the course is 100
  const percent = Math.round((obtained / max) * 100);
  return { obtained, max, percent };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function CtAverage(assessments: Assessment[]): number {
  if (assessments.length === 0) return 0;
  const total = assessments
    .filter((a) => a.type === 'ct')
    // Best three CTs count: highest marks first.
    .sort((a, b) => b.marksObtained - a.marksObtained)
    .slice(0, 3)
    .reduce((sum, a) => sum + a.marksObtained, 0);
  // const max = assessments.filter((a) => a.type === 'ct').slice(0, 3).reduce((sum, a) => sum + a.maxMarks, 0);
  return Math.ceil((total / 3));
}

export function AssignmentAverage(assessments: Assessment[]): number {
  if (assessments.length === 0) return 0;
  const total = assessments.filter((a) => a.type === 'assignment').reduce((sum, a) => sum + a.marksObtained, 0);
  // const max = assessments.filter((a) => a.type === 'assignment').reduce((sum, a) => sum + a.maxMarks, 0);
  return Math.ceil((total / 2));
}
