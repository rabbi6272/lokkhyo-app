/** Wire types for the routine — mirror `lokkhyo-server/schemas/course.ts`. */

export type DayOfWeekDto =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

/** One slot of a course, as `GET/PUT /courses/:id/routine` return it. */
export interface RoutineSlotDto {
  id: string;
  courseId: string;
  dayOfWeek: DayOfWeekDto;
  /** `HH:mm`, wall-clock in the student's timezone. */
  startTime: string;
  endTime: string;
  room: string | null;
}

/** A slot joined to its course, as `GET /me/routine/week` returns it. */
export interface ScheduledClassDto extends RoutineSlotDto {
  course: { id: string; title: string; code: string };
}

/** One slot of a `PUT` body. An `id` keeps that slot; omit it to create one. */
export interface RoutineSlotInputDto {
  id?: string;
  dayOfWeek: DayOfWeekDto;
  startTime: string;
  endTime: string;
  room: string | null;
}
