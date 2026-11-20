import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BlurredModal } from '@/components/ui/AppBlur';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/providers/theme-provider';

export interface ModalAction {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
}

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  placement?: 'center' | 'bottom';
  eyebrow?: string;
  title: string;
  body?: string;
  actions?: ModalAction[];
  children?: ReactNode;
}

/**
 * The app's one modal: a surface card on the blurred backdrop, with a header,
 * optional body and content, and a row of equally sized action buttons.
 */
export function AppModal({
  visible,
  onClose,
  placement = 'center',
  eyebrow,
  title,
  body,
  actions = [],
  children,
}: AppModalProps) {
  const { palette, radius, space } = useTheme();
  const isSheet = placement === 'bottom';
  const stacked = actions.length > 2;

  const card: ViewStyle = {
    width: '100%',
    backgroundColor: palette.surface,
    padding: space.xl,
    gap: space.md,
    ...(isSheet
      ? { borderTopLeftRadius: radius.lg + 10, borderTopRightRadius: radius.lg + 10, paddingBottom: space.xxl }
      : { borderRadius: radius.lg + 10 }),
  };

  return (
    <BlurredModal visible={visible} onClose={onClose} placement={placement}>
      <View style={card}>
        <View style={{ gap: space.xs }}>
          {eyebrow ? <ThemedText type="eyebrow">{eyebrow}</ThemedText> : null}
          <ThemedText type="heading" style={{ fontSize: 24, lineHeight: 28 }}>
            {title}
          </ThemedText>
          {body ? <ThemedText color={palette.muted}>{body}</ThemedText> : null}
        </View>

        {children ? <View>{children}</View> : null}

        {actions.length > 0 && (
          <View style={[stacked ? styles.stack : styles.row, { gap: space.md }]}>
            {actions.map((action) => (
              <Button
                key={action.title}
                title={action.title}
                onPress={action.onPress}
                variant={action.variant ?? 'primary'}
                loading={action.loading}
                disabled={action.disabled}
                style={stacked ? undefined : styles.equal}
              />
            ))}
          </View>
        )}
      </View>
    </BlurredModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  stack: { flexDirection: 'column' },
  equal: { flex: 1 },
});
