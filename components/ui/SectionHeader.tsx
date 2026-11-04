import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Space } from '@/constants/theme';
import { Button } from './Button';

type SectionHeaderProps = {
  title: string;
  /** Text action on the right, e.g. "See all" or "Add". */
  actionLabel?: string;
  href?: Href;
  onAction?: () => void;
  first?: boolean;
};

export function SectionHeader({ title, actionLabel, href, onAction, first }: SectionHeaderProps) {
  const router = useRouter();
  const action = onAction ?? (href ? () => router.push(href) : undefined);
  return (
    <View style={[styles.row, first && { marginTop: 0 }]}>
      <ThemedText type="heading">{title}</ThemedText>
      {actionLabel && action ? <Button title={actionLabel} variant="ghost" onPress={action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Space.xl,
    marginBottom: Space.sm + 2,
  },
});
