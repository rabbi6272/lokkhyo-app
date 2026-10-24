import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import { OfflineBanner } from './OfflineBanner';

/** Page shell: mist background, safe area, side gutters, keyboard-aware. */
export function Wrapper({
  style,
  children,
  noTopMargin,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  noTopMargin?: boolean;
}) {
  const { palette, space, resolved } = useTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: palette.mist }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar
        barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView
        edges={noTopMargin ? ['left', 'right'] : ['top', 'left', 'right']}
        style={[
          styles.safe,
          { paddingTop: noTopMargin ? 0 : space.md, backgroundColor: palette.mist },
          style,
        ]}>
        <OfflineBanner />
        {children}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 16 },
});