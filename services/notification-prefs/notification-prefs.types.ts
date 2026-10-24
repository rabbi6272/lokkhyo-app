/** Wire types — mirror `notificationPrefsSchema` in `lokkhyo-server/schemas/user.ts`. */

export type NotificationCategoryDto = 'ROUTINE' | 'ATTENDANCE' | 'ATTENDANCE_RISK' | 'DEADLINE' | 'GRADE';

export interface NotificationPrefsDto {
  timezone: string;
  /** `HH:mm`. */
  morningRoutineTime: string;
  eveningAttendanceTime: string;
  /** `HH:mm`. The time of day device-local assessment reminders fire. */
  assessmentReminderTime: string;
  categoriesEnabled: Record<NotificationCategoryDto, boolean>;
  attendanceCutoffHour: number;
}

export interface UpdateNotificationPrefsDto {
  timezone?: string;
  morningRoutineTime?: string;
  eveningAttendanceTime?: string;
  assessmentReminderTime?: string;
  categoriesEnabled?: Partial<Record<NotificationCategoryDto, boolean>>;
  attendanceCutoffHour?: number;
}
