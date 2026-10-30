import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

/** Decorative circles for hero cards, in brand tint so they work in both themes. Parent needs `overflow: 'hidden'`. */
export function Blobs() {
  const { palette } = useTheme();
  return (
    <>
      <View pointerEvents="none" style={[styles.circle, styles.large, { backgroundColor: palette.teal }]} />
      <View pointerEvents="none" style={[styles.circle, styles.small, { backgroundColor: palette.tealOnDark }]} />
      <View pointerEvents="none" style={[styles.circle, styles.dot, { backgroundColor: palette.teal }]} />
    </>
  );
}

const styles = StyleSheet.create({
  circle: { position: 'absolute', borderRadius: 999 },
  large: { width: 150, height: 150, top: -60, right: -45, opacity: 0.16 },
  small: { width: 60, height: 60, top: 36, right: 70, opacity: 0.5 },
  dot: { width: 18, height: 18, top: 18, right: 150, opacity: 0.25 },
});
