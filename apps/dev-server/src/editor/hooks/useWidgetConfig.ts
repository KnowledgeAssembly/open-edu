import { useMemo } from 'react';

export interface WidgetConfigResult {
  widgetType: string | null;
  widgetConfig: Record<string, unknown> | null;
  isWidgetNode: boolean;
}

export function useWidgetConfig(content: string): WidgetConfigResult {
  return useMemo(() => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { widgetType: null, widgetConfig: null, isWidgetNode: false };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { widgetType: null, widgetConfig: null, isWidgetNode: false };
    }

    const type = parsed.type;
    if (type !== 'exercise' && type !== 'custom') {
      return { widgetType: null, widgetConfig: null, isWidgetNode: false };
    }

    const metadata = parsed.metadata as Record<string, unknown> | undefined;
    const widgetType =
      (typeof parsed.widget === 'string' ? parsed.widget : null) ??
      (metadata && typeof metadata.widgetType === 'string' ? metadata.widgetType : null) ??
      'core.multiple-choice';

    const widgetConfig =
      (parsed.config as Record<string, unknown>) ??
      (parsed.widgetConfig as Record<string, unknown>) ??
      {};

    return { widgetType, widgetConfig, isWidgetNode: true };
  }, [content]);
}
