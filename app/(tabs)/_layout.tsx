import { Tabs } from 'expo-router';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { createRef, useRef, type RefObject } from 'react';
import { useTheme } from '@/providers/theme-provider';

import { AppBlurView } from '@/components/ui/AppBlur';
import { SvgIcon } from '@/components/ui/SvgIcon';

const TABS = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'courses', title: 'Courses', icon: 'courses' },
  { name: 'routine', title: 'Routine', icon: 'routine' },
  { name: 'attendance', title: 'Attendance', icon: 'calender' },
  { name: 'profile', title: 'Profile', icon: 'user' },
] as const;

export default function TabLayout() {
  const { palette, fontFamily } = useTheme();
  // One blur target per screen: the tab bar is a sibling of the screens, never inside the view it blurs.
  const targets = useRef(new Map<string, RefObject<View | null>>()).current;
  const targetFor = (key: string) => {
    if (!targets.has(key)) targets.set(key, createRef<View>());
    return targets.get(key)!;
  };

  const barStyle: ViewStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    paddingTop: 6,
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    elevation: 0,
  };

  return (
    <Tabs
      screenLayout={({ route, children }) => (
        <BlurTargetView ref={targetFor(route.key)} style={styles.screen}>
          {children}
        </BlurTargetView>
      )}
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'shift',
        lazy: true,
        tabBarActiveTintColor: palette.teal,
        tabBarInactiveTintColor: palette.faint,
        tabBarStyle: barStyle,
        tabBarBackground: () => (
          <AppBlurView intensity={40} blurTarget={targetFor(route.key)} style={StyleSheet.absoluteFill} />
        ),
        tabBarLabel: ({ focused, color, children }) => (
          <Text style={[styles.label, { color, fontFamily: focused ? fontFamily.semibold : fontFamily.medium }]}>
            {children}
          </Text>
        ),
      })}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconWrap}>
                <View style={[styles.marker, focused && { backgroundColor: palette.teal }]} />
                <SvgIcon name={tab.icon} size={24} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  label: { fontSize: 12, paddingTop: 2 },
  iconWrap: { alignItems: 'center', gap: 4 },
  /** A short bar above the active tab's icon — the only active-state decoration. */
  marker: { width: 18, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginTop: -6 },
});
