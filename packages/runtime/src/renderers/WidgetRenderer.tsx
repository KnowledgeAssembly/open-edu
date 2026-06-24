import { Component, type ReactNode } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import type { WidgetRenderProps } from '@open-edu/widgets';

class WidgetErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function resolveWidgetId(node: { type: string; widget?: string }): string {
  if (node.type === 'custom' && node.widget) return node.widget;
  if (node.type === 'exercise') return node.widget ?? 'exercise';
  return 'exercise';
}

export interface WidgetRendererProps {
  node: { type: string; widget?: string; config?: Record<string, unknown> };
  nodeId: string;
}

export function WidgetRenderer({ node, nodeId }: WidgetRendererProps): JSX.Element {
  const { widgetRegistry, completeNode } = useRuntime();
  const widgetId = resolveWidgetId(node);
  const definition = widgetRegistry?.get(widgetId);

  if (!definition) {
    return (
      <div role="status" data-testid="widget-renderer-placeholder">
        No widget registered for ID &ldquo;{widgetId}&rdquo;
      </div>
    );
  }

  const emitInteraction = (data: Record<string, unknown>) => {
    console.debug('[widget:interaction]', widgetId, data);
  };

  const WidgetComponent = definition.render;
  const widgetProps: WidgetRenderProps = {
    nodeId,
    config: node.config ?? {},
    emitInteraction,
    complete: (score?: number) => completeNode(score),
  };

  return (
    <WidgetErrorBoundary
      fallback={
        <div role="alert" data-testid="widget-renderer-error">
          Widget &ldquo;{widgetId}&rdquo; encountered an error.
        </div>
      }
    >
      <WidgetComponent {...widgetProps} />
    </WidgetErrorBoundary>
  );
}
