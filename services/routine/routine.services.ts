import type { RoutineSlot } from '@/lib/types';

import { getCourseRoutine, getWeekRoutine, replaceCourseRoutine } from './routine.api';
import type { DayOfWeekDto, RoutineSlotDto, RoutineSlotInputDto, ScheduledClassDto } from './routine.types';

/**
 * The app numbers days 0=Saturday … 6=Friday (the week starts on Saturday);
 * the server names them. This table is the only place the two meet.
 */
const APP_DAYS: readonly DayOfWeekDto[] = [
  'SATURDAY',
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
];

export function toAppDay(day: DayOfWeekDto): number {
  return APP_DAYS.indexOf(day);
}

export function toServerDay(day: number): DayOfWeekDto {
  const name = APP_DAYS[day];
  if (!name) throw new Error(`Invalid Lokkhyo dayOfWeek: ${day}`);
  return name;
}

/** Server slot (joined to its course) → the app's `RoutineSlot`. */
export function toRoutineSlot(dto: ScheduledClassDto): RoutineSlot {
  return {
    id: dto.id,
    courseId: dto.courseId,
    courseLabel: dto.course.code || 'Class',
    dayOfWeek: toAppDay(dto.dayOfWeek),
    startTime: dto.startTime,
    endTime: dto.endTime,
    room: dto.room ?? '',
    createdAt: null,
  };
}

/** A stored slot echoed back into a `PUT` body, keeping its id. */
function keep(slot: RoutineSlotDto): RoutineSlotInputDto {
  return {
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: slot.room,
  };
}

export async function fetchWeekRoutine(): Promise<RoutineSlot[]> {
  return (await getWeekRoutine()).map(toRoutineSlot);
}

/** `courseLabel` is derived from the course on read, so it is not sent. */
export type NewRoutineSlot = Omit<RoutineSlot, 'id' | 'createdAt'>;

/**
 * Add one slot. The server only replaces a course's whole set, so the current
 * set is read and written back with the new slot appended — existing slots go
 * back with their ids, so their attendance history is untouched.
 */
export async function addRoutineSlot(data: NewRoutineSlot): Promise<void> {
  const current = await getCourseRoutine(data.courseId);
  await replaceCourseRoutine(data.courseId, [
    ...current.map(keep),
    {
      dayOfWeek: toServerDay(data.dayOfWeek),
      startTime: data.startTime.trim(),
      endTime: data.endTime.trim(),
      room: data.room.trim() || null,
    },
  ]);
}

/** Remove one slot: write the owning course's set back without it. */
export async function removeRoutineSlot(slotId: string): Promise<void> {
  const week = await getWeekRoutine();
  const target = week.find((slot) => slot.id === slotId);
  if (!target) return;

  const current = await getCourseRoutine(target.courseId);
  await replaceCourseRoutine(
    target.courseId,
    current.filter((slot) => slot.id !== slotId).map(keep),
  );
}
