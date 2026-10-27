import { Link, type Href } from 'expo-router';
import { Pressable, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SvgIcon } from './SvgIcon';
import { useTheme } from '@/providers/theme-provider';
import type { Palette, Theme } from '@/constants/theme';

type PageHeaderProps = {
  title: string;
  /** One line of real context above the title: today's date, the semester. */
  eyebrow?: string;
  /** Route of the screen's add action, shown as a round + button. */
  actions?: Href;
  /** Kept for older callers; the add button always shows a plus. */
  icon?: string;
  /** Accessible name of the add button. */
  actionLabel?: string;
  /** @deprecated No longer rendered. */
  helloWave?: boolean;
};

export function PageHeader({ title, eyebrow, actions, actionLabel = 'Add' }: PageHeaderProps) {
  const { palette, radius, space } = useTheme();

  return (
    <View style={styles.header(space)}>
      <View style={styles.text}>
        {eyebrow ? <ThemedText type="eyebrow">{eyebrow.toUpperCase()}</ThemedText> : null}
        <ThemedText type="title" numberOfLines={1}>
          {title}
        </ThemedText>
      </View>
      {actions && (
        <Link href={actions} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={6}
            style={({ pressed }) => [styles.add(radius, palette), pressed && { backgroundColor: palette.tealDeep }]}>
            <SvgIcon name="plus" size={22} color={palette.tealDeep} />
          </Pressable>
        </Link>
      )}
    </View>
  );
}

const styles = {
  header: (space: Theme['space']): ViewStyle => ({
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: space.sm,
    paddingBottom: space.lg,
  }),
  text: { flex: 1, gap: 2 },
  add: (radius: Theme['radius'], palette: Palette): ViewStyle => ({
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.teal,
    alignItems: 'center',
    justifyContent: 'center',
  }),
};