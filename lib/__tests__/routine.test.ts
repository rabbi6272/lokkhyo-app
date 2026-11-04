import { describe, expect, it } from 'vitest';

import { findSpotlightClass } from '@/lib/routine';
import type { RoutineSlot } from '@/lib/types';

const slot = (id: string, dayOfWeek: number, startTime: string, endTime: string): RoutineSlot => ({
  id,
  courseId: `c-${id}`,
  courseLabel: id,
  dayOfWeek,
  startTime,
  endTime,
  room: '',
  createdAt: null,
});

const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

describe('findSpotlightClass', () => {
  const slots = [slot('A', 1, '09:00', '09:50'), slot('B', 1, '11:00', '11:50'), slot('C', 3, '08:00', '08:50')];

  it('features the class in progress, with time left', () => {
    expect(findSpotlightClass(slots, 1, at('09:15'))).toMatchObject({
      slot: { id: 'A' },
      live: true,
      status: 'Ends in 35 min',
    });
  });

  it('otherwise features the next class today, with a countdown', () => {
    expect(findSpotlightClass(slots, 1, at('09:50'))).toMatchObject({
      slot: { id: 'B' },
      live: false,
      when: 'Today',
      status: 'In 1 h 10 min',
    });
  });

  it('rolls over to a later day once today is done', () => {
    // Day indexes start on Saturday, so 3 is Tuesday.
    expect(findSpotlightClass(slots, 1, at('12:00'))).toMatchObject({ slot: { id: 'C' }, when: 'Tuesday' });
  });

  it('returns null with no routine', () => {
    expect(findSpotlightClass([], 1, at('09:00'))).toBeNull();
  });
});
