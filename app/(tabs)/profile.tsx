import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/ui/Avatar';
import { BlurredModal } from '@/components/ui/AppBlur';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { useTheme } from '@/providers/theme-provider';
import { useSemesters } from '@/hooks/useSemesters';
import { useProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/providers/auth-provider';
import { useCgpa } from '@/services/grades/grades.hooks';
import { formatGpa } from '@/services/grades/grades.services';
import { signOut } from '@/services/auth/auth.services';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profileData, isLoading } = useProfile();
  const { semesters } = useSemesters();
  const { data: cgpa } = useCgpa(user?.uid);
  const { palette, resolved, fontFamily } = useTheme();
  const isDark = resolved === 'dark';
  const router = useRouter();
  const [signoutModalVisible, setSignoutModalVisible] = useState(false);

  const currentSemester = semesters.find((s) => s.id === profileData?.currentSemesterId);
  const fullName = profileData?.fullName || user?.displayName || 'Student';
  const email = user?.email ?? '';

  return (
    <View style={[styles.screen, { backgroundColor: palette.mist }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'light-content'} backgroundColor="transparent" translucent />

      <SafeAreaView
        edges={['top']}
        style={[
          styles.masthead,
          {
            backgroundColor: isDark ? palette.surface : palette.teal,
            borderColor: palette.line,
            borderBottomWidth: isDark ? StyleSheet.hairlineWidth : 0,
          },
        ]}>
        <View style={styles.mastheadInner}>
          {/* <Text style={styles.eyebrow}>LOKKHYO</Text> */}

          <View style={styles.identity}>
            <Avatar name={fullName} photoUrl={profileData?.photoUrl} size={64} tone={isDark ? 'onPage' : 'onTeal'} />
            <View style={styles.identityText}>
              <Text
                style={[
                  styles.name,
                  { color: isDark ? palette.ink : '#FFFFFF', fontFamily: fontFamily.displayBold },
                ]}
                numberOfLines={1}>
                {fullName}
              </Text>
              {email ? (
                <Text
                  style={[
                    styles.email,
                    { color: isDark ? palette.muted : 'rgba(255,255,255,0.85)', fontFamily: fontFamily.regular },
                  ]}
                  numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.teal} />
            <ThemedText style={styles.loadingText}>Loading profile…</ThemedText>
          </View>
        ) : (
          <>
            <Section title="ACADEMIC">
              <InfoRow label="University" value={profileData?.university || '—'} />
              <InfoRow label="Department" value={profileData?.department || '—'} />
              <InfoRow label="Semester" value={currentSemester?.name || '—'} />
              <InfoRow label="CGPA" value={formatGpa(cgpa?.cgpa)} />
              <InfoRow
                label="Target CGPA"
                value={profileData?.targetCgpa ? String(profileData.targetCgpa) : '—'}
                last
              />
            </Section>

            <Section title="QUICK LINKS">
              <MenuRow
                icon="courses"
                label="Courses"
                onPress={() => router.push('/(tabs)/courses')}
              />
              <MenuRow
                icon="calender"
                label="Semesters"
                onPress={() => router.push('/semesters')}
              />
              <MenuRow icon="routine" label="Routine" onPress={() => router.push('/(tabs)/routine')} />
              <MenuRow
                icon="calender"
                label="Attendance"
                onPress={() => router.push('/(tabs)/attendance')}
              />
              <MenuRow
                icon="courses"
                label="Transcript & degree status"
                onPress={() => router.push('/profile/transcript')}
              />
              <MenuRow
                icon="courses"
                label="What-if GPA simulator"
                onPress={() => router.push('/profile/simulator')}
              />
              <MenuRow
                icon="settings"
                label="Settings"
                onPress={() => router.push('/settings/settings')}
                last
              />
            </Section>

            <Section title="ACCOUNT">
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => setSignoutModalVisible(true)}>
                <View style={styles.rowLeft}>
                  <SvgIcon name="logout" size={20} color={palette.risk} />
                  <ThemedText type="defaultSemiBold" style={[styles.dangerLabel, { color: palette.risk }]}>
                    Log out
                  </ThemedText>
                </View>
              </Pressable>
            </Section>

            <ThemedText style={styles.versionText}>Lokkhyo · version 1.1.0</ThemedText>
          </>
        )}
      </ScrollView>

      <BlurredModal visible={signoutModalVisible} onClose={() => setSignoutModalVisible(false)}>
        <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
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
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: 'courses' | 'calender' | 'settings' | 'routine';
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        !last && [styles.rowDivider, { borderBottomColor: palette.line }],
        pressed && styles.pressed,
      ]}
      onPress={onPress}>
      <View style={styles.rowLeft}>
        <SvgIcon name={icon} size={20} color={palette.muted} />
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      </View>
      <SvgIcon name="chevron" size={16} color={palette.faint} />
    </Pressable>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.row, !last && [styles.rowDivider, { borderBottomColor: palette.line }]]}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.rowValue} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  masthead: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  mastheadInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  eyebrow: {
    fontFamily: 'InterSemiBold',
    fontSize: 12,
    letterSpacing: 3,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
  },
  identityText: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 21,
  },
  email: {
    fontSize: 13,
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
  },
  editLabel: {
    fontFamily: 'InterSemiBold',
    fontSize: 13,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 104,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  loadingText: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
  },
  rowValue: {
    fontSize: 15,
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 16,
  },
  chevron: {
    fontSize: 18,
    lineHeight: 20,
  },
  dangerLabel: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.6,
  },
  versionText: {
    textAlign: 'center',
    opacity: 0.4,
    fontSize: 12,
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
