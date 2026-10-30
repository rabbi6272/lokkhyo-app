import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar, StyleSheet } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { modalBlurTarget } from '@/components/ui/AppBlur';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { QueryProvider, useIsRestoring } from '@/providers/query-provider';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { useCourses } from '@/hooks/useCourses';
import { useRoutines } from '@/hooks/useRoutines';
import { useScheduledNotifications } from '@/hooks/useScheduledNotifications';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, initializing } = useAuth();
  const { isLoading: isCoursesLoading } = useCourses();
  const { isLoading: isRoutinesLoading } = useRoutines();
  const { palette } = useTheme();
  useScheduledNotifications();
  const isRestoring = useIsRestoring();

  const [loaded] = useFonts({
    InterRegular: require('../assets/fonts/Inter-Regular.ttf'),
    InterMedium: require('../assets/fonts/Inter-Medium.ttf'),
    InterSemiBold: require('../assets/fonts/Inter-SemiBold.ttf'),
    SoraSemiBold: require('../assets/fonts/Sora-SemiBold.ttf'),
    SoraBold: require('../assets/fonts/Sora-Bold.ttf'),
  });

  const ready = !initializing && loaded && !isCoursesLoading && !isRoutinesLoading && !isRestoring;

  return (
    <>
      {initializing || !loaded || isRestoring ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.mist } }} />
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.mist } }}>
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="course/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="course/new" options={{ headerShown: false }} />
            <Stack.Screen name="assessment/new" options={{ headerShown: false }} />
            <Stack.Screen name="reminder/new" options={{ headerShown: false }} />
            <Stack.Screen name="routine/new" options={{ headerShown: false }} />
            <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
            <Stack.Screen name="profile/transcript" options={{ headerShown: false }} />
            <Stack.Screen name="profile/simulator" options={{ headerShown: false }} />
            <Stack.Screen name="semesters/index" options={{ headerShown: false }} />
            <Stack.Screen name="semesters/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="semesters/new" options={{ headerShown: false }} />
            <Stack.Screen name="settings/settings" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={!user}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      )}
      <AnimatedSplash ready={ready} />
    </>
  );
}

function AppWithTheme() {
  const { resolved } = useTheme();
  const barStyle = resolved === 'dark' ? 'light-content' : 'dark-content';

  return (
    <>
      <StatusBar barStyle={barStyle} backgroundColor="transparent" translucent />
      <QueryProvider>
        <AuthProvider>
          <BlurTargetView ref={modalBlurTarget} style={StyleSheet.absoluteFill}>
            <RootNavigator />
          </BlurTargetView>
        </AuthProvider>
      </QueryProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  );
}
