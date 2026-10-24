import { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Icons } from '@/constants/icons';
import { useTheme } from '@/providers/theme-provider';
import type { Palette, Theme } from '@/constants/theme';

type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  required?: boolean;
};

export function Field({ label, error, required, style, onFocus, onBlur, ...rest }: FieldProps) {
  const { palette, radius, space, fontFamily } = useTheme();
  const isPassword = Boolean(rest.secureTextEntry);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container(space)}>
      <Text style={styles.label(palette, fontFamily)}>
        {label}
        {required && <Text style={styles.required(palette)}> *</Text>}
      </Text>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={palette.faint}
          selectionColor={palette.teal}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input(palette, radius),
            { borderColor: error ? palette.risk : focused ? palette.teal : palette.line },
            isPassword && styles.passwordInput,
            style,
          ]}
          {...rest}
          secureTextEntry={isPassword ? !passwordVisible : rest.secureTextEntry}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            hitSlop={8}
            onPress={() => setPasswordVisible((v) => !v)}
            style={styles.eyeToggle}>
            <SvgXml
              xml={(passwordVisible ? Icons.EYE_OFF : Icons.EYE).replace(/stroke="[^"]*"/g, `stroke="${palette.muted}"`)}
              width={18}
              height={18}
            />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error(palette, fontFamily)}>{error}</Text>}
    </View>
  );
}

const styles = {
  container: (space: Theme['space']): ViewStyle => ({
    gap: 6,
    marginBottom: space.lg,
  }),
  label: (palette: Palette, fontFamily: Theme['fontFamily']): TextStyle => ({
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: palette.muted,
    paddingLeft: 2,
  }),
  required: (palette: Palette): TextStyle => ({ color: palette.risk }),
  inputWrap: {
    position: 'relative',
  } as ViewStyle,
  input: (palette: Palette, radius: Theme['radius']): TextStyle => ({
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'InterRegular',
    fontSize: 15,
    color: palette.ink,
  }),
  passwordInput: {
    paddingRight: 44,
  } as TextStyle,
  eyeToggle: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  } as ViewStyle,
  error: (palette: Palette, fontFamily: Theme['fontFamily']): TextStyle => ({
    fontFamily: fontFamily.regular,
    color: palette.risk,
    fontSize: 12,
    paddingLeft: 2,
  }),
};