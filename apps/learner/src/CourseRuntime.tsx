import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { RuntimeProvider, LayoutShell, CompletionScreen, useRuntime } from '@open-edu/runtime';
import { WorkflowEngine, getOrderedNodes } from '@open-edu/workflow';
import type { WorkflowEvent } from '@open-edu/workflow';
import { TelemetrySession } from '@open-edu/telemetry';
import { AccessibilityProvider } from '@open-edu/accessibility';
import { createDefaultRegistry } from '@open-edu/widgets';
import { RewardBroker } from '@open-edu/rewards';
import type { RewardReceipt } from '@open-edu/rewards';
import type { ProgressSnapshot } from '@open-edu/schemas';
import type { LoadedPackage, LoadedNode } from '@open-edu/core';
import { getProgress, saveProgress } from './progressStorage';
import { addBadge } from './badgesStorage';

export interface CourseRuntimeProps {
  pkg: LoadedPackage;
  onBackToCatalog: () => void;
  children?: ReactNode;
  hideLayoutShellHeader?: boolean;
  onProgressUpdate?: (current: number, total: number) => void;
}

export function CourseRuntime({
  pkg,
  onBackToCatalog,
  children,
  hideLayoutShellHeader,
  onProgressUpdate,
}: CourseRuntimeProps): JSX.Element {
  const [badges, setBadges] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [toastBadgeName, setToastBadgeName] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const engine = useMemo(() => {
    if (!pkg.workflow) return null;
    const saved = getProgress(pkg.manifest.id);
    const entry = saved?.currentNodeId ?? pkg.manifest.entry;
    if (!entry) return null;
    return new WorkflowEngine(pkg.workflow, { entry });
  }, [pkg]);

  const orderedNodes = useMemo<LoadedNode[]>(() => {
    if (!pkg.workflow || !pkg.manifest.entry) return [];
    const nodeIds = getOrderedNodes(pkg.workflow, pkg.manifest.entry);
    return nodeIds
      .map((id) => pkg.nodes.find((n) => n.relativePath === id))
      .filter((n): n is LoadedNode => n !== undefined);
  }, [pkg]);

  const widgetRegistry = useMemo(() => createDefaultRegistry(), []);

  const initialProgress = useMemo(() => {
    return getProgress(pkg.manifest.id) ?? undefined;
  }, [pkg]);

  useEffect(() => {
    if (!engine) return;

    const session = new TelemetrySession();
    session.start();

    const eventSub = session.events$.subscribe({ next: () => {} });

    const broker = pkg.rewards
      ? new RewardBroker({
          rewards: pkg.rewards,
          source: session.events$,
          onReceipt: (receipt: RewardReceipt) => {
            if (receipt.status === 'delivered' && receipt.actionType === 'badge.award') {
              const badgeName = receipt.detail ?? receipt.actionKey ?? 'Unknown badge';
              setBadges((prev) => [...prev, badgeName]);
              addBadge(pkg.manifest.id, badgeName);
              setToastBadgeName(badgeName);
              setToastVisible(true);
              setTimeout(() => setToastVisible(false), 3000);
            }
          },
        })
      : null;
    broker?.start();

    const engineUnsub = engine.subscribe((event: WorkflowEvent) => {
      if (event.type === 'node.entered' && event.nodeId) {
        session.emit({ event: 'node_open', nodeId: event.nodeId } as never);
      } else if (event.type === 'node.completed' && event.nodeId) {
        session.emit({
          event: 'node_complete',
          nodeId: event.nodeId,
          score: event.score,
        } as never);
        broker?.updateContext({
          scores: event.score != null ? { [event.nodeId]: event.score } : undefined,
          completedNodes: [event.nodeId],
        });
      } else if (event.type === 'workflow.completed') {
        session.emit({ event: 'workflow_complete' } as never);
      }
    });

    const compUnsub = engine.subscribe((event: WorkflowEvent) => {
      if (event.type === 'workflow.completed') {
        setIsCompleted(true);
      }
    });

    return () => {
      engineUnsub();
      compUnsub();
      broker?.stop();
      eventSub.unsubscribe();
      session.stop();
    };
  }, [engine, pkg]);

  const handleProgressChange = useCallback(
    (snapshot: ProgressSnapshot) => {
      saveProgress(pkg.manifest.id, snapshot);
    },
    [pkg],
  );

  if (!engine) {
    return (
      <div className="p-lg max-w-2xl">
        <h1 className="text-h1 font-display text-error font-bold mb-md">Course not available</h1>
        <p className="text-on-surface-variant mb-lg">This course has no workflow defined.</p>
        <button
          onClick={onBackToCatalog}
          className="bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold"
        >
          Back to catalog
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="course-runtime">
      <AccessibilityProvider>
        <RuntimeProvider
          loadedPackage={pkg}
          engine={engine}
          initialProgress={initialProgress}
          onProgressChange={handleProgressChange}
          widgetRegistry={widgetRegistry}
        >
          {children && (
            <div className="flex-[0_0_280px] overflow-y-auto border-r border-outline-variant">
              {children}
            </div>
          )}
          <div className="flex-1 min-w-0 relative">
            {isCompleted ? (
              <CompletionScreen badges={badges} onBack={onBackToCatalog} />
            ) : (
              <LayoutShellWithBack
                orderedNodes={orderedNodes}
                hideHeader={hideLayoutShellHeader}
                onProgressUpdate={onProgressUpdate}
              />
            )}
            {toastBadgeName && (
              <div
                className="fixed bottom-4 right-4 z-[9999] bg-surface border border-outline-variant rounded-lg px-4 py-3 shadow-lg transition-opacity duration-300"
                style={{ opacity: toastVisible ? 1 : 0 }}
                data-testid="badge-toast"
              >
                <div className="font-semibold text-sm text-success">Badge earned!</div>
                <div className="text-base">{toastBadgeName}</div>
              </div>
            )}
          </div>
        </RuntimeProvider>
      </AccessibilityProvider>
    </div>
  );
}

function LayoutShellWithBack({
  orderedNodes,
  hideHeader,
  onProgressUpdate,
}: {
  orderedNodes: LoadedNode[];
  hideHeader?: boolean;
  onProgressUpdate?: (current: number, total: number) => void;
}): JSX.Element {
  const { currentNodeId, visitedNodes, navigateToNode } = useRuntime();

  const currentIndex = orderedNodes.findIndex((n) => n.relativePath === currentNodeId);
  const canGoBack = currentIndex > 0;
  const stepDisplay = currentIndex >= 0 ? currentIndex + 1 : 0;

  useEffect(() => {
    onProgressUpdate?.(stepDisplay, orderedNodes.length);
  }, [stepDisplay, orderedNodes.length, onProgressUpdate]);

  const handleBack = () => {
    const previousNodes = orderedNodes.slice(0, currentIndex);
    for (let i = previousNodes.length - 1; i >= 0; i--) {
      const prevId = previousNodes[i]!.relativePath;
      if (visitedNodes.includes(prevId)) {
        navigateToNode(prevId);
        return;
      }
    }
  };

  return (
    <LayoutShell
      currentStep={stepDisplay}
      totalSteps={orderedNodes.length}
      onBack={handleBack}
      canGoBack={canGoBack}
      hideHeader={hideHeader}
    />
  );
}
