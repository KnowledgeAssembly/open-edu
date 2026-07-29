import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { WidgetRegistry } from '@open-edu/widgets';
import { createDefaultRegistry } from '@open-edu/widgets';

interface PreviewInteractionEvent {
  widgetId: string;
  type: string;
  data: unknown;
}

interface WidgetPreviewContextValue {
  registry: WidgetRegistry;
  emitInteraction: (widgetId: string, data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState: Record<string, unknown> | undefined;
  interactions: PreviewInteractionEvent[];
}

const WidgetPreviewContext = createContext<WidgetPreviewContextValue | null>(null);

export function useWidgetPreview(): WidgetPreviewContextValue {
  const ctx = useContext(WidgetPreviewContext);
  if (!ctx) throw new Error('useWidgetPreview must be used within WidgetPreviewProvider');
  return ctx;
}

export interface WidgetPreviewProviderProps {
  children: ReactNode;
}

export function WidgetPreviewProvider({ children }: WidgetPreviewProviderProps): JSX.Element {
  const [interactions, setInteractions] = useState<PreviewInteractionEvent[]>([]);

  const registry = useMemo(() => createDefaultRegistry(), []);

  const value: WidgetPreviewContextValue = {
    registry,
    emitInteraction: (widgetId: string, data: Record<string, unknown>) => {
      const event: PreviewInteractionEvent = { widgetId, type: 'interaction', data };
      setInteractions((prev) => [...prev, event]);
      console.debug('[widget:preview:interaction]', widgetId, data);
    },
    complete: (score?: number, state?: unknown) => {
      console.debug('[widget:preview:complete]', { score, state });
    },
    storedState: undefined,
    interactions,
  };

  return <WidgetPreviewContext.Provider value={value}>{children}</WidgetPreviewContext.Provider>;
}
