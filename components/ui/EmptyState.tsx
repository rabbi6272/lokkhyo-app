import { View, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Button } from './Button';
import { useTheme } from '@/providers/theme-provider';
import type { Palette, Theme } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** What to do next when a list is empty: a dashed card with one action. */
export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  const { palette, radius, space } = useTheme();

  return (
    <View style={styles.box(palette, radius, space)}>
      <ThemedText type="defaultSemiBold" style={styles.center}>
        {title}
      </ThemedText>
      {body ? (
        <ThemedText type="caption" style={styles.center}>
          {body}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} style={styles.action(space)} />
      ) : null}
    </View>
  );
}

const styles = {
  box: (palette: Palette, radius: Theme['radius'], space: Theme['space']): ViewStyle => ({
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.line,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    gap: space.xs,
  }),
  center: { textAlign: 'center' } as TextStyle,
  action: (space: Theme['space']): ViewStyle => ({ marginTop: space.md, minHeight: 40 }),
};