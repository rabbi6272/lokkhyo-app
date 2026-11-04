import React from 'react';
import { SvgXml } from 'react-native-svg';

import { Icons } from '@/constants/icons';

const ICONS: Record<string, string> = {
  home: Icons.HOME,
  courses: Icons.COURSE,
  calender: Icons.CALENDER,
  user: Icons.PROFILE,
  arrowLeft: Icons.ARROW_LEFT,
  settings: Icons.SETTING,
  circleAdd: Icons.CIRCLE_PLUS,
  trash: Icons.TRASH,
  chevronRight: Icons.ANGLE_LEFT,
  logout: Icons.LOGOUT,
  routine: Icons.ROUTINE,
  empty: Icons.EMPTY,
  plus: `<svg viewBox="0 0 24 24"><path d="M12 4.5a1.25 1.25 0 0 1 1.25 1.25v5h5a1.25 1.25 0 1 1 0 2.5h-5v5a1.25 1.25 0 1 1-2.5 0v-5h-5a1.25 1.25 0 1 1 0-2.5h5v-5A1.25 1.25 0 0 1 12 4.5Z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24"><path d="M9.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4l5.3-5.3-5.3-5.3a1 1 0 0 1 0-1.4Z"/></svg>`,
  camera: Icons.CAMERA,
};

type IconName = keyof typeof ICONS;

type SvgIconProps = {
  name: IconName;
  size?: number;
  color?: string;
}
export function SvgIcon({ size = 24, color, ...props }: SvgIconProps) {
  const xml = ICONS[props.name];
  if (!xml) return null;
  return <SvgXml xml={xml} width={size} height={size} fill={color} />;
}
