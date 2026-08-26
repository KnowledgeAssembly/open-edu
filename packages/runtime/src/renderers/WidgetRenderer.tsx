import { Component, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimationConfigSchema } from '@open-edu/schemas';
import { useRuntime, type DistributiveOmit } from '../context/RuntimeContext';
import { I18nContext, useTranslation } from '@open-edu/i18n';
import type { WidgetRenderProps, RemoteWidgetManifest } from '@open-edu/widgets';
import { useRemoteWidget, resolveWidgetId as resolveAlias } from '@open-edu/widgets';
import { WidgetCanvas } from '../components/WidgetCanvas';
import { OasAnimationWrapper } from '../components/OasAnimationWrapper';
import type { OasAnimationController } from '../components/useOasAnimation';
import { useStepSyncMachine } from '../components/useStepSyncMachine';
import { WidgetErrorFallback } from '../components/WidgetErrorFallback';
import { PROTOCOL_API_VERSION } from '@open-edu/widget-sdk';
import type { TelemetryEvent, WidgetAnswer, WidgetReference } from '@open-edu/schemas';
import { buildWidgetAnswer } from '../widgets/answer-provenance';
import { normalizeWidgetInteraction } from '../widgets/normalize-interaction';
import { SandboxWidgetAdapter, isSandboxWidgetsEnabled } from '../widgets/SandboxWidgetAdapter';
import { useTheme } from '../theme';
import type { InitPayload } from '@open-edu/widget-sdk';

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
  widgetRef?: WidgetReference;
}

export interface WidgetRendererProps {
  node: RemoteNode;
  nodeId: string;
}

function countWidgetSteps(config: Record<string, unknown> | undefined): number {
  const steps = config?.steps;
  if (Array.isArray(steps)) return steps.length;
  const nodes = config?.nodes;
  if (Array.isArray(nodes)) return nodes.length;
  return 0;
}

/**
 * Hosts the shared step-sync state machine so SVG/Lottie animation and widget
 * step reveal share one source of truth when `animation.trigger === 'step'`.
 */
function StepSyncedWidget({
  widgetId,
  nodeId,
  nodeConfig,
  animationConfig,
  definitionVersion,
  WidgetComponent,
  storedState,
  resolveAsset,
  completeNode,
  saveAnswer,
  locale,
  emitTelemetry,
}: {
  widgetId: string;
  nodeId: string;
  nodeConfig: Record<string, unknown>;
  animationConfig: unknown;
  definitionVersion?: string;
  WidgetComponent: (props: WidgetRenderProps) => ReactNode;
  storedState: unknown;
  resolveAsset: (path: string) => string;
  completeNode: (score?: number) => void;
  saveAnswer: (nodeId: string, answer: WidgetAnswer) => void;
  locale?: string;
  emitTelemetry?: (event: DistributiveOmit<TelemetryEvent, 'timestamp'>) => void;
}) {
  const parsedAnim = AnimationConfigSchema.safeParse(animationConfig);
  const effectCount = parsedAnim.success ? (parsedAnim.data.effects?.length ?? 0) : 0;
  const widgetStepCount = countWidgetSteps(nodeConfig);
  const totalSteps = Math.max(1, effectCount || widgetStepCount || 1);

  const initialRevealed =
    storedState &&
    typeof storedState === 'object' &&
    storedState !== null &&
    'revealedCount' in storedState &&
    typeof (storedState as { revealedCount: unknown }).revealedCount === 'number'
      ? (storedState as { revealedCount: number }).revealedCount
      : 0;

  const machine = useStepSyncMachine(totalSteps, initialRevealed);
  const animationControllerRef = useRef<OasAnimationController | null>(null);

  const emitInteraction = (data: Record<string, unknown>) => {
    const normalized = normalizeWidgetInteraction(widgetId, data);
    if (normalized) emitTelemetry?.(normalized);
    if (data.action === 'reveal' && typeof data.step === 'number') {
      machine.goTo(data.step);
    } else if (data.action === 'reveal') {
      machine.revealNext();
    }
  };

  const widgetProps: WidgetRenderProps = {
    nodeId,
    config: nodeConfig,
    locale,
    emitInteraction,
    resolveAsset,
    syncedRevealedCount: machine.state.revealedCount,
    complete: (score?: number, state?: unknown) => {
      if (state !== undefined) {
        const answer = buildWidgetAnswer({
          intendedWidgetId: widgetId,
          intendedWidgetVersion: definitionVersion,
          renderedWidgetId: widgetId,
          renderedWidgetVersion: definitionVersion,
          data: state,
          score,
        });
        saveAnswer(nodeId, answer);
        if (answer.renderedViaFallback) {
          emitTelemetry?.({ event: 'node_complete', nodeId, score, renderedViaFallback: true });
        }
      }
      if (
        state &&
        typeof state === 'object' &&
        state !== null &&
        'finished' in state &&
        (state as { finished?: boolean }).finished
      ) {
        machine.finish();
      }
      completeNode(score);
    },
    storedState,
  };

  const handleAnimStepChange = (stepIndex: number) => {
    // Animation controls → machine (revealedCount = stepIndex + 1, or 0 when idle)
    machine.goTo(stepIndex < 0 ? 0 : stepIndex + 1);
  };

  return (
    <OasAnimationWrapper
      config={animationConfig}
      resolveSrc={resolveAsset}
      preserveChildren
      controllerRef={animationControllerRef}
      controlledStep={machine.animationStepIndex}
      onStepChange={handleAnimStepChange}
      staticChildren={<WidgetComponent {...widgetProps} />}
    />
  );
}

export function WidgetRenderer({ node, nodeId }: WidgetRendererProps): JSX.Element {
  const { widgetRegistry, completeNode, answers, saveAnswer, resolveAsset, emitTelemetry } =
    useRuntime();
  const { t } = useTranslation();
  const animationControllerRef = useRef<OasAnimationController | null>(null);

  const i18nContext = useContext(I18nContext);
  const locale = i18nContext?.locale;

  if (isSandboxWidgetsEnabled() && node.widgetRef?.source === 'registry') {
    return <SandboxWidgetRenderer node={node} nodeId={nodeId} />;
  }

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
    const normalized = normalizeWidgetInteraction(widgetId, data);
    if (normalized) emitTelemetry?.(normalized);
    // Legacy one-way bridge for non-step-synced animations
    if (data.action === 'reveal') {
      if (typeof data.step === 'number') {
        animationControllerRef.current?.goToStep(data.step - 1);
      } else {
        animationControllerRef.current?.nextStep();
      }
    }
  };

  const WidgetComponent = definition.render;
  const widgetProps: WidgetRenderProps = {
    nodeId,
    config: node.config ?? {},
    locale,
    emitInteraction,
    resolveAsset,
    complete: (score?: number, state?: unknown) => {
      if (state !== undefined) {
        const answer = buildWidgetAnswer({
          intendedWidgetId: widgetId,
          intendedWidgetVersion: definition.version,
          renderedWidgetId: widgetId,
          renderedWidgetVersion: definition.version,
          data: state,
          score,
        });
        saveAnswer(nodeId, answer);
        if (answer.renderedViaFallback) {
          emitTelemetry?.({ event: 'node_complete', nodeId, score, renderedViaFallback: true });
        }
      }
      completeNode(score);
    },
    storedState,
  };

  const animationConfig = node.config?.animation;
  const parsedAnim = AnimationConfigSchema.safeParse(animationConfig);
  const isStepTriggered = parsedAnim.success && parsedAnim.data.trigger === 'step';

  return (
    <WidgetErrorBoundary widgetId={widgetId} message={t('runtime.widget.load_error')}>
      <WidgetCanvas widgetId={widgetId} minHeight={200}>
        {animationConfig && isStepTriggered ? (
          <StepSyncedWidget
            widgetId={widgetId}
            nodeId={nodeId}
            nodeConfig={node.config ?? {}}
            animationConfig={animationConfig}
            definitionVersion={definition.version}
            WidgetComponent={WidgetComponent}
            storedState={storedState}
            resolveAsset={resolveAsset}
            completeNode={completeNode}
            saveAnswer={saveAnswer}
            locale={locale}
            emitTelemetry={emitTelemetry}
          />
        ) : animationConfig ? (
          <OasAnimationWrapper
            config={animationConfig}
            resolveSrc={resolveAsset}
            preserveChildren
            controllerRef={animationControllerRef}
            staticChildren={<WidgetComponent {...widgetProps} />}
          />
        ) : (
          <WidgetComponent {...widgetProps} />
        )}
      </WidgetCanvas>
    </WidgetErrorBoundary>
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

function SandboxWidgetRenderer({
  node,
  nodeId,
}: {
  node: RemoteNode;
  nodeId: string;
}): JSX.Element {
  const { completeNode, answers, saveAnswer, emitTelemetry } = useRuntime();
  const widgetRef = node.widgetRef!;

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

  const buildAdapter = () => {
    const initPayload: InitPayload = {
      apiVersion: PROTOCOL_API_VERSION,
      widgetId: widgetRef.id,
      widgetVersion: widgetRef.version,
      instanceId: '',
      nodeId,
      config: node.config ?? {},
      storedState,
      locale,
      theme: themeIdToProtocolTheme(theme.id),
      themeTokens: {},
      prefersReducedMotion,
      capabilities: ['resize', 'telemetry-interaction', 'state-persistence', 'locale', 'theme'],
    };

    return (
      <SandboxWidgetAdapter
        nodeId={nodeId}
        expectedOrigin="opaque"
        title={widgetRef.id}
        initPayload={initPayload}
        onReady={() => {}}
        onComplete={(payload) => {
          const answer = buildWidgetAnswer({
            intendedWidgetId: widgetRef.id,
            intendedWidgetVersion: widgetRef.version,
            renderedWidgetId: widgetRef.id,
            renderedWidgetVersion: widgetRef.version,
            data: payload.state,
            score: payload.score,
          });
          saveAnswer(nodeId, answer);
          completeNode(payload.score);
        }}
        onInteraction={(payload) =>
          emitTelemetry?.({
            event: 'widget_interaction',
            widgetId: widgetRef.id,
            action: payload.action,
            data: payload.data,
          })
        }
        onStateSave={(payload) =>
          saveAnswer(
            nodeId,
            buildWidgetAnswer({
              intendedWidgetId: widgetRef.id,
              intendedWidgetVersion: widgetRef.version,
              renderedWidgetId: widgetRef.id,
              renderedWidgetVersion: widgetRef.version,
              data: payload.state,
            }),
          )
        }
        onError={(message) => console.warn('[sandbox-widget]', message)}
        onDiagnostic={(reason) => console.warn('[sandbox-widget]', reason)}
      />
    );
  };

  // Phase 1 ships no resolver, so widgetRef carries no document source yet. When a
  // documentUrl/srcDoc becomes available (Phase 2 resolver), render the adapter.
  const sourceUrl: string | undefined = undefined;
  if (sourceUrl) {
    return buildAdapter();
  }

  return <div role="status" data-testid="sandbox-widget-unresolved" aria-live="polite" />;
}
