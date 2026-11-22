/**
 * Lokkhyo's design tokens. Every colour, size and type style in the app comes
 * from here, so screens stay consistent and a change lands everywhere at once.
 *
 * Direction: a neutral grey page with white cards in light mode, a deep
 * blue-black navy with raised indigo-grey cards in dark mode, one brand colour
 * (forest green) for action and focus, and three status colours used only to
 * mean something (on track / close / at risk). Progress is always drawn
 * against its *target* (লক্ষ্য).
 *
 * Note: the brand keys are still named `teal*` so existing screens keep
 * working; they now hold the green brand colour.
 */

// Light palette
export const lightPalette = {
  /** Body text and headings. */
  ink: '#0B0D16',
  /** Secondary text, captions, inactive icons. */
  muted: 'rgba(0,0,0,0.6)',
  /** Placeholder text and disabled foregrounds. */
  faint: 'rgba(0,0,0,0.4)',
  /** Page background behind cards. */
  mist: '#F0F0F0',
  /** Card surfaces. */
  surface: '#FFFFFF',
  /** Hairline borders and dividers. */
  line: '#E2E2E2',

  /** Brand: primary actions, focus, the hero card. */
  teal: '#017A47',
  /** Pressed / emphasised brand. */
  tealDeep: '#004F2E',
  /** Brand tint for selected chips, secondary buttons, rings' tracks. */
  tealSoft: '#017A471A',
  /** Light text and marks sitting on `teal`. */
  tealOnDark: '#B3D2C5',
  /** High-contrast foreground sitting directly on `teal`. */
  onTeal: '#FFFFFF',

  /** Status: on track. */
  good: '#189918',
  goodSoft: '#1899181A',
  /** Status: close to the target line. */
  warn: '#F79329',
  warnSoft: '#F793291A',
  /** Status: below target, destructive actions. */
  risk: '#C31B21',
  riskSoft: '#C31B211A',
} as const;

// Dark palette
export const darkPalette = {
  /** Body text and headings. */
  ink: '#FFFFFF',
  /** Secondary text, captions, inactive icons. */
  muted: '#7A7D8C',
  /** Placeholder text and disabled foregrounds. */
  faint: '#707070',
  /** Page background behind cards. */
  mist: '#0B0D16',
  /** Card surfaces. */
  surface: '#181821',
  /** Hairline borders and dividers. */
  line: '#2B2B35',

  /** Brand: primary actions, focus, the hero card. */
  teal: '#017A47',
  /** Pressed / emphasised brand. */
  tealDeep: '#004F2E',
  /** Brand tint for selected chips, secondary buttons, rings' tracks. */
  tealSoft: '#017A4730',
  /** Light text and marks sitting on `teal`. */
  tealOnDark: '#B3D2C5',
  /** High-contrast foreground sitting directly on `teal`. */
  onTeal: '#FFFFFF',

  /** Status: on track. */
  good: '#146414',
  goodSoft: '#14641430',
  /** Status: close to the target line. */
  warn: '#F79329',
  warnSoft: '#F7932930',
  /** Status: below target, destructive actions. */
  risk: '#C31B21',
  riskSoft: '#C31B2130',
} as const;

export type Palette = Record<keyof typeof lightPalette, string>;

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  palette: Palette;
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  colors: {
    text: string;
    background: string;
    card: string;
    tint: string;
    icon: string;
    tabIconDefault: string;
    tabIconSelected: string;
  };
  brand: {
    teal: string;
    accent: string;
    page: string;
    divider: string;
    danger: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  space: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  fontFamily: {
    display: string;
    displayBold: string;
    regular: string;
    medium: string;
    semibold: string;
  };
  type: {
    title: { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing: number };
    figure: { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing: number };
    number: { fontFamily: string; fontSize: number; lineHeight: number };
    heading: { fontFamily: string; fontSize: number; lineHeight: number };
    body: { fontFamily: string; fontSize: number; lineHeight: number };
    bodyStrong: { fontFamily: string; fontSize: number; lineHeight: number };
    caption: { fontFamily: string; fontSize: number; lineHeight: number };
    eyebrow: { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing: number };
  };
  statusColor: (value: number, target: number, warnMargin?: number) => { fg: string; bg: string };
}

const shared = {
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    pill: 999,
  } as const,
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  } as const,
  fontFamily: {
    display: 'SoraSemiBold',
    displayBold: 'SoraBold',
    regular: 'InterRegular',
    medium: 'InterMedium',
    semibold: 'InterSemiBold',
  } as const,
  type: {
    /** Screen titles. */
    title: { fontFamily: 'SoraSemiBold', fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
    /** Hero numbers: the next class's time, a CGPA. */
    figure: { fontFamily: 'SoraBold', fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
    /** Inline numbers in rows: percentages, marks. */
    number: { fontFamily: 'SoraSemiBold', fontSize: 15, lineHeight: 20 },
    /** Section headings. */
    heading: { fontFamily: 'InterSemiBold', fontSize: 16, lineHeight: 22 },
    body: { fontFamily: 'InterRegular', fontSize: 15, lineHeight: 21 },
    bodyStrong: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 21 },
    caption: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 18 },
    /** Small caps-style labels above values ("NEXT CLASS"). */
    eyebrow: { fontFamily: 'InterSemiBold', fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  } as const,
};

function buildTheme(palette: Palette, mode: ThemeMode, resolved: 'light' | 'dark'): Theme {
  return {
    palette,
    mode,
    resolved,
    colors: {
      text: palette.ink,
      background: palette.mist,
      card: palette.surface,
      tint: palette.teal,
      icon: palette.muted,
      tabIconDefault: palette.faint,
      tabIconSelected: palette.teal,
    },
    brand: {
      teal: palette.teal,
      accent: palette.tealOnDark,
      page: palette.mist,
      divider: palette.line,
      danger: palette.risk,
    },
    radius: shared.radius,
    space: shared.space,
    fontFamily: shared.fontFamily,
    type: shared.type,
    statusColor: (value: number, target: number, warnMargin = 10) =>
      statusColor(value, target, warnMargin, palette),
  };
}

export const lightTheme = buildTheme(lightPalette, 'light', 'light');
export const darkTheme = buildTheme(darkPalette, 'dark', 'dark');

/** Status colour for a value measured against a target, e.g. attendance %. */
export function statusColor(value: number, target: number, warnMargin = 10, palette: Palette = lightPalette) {
  if (value < target) return { fg: palette.risk, bg: palette.riskSoft };
  if (value < target + warnMargin) return { fg: palette.warn, bg: palette.warnSoft };
  return { fg: palette.good, bg: palette.goodSoft };
}

/** Convert app theme to React Navigation Theme object */
export function toNavigationTheme(theme: Theme) {
  const isDark = theme.resolved === 'dark';
  return {
    dark: isDark,
    colors: {
      primary: theme.palette.teal,
      background: theme.palette.mist,
      card: theme.palette.surface,
      text: theme.palette.ink,
      border: theme.palette.line,
      notification: theme.palette.risk,
    },
    fonts: {
      regular: { fontFamily: theme.fontFamily.regular, fontWeight: 'normal' as const },
      // The family already carries the weight; a fontWeight on top makes Android fake-bold it and clip text.
      medium: { fontFamily: theme.fontFamily.medium, fontWeight: 'normal' as const },
      bold: { fontFamily: theme.fontFamily.semibold, fontWeight: 'normal' as const },
      heavy: { fontFamily: theme.fontFamily.displayBold, fontWeight: 'normal' as const },
    },
  };
}

/** Legacy alias for backward compatibility during migration */
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Palette = lightPalette;
export const Colors = lightTheme.colors;
export const Brand = lightTheme.brand;
export const Radius = shared.radius;
export const Space = shared.space;
export const FontFamily = shared.fontFamily;
export const Type = shared.type;
export const typeScale = shared.type;