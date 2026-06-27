import { Component, type ReactNode } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import type { WidgetRenderProps, RemoteWidgetManifest } from '@open-edu/widgets';
import { useRemoteWidget } from '@open-edu/widgets';
import { WidgetCanvas } from '../components/WidgetCanvas';
import { WidgetErrorFallback } from '../components/WidgetErrorFallback';

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class WidgetErrorBoundary extends Component<
  { widgetId: string; children: ReactNode },
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[WidgetErrorBoundary] Error in widget ${this.props.widgetId}:`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <WidgetErrorFallback
          widgetId={this.props.widgetId}
          message="This activity couldn't load. Try refreshing the page."
          onRetry={this.handleRetry}
          isDevMode={process.env.NODE_ENV === 'development'}
          devDetails={this.state.error?.message}
        />
      );
    }
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
    <WidgetErrorBoundary widgetId={widgetId}>
      <WidgetCanvas widgetId={widgetId} minHeight={200}>
        <WidgetComponent {...widgetProps} />
      </WidgetCanvas>
    </WidgetErrorBoundary>
  );
}

function RemoteWidgetRenderer({ node, nodeId }: { node: RemoteNode; nodeId: string }): JSX.Element {
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
        return (
          <WidgetErrorBoundary widgetId={manifest.fallback}>
            <WidgetCanvas widgetId={manifest.fallback} minHeight={200}>
              <WidgetComponent {...widgetProps} />
            </WidgetCanvas>
          </WidgetErrorBoundary>
        );
      }
    }

    return (
      <WidgetErrorFallback
        widgetId={manifest.id}
        message={`Failed to load remote widget "${manifest.id}".`}
        isDevMode={process.env.NODE_ENV === 'development'}
        devDetails={error}
      />
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
    <WidgetErrorBoundary widgetId={manifest.id}>
      <WidgetCanvas widgetId={manifest.id} minHeight={200}>
        <WidgetComponent {...widgetProps} />
      </WidgetCanvas>
    </WidgetErrorBoundary>
  );
}
