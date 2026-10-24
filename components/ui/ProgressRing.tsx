import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '@/providers/theme-provider';
import type { Palette } from '@/constants/theme';

type ProgressRingProps = {
  percent: number;
  size?: number;
  color?: string;
  /** Target line, 0–100, drawn as a tick across the ring. */
  target?: number;
  /** Show the number in the middle (default true). */
  showValue?: boolean;
};

/**
 * Lokkhyo's signature mark: progress as a ring with its target drawn on it.
 * Starts at 12 o'clock and runs clockwise; the tick shows the line to reach.
 */
export function ProgressRing({
  percent,
  size = 48,
  color,
  target,
  showValue = true,
}: ProgressRingProps) {
  const { palette } = useTheme();
  const ringColor = color ?? palette.teal;

  const value = Math.min(100, Math.max(0, percent));
  const stroke = Math.max(3, Math.round(size / 12));
  const radius = (size - stroke) / 2 - 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let tick: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (target !== undefined) {
    const angle = (Math.min(100, Math.max(0, target)) / 100) * 2 * Math.PI - Math.PI / 2;
    const inner = radius - stroke;
    const outer = radius + stroke;
    tick = {
      x1: center + inner * Math.cos(angle),
      y1: center + inner * Math.sin(angle),
      x2: center + outer * Math.cos(angle),
      y2: center + outer * Math.sin(angle),
    };
  }

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={palette.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - value / 100)}
          transform={`rotate(-90 ${center} ${center})`}
        />
        {tick && <Line {...tick} stroke={palette.ink} strokeWidth={2} strokeLinecap="round" />}
      </Svg>
      {showValue && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.center}>
            <Text style={[styles.value(palette), { fontSize: Math.max(10, Math.round(size * 0.26)) }]}>
              {Math.round(value)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = {
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  value: (palette: Palette): TextStyle => ({ fontFamily: 'SoraBold', color: palette.ink }),
};