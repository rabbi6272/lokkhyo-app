export type SemesterStatus = 'active' | 'archived';

export interface UserProfile {
  fullName: string;
  /** Google's avatar when signed in with Google, else null. */
  photoUrl: string | null;
  university: string;
  department: string;
  currentSemesterId: string;
  targetCgpa: number;
  /** ISO-8601, or null before the profile has been read from the API. */
  createdAt: string | null;
}

export interface Semester {
  id: string;
  name: string;
  status: SemesterStatus;
  targetGpa: number;
  startDate: string;
  totalWeeks: number;
  /** ISO-8601 from the API. */
  createdAt: string | null;
}

export interface Course {
  id: string;
  semesterId: string;
  code: string;
  title: string;
  credits: number;
  passMarks: number;
  ctWeight: number;
  isLab: boolean;
  courseTeachers?: string[];
  /** ISO-8601 from the API. */
  createdAt: string | null;
}

export type AssessmentType = 'ct' | 'quiz' | 'assignment' | 'labFinal';

export interface Assessment {
  id: string;
  type: AssessmentType;
  name: string;
  marksObtained: number;
  maxMarks: number;
  weight: number;
  date: string;
  teacherName?: string;
  /** ISO-8601 from the API. */
  createdAt: string | null;
}

export interface UpcomingReminder {
  id: string;
  type: AssessmentType;
  name: string;
  date: string;
  /** ISO-8601 from the API. */
  createdAt: string | null;
}

export type AttendanceStatus = 'present' | 'absent' | 'cancelled';

export interface AttendanceRecord {
  id: string;
  date: string;
  slotId: string;
  status: AttendanceStatus;
  /** ISO-8601 from the API. */
  createdAt: string | null;
}

export interface RoutineSlot {
  id: string;
  courseId: string;
  courseLabel: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  /** Not carried by the API; kept for the shape the screens were written against. */
  createdAt: string | null;
}
