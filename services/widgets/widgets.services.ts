import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { parseWidgetSnapshot, type WidgetSnapshot } from '@/lib/widgetSnapshot';
import { renderLokkhyoWidget, WIDGET_NAMES } from '@/widgets/LokkhyoWidgets';

const SNAPSHOT_KEY = 'lokkhyo.widget.snapshot';

export async function loadWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  return parseWidgetSnapshot(await AsyncStorage.getItem(SNAPSHOT_KEY));
}

/** Redraw every placed widget. A failure only leaves a widget a little stale. */
async function refreshWidgets(snapshot: WidgetSnapshot | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  const now = new Date();
  await Promise.all(
    WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: () => renderLokkhyoWidget(widgetName, snapshot, now) }),
    ),
  ).catch((error: unknown) => console.warn('[widgets] Refresh failed:', error));
}

export async function saveWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  await refreshWidgets(snapshot);
}

/** On sign-out: the next person holding the phone must not see these numbers. */
export async function clearWidgetSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(SNAPSHOT_KEY);
  await refreshWidgets(null);
}
