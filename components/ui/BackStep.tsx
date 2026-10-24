import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/providers/theme-provider';
import { SvgIcon } from './SvgIcon';

/** Top bar of a pushed screen: a round back button and the screen's name. */
export function BackStep({ title, onBack }: { title: string; onBack?: () => void }) {
  const { palette, space, radius } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={{ width: '100%', backgroundColor: palette.mist }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          height: 56,
          paddingHorizontal: space.lg,
        }}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [
              {
                width: 38,
                height: 38,
                borderRadius: radius.pill,
                backgroundColor: palette.surface,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: palette.line,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed && { opacity: 0.6 },
            ]}>
            <SvgIcon name="arrowLeft" size={20} color={palette.ink} />
          </Pressable>
        ) : null}
        <Text
          style={{ flex: 1, fontFamily: FontFamily.display, fontSize: 18, color: palette.ink }}
          numberOfLines={1}>
          {title}
        </Text>
      </View>
    </SafeAreaView>
  );
}
