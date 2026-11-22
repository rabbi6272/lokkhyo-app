import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { BackStep } from '@/components/ui/BackStep';
import { AppModal } from '@/components/ui/AppModal';
import { Chip } from '@/components/ui/Chip';
import { TimePicker, toHHMM } from '@/components/ui/TimePicker';
import { ThemedText } from '@/components/ThemedText';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { Wrapper } from '@/components/ui/Wrapper';
import { useAuth } from '@/providers/auth-provider';
import { useTheme, useThemeMode } from '@/providers/theme-provider';
import { useProfile } from '@/hooks/useUserProfile';
import { deleteAccount, signOut } from '@/services/auth/auth.services';
import {
  notificationPrefsQuery,
  setAssessmentReminderTime,
  setAssessmentRemindersEnabled,
  setAttendanceDigestEnabled,
  setAttendanceRiskEnabled,
  setDailyRoutineEnabled,
  setEveningTime,
  setMorningTime,
  type NotificationPreferences,
} from '@/lib/notificationPreferences';
import { formatTime12h } from '@/lib/routine';
import { cancelRoutineNotifications, syncRoutineNotifications } from '@/services/notifications/routineNotifications';
import { cancelAssessmentReminders, syncAssessmentReminders } from '@/services/notifications/assessmentReminders';
import { getUpcomingAssessmentRemindersForUser } from '@/services/notifications/upcomingReminders';

/**
 * The attendance digest and its risk alerts are server pushes, and the server
 * only sends those to Android — on iOS these rows would do nothing at all, so
 * they are hidden rather than shown inert.
 */
const SHOW_ATTENDANCE_ROWS = Platform.OS === 'android';

type TimeTarget = 'morning' | 'evening' | 'assessment';

const TIME_PICKER_COPY: Record<TimeTarget, { title: string; body: string }> = {
  morning: {
    title: 'Morning time',
    body: "When the morning summary of today's classes arrives.",
  },
  evening: {
    title: 'Attendance time',
    body: "When you're nudged about classes you haven't marked yet.",
  },
  assessment: {
    title: 'Assessment time',
    body: 'The time of day each daily assessment reminder arrives.',
  },
};

export default function SettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();
  const { deleteProfile } = useProfile();
  const { mode, setMode } = useThemeMode();
  const { palette } = useTheme();

  const cardStyle = [
    styles.listCard,
    {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderWidth: StyleSheet.hairlineWidth,
    },
  ];

  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const prefsLoaded = prefs !== null;

  const [signoutModalVisible, setSignoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingTime, setEditingTime] = useState<TimeTarget | null>(null);
  const [pendingHour, setPendingHour] = useState(7);
  const [pendingMinute, setPendingMinute] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const showNotice = (title: string, body: string) => {
    setNotice({ title, body });
    setNoticeOpen(true);
  };

  const { data: upcomingData, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ['upcomingAssessmentReminders', user?.uid],
    queryFn: () => getUpcomingAssessmentRemindersForUser(queryClient, user!.uid),
    enabled: !!user && (prefs?.assessmentRemindersEnabled ?? false),
  });

  const upcomingCount = upcomingData?.upcoming.length;
  const assessmentReminderDescription =
    prefs?.assessmentRemindersEnabled && !isUpcomingLoading && upcomingCount !== undefined
      ? upcomingCount > 0
        ? `Reminds you daily, starting 2–5 days before · ${upcomingCount} upcoming scheduled`
        : 'Reminds you daily, starting 2–5 days before · nothing upcoming'
      : 'Get notified daily before CTs, quizzes & assignments';

  useEffect(() => {
    queryClient.fetchQuery(notificationPrefsQuery(user?.uid)).then(setPrefs);
  }, [queryClient, user?.uid]);

  // Mirror edits into the shared query so other screens see them without refetching.
  const updatePrefs = (patch: Partial<NotificationPreferences>) => {
    setPrefs((current) => (current ? { ...current, ...patch } : current));
    queryClient.setQueryData<NotificationPreferences>(notificationPrefsQuery(user?.uid).queryKey, (current) =>
      current ? { ...current, ...patch } : current,
    );
  };

  const handleToggleDailyRoutine = async (value: boolean) => {
    updatePrefs({ dailyRoutineEnabled: value });
    await setDailyRoutineEnabled(value);
    if (!user) return;
    if (value) {
      await syncRoutineNotifications(user.uid);
    } else {
      await cancelRoutineNotifications();
    }
  };

  const handleToggleAssessmentReminders = async (value: boolean) => {
    updatePrefs({ assessmentRemindersEnabled: value });
    await setAssessmentRemindersEnabled(value);
    if (!user) return;
    if (value) {
      await syncAssessmentReminders(user.uid);
    } else {
      await cancelAssessmentReminders();
    }
  };

  // The attendance digest and risk alerts are server-side: there is nothing to
  // reschedule on the device, only the preference to persist.
  const handleToggleAttendanceDigest = async (value: boolean) => {
    updatePrefs({ attendanceDigestEnabled: value });
    await setAttendanceDigestEnabled(value);
  };

  const handleToggleAttendanceRisk = async (value: boolean) => {
    updatePrefs({ attendanceRiskEnabled: value });
    await setAttendanceRiskEnabled(value);
  };

  const handleOpenTimePicker = (target: TimeTarget) => {
    if (!prefs) return;
    setEditingTime(target);
    setPendingHour(
      target === 'morning' ? prefs.morningHour : target === 'evening' ? prefs.eveningHour : prefs.assessmentHour,
    );
    setPendingMinute(
      target === 'morning'
        ? prefs.morningMinute
        : target === 'evening'
          ? prefs.eveningMinute
          : prefs.assessmentMinute,
    );
  };

  const handleConfirmTime = async () => {
    const target = editingTime;
    const hour = pendingHour;
    const minute = pendingMinute;
    setEditingTime(null);
    if (!target) return;

    updatePrefs(
      target === 'morning'
        ? { morningHour: hour, morningMinute: minute }
        : target === 'evening'
          ? { eveningHour: hour, eveningMinute: minute }
          : { assessmentHour: hour, assessmentMinute: minute },
    );

    // One write per confirm, not one per pill tapped.
    if (target === 'morning') await setMorningTime(hour, minute);
    if (target === 'evening') await setEveningTime(hour, minute);
    if (target === 'assessment') await setAssessmentReminderTime(hour, minute);

    if (!user) return;
    // These times are read by the server's dispatcher; the sync only clears any
    // local schedules left by an older build.
    if (target === 'morning') await syncRoutineNotifications(user.uid);
    if (target === 'assessment' && prefs?.assessmentRemindersEnabled) {
      await syncAssessmentReminders(user.uid);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteProfile.mutateAsync();
      await deleteAccount();
    } catch (error: any) {
      setDeleting(false);
      setDeleteModalVisible(false);
      if (error?.code === 'auth/requires-recent-login') {
        showNotice(
          'Please sign in again',
          'For your security, sign out and log back in, then try deleting your account again.',
        );
      } else {
        showNotice('Error', 'Failed to delete account. Please try again.');
      }
    }
  };

  return (
    <>
      <BackStep title="Settings" onBack={() => navigation.goBack()} />
      <Wrapper noTopMargin>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={cardStyle}>
            <MenuRow label="Edit Profile" onPress={() => router.push('/profile/edit')} last />
          </View>

          <View style={cardStyle}>
            <View style={styles.themeSection}>
              <ThemedText style={styles.menuLabel}>Appearance</ThemedText>
              <View style={styles.themeChips}>
                {(['system', 'light', 'dark'] as const).map((m) => (
                  <Chip
                    key={m}
                    label={m === 'system' ? 'System' : m === 'light' ? 'Light' : 'Dark'}
                    selected={mode === m}
                    onPress={() => setMode(m)}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={cardStyle}>
            <ToggleRow
              label="Daily routine reminder"
              description="Get a morning summary of today's classes"
              value={prefs?.dailyRoutineEnabled ?? true}
              onValueChange={handleToggleDailyRoutine}
              disabled={!prefsLoaded}
            />
            <MenuRow
              label="Morning time"
              value={formatTime12h(toHHMM(prefs?.morningHour ?? 7, prefs?.morningMinute ?? 0))}
              onPress={() => handleOpenTimePicker('morning')}
            />

            {SHOW_ATTENDANCE_ROWS && (
              <>
                <ToggleRow
                  label="Attendance reminder"
                  description="Nudge me when today's classes are still unmarked"
                  value={prefs?.attendanceDigestEnabled ?? true}
                  onValueChange={handleToggleAttendanceDigest}
                  disabled={!prefsLoaded}
                />
                <MenuRow
                  label="Attendance time"
                  value={formatTime12h(toHHMM(prefs?.eveningHour ?? 20, prefs?.eveningMinute ?? 0))}
                  onPress={() => handleOpenTimePicker('evening')}
                />
                <ToggleRow
                  label="Attendance risk alerts"
                  description="Warn me when a course drops below the eligibility line"
                  value={prefs?.attendanceRiskEnabled ?? true}
                  onValueChange={handleToggleAttendanceRisk}
                  disabled={!prefsLoaded}
                />
              </>
            )}

            <ToggleRow
              label="Assessment reminders"
              description={assessmentReminderDescription}
              value={prefs?.assessmentRemindersEnabled ?? true}
              onValueChange={handleToggleAssessmentReminders}
              disabled={!prefsLoaded}
              last={!SHOW_ATTENDANCE_ROWS}
            />
            <MenuRow
              label="Assessment time"
              value={formatTime12h(toHHMM(prefs?.assessmentHour ?? 7, prefs?.assessmentMinute ?? 0))}
              onPress={() => handleOpenTimePicker('assessment')}
              last
            />
          </View>

          <View style={cardStyle}>
            <Pressable style={styles.menuRow} onPress={() => setDeleteModalVisible(true)}>
              <ThemedText type='defaultSemiBold' style={[styles.dangerLabel, { color: palette.risk }]}>Delete Account</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.versionText}>App version 1.2.0</ThemedText>

          <AppModal
            visible={signoutModalVisible}
            onClose={() => setSignoutModalVisible(false)}
            title="Sign out?"
            body="Are you sure you want to sign out? You will need to log in again to access your account."
            actions={[
              { title: 'Cancel', variant: 'secondary', onPress: () => setSignoutModalVisible(false) },
              {
                title: 'Sign out',
                variant: 'destructive',
                onPress: async () => {
                  try {
                    await signOut();
                  } catch {
                    setSignoutModalVisible(false);
                    showNotice('Error', 'Failed to sign out. Please try again.');
                  }
                },
              },
            ]}
          />

          <AppModal
            visible={editingTime !== null}
            onClose={() => setEditingTime(null)}
            title={editingTime ? TIME_PICKER_COPY[editingTime].title : 'Reminder time'}
            body={editingTime ? TIME_PICKER_COPY[editingTime].body : undefined}
            actions={[
              { title: 'Cancel', variant: 'secondary', onPress: () => setEditingTime(null) },
              { title: 'Save', onPress: handleConfirmTime },
            ]}>
            <TimePicker
              hour={pendingHour}
              minute={pendingMinute}
              onSelect={(hour, minute) => {
                setPendingHour(hour);
                setPendingMinute(minute);
              }}
            />
          </AppModal>

          <AppModal
            visible={deleteModalVisible}
            onClose={() => setDeleteModalVisible(false)}
            title="Delete account?"
            body="This permanently deletes your profile and signs you out. This action cannot be undone."
            actions={[
              { title: 'Cancel', variant: 'secondary', onPress: () => setDeleteModalVisible(false), disabled: deleting },
              { title: 'Delete', variant: 'destructive', onPress: handleDeleteAccount, loading: deleting },
            ]}
          />

          <AppModal
            visible={noticeOpen}
            onClose={() => setNoticeOpen(false)}
            title={notice?.title ?? ''}
            body={notice?.body}
            actions={[{ title: 'OK', onPress: () => setNoticeOpen(false) }]}
          />
        </ScrollView>
      </Wrapper>
    </>
  );
}

function MenuRow({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable style={[styles.menuRow, !last && [styles.rowDivider, { borderBottomColor: palette.line }]]} onPress={onPress}>
      <ThemedText style={styles.menuLabel}>{label}</ThemedText>
      <View style={styles.menuRowRight}>
        {value && <ThemedText style={[styles.menuValue, { color: palette.muted }]}>{value}</ThemedText>}
        <SvgIcon name="chevron" size={16} color={palette.faint} />
      </View>
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  last,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.menuRow, !last && [styles.rowDivider, { borderBottomColor: palette.line }]]}>
      <View style={styles.toggleTextWrap}>
        <ThemedText style={styles.menuLabel}>{label}</ThemedText>
        <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>{description}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: palette.teal, false: palette.line }}
        thumbColor="#FFFFFF"
        style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    borderRadius: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  themeSection: {
    paddingVertical: 16,
    gap: 12,
  },
  themeChips: {
    flexDirection: 'row',
    gap: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: {
    fontSize: 15,
  },
  chevron: {
    opacity: 0.4,
    fontSize: 16,
  },
  menuRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuValue: {
    opacity: 0.5,
    fontSize: 14,
  },
  toggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  toggleDescription: {
    opacity: 0.5,
    fontSize: 12,
  },
  dangerLabel: {
    fontSize: 15,
  },
  versionText: {
    textAlign: 'center',
    opacity: 0.4,
    fontSize: 12,
    marginBottom: 24,
  },
});
