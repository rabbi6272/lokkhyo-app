import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/providers/auth-provider';
import {
  DEFAULT_ASSESSMENT_HOUR,
  DEFAULT_ASSESSMENT_MINUTE,
  DEFAULT_EVENING_HOUR,
  DEFAULT_EVENING_MINUTE,
  DEFAULT_MORNING_HOUR,
  DEFAULT_MORNING_MINUTE,
  notificationPrefsQuery,
  type NotificationPreferences,
} from '@/lib/notificationPreferences';

const DEFAULT_PREFS: NotificationPreferences = {
  dailyRoutineEnabled: true,
  attendanceDigestEnabled: true,
  attendanceRiskEnabled: true,
  assessmentRemindersEnabled: true,
  morningHour: DEFAULT_MORNING_HOUR,
  morningMinute: DEFAULT_MORNING_MINUTE,
  eveningHour: DEFAULT_EVENING_HOUR,
  eveningMinute: DEFAULT_EVENING_MINUTE,
  assessmentHour: DEFAULT_ASSESSMENT_HOUR,
  assessmentMinute: DEFAULT_ASSESSMENT_MINUTE,
};

/**
 * Notification preferences for read-only surfaces that need to know whether
 * reminders are on and at what time. Shares one cached query with Settings,
 * so mounting several screens costs one request, not one each.
 */
export function useNotificationPreferences(): NotificationPreferences {
  const { user } = useAuth();
  const { data } = useQuery(notificationPrefsQuery(user?.uid));
  return data ?? DEFAULT_PREFS;
}
