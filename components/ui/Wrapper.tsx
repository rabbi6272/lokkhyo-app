import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme-provider';
import { OfflineBanner } from './OfflineBanner';

/**
 * The page background: mist fading to soft teal. Starts at mist so it meets
 * BackStep and the status bar without a seam.
 */
export function PageBackground({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { palette } = useTheme();
  return (
    <LinearGradient colors={[palette.mist, palette.tealSoft]} locations={[0.35, 1]} style={[styles.flex, style]}>
      {children}
    </LinearGradient>
  );
}

/** Page shell: gradient background, safe area, side gutters, keyboard-aware. */
export function Wrapper({
  style,
  children,
  noTopMargin,
  keyboardAvoiding,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  noTopMargin?: boolean;
  /** Also lift content above the keyboard on Android (iOS always does). */
  keyboardAvoiding?: boolean;
}) {
  const { space, resolved } = useTheme();

  return (
    <PageBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' || keyboardAvoiding ? 'padding' : undefined}>
        <StatusBar
          barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <SafeAreaView
          edges={noTopMargin ? ['left', 'right'] : ['top', 'left', 'right']}
          style={[styles.safe, { paddingTop: noTopMargin ? 0 : space.md }, style]}>
          <OfflineBanner />
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 16 },
});
