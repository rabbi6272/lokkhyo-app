import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

export function OrDivider() {
  const { palette, fontFamily } = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: palette.line }]} />
      <Text style={[styles.text, { color: palette.faint, fontFamily: fontFamily.medium }]}>or</Text>
      <View style={[styles.line, { backgroundColor: palette.line }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    opacity: 0.6,
  },
  text: {
    fontSize: 13,
  },
});
