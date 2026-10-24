import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import type { Palette, Theme } from '@/constants/theme';

type SectionProps = {
  /** Eyebrow above the card, e.g. "Academic". Rendered in caps. */
  title: string;
  /** Trailing element on the title row — an action such as "+ Add". */
  action?: ReactNode;
  /** The card's contents; rows are expected to draw their own dividers. */
  children: ReactNode;
};

/**
 * A titled white surface on the page's light background.
 *
 * The one card shape the app's forms are built from, so the profile screen and
 * the edit screen read as the same product. Passing `action` puts a control on
 * the title row rather than inside the card, which keeps row dividers clean.
 */
export function Section({ title, action, children }: SectionProps) {
  const { palette, space, radius, fontFamily } = useTheme();

  return (
    <View style={styles.block(space)}>
      <View style={styles.header(space)}>
        <Text style={styles.title(palette, fontFamily)}>{title}</Text>
        {action}
      </View>
      <View style={styles.card(palette, radius, space)}>{children}</View>
    </View>
  );
}

const styles = {
  block: (space: Theme['space']): ViewStyle => ({
    marginBottom: space.xl,
  }),
  header: (space: Theme['space']): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
    marginBottom: space.sm,
  }),
  title: (palette: Palette, fontFamily: Theme['fontFamily']): TextStyle => ({
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: palette.muted,
  }),
  card: (palette: Palette, radius: Theme['radius'], space: Theme['space']): ViewStyle => ({
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    paddingHorizontal: space.lg,
    /** Just enough to keep a card's first row off the edge; rows and fields
     *  supply the rest of the vertical rhythm themselves. */
    paddingVertical: 2,
  }),
};