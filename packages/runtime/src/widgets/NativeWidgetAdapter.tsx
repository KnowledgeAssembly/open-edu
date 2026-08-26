import { Component, useContext, useRef, type ReactNode } from 'react';
import { AnimationConfigSchema } from '@open-edu/schemas';
import type {
  RemoteWidgetManifest,
  TelemetryEvent,
  WidgetAnswer,
  WidgetReference,
} from '@open-edu/schemas';
import type { WidgetDefinition, WidgetRenderProps } from '@open-edu/widgets';
import { resolveWidgetId as resolveAlias } from '@open-edu/widgets';
import { I18nContext, useTranslation } from '@open-edu/i18n';
import { useRuntime, type DistributiveOmit } from '../context/RuntimeContext';
import { WidgetCanvas } from '../components/WidgetCanvas';
import { OasAnimationWrapper } from '../components/OasAnimationWrapper';
import type { OasAnimationController } from '../components/useOasAnimation';
import { useStepSyncMachine } from '../components/useStepSyncMachine';
import { WidgetErrorFallback } from '../components/WidgetErrorFallback';
import { buildWidgetAnswer } from './answer-provenance';
import { normalizeWidgetInteraction } from './normalize-interaction';

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<
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

export function resolveWidgetId(node: { type: string; widget?: string }): string {
  if (node.type === 'custom' && node.widget) return resolveAlias(node.widget);
  if (node.type === 'exercise') return resolveAlias(node.widget ?? 'exercise');
  return resolveAlias('exercise');
}

export interface RemoteNode {
  type: string;
  widget?: string;
  config?: Record<string, unknown>;
  widgetVersion?: string;
  remoteWidget?: RemoteWidgetManifest;
  widgetRef?: WidgetReference;
}

export interface NativeWidgetAdapterProps {
  definition: WidgetDefinition;
  node: RemoteNode;
  nodeId: string;
  /** Intended widget identity for fallback provenance; defaults to the rendered widget id. */
  intendedWidgetId?: string;
  intendedWidgetVersion?: string;
  /** Config adaptation for fallback rendering; defaults to node.config. */
  configOverride?: Record<string, unknown>;
  onDiagnostic?: (code: string) => void;
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

export function NativeWidgetAdapter({
  definition,
  node,
  nodeId,
  intendedWidgetId,
  intendedWidgetVersion,
  configOverride,
}: NativeWidgetAdapterProps): JSX.Element {
  const { completeNode, answers, saveAnswer, resolveAsset, emitTelemetry } = useRuntime();
  const { t } = useTranslation();
  const animationControllerRef = useRef<OasAnimationController | null>(null);

  const i18nContext = useContext(I18nContext);
  const locale = i18nContext?.locale;

  const resolvedId = resolveWidgetId(node);
  const widgetId = definition.id !== resolvedId ? definition.id : resolvedId;

  const config = configOverride ?? node.config ?? {};

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
    config,
    locale,
    emitInteraction,
    resolveAsset,
    complete: (score?: number, state?: unknown) => {
      if (state !== undefined) {
        const answer = buildWidgetAnswer({
          intendedWidgetId: intendedWidgetId ?? widgetId,
          intendedWidgetVersion: intendedWidgetVersion ?? definition.version,
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

  const animationConfig = config.animation;
  const parsedAnim = AnimationConfigSchema.safeParse(animationConfig);
  const isStepTriggered = parsedAnim.success && parsedAnim.data.trigger === 'step';

  return (
    <WidgetErrorBoundary widgetId={widgetId} message={t('runtime.widget.load_error')}>
      <WidgetCanvas widgetId={widgetId} minHeight={200}>
        {animationConfig && isStepTriggered ? (
          <StepSyncedWidget
            widgetId={widgetId}
            nodeId={nodeId}
            nodeConfig={config}
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
