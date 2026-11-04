/** Wire types for attendance — mirror `lokkhyo-server/schemas/attendance.ts`. */

export type AttendanceStatusDto = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'CANCELLED';

export interface AttendanceDto {
  id: string;
  courseId: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** The routine slot the session belongs to; null for a course-day record. */
  slotId: string | null;
  status: AttendanceStatusDto;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `PUT /courses/:id/attendance` — upsert on `(date, slotId)`. */
export interface PutAttendanceDto {
  date: string;
  slotId: string | null;
  status: AttendanceStatusDto;
}
