import { describe, expect, it } from 'vitest';

import {
  attendanceTone,
  buildWidgetSnapshot,
  deadlineDistance,
  MAX_WIDGET_DEADLINES,
  nextDeadline,
  parseWidgetSnapshot,
  updatedLabel,
  WIDGET_SNAPSHOT_VERSION,
} from '@/lib/widgetSnapshot';

const now = new Date(2026, 10, 10, 9, 5);
const reminder = (id: string, date: string) => ({ id, name: `R${id}`, date, courseId: 'c1', courseCode: 'CSE 3105' });
const build = (reminders: ReturnType<typeof reminder>[] = []) =>
  buildWidgetSnapshot({
    cgpa: 3.42,
    courses: [
      { course: { id: 'c1', code: 'CSE 3105' }, stats: { held: 10, percent: 92, eligible: true } },
      { course: { id: 'c2', code: 'CSE 3107' }, stats: { held: 0, percent: 0, eligible: false } },
    ],
    reminders,
    now,
  });

describe('buildWidgetSnapshot', () => {
  it('reports no percentage for a course with no held sessions', () => {
    const { attendance } = build();
    expect(attendance[0].percent).toBe(92);
    expect(attendance[1].percent).toBeNull();
  });

  it('keeps only upcoming reminders, soonest first, up to the cap', () => {
    const { deadlines } = build([
      reminder('late', '2026-11-20'),
      reminder('past', '2026-11-09'),
      reminder('today', '2026-11-10'),
    ]);
    expect(deadlines.map((d) => d.id)).toEqual(['today', 'late']);

    const many = Array.from({ length: 9 }, (_, i) => reminder(String(i), '2026-11-20'));
    expect(build(many).deadlines).toHaveLength(MAX_WIDGET_DEADLINES);
  });

  it('holds only what the contract names', () => {
    expect(Object.keys(build()).sort()).toEqual(['attendance', 'cgpa', 'deadlines', 'updatedAt', 'version']);
  });
});

describe('parseWidgetSnapshot', () => {
  it('round-trips a snapshot', () => {
    const snapshot = build();
    expect(parseWidgetSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it.each([[null], ['not json'], ['null'], [JSON.stringify({ version: WIDGET_SNAPSHOT_VERSION + 1 })]])(
    'treats %s as nothing to show',
    (raw) => {
      expect(parseWidgetSnapshot(raw)).toBeNull();
    },
  );
});

describe('nextDeadline', () => {
  it('skips one that passed after the snapshot was written', () => {
    const snapshot = build([reminder('a', '2026-11-10'), reminder('b', '2026-11-12')]);
    expect(nextDeadline(snapshot, new Date(2026, 10, 11))?.id).toBe('b');
    expect(nextDeadline(snapshot, new Date(2026, 10, 13))).toBeNull();
  });
});

describe('labels', () => {
  it('words the distance by calendar day', () => {
    expect(deadlineDistance('2026-11-10', now)).toBe('Today');
    expect(deadlineDistance('2026-11-11', now)).toBe('Tomorrow');
    expect(deadlineDistance('2026-12-01', now)).toBe('In 21 days');
  });

  it('shows the time today and the date before that', () => {
    expect(updatedLabel(new Date(2026, 10, 10, 14, 5).toISOString(), now)).toBe('Updated 2:05 PM');
    expect(updatedLabel(new Date(2026, 10, 3, 14, 5).toISOString(), now)).toBe('Updated 3/11');
  });

  it('colours attendance by the app thresholds', () => {
    expect(attendanceTone(null)).toBe('muted');
    expect(attendanceTone(49)).toBe('risk');
    expect(attendanceTone(50)).toBe('warn');
    expect(attendanceTone(59)).toBe('warn');
    expect(attendanceTone(60)).toBe('good');
  });
});
