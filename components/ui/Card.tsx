import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import type { Palette, Theme } from '@/constants/theme';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Tighter padding for list-like cards. */
  dense?: boolean;
  accessibilityLabel?: string;
};

/** The app's one surface: white, hairline border, no shadow. */
export function Card({ children, onPress, style, dense, accessibilityLabel }: CardProps) {
  const { palette, radius, space } = useTheme();

  const body = [styles.card(palette, radius, space), dense && styles.dense(space), style];
  if (!onPress) return <View style={body}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [body, pressed && styles.pressed(palette)]}>
      {children}
    </Pressable>
  );
}

/** A hairline between rows inside a card. */
export function Divider() {
  const { palette } = useTheme();
  return <View style={styles.divider(palette)} />;
}

const styles = {
  card: (palette: Palette, radius: Theme['radius'], space: Theme['space']): ViewStyle => ({
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    padding: space.lg,
  }),
  dense: (space: Theme['space']): ViewStyle => ({ paddingVertical: space.md }),
  pressed: (palette: Palette): ViewStyle => ({ backgroundColor: palette.tealSoft }),
  divider: (palette: Palette): ViewStyle => ({ height: StyleSheet.hairlineWidth, backgroundColor: palette.line }),
};