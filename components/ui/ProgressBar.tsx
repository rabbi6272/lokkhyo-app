import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/providers/theme-provider';
import type { Palette } from '@/constants/theme';

type ProgressBarProps = {
  percent: number;
  color?: string;
  /** Where the target line sits, 0–100 — e.g. 60 for the attendance mark. */
  target?: number;
};

/**
 * A thin bar that fills to `percent`. With `target`, a small tick marks the
 * line the student is aiming for, so the bar reads as "how far from the
 * target", not just "how full".
 */
export function ProgressBar({ percent, color, target }: ProgressBarProps) {
  const { palette } = useTheme();
  const clamped = Math.min(100, Math.max(0, percent));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 700 });
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={styles.wrap}>
      <View style={styles.track(palette)}>
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: color ?? palette.teal }]} />
      </View>
      {target !== undefined && <View style={[styles.tick(palette), { left: `${Math.min(100, Math.max(0, target))}%` }]} />}
    </View>
  );
}

const styles = {
  wrap: { height: 12, justifyContent: 'center' } as ViewStyle,
  track: (palette: Palette): ViewStyle => ({
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: palette.line,
  }),
  fill: { height: '100%', borderRadius: 3 } as ViewStyle,
  tick: (palette: Palette): ViewStyle => ({
    position: 'absolute',
    width: 2,
    height: 12,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: palette.ink,
  }),
};