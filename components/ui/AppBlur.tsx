import type { BlurTint } from 'expo-blur';
import {
  Modal,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
  type ModalProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/providers/theme-provider';

function checkNativeBlurAvailable(): boolean {
  if (Platform.OS === 'web') return false;

  try {
    const unimoduleProxy = NativeModules?.NativeUnimoduleProxy;
    if (unimoduleProxy?.viewManagersMetadata) {
      return Boolean(unimoduleProxy.viewManagersMetadata.ExpoBlurView);
    }
    if (UIManager?.getViewManagerConfig) {
      return Boolean(UIManager.getViewManagerConfig('ExpoBlurView'));
    }
  } catch {
    return false;
  }
  return false;
}

export const isNativeBlurAvailable = checkNativeBlurAvailable();

// Dynamically require expo-blur only if the native view manager is registered in the host binary.
// This prevents missing native view manager warnings on dev client APKs built without expo-blur.
let NativeBlurView: React.ComponentType<any> | null = null;
if (isNativeBlurAvailable) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeBlurView = require('expo-blur').BlurView;
  } catch {
    NativeBlurView = null;
  }
}

export interface AppBlurViewProps {
  intensity?: number;
  tint?: BlurTint;
  style?: StyleProp<ViewStyle>;
  overlayColor?: string;
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
  children,
}: AppBlurViewProps) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const resolvedTint: BlurTint = tint ?? (isDark ? 'dark' : 'light');

  const defaultOverlay = isDark
    ? isNativeBlurAvailable
      ? 'rgba(15, 30, 36, 0.65)'
      : 'rgba(15, 30, 36, 0.88)'
    : isNativeBlurAvailable
      ? 'rgba(255, 255, 255, 0.70)'
      : 'rgba(255, 255, 255, 0.90)';

  return (
    <View style={[styles.container, style]}>
      {NativeBlurView ? (
        <NativeBlurView
          intensity={intensity}
          tint={resolvedTint}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
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
  blurIntensity = 40,
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
        {NativeBlurView ? (
          <NativeBlurView
            intensity={blurIntensity}
            tint={resolvedTint}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
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
