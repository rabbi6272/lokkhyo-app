import type { WidgetTaskHandler } from 'react-native-android-widget';

import { loadWidgetSnapshot } from '@/services/widgets/widgets.services';
import { renderLokkhyoWidget } from '@/widgets/LokkhyoWidgets';

/** Runs headless when Android adds, resizes or periodically refreshes a widget. */
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  renderWidget(renderLokkhyoWidget(widgetInfo.widgetName, await loadWidgetSnapshot(), new Date()));
};
