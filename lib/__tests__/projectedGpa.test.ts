import { describe, expect, it } from 'vitest';
import fixtures from '../../fixtures/grading-cases.json';
import {
  calculateWhatIfScenario,
  classifyCgpa,
  computeProjectedGpa,
  DEGREE_CGPA_THRESHOLD,
  deriveProjectedGrade,
  projectCgpa,
  type WhatIfCourse,
} from '../projectedGpa';

describe('grading-cases fixtures (app / projectedGpa)', () => {
  it('matches degreeCgpaThreshold', () => {
    expect(DEGREE_CGPA_THRESHOLD).toBe(fixtures.degreeCgpaThreshold);
  });

  describe('gradeDerivations', () => {
    for (const testCase of fixtures.gradeDerivations) {
      it(`derives ${testCase.marksObtained}/${testCase.maxMarks} (inc=${testCase.incomplete}) -> ${testCase.expected.letterGrade}`, () => {
        const derived = deriveProjectedGrade(
          testCase.marksObtained,
          testCase.maxMarks,
          testCase.incomplete,
          fixtures.scale as any,
        );
        expect(derived.letterGrade).toBe(testCase.expected.letterGrade);
        expect(derived.gradePoint).toBe(testCase.expected.gradePoint);
        expect(derived.percentage).toBeCloseTo(testCase.expected.percentage, 2);
        expect(derived.status).toBe(testCase.expected.status);
        expect(derived.countsTowardGPA).toBe(testCase.expected.countsTowardGPA);
        expect(derived.countsAsEarnedCredit).toBe(testCase.expected.countsAsEarnedCredit);
      });
    }
  });

  describe('gpaComputations', () => {
    for (const comp of fixtures.gpaComputations) {
      it(comp.name, () => {
        const summary = computeProjectedGpa(comp.entries as any);
        expect(summary.gpa).toBe(comp.expected.gpa);
        expect(summary.totalCredits).toBe(comp.expected.totalCredits);
        expect(summary.totalWeightedPoints).toBe(comp.expected.totalWeightedPoints);
        expect(summary.coursesCounted).toBe(comp.expected.coursesCounted);
      });
    }
  });

  describe('cgpaProjections', () => {
    for (const proj of fixtures.cgpaProjections) {
      it(proj.name, () => {
        const retakes =
          'retake' in proj && proj.retake
            ? [{ oldCredits: proj.retake.oldCredits, oldGradePoint: proj.retake.oldGradePoint }]
            : [];

        const result = projectCgpa({
          currentSummary: proj.base,
          entries: proj.added as any,
          retakes,
        });

        expect(result.projectedCgpa).toBe(proj.expected.projectedCgpa);
        expect(result.projectedCredits).toBe(proj.expected.projectedCredits);
        expect(result.projectedWeightedPoints).toBe(proj.expected.projectedWeightedPoints);
        if ('classification' in proj.expected) {
          expect(result.classification).toBe(proj.expected.classification);
        }
        if ('isDegreeEligible' in proj.expected) {
          expect(result.isDegreeEligible).toBe(proj.expected.isDegreeEligible);
        }
      });
    }
  });

  describe('classifications', () => {
    for (const cls of fixtures.classifications) {
      it(`classifies ${cls.cgpa} -> ${cls.expected.classification}`, () => {
        const result = classifyCgpa(cls.cgpa, fixtures.classificationBoundaries as any);
        expect(result.classification).toBe(cls.expected.classification);
        expect(result.isDegreeEligible).toBe(cls.expected.isDegreeEligible);
      });
    }
  });

  describe('calculateWhatIfScenario', () => {
    it('computes scenario with new and retake courses correctly', () => {
      const courses: WhatIfCourse[] = [
        {
          id: '1',
          code: 'CSE 3101',
          title: 'Database Systems',
          credits: 3,
          targetGrade: 'A+',
        },
        {
          id: '2',
          code: 'CSE 3103',
          title: 'Operating Systems',
          credits: 3,
          targetGrade: 'A',
          isRetake: true,
          previousCredits: 3,
          previousGradePoint: 1.5, // D
        },
      ];

      const current = { totalCredits: 15, totalWeightedPoints: 55.5 };
      const result = calculateWhatIfScenario(courses, current);

      // Added:
      // CSE 3101: 3 * 4.0 = 12.0
      // CSE 3103: 3 * 3.75 = 11.25
      // Retake deducts: 3 * 1.5 = 4.5 pts, 3 credits
      // Final pts: 55.5 - 4.5 + 12.0 + 11.25 = 74.25
      // Final credits: 15 - 3 + 3 + 3 = 18
      // CGPA: 74.25 / 18 = 4.125 -> 4.13
      expect(result.projectedCredits).toBe(18);
      expect(result.projectedWeightedPoints).toBe(74.25);
      expect(result.projectedCgpa).toBe(4.13);
      expect(result.isDegreeEligible).toBe(true);
    });

    it('handles F and I grades in scenario without corrupting GPA', () => {
      const courses: WhatIfCourse[] = [
        {
          id: '1',
          code: 'CSE 3101',
          title: 'Course 1',
          credits: 3,
          targetGrade: 'F',
        },
        {
          id: '2',
          code: 'CSE 3103',
          title: 'Course 2',
          credits: 3,
          targetGrade: 'I',
        },
      ];

      const current = { totalCredits: 10, totalWeightedPoints: 35.0 };
      const result = calculateWhatIfScenario(courses, current);

      // F and I do not contribute points or counted credits
      expect(result.projectedCredits).toBe(10);
      expect(result.projectedWeightedPoints).toBe(35.0);
      expect(result.projectedCgpa).toBe(3.5);
    });
  });
});
