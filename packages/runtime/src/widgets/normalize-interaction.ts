const DATA_KEYS = new Set(['step', 'optionId', 'from', 'to', 'index']);

export function normalizeWidgetInteraction(
  widgetId: string,
  data: Record<string, unknown>,
): {
  event: 'widget_interaction';
  widgetId: string;
  action: string;
  data?: Record<string, unknown>;
} | null {
  if (typeof data.action !== 'string' || data.action.length === 0 || data.action.length > 128) {
    return null;
  }
  const filtered: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    if (key in data && typeof data[key] !== 'object') {
      filtered[key] = data[key];
    }
  }
  return {
    event: 'widget_interaction',
    widgetId,
    action: data.action,
    data: Object.keys(filtered).length > 0 ? filtered : undefined,
  };
}
