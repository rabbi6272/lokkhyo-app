import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { BackStep } from '@/components/ui/BackStep';
import { BlurredModal } from '@/components/ui/AppBlur';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ThemedText } from '@/components/ThemedText';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { Wrapper } from '@/components/ui/Wrapper';
import { useAuth } from '@/providers/auth-provider';
import { useTheme, useThemeMode } from '@/providers/theme-provider';
import { useProfile } from '@/hooks/useUserProfile';
import { deleteAccount, signOut } from '@/services/auth/auth.services';
import {
  getNotificationPreferences,
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
import {
  cancelAssessmentReminders,
  getUpcomingAssessmentRemindersForUser,
  syncAssessmentReminders,
} from '@/services/notifications/assessmentReminders';

/**
 * The attendance digest and its risk alerts are server pushes, and the server
 * only sends those to Android — on iOS these rows would do nothing at all, so
 * they are hidden rather than shown inert.
 */
const SHOW_ATTENDANCE_ROWS = Platform.OS === 'android';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_STEP = 5;
const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

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

function toHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Two scrollable columns of pills — an hour and a minute — so a reminder time
 * can be any moment in the day rather than the nine morning slots the old list
 * offered. Built from the existing Chip rather than a native date picker, so
 * it adds no dependency and needs no dev-client rebuild.
 */
function TimePicker({
  hour,
  minute,
  onSelect,
}: {
  hour: number;
  minute: number;
  onSelect: (hour: number, minute: number) => void;
}) {
  return (
    <View style={styles.pickerWrap}>
      <ThemedText type="title" style={styles.pickerReadout}>
        {formatTime12h(toHHMM(hour, minute))}
      </ThemedText>
      <View style={styles.pickerColumns}>
        <View style={styles.pickerColumn}>
          <ThemedText style={styles.pickerHeading}>Hour</ThemedText>
          <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
            {HOUR_OPTIONS.map((h) => (
              <Chip
                key={h}
                label={String(h).padStart(2, '0')}
                selected={h === hour}
                onPress={() => onSelect(h, minute)}
              />
            ))}
          </ScrollView>
        </View>
        <View style={styles.pickerColumn}>
          <ThemedText style={styles.pickerHeading}>Minute</ThemedText>
          <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
            {MINUTE_OPTIONS.map((m) => (
              <Chip
                key={m}
                label={String(m).padStart(2, '0')}
                selected={m === minute}
                onPress={() => onSelect(hour, m)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

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
  const modalContentStyle = [styles.modalContent, { backgroundColor: palette.surface }];

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const prefsLoaded = prefs !== null;

  const [signoutModalVisible, setSignoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingTime, setEditingTime] = useState<TimeTarget | null>(null);
  const [pendingHour, setPendingHour] = useState(7);
  const [pendingMinute, setPendingMinute] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const { data: upcomingData, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ['upcomingAssessmentReminders', user?.uid],
    queryFn: () => getUpcomingAssessmentRemindersForUser(user!.uid),
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
    getNotificationPreferences().then(setPrefs);
  }, []);

  const updatePrefs = (patch: Partial<NotificationPreferences>) =>
    setPrefs((current) => (current ? { ...current, ...patch } : current));

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
    // The morning time drives the iOS local weekly schedule; Android gets the
    // morning summary as a server push, so this is a no-op there.
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
        Alert.alert(
          'Please sign in again',
          'For your security, sign out and log back in, then try deleting your account again.',
        );
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
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

          <ThemedText style={styles.versionText}>App version 1.0.0</ThemedText>

          <BlurredModal
            visible={signoutModalVisible}
            onClose={() => setSignoutModalVisible(false)}
          >
            <View style={modalContentStyle}>
              <ThemedText type="title" style={styles.modalTitle}>
                Sign out?
              </ThemedText>
              <ThemedText>
                Are you sure you want to sign out? You will need to log in again to access your account.
              </ThemedText>
              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="secondary" onPress={() => setSignoutModalVisible(false)} />
                <Button
                  title="Sign Out"
                  variant="destructive"
                  onPress={async () => {
                    try {
                      await signOut();
                    } catch {
                      Alert.alert('Error', 'Failed to sign out. Please try again.');
                    }
                  }}
                />
              </View>
            </View>
          </BlurredModal>

          <BlurredModal
            visible={editingTime !== null}
            onClose={() => setEditingTime(null)}
          >
            <View style={modalContentStyle}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editingTime ? TIME_PICKER_COPY[editingTime].title : 'Reminder time'}
              </ThemedText>
              <ThemedText>{editingTime ? TIME_PICKER_COPY[editingTime].body : ''}</ThemedText>
              <TimePicker
                hour={pendingHour}
                minute={pendingMinute}
                onSelect={(hour, minute) => {
                  setPendingHour(hour);
                  setPendingMinute(minute);
                }}
              />
              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="secondary" onPress={() => setEditingTime(null)} />
                <Button title="Save" onPress={handleConfirmTime} />
              </View>
            </View>
          </BlurredModal>

          <BlurredModal
            visible={deleteModalVisible}
            onClose={() => setDeleteModalVisible(false)}
          >
            <View style={modalContentStyle}>
              <ThemedText type="title" style={styles.modalTitle}>
                Delete account?
              </ThemedText>
              <ThemedText>
                This permanently deletes your profile and signs you out. This action cannot be undone.
              </ThemedText>
              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="secondary" onPress={() => setDeleteModalVisible(false)} disabled={deleting} />
                <Button title="Delete" variant="destructive" onPress={handleDeleteAccount} loading={deleting} />
              </View>
            </View>
          </BlurredModal>
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
  pickerWrap: {
    marginTop: 16,
    marginBottom: 8,
  },
  pickerReadout: {
    textAlign: 'center',
    marginBottom: 12,
  },
  pickerColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerHeading: {
    opacity: 0.5,
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerList: {
    maxHeight: 220,
  },
  pickerListContent: {
    gap: 8,
    alignItems: 'center',
    paddingBottom: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,30,36,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 32,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
