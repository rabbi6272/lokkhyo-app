import { useEffect, useState } from 'react';
import { View, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/providers/theme-provider';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(onlineManager.isOnline());
  const { palette, space, radius } = useTheme();

  useEffect(() => {
    return onlineManager.subscribe((online) => {
      setIsOnline(online);
    });
  }, []);

  if (isOnline) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="Offline: showing saved data"
      style={[
        styles.banner,
        {
          backgroundColor: palette.warnSoft,
          borderColor: palette.warn,
          borderRadius: radius.md,
          marginBottom: space.sm,
          paddingVertical: space.xs + 2,
          paddingHorizontal: space.md,
        },
      ]}>
      <ThemedText style={[styles.text, { color: palette.warn }]}>
        Offline — showing saved data
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  text: {
    fontFamily: 'InterMedium',
    fontSize: 12,
  } as TextStyle,
});

