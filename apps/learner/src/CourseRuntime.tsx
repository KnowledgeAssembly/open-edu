import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { RuntimeProvider, LayoutShell, CompletionScreen, useRuntime } from '@open-edu/runtime';
import { WorkflowEngine, getOrderedNodes } from '@open-edu/workflow';
import type { WorkflowEvent } from '@open-edu/workflow';
import { TelemetrySession } from '@open-edu/telemetry';
import { AccessibilityProvider } from '@open-edu/accessibility';
import { createDefaultRegistry } from '@open-edu/widgets';
import { RewardBroker, CardBroker } from '@open-edu/rewards';
import { useTranslation } from '@open-edu/i18n';
import type { RewardReceipt } from '@open-edu/rewards';
import type { Rewards, CardDefinitions } from '@open-edu/schemas';
import type { ProgressSnapshot, BundleProgressSnapshot } from '@open-edu/schemas';
import type { LoadedPackage, LoadedNode, LoadedBundle } from '@open-edu/core';
import { getProgress, saveProgress } from './progressStorage';
import { saveBundleProgress } from './bundleProgressStorage';
import { addBadge } from './badgesStorage';
import { saveCardProgress, getAllCardProgress } from './cardsStorage';
import { Button, cn } from '@open-edu/design-system';
import { ArrowLeft } from 'lucide-react';
import { useCompanion } from './ai';

export interface BundleCourseContext {
  bundleId: string;
  bundle: LoadedBundle;
  currentBundleProgress: BundleProgressSnapshot | null;
  onBundleSnapshot: (snapshot: BundleProgressSnapshot) => void;
}

export interface CourseRuntimeProps {
  pkg: LoadedPackage;
  onBackToCatalog: () => void;
  children?: ReactNode;
  header?: ReactNode;
  hideLayoutShellHeader?: boolean;
  sidebarCollapsed?: boolean;
  onProgressUpdate?: (current: number, total: number) => void;
  bundleContext?: BundleCourseContext;
}

export function CourseRuntime({
  pkg,
  onBackToCatalog,
  children,
  header,
  hideLayoutShellHeader,
  sidebarCollapsed = false,
  onProgressUpdate,
  bundleContext,
}: CourseRuntimeProps): JSX.Element {
  const { t } = useTranslation();
  const companion = useCompanion();
  const [badges, setBadges] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const bundleProgressRef = useRef<BundleProgressSnapshot | null>(null);

  const [savedProgress, setSavedProgress] = useState<ProgressSnapshot | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const progress = await getProgress(pkg.manifest.id);
      if (cancelled) return;
      setSavedProgress(progress);
      setIsLoadingProgress(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pkg.manifest.id]);

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
              const badgeName = receipt.actionKey ?? receipt.detail ?? 'Unknown badge';
              setBadges((prev) => [...prev, badgeName]);
              void addBadge(pkg.manifest.id, badgeName);
              companion.addRewardMessage({
                id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type: 'badge',
                badgeName,
                timestamp: Date.now(),
              });
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
              companion.addRewardMessage({
                id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type: 'card',
                cardTitle: card.title,
                cardType: card.type,
                cardLevel: card.level,
                cardMaxLevel: card.maximumLevel,
                timestamp: Date.now(),
              });
            },
            onCardLeveledUp: (card, newLevel) => {
              void saveCardProgress(card.id, newLevel);
              companion.addRewardMessage({
                id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type: 'cardLevelUp',
                cardTitle: card.title,
                cardType: card.type,
                cardLevel: newLevel,
                cardMaxLevel: card.maximumLevel,
                timestamp: Date.now(),
              });
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

  const bundleCardBrokerRef = useRef<CardBroker | null>(null);
  const bundleRewardBrokerRef = useRef<RewardBroker | null>(null);
  const bundleSessionRef = useRef<TelemetrySession | null>(null);
  const bundleCompletedRef = useRef(false);
  const bundleModuleIdsRef = useRef<Set<string>>(new Set());
  const bundleRewardsRef = useRef<Rewards | null>(null);
  const bundleCardsRef = useRef<CardDefinitions | null>(null);

  useEffect(() => {
    const bundle = bundleContext?.bundle;
    if (!bundleContext || !bundle) return;

    const bundleRewards = bundle.rewards ?? null;
    const bundleCards = bundle.cards ?? null;
    if (!bundleRewards && !bundleCards) return;

    bundleRewardsRef.current = bundleRewards;
    bundleCardsRef.current = bundleCards;
    bundleModuleIdsRef.current = new Set(bundle.modules.map((m) => m.manifest.id));

    const session = new TelemetrySession();
    session.start();
    bundleSessionRef.current = session;

    const eventSub = session.events$.subscribe({ next: () => {} });

    const broker = bundleRewards
      ? new RewardBroker({
          rewards: bundleRewards,
          source: session.events$,
          context: { scores: {}, skills: {}, completedNodes: [], completedModules: [] },
          onReceipt: (receipt: RewardReceipt) => {
            if (receipt.status === 'delivered' && receipt.actionType === 'badge.award') {
              const badgeName = receipt.actionKey ?? receipt.detail ?? 'Unknown badge';
              setBadges((prev) => [...prev, badgeName]);
              void addBadge(bundleContext.bundleId, badgeName);
              companion.addRewardMessage({
                id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type: 'badge',
                badgeName,
                timestamp: Date.now(),
              });
            }
          },
        })
      : null;
    broker?.start();

    const cardBroker = bundleCards
      ? new CardBroker({
          cards: bundleCards.cards,
          source: session.events$,
          context: { scores: {}, skills: {}, completedNodes: [], completedModules: [] },
          onCardUnlocked: (card) => {
            void saveCardProgress(card.id, card.level);
            companion.addRewardMessage({
              id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              type: 'card',
              cardTitle: card.title,
              cardType: card.type,
              cardLevel: card.level,
              cardMaxLevel: card.maximumLevel,
              timestamp: Date.now(),
            });
          },
          onCardLeveledUp: (card, newLevel) => {
            void saveCardProgress(card.id, newLevel);
            companion.addRewardMessage({
              id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              type: 'cardLevelUp',
              cardTitle: card.title,
              cardType: card.type,
              cardLevel: newLevel,
              cardMaxLevel: card.maximumLevel,
              timestamp: Date.now(),
            });
          },
        })
      : null;
    cardBroker?.start();

    bundleRewardBrokerRef.current = broker;
    bundleCardBrokerRef.current = cardBroker;

    return () => {
      eventSub.unsubscribe();
      broker?.stop();
      cardBroker?.stop();
      session.stop();
      bundleSessionRef.current = null;
      bundleRewardBrokerRef.current = null;
      bundleCardBrokerRef.current = null;
      bundleCompletedRef.current = false;
      bundleModuleIdsRef.current = new Set();
      bundleRewardsRef.current = null;
      bundleCardsRef.current = null;
    };
  }, [bundleContext?.bundle, bundleContext?.bundleId]);

  const handleProgressChange = useCallback(
    (snapshot: ProgressSnapshot) => {
      void saveProgress(pkg.manifest.id, snapshot);

      if (bundleContext) {
        const existingBundleSnapshot =
          bundleProgressRef.current ?? bundleContext.currentBundleProgress;
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

        bundleProgressRef.current = bundleSnapshot;
        void saveBundleProgress(bundleContext.bundleId, bundleSnapshot);
        bundleContext.onBundleSnapshot(bundleSnapshot);

        if (snapshot.isCompleted && bundleModuleIdsRef.current.has(pkg.manifest.id)) {
          const wasComplete = bundleCompletedRef.current;
          const completedModules = [...bundleModuleIdsRef.current].filter(
            (id) => id === pkg.manifest.id || bundleSnapshot.moduleStatuses[id] === 'completed',
          );
          bundleCompletedRef.current = completedModules.length === bundleModuleIdsRef.current.size;
          if ((bundleRewardsRef.current || bundleCardsRef.current) && bundleSessionRef.current) {
            bundleRewardBrokerRef.current?.updateContext({ completedModules });
            bundleCardBrokerRef.current?.updateContext({ completedModules });
            bundleSessionRef.current.emit({
              event: 'module_complete',
              moduleId: pkg.manifest.id,
            } as never);
            if (bundleCompletedRef.current && !wasComplete) {
              bundleSessionRef.current.emit({
                event: 'bundle_complete',
                bundleId: bundleContext.bundleId,
              } as never);
            }
          }
        }
      }
    },
    [pkg, bundleContext],
  );

  if (isLoadingProgress) {
    return (
      <div className="p-lg max-w-content mx-auto w-full" data-testid="course-runtime">
        <div role="status" aria-live="polite">
          <p className="text-on-surface-variant">{t('runtime.loading')}</p>
        </div>
      </div>
    );
  }

  if (!engine) {
    return (
      <div className="p-lg max-w-content mx-auto w-full" data-testid="course-runtime">
        <h1 className="text-h1 font-display text-error mb-md">
          {t('learner.course.not_available')}
        </h1>
        <p className="text-on-surface-variant mb-lg">{t('learner.course.no_workflow')}</p>
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
            <div
              className={cn(
                'border-outline-variant shrink-0 overflow-y-auto border-r transition-[width] duration-200',
                sidebarCollapsed ? 'w-16' : 'w-[var(--oe-space-panel-nav)]',
              )}
            >
              {children}
            </div>
          )}
          <div className="relative flex min-w-0 flex-1 flex-col">
            {header && <div className="shrink-0">{header}</div>}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isCompleted ? (
                <CompletionScreen badges={badges} onBack={onBackToCatalog} />
              ) : (
                <LayoutShellWithBack
                  orderedNodes={orderedNodes}
                  hideHeader={hideLayoutShellHeader}
                  onProgressUpdate={onProgressUpdate}
                />
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
