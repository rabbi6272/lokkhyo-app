import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { typeScale, type Palette } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  color?: string;
  type?:
    | 'default'
    | 'defaultSemiBold'
    | 'title'
    | 'normalTitle'
    | 'subtitle'
    | 'link'
    | 'heading'
    | 'caption'
    | 'eyebrow'
    | 'figure'
    | 'number';
};

/**
 * All app text. Types map onto the type scale in `constants/theme`; the older
 * names (`subtitle`, `defaultSemiBold`, …) are kept so existing screens follow.
 */
export function ThemedText({ style, color, type = 'default', ...rest }: ThemedTextProps) {
  const { palette, fontFamily } = useTheme();
  return (
    <Text
      style={[
        baseStyle(palette),
        textStyles[type]?.(palette, fontFamily),
        color ? { color } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const baseStyle = (palette: Palette): TextStyle => ({ color: palette.ink });

const textStyles: Record<string, (palette: Palette, fontFamily: any) => TextStyle> = {
  default: () => ({ ...typeScale.body }),
  defaultSemiBold: () => ({ ...typeScale.bodyStrong }),
  title: () => ({ ...typeScale.title }),
  normalTitle: () => ({ ...typeScale.title }),
  subtitle: () => ({ ...typeScale.heading }),
  heading: () => ({ ...typeScale.heading }),
  caption: (palette: Palette) => ({ ...typeScale.caption, color: palette.muted }),
  eyebrow: (palette: Palette) => ({ ...typeScale.eyebrow, color: palette.muted }),
  figure: () => ({ ...typeScale.figure }),
  number: () => ({ ...typeScale.number }),
  link: (palette: Palette, fontFamily: any) => ({
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: palette.teal,
  }),
};