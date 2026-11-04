import { BlurView, type BlurTint } from 'expo-blur';
import { createRef, useEffect, useState, type RefObject } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ModalProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/providers/theme-provider';

/**
 * Whether native blur is available on this platform.
 *
 * With the New Architecture (mandatory since SDK 55), the legacy
 * `NativeUnimoduleProxy` / `UIManager.getViewManagerConfig` detection no
 * longer works. Since `expo-blur` is always compiled into production and
 * preview builds, we simply check that we're not on web.
 */
export const isNativeBlurAvailable = Platform.OS !== 'web';

/** Android only blurs with a `blurTarget`; without one it shows the tint alone. */
const blursWithoutTarget = Platform.OS === 'ios';

/** Root-level blur target (set in `app/_layout.tsx`); modals open in their own window, so never inside it. */
export const modalBlurTarget = createRef<View>();

export interface AppBlurViewProps {
  intensity?: number;
  tint?: BlurTint;
  style?: StyleProp<ViewStyle>;
  overlayColor?: string;
  blurTarget?: RefObject<View | null>;
  children?: React.ReactNode;
}

/**
 * Themed optical blur view wrapping `expo-blur`.
 * Used for the bottom navigation bar and any frosted glass surfaces.
 * Automatically falls back to a translucent tinted surface when running
 * in environments or dev builds without the native ExpoBlurView module.
 */
export function AppBlurView({
  intensity = 40,
  tint,
  style,
  overlayColor,
  blurTarget,
  children,
}: AppBlurViewProps) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const resolvedTint: BlurTint = tint ?? (isDark ? 'dark' : 'light');

  // BlurView reads `blurTarget.current` only when the prop changes, and the target's ref
  // attaches after this view mounts, so hand it over one commit later.
  const [activeBlurTarget, setActiveBlurTarget] = useState<RefObject<View | null>>();
  useEffect(() => setActiveBlurTarget(blurTarget), [blurTarget]);
  const blurs = isNativeBlurAvailable && (blursWithoutTarget || !!activeBlurTarget);

  const defaultOverlay = isDark
    ? blurs
      ? 'rgba(15, 30, 36, 0.45)'
      : 'rgba(15, 30, 36, 0.88)'
    : blurs
      ? 'rgba(255, 255, 255, 0.45)'
      : 'rgba(255, 255, 255, 0.90)';

  return (
    <View style={[styles.container, style]}>
      {isNativeBlurAvailable ? (
        <BlurView
          intensity={intensity}
          tint={resolvedTint}
          blurTarget={activeBlurTarget}
          blurMethod={activeBlurTarget ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: overlayColor ?? defaultOverlay },
        ]}
      />
      {children}
    </View>
  );
}

export interface BlurredModalProps extends Omit<ModalProps, 'children'> {
  visible: boolean;
  onClose?: () => void;
  placement?: 'center' | 'bottom';
  blurIntensity?: number;
  overlayStyle?: StyleProp<ViewStyle>;
  dismissOnBackdropPress?: boolean;
  children: React.ReactNode;
}

/**
 * Unified blur modal wrapper for all modals and bottom sheets.
 *
 * Encapsulates:
 * - Native `Modal` with `transparent={true}`
 * - Theme-reactive `BlurView` optical backdrop (with graceful translucent fallback)
 * - Background dimming for contrast
 * - Outside tap-to-dismiss (with click propagation blocking on inner dialog)
 * - Android hardware back button handler
 */
export function BlurredModal({
  visible,
  onClose,
  placement = 'center',
  blurIntensity = 30,
  animationType,
  overlayStyle,
  dismissOnBackdropPress = true,
  children,
  ...modalProps
}: BlurredModalProps) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const resolvedTint: BlurTint = isDark ? 'dark' : 'light';

  const defaultAnim = placement === 'bottom' ? 'slide' : 'fade';
  const overlayBg = isDark
    ? isNativeBlurAvailable
      ? 'rgba(15, 30, 36, 0.55)'
      : 'rgba(0, 0, 0, 0.70)'
    : isNativeBlurAvailable
      ? 'rgba(15, 30, 36, 0.35)'
      : 'rgba(15, 30, 36, 0.50)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType ?? defaultAnim}
      onRequestClose={onClose}
      {...modalProps}
    >
      <View
        style={[
          styles.backdrop,
          placement === 'bottom' ? styles.placementBottom : styles.placementCenter,
          overlayStyle,
        ]}
      >
        {/* Optical blur layer (when native module is available) */}
        {isNativeBlurAvailable ? (
          <BlurView
            intensity={blurIntensity}
            tint={resolvedTint}
            blurTarget={modalBlurTarget}
            blurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {/* Contrast dimmer layer */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overlayBg },
          ]}
        />
        {/* Outside tap dismiss handler */}
        {dismissOnBackdropPress && onClose ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessible={false}
            accessibilityRole="none"
          />
        ) : null}
        {/* Inner modal content wrapped to prevent event bubbling */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={placement === 'bottom' ? styles.sheetWrapper : styles.centerWrapper}
        >
          {children}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  placementCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placementBottom: {
    justifyContent: 'flex-end',
    padding: 0,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  sheetWrapper: {
    width: '100%',
  },
});
