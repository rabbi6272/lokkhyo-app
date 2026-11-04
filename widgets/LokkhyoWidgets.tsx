import type { ReactNode } from 'react';
import {
  FlexWidget,
  TextWidget,
  type ColorProp,
  type WidgetRepresentation,
} from 'react-native-android-widget';

import { darkPalette, lightPalette } from '@/constants/theme';
import {
  attendanceTone,
  deadlineDistance,
  nextDeadline,
  updatedLabel,
  type WidgetSnapshot,
} from '@/lib/widgetSnapshot';

export const WIDGET_NAMES = ['Cgpa', 'Attendance', 'Deadline'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

type Colors = typeof lightPalette | typeof darkPalette;
const color = (value: string) => value as ColorProp;

interface FrameProps {
  colors: Colors;
  label: string;
  uri: string;
  children: ReactNode;
}

function Frame({ colors, label, uri, children }: FrameProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={label}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        padding: 14,
        borderRadius: 18,
        backgroundColor: color(colors.surface),
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
      {children}
    </FlexWidget>
  );
}

function Caption({ colors, text }: { colors: Colors; text: string }) {
  return <TextWidget text={text} maxLines={1} truncate="END" style={{ fontSize: 12, color: color(colors.muted) }} />;
}

function SyncPrompt({ colors }: { colors: Colors }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Open Lokkhyo to sync"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        padding: 14,
        borderRadius: 18,
        backgroundColor: color(colors.surface),
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <TextWidget text="Open Lokkhyo to sync" style={{ fontSize: 14, color: color(colors.muted), textAlign: 'center' }} />
    </FlexWidget>
  );
}

function CgpaWidget({ snapshot, colors, now }: WidgetProps) {
  const cgpa = snapshot.cgpa === null ? '—' : snapshot.cgpa.toFixed(2);
  return (
    <Frame colors={colors} label={`CGPA ${cgpa}`} uri="lokkhyo:///profile">
      <Caption colors={colors} text="CGPA" />
      <TextWidget text={cgpa} style={{ fontSize: 36, fontWeight: 'bold', color: color(colors.teal) }} />
      <Caption colors={colors} text={updatedLabel(snapshot.updatedAt, now)} />
    </Frame>
  );
}

function AttendanceWidget({ snapshot, colors, now }: WidgetProps) {
  const rows = snapshot.attendance.slice(0, 3);
  const spoken = rows.map((r) => `${r.code} ${r.percent === null ? 'no classes yet' : `${r.percent}%`}`).join(', ');
  return (
    <Frame colors={colors} label={`Attendance: ${spoken || 'no courses'}`} uri="lokkhyo:///attendance">
      <Caption colors={colors} text="Attendance" />
      {rows.length === 0 ? (
        <TextWidget text="No courses yet" style={{ fontSize: 14, color: color(colors.ink) }} />
      ) : (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
          {rows.map((row) => {
            const tone = attendanceTone(row.percent);
            return (
              <FlexWidget
                key={row.courseId}
                style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 }}>
                <TextWidget text={row.code} maxLines={1} truncate="END" style={{ fontSize: 14, color: color(colors.ink) }} />
                <TextWidget
                  text={row.percent === null ? '—' : `${row.percent}%`}
                  style={{ fontSize: 14, fontWeight: 'bold', color: color(colors[tone]) }}
                />
              </FlexWidget>
            );
          })}
        </FlexWidget>
      )}
      <Caption colors={colors} text={updatedLabel(snapshot.updatedAt, now)} />
    </Frame>
  );
}

function DeadlineWidget({ snapshot, colors, now }: WidgetProps) {
  const next = nextDeadline(snapshot, now);
  if (!next) {
    return (
      <Frame colors={colors} label="No upcoming reminders" uri="lokkhyo:///routine">
        <Caption colors={colors} text="Next up" />
        <TextWidget text="Nothing coming up" style={{ fontSize: 16, color: color(colors.ink) }} />
        <Caption colors={colors} text={updatedLabel(snapshot.updatedAt, now)} />
      </Frame>
    );
  }
  const distance = deadlineDistance(next.date, now);
  return (
    <Frame
      colors={colors}
      label={`Next up: ${next.courseCode} ${next.title}, ${distance}`}
      uri={`lokkhyo:///course/${next.courseId}`}>
      <Caption colors={colors} text={`Next up · ${next.courseCode}`} />
      <TextWidget
        text={next.title}
        maxLines={1}
        truncate="END"
        style={{ fontSize: 18, fontWeight: 'bold', color: color(colors.ink) }}
      />
      <TextWidget text={distance} style={{ fontSize: 14, color: color(colors.teal) }} />
    </Frame>
  );
}

interface WidgetProps {
  snapshot: WidgetSnapshot;
  colors: Colors;
  now: Date;
}

const VIEWS: Record<WidgetName, (props: WidgetProps) => React.JSX.Element> = {
  Cgpa: CgpaWidget,
  Attendance: AttendanceWidget,
  Deadline: DeadlineWidget,
};

/** Follows the system theme: a widget has no access to the app's manual override. */
export function renderLokkhyoWidget(name: string, snapshot: WidgetSnapshot | null, now: Date): WidgetRepresentation {
  const View = VIEWS[name as WidgetName];
  const render = (colors: Colors) =>
    snapshot && View ? <View snapshot={snapshot} colors={colors} now={now} /> : <SyncPrompt colors={colors} />;
  return { light: render(lightPalette), dark: render(darkPalette) };
}
