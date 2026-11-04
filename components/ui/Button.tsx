import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
};

export function Button({ title, onPress, loading, disabled, variant = 'primary', style }: ButtonProps) {
  const { palette } = useTheme();
  const isDisabled = disabled || loading;

  const FILL: Record<Variant, string> = {
    primary: palette.teal,
    secondary: palette.tealSoft,
    ghost: 'transparent',
    destructive: palette.risk,
  };

  const LABEL: Record<Variant, string> = {
    primary: palette.onTeal,
    secondary: palette.teal,
    ghost: palette.teal,
    destructive: '#FFFFFF',
  };

  /**
   * Primary is the one main action on a screen; secondary sits beside it;
   * ghost is an inline text action ("Add", "See all"); destructive deletes.
   */
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={variant === 'ghost' ? 10 : undefined}
      style={({ pressed }) => [
        variant === 'ghost' ? styles.ghost : styles.base,
        { backgroundColor: FILL[variant] },
        pressed && !isDisabled && (variant === 'ghost' ? styles.ghostPressed : styles.pressed),
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={LABEL[variant]} />
      ) : (
        <Text style={[styles.label, { color: LABEL[variant] }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  ghostPressed: { opacity: 0.6 },
  disabled: { opacity: 0.45 },
  label: { fontFamily: 'InterSemiBold', fontSize: 15 },
});