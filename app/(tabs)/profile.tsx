import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { Button } from '@/components/ui/Button';
import { PageBackground } from '@/components/ui/Wrapper';
import { AppModal } from '@/components/ui/AppModal';
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
  const [signOutFailed, setSignOutFailed] = useState(false);

  const currentSemester = semesters.find((s) => s.id === profileData?.currentSemesterId);
  const fullName = profileData?.fullName || user?.displayName || 'Student';
  const email = user?.email ?? '';
  const studyLine = [profileData?.department, profileData?.university].filter(Boolean).join(' · ');
  const hasCgpa = cgpa?.cgpa != null;

  return (
    <PageBackground>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <SafeAreaView
        edges={['top']}
        style={[
          styles.masthead,
          {
            // Light: same soft fill and edge as the secondary button (an opaque
            // surface with the brand tint at half strength). Dark: a plain card.
            backgroundColor: palette.surface,
            borderColor: isDark ? palette.line : palette.tealSoft,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}>
        {!isDark ? (
          <View style={[StyleSheet.absoluteFill, styles.mastheadTint, { backgroundColor: palette.tealSoft }]} />
        ) : null}
        <View style={styles.mastheadInner}>
          {/* <Text style={styles.eyebrow}>LOKKHYO</Text> */}

          <View style={styles.identity}>
            <Avatar name={fullName} photoUrl={profileData?.photoUrl} size={80} tone="onPage" />
            <View style={styles.identityText}>
              <Text
                style={[
                  styles.name,
                  { color: palette.ink, fontFamily: fontFamily.displayBold },
                ]}
                numberOfLines={1}>
                {fullName}
              </Text>
              {email ? (
                <Text
                  style={[
                    styles.email,
                    { color: palette.muted, fontFamily: fontFamily.regular },
                  ]}
                  numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
              <Button
                title="Edit profile"
                variant="ghost"
                onPress={() => router.push('/profile/edit')}
                style={styles.editLink}
              />
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

            <ThemedText style={styles.versionText}>Lokkhyo · version 1.2.0</ThemedText>
          </>
        )}
      </ScrollView>

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
                setSignOutFailed(true);
              }
            },
          },
        ]}
      />

      <AppModal
        visible={signOutFailed}
        onClose={() => setSignOutFailed(false)}
        title="Error"
        body="Failed to sign out. Please try again."
        actions={[{ title: 'OK', onPress: () => setSignOutFailed(false) }]}
      />
    </PageBackground>
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
  masthead: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  mastheadTint: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    opacity: 0.5,
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
  editLink: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    marginTop: 4,
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
});
