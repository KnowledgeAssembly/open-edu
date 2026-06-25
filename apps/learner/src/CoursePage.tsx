import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RuntimeProvider,
  LayoutShell,
  RuntimeThemeProvider,
  Sidebar,
  CompletionScreen,
} from '@open-edu/runtime';
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

export interface CoursePageProps {
  pkg: LoadedPackage;
  onBackToCatalog: () => void;
}

export function CoursePage({ pkg, onBackToCatalog }: CoursePageProps): JSX.Element {
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

    const eventSub = session.events$.subscribe({
      next: () => {},
    });

    const broker = pkg.rewards
      ? new RewardBroker({
          rewards: pkg.rewards,
          source: session.events$,
          onReceipt: (receipt: RewardReceipt) => {
            if (receipt.status === 'delivered' && receipt.actionType === 'badge.award') {
              const badgeName = receipt.detail ?? receipt.actionKey ?? 'Unknown badge';
              setBadges((prev) => [...prev, badgeName]);
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

    return () => {
      engineUnsub();
      broker?.stop();
      eventSub.unsubscribe();
      session.stop();
    };
  }, [engine, pkg]);

  useEffect(() => {
    if (!engine) return;

    const unsub = engine.subscribe((event: WorkflowEvent) => {
      if (event.type === 'workflow.completed') {
        setIsCompleted(true);
      }
    });

    return unsub;
  }, [engine]);

  const handleProgressChange = useCallback(
    (snapshot: ProgressSnapshot) => {
      saveProgress(pkg.manifest.id, snapshot);
    },
    [pkg],
  );

  if (!engine) {
    return (
      <div style={{ padding: '2rem', maxWidth: '40rem' }}>
        <h1 style={{ color: 'var(--oe-color-error, #dc2626)' }}>Course not available</h1>
        <p>This course has no workflow defined.</p>
        <button onClick={onBackToCatalog}>Back to catalog</button>
      </div>
    );
  }

  return (
    <RuntimeThemeProvider>
      <AccessibilityProvider>
        <RuntimeProvider
          loadedPackage={pkg}
          engine={engine}
          initialProgress={initialProgress}
          onProgressChange={handleProgressChange}
          widgetRegistry={widgetRegistry}
        >
          {isCompleted ? (
            <CompletionScreen badges={badges} onBack={onBackToCatalog} />
          ) : (
            <div style={{ display: 'flex', height: '100vh' }}>
              <Sidebar nodes={orderedNodes} />
              <div style={{ flex: 1, overflow: 'auto' }}>
                <LayoutShell />
              </div>
            </div>
          )}
          {toastBadgeName && (
            <div
              style={{
                position: 'fixed',
                bottom: '1rem',
                right: '1rem',
                zIndex: 9999,
                background: 'var(--oe-color-bg, white)',
                border: '1px solid var(--oe-color-border)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                opacity: toastVisible ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <div
                style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--oe-color-success)' }}
              >
                Badge earned!
              </div>
              <div style={{ fontSize: '1rem' }}>{toastBadgeName}</div>
            </div>
          )}
        </RuntimeProvider>
      </AccessibilityProvider>
    </RuntimeThemeProvider>
  );
}
