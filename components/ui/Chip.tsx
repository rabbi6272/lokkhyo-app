import { Pressable, Text, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import type { Palette, Theme } from '@/constants/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A selectable pill: a day, a semester, a course. */
export function Chip({ label, selected, onPress }: ChipProps) {
  const { palette, radius } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip(radius),
        selected ? styles.selected(palette) : styles.idle(palette),
        pressed && { opacity: 0.8 },
      ]}>
      <Text style={[styles.label, { color: selected ? palette.onTeal : palette.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = {
  chip: (radius: Theme['radius']): ViewStyle => ({
    paddingHorizontal: 16,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
  }),
  idle: (palette: Palette): ViewStyle => ({ backgroundColor: palette.surface, borderColor: palette.line }),
  selected: (palette: Palette): ViewStyle => ({ backgroundColor: palette.teal, borderColor: palette.teal }),
  label: { fontFamily: 'InterMedium', fontSize: 14 } as TextStyle,
};