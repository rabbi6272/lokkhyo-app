import type { AttendanceRecord, AttendanceStatus } from '@/lib/types';

import { listCourseAttendance, putAttendance } from './attendance.api';
import type { AttendanceDto, AttendanceStatusDto } from './attendance.types';

/**
 * The app records present / absent / cancelled. The server also knows LATE and
 * EXCUSED (the app never writes them); they read as attended and as "did not
 * count" respectively, matching what the app's maths does with each.
 */
const FROM_SERVER: Record<AttendanceStatusDto, AttendanceStatus> = {
  PRESENT: 'present',
  LATE: 'present',
  ABSENT: 'absent',
  EXCUSED: 'cancelled',
  CANCELLED: 'cancelled',
};

const TO_SERVER: Record<AttendanceStatus, AttendanceStatusDto> = {
  present: 'PRESENT',
  absent: 'ABSENT',
  cancelled: 'CANCELLED',
};

export function toAttendanceRecord(dto: AttendanceDto): AttendanceRecord {
  return {
    id: dto.id,
    date: dto.date,
    slotId: dto.slotId ?? '',
    status: FROM_SERVER[dto.status],
    createdAt: dto.createdAt,
  };
}

export async function fetchCourseAttendance(courseId: string): Promise<AttendanceRecord[]> {
  return (await listCourseAttendance(courseId)).map(toAttendanceRecord);
}

export async function markAttendance(
  courseId: string,
  date: string,
  slotId: string,
  status: AttendanceStatus,
): Promise<void> {
  await putAttendance(courseId, { date, slotId: slotId || null, status: TO_SERVER[status] });
}
