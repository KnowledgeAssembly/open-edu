import type { ReactNode } from 'react';

export interface WidgetRenderProps {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}

export interface WidgetDefinition {
  id: string;
  version?: string;
  render: (props: WidgetRenderProps) => ReactNode;
}

export interface WidgetRegistry {
  register: (definition: WidgetDefinition) => void;
  get: (id: string) => WidgetDefinition | undefined;
  has: (id: string) => boolean;
}

export class WidgetRegistrationError extends Error {
  constructor(widgetId: string) {
    super(`Widget "${widgetId}" is already registered`);
    this.name = 'WidgetRegistrationError';
  }
}
