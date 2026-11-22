import { useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
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

const DEPTH = 2;

export function Button({ title, onPress, loading, disabled, variant = 'primary', style }: ButtonProps) {
  const { palette } = useTheme();
  const isDisabled = disabled || loading;
  const press = useRef(new Animated.Value(0)).current;

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

  const EDGE: Record<Variant, string> = {
    primary: palette.tealDeep,
    secondary: palette.tealSoft,
    ghost: 'transparent',
    destructive: palette.risk,
  };

  const label = loading ? (
    <ActivityIndicator color={LABEL[variant]} />
  ) : (
    <Text textBreakStrategy="simple" numberOfLines={1} style={[styles.label, { color: LABEL[variant] }]}>
      {title}
    </Text>
  );

  /**
   * Primary is the one main action on a screen; secondary sits beside it;
   * ghost is an inline text action ("Add", "See all"); destructive deletes.
   */
  if (variant === 'ghost') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPress={onPress}
        disabled={isDisabled}
        hitSlop={10}
        style={({ pressed }) => [styles.ghost, pressed && !isDisabled && styles.ghostPressed, isDisabled && styles.disabled, style]}>
        {label}
      </Pressable>
    );
  }

  const animate = (toValue: number, duration: number) =>
    Animated.timing(press, { toValue, duration, useNativeDriver: true }).start();

  const translateY = press.interpolate({ inputRange: [0, 1], outputRange: [0, DEPTH] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      onPressIn={() => animate(1, 100)}
      onPressOut={() => animate(0, 150)}
      disabled={isDisabled}
      style={[styles.wrap, isDisabled && styles.disabled, style]}>
      <View style={[styles.base, { backgroundColor: EDGE[variant] }]}>
        {variant === 'destructive' ? <View style={[StyleSheet.absoluteFill, styles.dim]} /> : null}
      </View>
      <Animated.View
        renderToHardwareTextureAndroid={Platform.OS === 'android'}
        style={[
          styles.face,
          {
            // The tint is translucent, so secondary gets an opaque surface underneath;
            // otherwise the green base shows through the face.
            backgroundColor: variant === 'secondary' ? palette.surface : FILL[variant],
            borderColor: EDGE[variant],
            transform: [{ translateY }],
          },
          variant === 'destructive' && styles.destructiveEdge,
        ]}>
        {variant === 'secondary' ? (
          <View style={[StyleSheet.absoluteFill, styles.softTint, { backgroundColor: palette.tealSoft }]} />
        ) : null}
        {label}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: DEPTH,
  },
  base: {
    position: 'absolute',
    top: DEPTH,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 999,
    overflow: 'hidden',
  },
  dim: { backgroundColor: 'rgba(0,0,0,0.25)' },
  face: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderBottomWidth: 2,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveEdge: { borderColor: 'rgba(0,0,0,0.25)' },
  /** Secondary's fill: the brand tint at half strength. */
  softTint: { borderRadius: 999, opacity: 0.5 },
  ghost: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostPressed: { opacity: 0.6 },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: 'InterSemiBold',
    fontSize: 15,
    ...(Platform.OS === 'android' ? { paddingRight: 2 } : null),
  },
});
