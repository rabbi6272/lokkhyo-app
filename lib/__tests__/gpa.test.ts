import { describe, expect, it } from 'vitest';

import type { Assessment } from '@/lib/types';
import { CtAverage, AssignmentAverage, clamp, courseProgress, initials } from '@/lib/gpa';

function assessment(partial: Partial<Assessment> & { id: string; type: Assessment['type'] }): Assessment {
  return {
    name: partial.name ?? partial.id,
    marksObtained: 0,
    maxMarks: 25,
    weight: 0,
    date: '2026-10-20',
    createdAt: null,
    ...partial,
  };
}

describe('CtAverage', () => {
  it('returns 0 for no assessments', () => {
    expect(CtAverage([])).toBe(0);
  });

  it('ignores non-CT assessments', () => {
    const assessments = [
      assessment({ id: 'a1', type: 'quiz', marksObtained: 25 }),
      assessment({ id: 'a2', type: 'assignment', marksObtained: 25 }),
    ];
    expect(CtAverage(assessments)).toBe(0);
  });

  it('divides a single CT by three (best-of-3 rule)', () => {
    // RUET rule: the CT average is always the best three CTs over three,
    // so one CT worth 20 contributes 20/3 = 6.67 → 7 after the ceiling.
    expect(CtAverage([assessment({ id: 'c1', type: 'ct', marksObtained: 20 })])).toBe(7);
  });

  it('sums the best three CTs when more are taken', () => {
    const assessments = [
      assessment({ id: 'c1', type: 'ct', marksObtained: 30 }),
      assessment({ id: 'c2', type: 'ct', marksObtained: 25 }),
      assessment({ id: 'c3', type: 'ct', marksObtained: 20 }),
      assessment({ id: 'c4', type: 'ct', marksObtained: 10 }),
    ];
    // Best three = 30 + 25 + 20 = 75 → 75 / 3 = 25.
    expect(CtAverage(assessments)).toBe(25);
  });

  it('ceilings fractional averages', () => {
    const assessments = [
      assessment({ id: 'c1', type: 'ct', marksObtained: 20 }),
      assessment({ id: 'c2', type: 'ct', marksObtained: 15 }),
    ];
    // 35 / 3 = 11.67 → 12.
    expect(CtAverage(assessments)).toBe(12);
  });
});

describe('AssignmentAverage', () => {
  it('returns 0 for no assessments', () => {
    expect(AssignmentAverage([])).toBe(0);
  });

  it('divides the total by two even with one assignment', () => {
    expect(AssignmentAverage([assessment({ id: 'a1', type: 'assignment', marksObtained: 10 })])).toBe(5);
  });

  it('ceilings fractional averages', () => {
    const assessments = [
      assessment({ id: 'a1', type: 'assignment', marksObtained: 10 }),
      assessment({ id: 'a2', type: 'assignment', marksObtained: 15 }),
    ];
    // 25 / 2 = 12.5 → 13.
    expect(AssignmentAverage(assessments)).toBe(13);
  });
});

describe('courseProgress', () => {
  it('sums CT, assignment, other marks, and the attendance mark over a hard-coded 100', () => {
    const assessments = [
      assessment({ id: 'c1', type: 'ct', marksObtained: 30 }), // CT avg = 10
      assessment({ id: 'a1', type: 'assignment', marksObtained: 10 }), // assignment avg = 5
      assessment({ id: 'q1', type: 'quiz', marksObtained: 15 }), // counted in full
    ];
    const result = courseProgress(assessments, 7);
    expect(result.obtained).toBe(10 + 5 + 15 + 7);
    expect(result.max).toBe(100);
    expect(result.percent).toBe(37);
  });

  it('defaults the attendance mark to 0', () => {
    const result = courseProgress([assessment({ id: 'q1', type: 'quiz', marksObtained: 40 })]);
    expect(result.obtained).toBe(40);
    expect(result.percent).toBe(40);
  });
});

describe('clamp', () => {
  it('bounds a value between min and max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe('initials', () => {
  it('takes the first two words', () => {
    expect(initials('Rabbi Ahmed')).toBe('RA');
    expect(initials('  single  ')).toBe('S');
    expect(initials('')).toBe('');
  });
});
