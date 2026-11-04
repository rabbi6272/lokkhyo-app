import { describe, expect, it } from 'vitest';

import type { RoutineSlot } from '@/lib/types';
import {
  EXAM_ELIGIBILITY_THRESHOLD,
  computeAttendanceStats,
  generateSessionOccurrences,
  mergeSessionsWithRecords,
  type AttendanceSession,
} from '@/lib/attendance';

function session(partial: Partial<AttendanceSession> & { date: string; slotId: string }): AttendanceSession {
  return {
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '10:30',
    status: 'present',
    isFuture: false,
    ...partial,
  };
}

function slot(partial: Partial<RoutineSlot> & { id: string; dayOfWeek: number }): RoutineSlot {
  return {
    courseId: 'course-1',
    courseLabel: 'CSE 3105',
    startTime: '09:00',
    endTime: '10:30',
    room: '402',
    createdAt: null,
    ...partial,
  };
}

describe('computeAttendanceStats', () => {
  it('reports zero stats for no sessions', () => {
    expect(computeAttendanceStats([])).toEqual({
      held: 0,
      present: 0,
      absent: 0,
      cancelled: 0,
      percent: 0,
      mark: 0,
      eligible: false,
    });
  });

  it('excludes cancelled sessions from the held count', () => {
    const sessions = [
      session({ date: '2026-10-01', slotId: 's1', status: 'present' }),
      session({ date: '2026-10-02', slotId: 's2', status: 'absent' }),
      session({ date: '2026-10-03', slotId: 's3', status: 'cancelled' }),
    ];
    const stats = computeAttendanceStats(sessions);
    expect(stats.held).toBe(2);
    expect(stats.cancelled).toBe(1);
    expect(stats.percent).toBe(50);
    expect(stats.eligible).toBe(true); // 50% meets the exam-eligibility line
  });

  it('excludes future sessions from the percentage', () => {
    const sessions = [
      session({ date: '2026-10-01', slotId: 's1', status: 'present' }),
      session({ date: '2026-10-02', slotId: 's2', status: 'absent' }),
      session({ date: '2026-10-09', slotId: 's3', status: 'present', isFuture: true }),
    ];
    const stats = computeAttendanceStats(sessions);
    expect(stats.held).toBe(2);
    expect(stats.percent).toBe(50);
  });

  it('treats below 50% as exam-ineligible', () => {
    const sessions = [
      session({ date: '2026-10-01', slotId: 's1', status: 'absent' }),
      session({ date: '2026-10-02', slotId: 's2', status: 'absent' }),
      session({ date: '2026-10-03', slotId: 's3', status: 'absent' }),
      session({ date: '2026-10-04', slotId: 's4', status: 'present' }),
    ];
    const stats = computeAttendanceStats(sessions);
    expect(stats.percent).toBe(25);
    expect(stats.eligible).toBe(false);
    expect(stats.mark).toBe(0);
  });

  it('maps percentages onto the attendance-mark bands', () => {
    const cases: { present: number; absent: number; mark: number }[] = [
      { present: 9, absent: 1, mark: 10 }, // 90%
      { present: 8, absent: 2, mark: 9 }, // 80%
      { present: 7, absent: 3, mark: 8 }, // 70%
      { present: 6, absent: 4, mark: 7 }, // 60%
      { present: 5, absent: 5, mark: 0 }, // 50% → attendance mark drops below the 60% warning line
    ];
    for (const { present, absent, mark } of cases) {
      const sessions = [
        ...Array.from({ length: present }, (_, i) =>
          session({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, slotId: `p${i}`, status: 'present' }),
        ),
        ...Array.from({ length: absent }, (_, i) =>
          session({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, slotId: `a${i}`, status: 'absent' }),
        ),
      ];
      expect(computeAttendanceStats(sessions).mark).toBe(mark);
    }
  });

  it('exposes the exam-eligibility threshold as 50', () => {
    expect(EXAM_ELIGIBILITY_THRESHOLD).toBe(50);
  });
});

describe('generateSessionOccurrences', () => {
  it('repeats a weekly slot across the semester window', () => {
    // 2026-10-24 is a Saturday (Lokkhyo dayOfWeek 0).
    const occurrences = generateSessionOccurrences([slot({ id: 's1', dayOfWeek: 0 })], '2026-10-24', 2);
    expect(occurrences.map((o) => o.date)).toEqual(['2026-10-24', '2026-10-31']);
  });

  it('aligns a later weekday to its first occurrence after the start date', () => {
    // Sunday (dayOfWeek 1) first falls on 2026-10-25 after a Saturday start.
    const occurrences = generateSessionOccurrences([slot({ id: 's1', dayOfWeek: 1 })], '2026-10-24', 2);
    expect(occurrences.map((o) => o.date)).toEqual(['2026-10-25', '2026-11-01']);
  });

  it('returns nothing for empty inputs', () => {
    expect(generateSessionOccurrences([], '2026-10-24', 4)).toEqual([]);
    expect(generateSessionOccurrences([slot({ id: 's1', dayOfWeek: 0 })], '2026-10-24', 0)).toEqual([]);
  });

  it('sorts sessions by date then start time', () => {
    const occurrences = generateSessionOccurrences(
      [
        slot({ id: 's1', dayOfWeek: 0, startTime: '11:00', endTime: '12:30' }),
        slot({ id: 's2', dayOfWeek: 0, startTime: '09:00', endTime: '10:30' }),
      ],
      '2026-10-24',
      1,
    );
    expect(occurrences.map((o) => o.slotId)).toEqual(['s2', 's1']);
  });
});

describe('mergeSessionsWithRecords', () => {
  it('marks unrecorded past sessions as unmarked, not absent', () => {
    const occurrences = generateSessionOccurrences([slot({ id: 's1', dayOfWeek: 0 })], '2026-10-24', 1);
    const merged = mergeSessionsWithRecords(occurrences, [], '2026-10-26');
    expect(merged[0].status).toBe('unmarked');
    expect(merged[0].isFuture).toBe(false);
  });

  it('joins a saved record by date and slot id', () => {
    const occurrences = generateSessionOccurrences([slot({ id: 's1', dayOfWeek: 0 })], '2026-10-24', 1);
    const merged = mergeSessionsWithRecords(
      occurrences,
      [{ id: 'r1', date: '2026-10-24', slotId: 's1', status: 'absent', createdAt: null }],
      '2026-10-26',
    );
    expect(merged[0].status).toBe('absent');
  });

  it('flags sessions after today as future', () => {
    const occurrences = generateSessionOccurrences([slot({ id: 's1', dayOfWeek: 0 })], '2026-10-24', 2);
    const merged = mergeSessionsWithRecords(occurrences, [], '2026-10-25');
    expect(merged.map((m) => m.isFuture)).toEqual([false, true]);
  });
});
