import { Component, useContext, type ReactNode } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import { I18nContext, useTranslation } from '@open-edu/i18n';
import type { WidgetRenderProps, RemoteWidgetManifest } from '@open-edu/widgets';
import { useRemoteWidget, resolveWidgetId as resolveAlias } from '@open-edu/widgets';
import { WidgetCanvas } from '../components/WidgetCanvas';
import { WidgetErrorFallback } from '../components/WidgetErrorFallback';
import type { WidgetAnswer } from '@open-edu/schemas';

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class WidgetErrorBoundary extends Component<
  { widgetId: string; message: string; children: ReactNode },
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
          message={this.props.message}
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
  if (node.type === 'custom' && node.widget) return resolveAlias(node.widget);
  if (node.type === 'exercise') return resolveAlias(node.widget ?? 'exercise');
  return resolveAlias('exercise');
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
  const { widgetRegistry, completeNode, answers, saveAnswer } = useRuntime();
  const { t } = useTranslation();

  const i18nContext = useContext(I18nContext);
  const locale = i18nContext?.locale;

  if (node.remoteWidget) {
    return <RemoteWidgetRenderer node={node} nodeId={nodeId} />;
  }

  const widgetId = resolveWidgetId(node);
  const definition = widgetRegistry?.get(widgetId);

  if (!definition) {
    return (
      <div role="status" data-testid="widget-renderer-placeholder">
        {t('runtime.widget.no_registered', { id: widgetId })}
      </div>
    );
  }

  const storedAnswer = answers[nodeId] as WidgetAnswer | undefined;
  const storedState = storedAnswer?.type === 'widget' ? storedAnswer.data : undefined;

  const emitInteraction = (data: Record<string, unknown>) => {
    console.debug('[widget:interaction]', widgetId, data);
  };

  const WidgetComponent = definition.render;
  const widgetProps: WidgetRenderProps = {
    nodeId,
    config: node.config ?? {},
    locale,
    emitInteraction,
    complete: (score?: number, state?: unknown) => {
      if (state !== undefined) {
        const answer: WidgetAnswer = {
          type: 'widget',
          widgetId,
          widgetVersion: definition.version,
          data: state,
          score,
        };
        saveAnswer(nodeId, answer);
      }
      completeNode(score);
    },
    storedState,
  };

  return (
    <WidgetErrorBoundary widgetId={widgetId} message={t('runtime.widget.load_error')}>
      <WidgetCanvas widgetId={widgetId} minHeight={200}>
        <WidgetComponent {...widgetProps} />
      </WidgetCanvas>
    </WidgetErrorBoundary>
  );
}

function RemoteWidgetRenderer({ node, nodeId }: { node: RemoteNode; nodeId: string }): JSX.Element {
  const { widgetRegistry, completeNode, answers, saveAnswer } = useRuntime();
  const { t } = useTranslation();

  const i18nContext = useContext(I18nContext);
  const locale = i18nContext?.locale;

  const manifest = node.remoteWidget!;
  const { widget, status, error } = useRemoteWidget(manifest, widgetRegistry);

  if (status === 'loading') {
    return (
      <div role="status" data-testid="remote-widget-loading">
        {t('runtime.widget.loading_remote', { id: manifest.id })}
      </div>
    );
  }

  if (status === 'error') {
    if (manifest.fallback) {
      const fallbackDef = widgetRegistry?.get(manifest.fallback);
      if (fallbackDef) {
        const storedAnswer = answers[nodeId] as WidgetAnswer | undefined;
        const storedState = storedAnswer?.type === 'widget' ? storedAnswer.data : undefined;
        const WidgetComponent = fallbackDef.render;
        const widgetProps: WidgetRenderProps = {
          nodeId,
          config: node.config ?? {},
          locale,
          emitInteraction: (data: Record<string, unknown>) => {
            console.debug('[widget:interaction]', manifest.fallback, data);
          },
          complete: (score?: number, state?: unknown) => {
            if (state !== undefined) {
              saveAnswer(nodeId, {
                type: 'widget',
                widgetId: manifest.fallback ?? 'unknown',
                data: state,
                score,
              });
            }
            completeNode(score);
          },
          storedState,
        };
        return (
          <WidgetErrorBoundary
            widgetId={manifest.fallback}
            message={t('runtime.widget.load_error')}
          >
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
        message={t('runtime.widget.remote_load_error', { id: manifest.id })}
        isDevMode={process.env.NODE_ENV === 'development'}
        devDetails={error}
      />
    );
  }

  const storedAnswer = answers[nodeId] as WidgetAnswer | undefined;
  const storedState = storedAnswer?.type === 'widget' ? storedAnswer.data : undefined;
  const WidgetComponent = widget!.render;
  const widgetProps: WidgetRenderProps = {
    nodeId,
    config: node.config ?? {},
    locale,
    emitInteraction: (data: Record<string, unknown>) => {
      console.debug('[widget:interaction]', manifest.id, data);
    },
    complete: (score?: number, state?: unknown) => {
      if (state !== undefined) {
        saveAnswer(nodeId, {
          type: 'widget',
          widgetId: manifest.id,
          data: state,
          score,
        });
      }
      completeNode(score);
    },
    storedState,
  };

  return (
    <WidgetErrorBoundary widgetId={manifest.id} message={t('runtime.widget.load_error')}>
      <WidgetCanvas widgetId={manifest.id} minHeight={200}>
        <WidgetComponent {...widgetProps} />
      </WidgetCanvas>
    </WidgetErrorBoundary>
  );
}
