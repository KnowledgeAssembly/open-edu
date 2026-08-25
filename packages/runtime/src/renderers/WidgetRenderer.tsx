import { useContext, useEffect, useState } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import { I18nContext, useTranslation } from '@open-edu/i18n';
import type { WidgetRenderProps, RemoteWidgetManifest } from '@open-edu/widgets';
import {
  useRemoteWidget,
  normalizeWidgetReference,
  applyFallbackConfig,
  FALLBACK_ADAPTERS,
} from '@open-edu/widgets';
import type { ResolvedWidget } from '@open-edu/widgets';
import type { WidgetReference } from '@open-edu/schemas';
import { WidgetCanvas } from '../components/WidgetCanvas';
import { WidgetErrorFallback } from '../components/WidgetErrorFallback';
import { PROTOCOL_API_VERSION } from '@open-edu/widget-sdk';
import type { InitPayload } from '@open-edu/widget-sdk';
import type { WidgetAnswer } from '@open-edu/schemas';
import { buildWidgetAnswer } from '../widgets/answer-provenance';
import { normalizeWidgetInteraction } from '../widgets/normalize-interaction';
import { SandboxWidgetAdapter, isSandboxWidgetsEnabled } from '../widgets/SandboxWidgetAdapter';
import {
  NativeWidgetAdapter,
  WidgetErrorBoundary,
  resolveWidgetId,
} from '../widgets/NativeWidgetAdapter';
import { useTheme } from '../theme';

interface RemoteNode {
  type: string;
  widget?: string;
  version?: string;
  config?: Record<string, unknown>;
  remoteWidget?: RemoteWidgetManifest;
  widgetRef?: WidgetReference;
}

export interface WidgetRendererProps {
  node: RemoteNode;
  nodeId: string;
  onDiagnostic?: (code: string) => void;
}

export function WidgetRenderer({ node, nodeId, onDiagnostic }: WidgetRendererProps): JSX.Element {
  const { widgetRegistry, widgetResolver } = useRuntime();
  const { t } = useTranslation();

  const { ref, warnings } = normalizeWidgetReference({
    widget: node.widget,
    version: node.version,
    remoteWidget: node.remoteWidget,
    widgetRef: node.widgetRef,
  });

  if (warnings.length > 0) {
    if (process.env.NODE_ENV !== 'production') {
      warnings.forEach((w) => console.warn('[open-edu:widget-resolver]', w.code, w.message));
    }
    if (onDiagnostic) warnings.forEach((w) => onDiagnostic(w.code));
    else warnings.forEach((w) => console.warn('[open-edu:widget-diagnostic]', w.code));
  }

  if (ref.source === 'url') return <RemoteWidgetRenderer node={node} nodeId={nodeId} />;

  if (!widgetResolver) {
    if (isSandboxWidgetsEnabled() && node.widgetRef?.source === 'registry') {
      return <SandboxWidgetRenderer node={node} nodeId={nodeId} />;
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
    return (
      <NativeWidgetAdapter
        definition={definition}
        node={node}
        nodeId={nodeId}
        onDiagnostic={onDiagnostic}
      />
    );
  }

  return (
    <ResolvedWidgetRenderer
      widgetRef={ref}
      node={node}
      nodeId={nodeId}
      onDiagnostic={onDiagnostic}
    />
  );
}

function ResolvedWidgetRenderer({
  widgetRef,
  node,
  nodeId,
  onDiagnostic,
}: {
  widgetRef: WidgetReference;
  node: RemoteNode;
  nodeId: string;
  onDiagnostic?: (code: string) => void;
}): JSX.Element {
  const { widgetResolver, widgetRegistry } = useRuntime();
  const resolver = widgetResolver!;
  const { t } = useTranslation();
  const [resolved, setResolved] = useState<ResolvedWidget | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setResolved(undefined);
    void resolver.resolve(widgetRef, node.config).then((r) => {
      if (!cancelled) setResolved(r);
    });
    return () => {
      cancelled = true;
    };
  }, [resolver, widgetRef, node.config]);

  if (!resolved) {
    return <div role="status" data-testid="widget-resolving" aria-live="polite" />;
  }

  if (resolved.ok && resolved.tier === 'native') {
    return (
      <NativeWidgetAdapter
        definition={resolved.definition}
        node={node}
        nodeId={nodeId}
        onDiagnostic={onDiagnostic}
      />
    );
  }

  if (resolved.ok && resolved.tier === 'sandboxed') {
    return (
      <SandboxWidgetRenderer
        node={node}
        nodeId={nodeId}
        resolved={resolved}
        onDiagnostic={onDiagnostic}
      />
    );
  }

  const renderUnavailable = () => (
    <div role="status" data-testid="widget-unavailable" aria-live="polite">
      {t('runtime.widget.unavailable', { id: widgetRef.id })}
    </div>
  );

  const reportFailure = () => {
    if (onDiagnostic) onDiagnostic(resolved.failure);
    return renderUnavailable();
  };

  const fallbackId = 'fallback' in widgetRef ? widgetRef.fallback : undefined;
  const adapter = FALLBACK_ADAPTERS[widgetRef.id];
  if (!fallbackId || !adapter) return reportFailure();

  let adapted: unknown;
  try {
    adapted = applyFallbackConfig(adapter, node.config ?? {});
  } catch {
    return reportFailure();
  }

  const definition = widgetRegistry?.get(fallbackId);
  if (!definition) return reportFailure();

  return (
    <NativeWidgetAdapter
      definition={definition}
      node={node}
      nodeId={nodeId}
      intendedWidgetId={widgetRef.id}
      intendedWidgetVersion={widgetRef.version}
      configOverride={adapted as Record<string, unknown>}
      onDiagnostic={onDiagnostic}
    />
  );
}

function RemoteWidgetRenderer({ node, nodeId }: { node: RemoteNode; nodeId: string }): JSX.Element {
  const { widgetRegistry, completeNode, answers, saveAnswer, resolveAsset, emitTelemetry } =
    useRuntime();
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
        const fallbackId = manifest.fallback;
        const storedAnswer = answers[nodeId] as WidgetAnswer | undefined;
        const storedState = storedAnswer?.type === 'widget' ? storedAnswer.data : undefined;
        const WidgetComponent = fallbackDef.render;
        const widgetProps: WidgetRenderProps = {
          nodeId,
          config: node.config ?? {},
          locale,
          resolveAsset,
          emitInteraction: (data: Record<string, unknown>) => {
            const normalized = normalizeWidgetInteraction(fallbackId, data);
            if (normalized) emitTelemetry?.(normalized);
          },
          complete: (score?: number, state?: unknown) => {
            if (state !== undefined) {
              const answer = buildWidgetAnswer({
                intendedWidgetId: manifest.id,
                intendedWidgetVersion: manifest.version,
                renderedWidgetId: fallbackId,
                renderedWidgetVersion: fallbackDef.version,
                data: state,
                score,
              });
              saveAnswer(nodeId, answer);
              if (answer.renderedViaFallback) {
                emitTelemetry?.({
                  event: 'node_complete',
                  nodeId,
                  score,
                  renderedViaFallback: true,
                });
              }
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
    resolveAsset,
    emitInteraction: (data: Record<string, unknown>) => {
      const normalized = normalizeWidgetInteraction(manifest.id, data);
      if (normalized) emitTelemetry?.(normalized);
    },
    complete: (score?: number, state?: unknown) => {
      if (state !== undefined) {
        const answer = buildWidgetAnswer({
          intendedWidgetId: manifest.id,
          intendedWidgetVersion: manifest.version,
          renderedWidgetId: manifest.id,
          renderedWidgetVersion: manifest.version,
          data: state,
          score,
        });
        saveAnswer(nodeId, answer);
        if (answer.renderedViaFallback) {
          emitTelemetry?.({
            event: 'node_complete',
            nodeId,
            score,
            renderedViaFallback: true,
          });
        }
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

function themeIdToProtocolTheme(id: string): 'light' | 'dark' | 'zen' {
  if (id === 'nocturnal') return 'dark';
  if (id === 'zen') return 'zen';
  return 'light';
}

type SandboxedResolved = Extract<ResolvedWidget, { ok: true; tier: 'sandboxed' }>;

function SandboxWidgetRenderer({
  node,
  nodeId,
  resolved,
  onDiagnostic,
}: {
  node: RemoteNode;
  nodeId: string;
  resolved?: SandboxedResolved;
  onDiagnostic?: (code: string) => void;
}): JSX.Element {
  const { completeNode, answers, saveAnswer, emitTelemetry, currentNodeId } = useRuntime();
  const { t } = useTranslation();

  const storedAnswer = answers[nodeId] as WidgetAnswer | undefined;
  const storedState = storedAnswer?.type === 'widget' ? storedAnswer.data : undefined;

  const i18nContext = useContext(I18nContext);
  const locale = i18nContext?.locale ?? 'en';
  const theme = useTheme();

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (currentNodeId !== nodeId) {
    return <div />;
  }

  if (!resolved) {
    return <div role="status" data-testid="sandbox-widget-unresolved" aria-live="polite" />;
  }

  const initPayload: InitPayload = {
    apiVersion: PROTOCOL_API_VERSION,
    widgetId: resolved.widgetId,
    widgetVersion: resolved.version,
    instanceId: '',
    nodeId,
    config: node.config ?? {},
    storedState,
    locale,
    theme: themeIdToProtocolTheme(theme.id),
    themeTokens: {},
    prefersReducedMotion,
    capabilities: resolved.grantedCapabilities,
    stateSchemaVersion: resolved.manifest.stateSchemaVersion as string | undefined,
  };

  const expectedOrigin: string | 'opaque' = resolved.srcDoc
    ? 'opaque'
    : resolved.documentUrl
      ? new URL(resolved.documentUrl).origin
      : 'opaque';

  return (
    <SandboxWidgetAdapter
      nodeId={nodeId}
      documentUrl={resolved.documentUrl}
      srcDoc={resolved.srcDoc}
      expectedOrigin={expectedOrigin}
      title={t('runtime.widget.iframe_title', { id: resolved.widgetId })}
      initPayload={initPayload}
      onReady={() => {}}
      onComplete={(payload) => {
        const answer = buildWidgetAnswer({
          intendedWidgetId: resolved.widgetId,
          intendedWidgetVersion: resolved.version,
          renderedWidgetId: resolved.widgetId,
          renderedWidgetVersion: resolved.version,
          data: payload.state,
          score: payload.score,
        });
        saveAnswer(nodeId, answer);
        completeNode(payload.score);
      }}
      onInteraction={(payload) =>
        emitTelemetry?.({
          event: 'widget_interaction',
          widgetId: resolved.widgetId,
          action: payload.action,
          data: payload.data,
        })
      }
      onStateSave={(payload) =>
        saveAnswer(
          nodeId,
          buildWidgetAnswer({
            intendedWidgetId: resolved.widgetId,
            intendedWidgetVersion: resolved.version,
            renderedWidgetId: resolved.widgetId,
            renderedWidgetVersion: resolved.version,
            data: payload.state,
          }),
        )
      }
      onError={(message) => console.warn('[sandbox-widget]', message)}
      onDiagnostic={(reason) => {
        if (onDiagnostic) {
          onDiagnostic(reason);
        } else {
          console.warn('[sandbox-widget]', reason);
        }
      }}
    />
  );
}
