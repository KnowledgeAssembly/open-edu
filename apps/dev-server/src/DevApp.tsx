import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import {
  RuntimeProvider,
  LayoutShell,
  RuntimeThemeProvider,
  BundleOverview,
} from '@open-edu/runtime';
import { WorkflowEngine } from '@open-edu/workflow';
import type { WorkflowEvent } from '@open-edu/workflow';
import { TelemetrySession } from '@open-edu/telemetry';
import type { TelemetryEvent, ProgressSnapshot } from '@open-edu/schemas';
import { AccessibilityProvider } from '@open-edu/accessibility';
import type { LoadedPackage, LoadedBundle } from '@open-edu/core';
import { createDefaultRegistry } from '@open-edu/widgets';
import { RewardBroker } from '@open-edu/rewards';
import type { RewardReceipt } from '@open-edu/rewards';
import { InspectorPanel } from './inspectors/InspectorPanel';
import { loadProgress, saveProgress, clearProgress } from './progressStorage';

import {
  packageData as rawPackageData,
  bundleData as rawBundleData,
} from 'virtual:open-edu-package';

const loadedPkg = rawPackageData as LoadedPackage | null;
const loadedBundle = rawBundleData
  ? ({
      ...rawBundleData,
      moduleMap: new Map((rawBundleData as any).moduleMap as [string, any][]),
    } as LoadedBundle)
  : null;

function DevAppFallback({ title, message }: { title: string; message: string }): JSX.Element {
  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        color: '#dc2626',
        maxWidth: '40rem',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{title}</h1>
      <p style={{ color: '#6b7280' }}>{message}</p>
    </div>
  );
}

function BundleDevApp({ bundle }: { bundle: LoadedBundle }): JSX.Element {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    bundle.modules[0]?.manifest.id ?? '',
  );
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([]);
  const [rewardReceipts] = useState<RewardReceipt[]>([]);
  const [showOverview, setShowOverview] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const currentPkg = useMemo(() => {
    return selectedModuleId ? (bundle.moduleMap.get(selectedModuleId) ?? null) : null;
  }, [selectedModuleId, bundle]);

  const initialProgress = useMemo(() => {
    if (!currentPkg) return undefined;
    return loadProgress(currentPkg.manifest.id, currentPkg.manifest.version) ?? undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey, currentPkg?.manifest.id]);

  const engine = useMemo(() => {
    if (!currentPkg?.workflow) return null;
    const entry = initialProgress?.currentNodeId ?? currentPkg.manifest.entry;
    return new WorkflowEngine(currentPkg.workflow, { entry });
  }, [currentPkg, initialProgress, progressKey]);

  useEffect(() => {
    const session = new TelemetrySession();
    session.start();

    const eventSub = session.events$.subscribe({
      next: (event) => {
        setTelemetryEvents((prev) => [...prev, event]);
      },
    });

    let engineUnsub: (() => void) | undefined;
    if (engine) {
      engineUnsub = engine.subscribe((event: WorkflowEvent) => {
        if (event.type === 'node.entered' && event.nodeId) {
          session.emit({
            event: 'node_open',
            nodeId: event.nodeId,
            bundleId: bundle.manifest.id,
            moduleId: selectedModuleId,
          } as never);
        } else if (event.type === 'node.completed' && event.nodeId) {
          session.emit({
            event: 'node_complete',
            nodeId: event.nodeId,
            score: event.score,
            bundleId: bundle.manifest.id,
            moduleId: selectedModuleId,
          } as never);
        } else if (event.type === 'workflow.completed') {
          session.emit({
            event: 'workflow_complete',
            bundleId: bundle.manifest.id,
            moduleId: selectedModuleId,
          } as never);
        }
      });
    }

    return () => {
      engineUnsub?.();
      eventSub.unsubscribe();
      session.stop();
    };
  }, [engine, selectedModuleId, bundle.manifest.id]);

  const handleProgressChange = useCallback(
    (snapshot: ProgressSnapshot) => {
      if (currentPkg) {
        saveProgress(currentPkg.manifest.id, currentPkg.manifest.version, snapshot);
      }
    },
    [currentPkg],
  );

  const widgetRegistry = useMemo(() => createDefaultRegistry(), []);

  const handleReset = useCallback(() => {
    if (currentPkg) {
      clearProgress(currentPkg.manifest.id, currentPkg.manifest.version);
      setProgressKey((k) => k + 1);
    }
  }, [currentPkg]);

  if (showOverview) {
    return (
      <RuntimeThemeProvider>
        <AccessibilityProvider>
          <BundleOverview
            bundleTitle={bundle.manifest.title}
            bundleId={bundle.manifest.id}
            description={bundle.manifest.description}
            modules={bundle.manifest.modules.map((m) => ({
              id: m.id,
              title: m.title,
              chapterCode: m.chapterCode,
              status: 'unlocked' as const,
              nodeCount: bundle.moduleMap.get(m.id)?.nodes.length ?? 0,
              completedNodeCount: 0,
              estimatedDuration: m.estimatedDuration,
            }))}
            onStartModule={(moduleId) => {
              setSelectedModuleId(moduleId);
              setShowOverview(false);
            }}
            onBackToCatalog={() => setShowOverview(false)}
          />
        </AccessibilityProvider>
      </RuntimeThemeProvider>
    );
  }

  if (!currentPkg) {
    return (
      <DevAppFallback title="No module selected" message="Select a module from the dropdown." />
    );
  }

  if (!engine) {
    return <DevAppFallback title="No workflow" message="Selected module has no workflow." />;
  }

  return (
    <RuntimeThemeProvider>
      <AccessibilityProvider>
        <RuntimeProvider
          loadedPackage={currentPkg}
          engine={engine}
          initialProgress={initialProgress}
          onProgressChange={handleProgressChange}
          widgetRegistry={widgetRegistry}
        >
          <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div
                style={{
                  padding: '0.5rem 1rem',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#2563eb',
                    background: '#dbeafe',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  Bundle Mode
                </span>
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.875rem',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                  }}
                  aria-label="Select module"
                >
                  {bundle.manifest.modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowOverview(true)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Bundle Overview
                </button>
              </div>
              <div style={{ position: 'fixed', bottom: '1rem', right: '24rem', zIndex: 50 }}>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.25rem',
                    color: '#dc2626',
                    cursor: 'pointer',
                  }}
                >
                  Reset Progress
                </button>
              </div>
              <LayoutShell />
            </div>
            <InspectorPanel
              telemetryEvents={telemetryEvents}
              rewardReceipts={rewardReceipts}
              bundleData={bundle}
            />
          </div>
        </RuntimeProvider>
      </AccessibilityProvider>
    </RuntimeThemeProvider>
  );
}

function SinglePackageDevApp(): JSX.Element {
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([]);
  const telemetrySessionRef = useRef<TelemetrySession | null>(null);
  const brokerRef = useRef<RewardBroker | null>(null);
  const [rewardReceipts, setRewardReceipts] = useState<RewardReceipt[]>([]);
  const [progressKey, setProgressKey] = useState(0);

  const initialProgress = useMemo(() => {
    if (!loadedPkg) return undefined;
    return loadProgress(loadedPkg.manifest.id, loadedPkg.manifest.version) ?? undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey]);

  const entry = initialProgress?.currentNodeId ?? loadedPkg?.manifest.entry;

  const engine = useMemo(() => {
    if (!loadedPkg?.workflow) return null;
    return new WorkflowEngine(loadedPkg.workflow, { entry });
  }, [loadedPkg, entry, progressKey]);

  useEffect(() => {
    const session = new TelemetrySession();
    session.start();
    telemetrySessionRef.current = session;

    const eventSub = session.events$.subscribe({
      next: (event) => {
        setTelemetryEvents((prev) => [...prev, event]);
      },
    });

    const broker = loadedPkg?.rewards
      ? new RewardBroker({
          rewards: loadedPkg.rewards,
          source: session.events$,
          onReceipt: (receipt) => {
            setRewardReceipts((prev) => [...prev, receipt]);
          },
        })
      : null;
    broker?.start();
    brokerRef.current = broker;

    let engineUnsub: (() => void) | undefined;
    if (engine) {
      engineUnsub = engine.subscribe((event: WorkflowEvent) => {
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
          broker?.updateContext({
            completedNodes: ['__workflow__'],
          });
        }
      });
    }

    return () => {
      engineUnsub?.();
      broker?.stop();
      eventSub.unsubscribe();
      session.stop();
      telemetrySessionRef.current = null;
      brokerRef.current = null;
    };
  }, [engine]);

  const handleProgressChange = useCallback((snapshot: ProgressSnapshot) => {
    if (loadedPkg) {
      saveProgress(loadedPkg.manifest.id, loadedPkg.manifest.version, snapshot);
    }
  }, []);

  const widgetRegistry = useMemo(() => {
    return createDefaultRegistry();
  }, []);

  const handleReset = useCallback(() => {
    if (loadedPkg) {
      clearProgress(loadedPkg.manifest.id, loadedPkg.manifest.version);
      setProgressKey((k) => k + 1);
    }
  }, []);

  if (!loadedPkg) {
    return (
      <DevAppFallback
        title="No package loaded"
        message="Ensure OPEN_EDU_PACKAGE_DIR or OPEN_EDU_BUNDLE_DIR is set and points to a valid Open-Edu package or bundle directory."
      />
    );
  }

  if (!engine) {
    return (
      <DevAppFallback
        title="No workflow defined"
        message={`The package at ${loadedPkg.rootDir} has no workflow.json. Add a workflow to enable navigation.`}
      />
    );
  }

  return (
    <RuntimeThemeProvider>
      <AccessibilityProvider>
        <RuntimeProvider
          loadedPackage={loadedPkg}
          engine={engine}
          initialProgress={initialProgress}
          onProgressChange={handleProgressChange}
          widgetRegistry={widgetRegistry}
        >
          <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div
                style={{
                  position: 'fixed',
                  bottom: '1rem',
                  right: '24rem',
                  zIndex: 50,
                }}
              >
                <button
                  onClick={handleReset}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.25rem',
                    color: '#dc2626',
                    cursor: 'pointer',
                  }}
                >
                  Reset Progress
                </button>
              </div>
              <LayoutShell />
            </div>
            <InspectorPanel
              telemetryEvents={telemetryEvents}
              rewardReceipts={rewardReceipts}
              definedRewards={
                loadedPkg?.rewards
                  ? loadedPkg.rewards.triggers.flatMap((t) =>
                      t.rewards.map((r) => ({
                        action: r.action,
                        badge: (r as any).badge,
                        condition: (r as any).condition,
                      })),
                    )
                  : undefined
              }
            />
          </div>
        </RuntimeProvider>
      </AccessibilityProvider>
    </RuntimeThemeProvider>
  );
}

export function DevApp(): JSX.Element {
  if (loadedBundle) {
    return <BundleDevApp bundle={loadedBundle} />;
  }
  return <SinglePackageDevApp />;
}
