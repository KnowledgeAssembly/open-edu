import { useMemo, useRef, useState } from 'react';
import type { InteractiveNode } from '@open-edu/schemas';
import {
  InteractiveNodeView,
  InteractiveLessonView,
  buildOpenEduBridge,
  readCssTokens,
} from '@open-edu/interactive-runtime';
import type { OpenEduBridge } from '@open-edu/interactive-runtime';
import { useRuntimeOptional } from '../context/RuntimeContext';
import { useTranslation } from '@open-edu/i18n';
import { useLiveRegion } from '@open-edu/accessibility';

export interface InteractiveRendererProps {
  node: InteractiveNode;
  nodeId: string;
  onComplete?: (score?: number) => void;
}

function isComposedLesson(node: InteractiveNode): boolean {
  return Array.isArray(node.engines);
}

/**
 * Renders a single `{ type: 'interactive' }` node via the OpenEdu host bridge.
 * Single-engine nodes mount {@link InteractiveNodeView}; composed lessons mount
 * {@link InteractiveLessonView}. Engine events are bridged to OpenEdu telemetry;
 * completion is user-initiated via an explicit "Mark complete" button.
 */
export function InteractiveRenderer({
  node,
  nodeId,
  onComplete,
}: InteractiveRendererProps): JSX.Element {
  const runtime = useRuntimeOptional();
  const { t, locale } = useTranslation();
  const { announce } = useLiveRegion();
  const [interactions, setInteractions] = useState(0);

  const tRef = useRef(t);
  tRef.current = t;
  const announceRef = useRef(announce);
  announceRef.current = announce;

  const bridge: OpenEduBridge = useMemo(
    () =>
      buildOpenEduBridge({
        locale,
        tokens: readCssTokens(),
        reducedMotion:
          typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false,
        t: (key, vars) => {
          const safe: Record<string, string> = {};
          if (vars) for (const k of Object.keys(vars)) safe[k] = String(vars[k]);
          return tRef.current(key, safe);
        },
        announce: (message) => announceRef.current(message),
        onEvent: (event) => {
          const isUserInteraction = event.action != null;
          if (isUserInteraction) setInteractions((n) => n + 1);
          const rawAction = event.action as { type?: string } | undefined;
          runtime?.emitTelemetry?.({
            event: 'interactive_interaction',
            nodeId,
            instanceId: event.instanceId,
            engine: String(event.name.split('.')[0] ?? ''),
            action: rawAction?.type,
            seq: event.seq,
            data: { event: event.name },
          });
        },
        resolveAsset: (id) => runtime?.resolveAsset(id) ?? `/assets/${id}`,
      }),
    [locale, runtime, nodeId],
  );

  const handleComplete = (): void => {
    runtime?.saveAnswer(nodeId, {
      type: 'interactive',
      engaged: interactions > 0,
      interactions,
    });
    runtime?.emitTelemetry?.({
      event: 'interactive_complete',
      nodeId,
      interactions,
    });
    announce(t('runtime.interactive.completed'));
    if (onComplete) onComplete(undefined);
    else runtime?.completeNode(undefined);
  };

  const engine = node.engine ?? 'lesson';

  return (
    <div
      className="open-edu-interactive"
      data-testid="interactive-renderer"
      role="region"
      aria-label={t('runtime.interactive.iframe_title', { engine })}
    >
      {isComposedLesson(node) ? (
        <InteractiveLessonView
          lesson={{
            id: node.id ?? 'interactive-lesson',
            title: node.title,
            engines: node.engines ?? [],
            bindings: node.bindings ?? [],
          }}
          bridge={bridge}
          onEvent={bridge.onEvent}
        />
      ) : (
        <InteractiveNodeView
          spec={node.spec}
          engineType={node.engine ?? 'visual'}
          bridge={bridge}
          onEvent={bridge.onEvent}
        />
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          {t('runtime.interactive.interactions', { count: String(interactions) })}
        </span>
        <button
          type="button"
          className="bg-primary text-primary-foreground ring-offset-background hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          onClick={handleComplete}
        >
          {t('runtime.interactive.mark_complete')}
        </button>
      </div>
    </div>
  );
}
