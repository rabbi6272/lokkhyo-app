import { describe, expect, it } from 'vitest';

import type { AssessmentType } from '@/lib/types';
import {
  buildAssessmentReminderContent,
  getAssessmentReminderDates,
  getReminderLeadDays,
  getUpcomingAssessmentReminders,
  isReminderType,
  toDateKey,
} from '@/lib/reminders';

// Local-time "now": the reminder window is built from local Date components,
// so the reference clock must be local too for the assertions to hold.
const NOW = new Date(2026, 9, 24, 8, 0, 0, 0); // 2026-10-24 08:00 local

describe('isReminderType', () => {
  it('accepts only the four reminder types', () => {
    expect(isReminderType('ct')).toBe(true);
    expect(isReminderType('quiz')).toBe(true);
    expect(isReminderType('assignment')).toBe(true);
    expect(isReminderType('labFinal')).toBe(true);
    expect(isReminderType('final')).toBe(false);
  });
});

describe('getReminderLeadDays', () => {
  it('returns the configured lead for each type', () => {
    expect(getReminderLeadDays('ct')).toBe(2);
    expect(getReminderLeadDays('assignment')).toBe(2);
    expect(getReminderLeadDays('quiz')).toBe(3);
    expect(getReminderLeadDays('labFinal')).toBe(5);
  });
});

describe('getAssessmentReminderDates', () => {
  it('fires daily from leadDays before the event through the event day', () => {
    // A CT on 2026-10-27 with a two-day lead fires on the 25th, 26th and 27th.
    const dates = getAssessmentReminderDates('2026-10-27', 'ct', NOW, 7, 0);
    expect(dates.map(toDateKey)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27']);
    expect(dates[0].getHours()).toBe(7);
    expect(dates[0].getMinutes()).toBe(0);
  });

  it('drops days already past so a late-started window still reminds', () => {
    // On the morning of the 26th (08:00, after the 07:00 trigger) only the
    // event day remains in the window.
    const now = new Date(2026, 9, 26, 8, 0, 0, 0);
    const dates = getAssessmentReminderDates('2026-10-27', 'ct', now, 7, 0);
    expect(dates.map(toDateKey)).toEqual(['2026-10-27']);
  });

  it('returns an empty window once the whole series is behind us', () => {
    const now = new Date(2026, 9, 28, 8, 0, 0, 0);
    expect(getAssessmentReminderDates('2026-10-27', 'ct', now, 7, 0)).toEqual([]);
  });

  it('returns nothing for an unknown type or an unparseable date', () => {
    expect(getAssessmentReminderDates('2026-10-27', 'final' as AssessmentType, NOW)).toEqual([]);
    expect(getAssessmentReminderDates('not-a-date', 'ct', NOW)).toEqual([]);
    expect(getAssessmentReminderDates('', 'ct', NOW)).toEqual([]);
  });

  it('rolls the window across a month boundary', () => {
    // A quiz (3-day lead) on 2026-11-02 starts on 2026-10-30.
    const dates = getAssessmentReminderDates('2026-11-02', 'quiz', NOW, 7, 0);
    expect(dates.map(toDateKey)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
});

describe('getUpcomingAssessmentReminders', () => {
  it('keeps only assessments with a reminder left to fire', () => {
    const reminders = getUpcomingAssessmentReminders(
      [
        { id: 'a1', type: 'ct', name: 'CT 1', date: '2026-10-27', courseId: 'c1' },
        { id: 'a2', type: 'final', name: 'Final', date: '2026-10-27', courseId: 'c1' },
        { id: 'a3', type: 'quiz', name: 'Quiz 1', date: '2026-10-20', courseId: 'c1' }, // window passed
      ],
      NOW,
      7,
      0,
    );
    expect(reminders.map((r) => r.assessmentId)).toEqual(['a1']);
    expect(reminders[0].triggerDates).toHaveLength(3);
  });

  it('falls back to a placeholder name when the assessment has none', () => {
    const reminders = getUpcomingAssessmentReminders(
      [{ id: 'a1', type: 'ct', name: '', date: '2026-10-27', courseId: 'c1' }],
      NOW,
      7,
      0,
    );
    expect(reminders[0].name).toBe('Assessment');
  });

  it('skips entries with an empty date', () => {
    const reminders = getUpcomingAssessmentReminders(
      [{ id: 'a1', type: 'ct', name: 'CT 1', date: '   ', courseId: 'c1' }],
      NOW,
      7,
      0,
    );
    expect(reminders).toEqual([]);
  });
});

describe('buildAssessmentReminderContent', () => {
  it('uses a type-specific title and words the distance from the event', () => {
    const now = new Date(2026, 9, 25, 7, 0, 0, 0); // two days before the CT
    const content = buildAssessmentReminderContent(
      { type: 'ct', name: 'CT 2', date: '2026-10-27' },
      'CSE 3105',
      now,
    );
    expect(content.title).toBe('CT Reminder 📝');
    expect(content.body).toContain('CSE 3105');
    expect(content.body).toContain('in 2 days');
  });

  it('says today and tomorrow for same-day and next-day events', () => {
    const today = buildAssessmentReminderContent(
      { type: 'quiz', name: 'Quiz', date: '2026-10-24' },
      'CSE 3107',
      NOW,
    );
    expect(today.body).toContain('today');

    const tomorrow = buildAssessmentReminderContent(
      { type: 'quiz', name: 'Quiz', date: '2026-10-25' },
      'CSE 3107',
      NOW,
    );
    expect(tomorrow.body).toContain('tomorrow');
  });

  it('uses the assessment name when no course code is given', () => {
    const content = buildAssessmentReminderContent(
      { type: 'assignment', name: 'Report', date: '2026-10-26' },
      undefined,
      NOW,
    );
    expect(content.body).toContain('Report');
    expect(content.title).toBe('Assignment Reminder 📝');
  });
});

describe('toDateKey', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
