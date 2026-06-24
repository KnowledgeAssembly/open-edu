import { Component, type ReactNode } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import type { WidgetRenderProps, RemoteWidgetManifest } from '@open-edu/widgets';
import { useRemoteWidget } from '@open-edu/widgets';

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

interface RemoteNode {
  type: string;
  widget?: string;
  config?: Record<string, unknown>;
  remoteWidget?: RemoteWidgetManifest;
}

export interface WidgetRendererProps {
  node: RemoteNode;
  nodeId: string;
}

export function WidgetRenderer({ node, nodeId }: WidgetRendererProps): JSX.Element {
  const { widgetRegistry, completeNode } = useRuntime();

  if (node.remoteWidget) {
    return <RemoteWidgetRenderer node={node} nodeId={nodeId} />;
  }

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

function RemoteWidgetRenderer({
  node,
  nodeId,
}: {
  node: RemoteNode;
  nodeId: string;
}): JSX.Element {
  const { widgetRegistry, completeNode } = useRuntime();
  const manifest = node.remoteWidget!;
  const { widget, status, error } = useRemoteWidget(manifest, widgetRegistry);

  if (status === 'loading') {
    return (
      <div role="status" data-testid="remote-widget-loading">
        Loading remote widget &ldquo;{manifest.id}&rdquo;&hellip;
      </div>
    );
  }

  if (status === 'error') {
    if (manifest.fallback) {
      const fallbackDef = widgetRegistry?.get(manifest.fallback);
      if (fallbackDef) {
        const WidgetComponent = fallbackDef.render;
        const widgetProps: WidgetRenderProps = {
          nodeId,
          config: node.config ?? {},
          emitInteraction: (data: Record<string, unknown>) => {
            console.debug('[widget:interaction]', manifest.fallback, data);
          },
          complete: (score?: number) => completeNode(score),
        };
        return <WidgetComponent {...widgetProps} />;
      }
    }

    return (
      <div role="alert" data-testid="remote-widget-error">
        Failed to load remote widget &ldquo;{manifest.id}&rdquo;: {error}
      </div>
    );
  }

  const WidgetComponent = widget!.render;
  const widgetProps: WidgetRenderProps = {
    nodeId,
    config: node.config ?? {},
    emitInteraction: (data: Record<string, unknown>) => {
      console.debug('[widget:interaction]', manifest.id, data);
    },
    complete: (score?: number) => completeNode(score),
  };

  return (
    <WidgetErrorBoundary
      fallback={
        <div role="alert" data-testid="widget-renderer-error">
          Widget &ldquo;{manifest.id}&rdquo; encountered an error.
        </div>
      }
    >
      <WidgetComponent {...widgetProps} />
    </WidgetErrorBoundary>
  );
}
