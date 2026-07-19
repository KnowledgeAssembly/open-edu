import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { RuntimeProvider, LayoutShell, CompletionScreen, useRuntime } from '@open-edu/runtime';
import { WorkflowEngine, getOrderedNodes } from '@open-edu/workflow';
import type { WorkflowEvent } from '@open-edu/workflow';
import { TelemetrySession } from '@open-edu/telemetry';
import { AccessibilityProvider } from '@open-edu/accessibility';
import { createDefaultRegistry } from '@open-edu/widgets';
import { RewardBroker, CardBroker } from '@open-edu/rewards';
import type { RewardReceipt } from '@open-edu/rewards';
import type { CardDefinition } from '@open-edu/schemas';
import type { ProgressSnapshot, BundleProgressSnapshot } from '@open-edu/schemas';
import type { LoadedPackage, LoadedNode, LoadedBundle } from '@open-edu/core';
import { getProgress, saveProgress } from './progressStorage';
import { getBundleProgress, saveBundleProgress } from './bundleProgressStorage';
import { addBadge } from './badgesStorage';
import { saveCardProgress, getAllCardProgress } from './cardsStorage';
import { Button } from '@open-edu/design-system';
import { ArrowLeft } from 'lucide-react';
import { KnowledgeCardUnlockedToast } from '@open-edu/runtime';
import { BadgeToast } from './BadgeToast';

export interface BundleCourseContext {
  bundleId: string;
  bundle: LoadedBundle;
  onBundleSnapshot: (snapshot: BundleProgressSnapshot) => void;
}

export interface CourseRuntimeProps {
  pkg: LoadedPackage;
  onBackToCatalog: () => void;
  children?: ReactNode;
  hideLayoutShellHeader?: boolean;
  onProgressUpdate?: (current: number, total: number) => void;
  bundleContext?: BundleCourseContext;
}

export function CourseRuntime({
  pkg,
  onBackToCatalog,
  children,
  hideLayoutShellHeader,
  onProgressUpdate,
  bundleContext,
}: CourseRuntimeProps): JSX.Element {
  const [badges, setBadges] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [toastBadgeName, setToastBadgeName] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastCard, setToastCard] = useState<CardDefinition | null>(null);
  const [toastCardLevel, setToastCardLevel] = useState(0);
  const [toastCardType, setToastCardType] = useState<'unlock' | 'levelUp'>('unlock');
  const [toastCardVisible, setToastCardVisible] = useState(false);
  const bundleProgressRef = useRef<BundleProgressSnapshot | null>(null);

  const [savedProgress, setSavedProgress] = useState<ProgressSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [progress, bundleSnapshot] = await Promise.all([
        getProgress(pkg.manifest.id),
        bundleContext ? getBundleProgress(bundleContext.bundleId) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setSavedProgress(progress);
      if (bundleSnapshot) bundleProgressRef.current = bundleSnapshot;
    })();
    return () => {
      cancelled = true;
    };
  }, [pkg.manifest.id, bundleContext]);

  const engine = useMemo(() => {
    if (!pkg.workflow) return null;
    const savedNode = savedProgress?.currentNodeId;
    const entry = savedNode && savedNode in pkg.workflow.routing ? savedNode : pkg.manifest.entry;
    if (!entry) return null;
    return new WorkflowEngine(pkg.workflow, { entry });
  }, [pkg, savedProgress]);

  const orderedNodes = useMemo<LoadedNode[]>(() => {
    if (!pkg.workflow || !pkg.manifest.entry) return [];
    const nodeIds = getOrderedNodes(pkg.workflow, pkg.manifest.entry);
    return nodeIds
      .map((id) => pkg.nodes.find((n) => n.relativePath === id))
      .filter((n): n is LoadedNode => n !== undefined);
  }, [pkg]);

  const widgetRegistry = useMemo(() => createDefaultRegistry(), []);

  const initialProgress = useMemo(() => {
    return savedProgress ?? undefined;
  }, [savedProgress]);

  const cardBrokerRef = useRef<CardBroker | null>(null);

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
              void addBadge(pkg.manifest.id, badgeName);
              setToastBadgeName(badgeName);
              setToastVisible(true);
            }
          },
        })
      : null;
    broker?.start();

    const engineUnsub = engine.subscribe((event: WorkflowEvent) => {
      if (event.type === 'node.entered' && event.nodeId) {
        session.emit({ event: 'node_open', nodeId: event.nodeId } as never);
      } else if (event.type === 'node.completed' && event.nodeId) {
        broker?.updateContext({
          scores: event.score != null ? { [event.nodeId]: event.score } : undefined,
          completedNodes: [event.nodeId],
        });
        cardBrokerRef.current?.updateContext({
          scores: event.score != null ? { [event.nodeId]: event.score } : undefined,
          completedNodes: [event.nodeId],
        });
        session.emit({
          event: 'node_complete',
          nodeId: event.nodeId,
          score: event.score,
        } as never);
      } else if (event.type === 'workflow.completed') {
        session.emit({ event: 'workflow_complete' } as never);
      }
    });

    const compUnsub = engine.subscribe((event: WorkflowEvent) => {
      if (event.type === 'workflow.completed') {
        setIsCompleted(true);
      }
    });

    let cancelled = false;
    void (async () => {
      const savedCardProgress = await getAllCardProgress();
      if (cancelled) return;
      const cb = pkg.cards?.cards
        ? new CardBroker({
            cards: pkg.cards.cards,
            source: session.events$,
            initialLevels: Object.fromEntries(
              Object.entries(savedCardProgress).map(([id, p]) => [id, p.level]),
            ),
            onCardUnlocked: (card) => {
              void saveCardProgress(card.id, card.level);
              setToastCard(card);
              setToastCardLevel(card.level);
              setToastCardType('unlock');
              setToastCardVisible(true);
            },
            onCardLeveledUp: (card, newLevel) => {
              void saveCardProgress(card.id, newLevel);
              setToastCard(card);
              setToastCardLevel(newLevel);
              setToastCardType('levelUp');
              setToastCardVisible(true);
            },
          })
        : null;
      cardBrokerRef.current = cb;
      cb?.start();
    })();

    return () => {
      cancelled = true;
      engineUnsub();
      compUnsub();
      broker?.stop();
      cardBrokerRef.current?.stop();
      cardBrokerRef.current = null;
      eventSub.unsubscribe();
      session.stop();
    };
  }, [engine, pkg]);

  const handleProgressChange = useCallback(
    (snapshot: ProgressSnapshot) => {
      void saveProgress(pkg.manifest.id, snapshot);

      if (bundleContext) {
        const existingBundleSnapshot = bundleProgressRef.current;
        const bundleSnapshot: BundleProgressSnapshot = {
          bundleId: bundleContext.bundleId,
          bundleVersion: bundleContext.bundle.manifest.version ?? '0.0.0',
          moduleStatuses: {
            ...existingBundleSnapshot?.moduleStatuses,
            [pkg.manifest.id]: snapshot.isCompleted ? 'completed' : 'in_progress',
          },
          moduleProgress: {
            ...existingBundleSnapshot?.moduleProgress,
            [pkg.manifest.id]: {
              moduleId: pkg.manifest.id,
              packageVersion: pkg.manifest.version ?? '0.0.0',
              currentNodeId: snapshot.currentNodeId,
              visitedNodes: snapshot.visitedNodes,
              scores: snapshot.scores,
              answers: snapshot.answers,
              isCompleted: snapshot.isCompleted,
              completedAt: snapshot.isCompleted ? snapshot.updatedAt : undefined,
            },
          },
          updatedAt: snapshot.updatedAt,
        };

        void saveBundleProgress(bundleContext.bundleId, bundleSnapshot);
        bundleContext.onBundleSnapshot(bundleSnapshot);
      }
    },
    [pkg, bundleContext],
  );

  if (!engine) {
    return (
      <div className="p-lg max-w-2xl" data-testid="course-runtime">
        <h1 className="text-h1 font-display text-error mb-md">Course not available</h1>
        <p className="text-on-surface-variant mb-lg">This course has no workflow defined.</p>
        <Button onClick={onBackToCatalog}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1" data-testid="course-runtime">
      <AccessibilityProvider>
        <RuntimeProvider
          loadedPackage={pkg}
          engine={engine}
          initialProgress={initialProgress}
          onProgressChange={handleProgressChange}
          widgetRegistry={widgetRegistry}
        >
          {children && (
            <div className="border-outline-variant flex-[0_0_280px] overflow-y-auto border-r">
              {children}
            </div>
          )}
          <div className="relative min-w-0 flex-1 overflow-y-auto">
            {isCompleted ? (
              <CompletionScreen badges={badges} onBack={onBackToCatalog} />
            ) : (
              <LayoutShellWithBack
                orderedNodes={orderedNodes}
                hideHeader={hideLayoutShellHeader}
                onProgressUpdate={onProgressUpdate}
              />
            )}
            <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-2">
              {toastBadgeName && (
                <div className="pointer-events-auto">
                  <BadgeToast
                    badgeName={toastBadgeName}
                    visible={toastVisible}
                    onDismiss={() => setToastVisible(false)}
                  />
                </div>
              )}
              {toastCard && (
                <div className="pointer-events-auto">
                  <KnowledgeCardUnlockedToast
                    card={toastCard}
                    newLevel={toastCardLevel}
                    visible={toastCardVisible}
                    type={toastCardType}
                    onDismiss={() => {
                      setToastCardVisible(false);
                      setToastCard(null);
                    }}
                  />
                </div>
              )}
            </div>
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
