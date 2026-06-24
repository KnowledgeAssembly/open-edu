import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { RuntimeProvider, LayoutShell, RuntimeThemeProvider } from '@open-edu/runtime';
import { WorkflowEngine } from '@open-edu/workflow';
import type { WorkflowEvent } from '@open-edu/workflow';
import { TelemetrySession } from '@open-edu/telemetry';
import type { TelemetryEvent, ProgressSnapshot } from '@open-edu/schemas';
import { AccessibilityProvider } from '@open-edu/accessibility';
import type { LoadedPackage } from '@open-edu/core';
import { createWidgetRegistry, multipleChoicePractice } from '@open-edu/widgets';
import { InspectorPanel } from './inspectors/InspectorPanel';
import { loadProgress, saveProgress, clearProgress } from './progressStorage';

import { packageData as rawPackageData } from 'virtual:open-edu-package';

const loadedPkg = rawPackageData as LoadedPackage | null;

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

export function DevApp(): JSX.Element {
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([]);
  const telemetrySessionRef = useRef<TelemetrySession | null>(null);
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
        } else if (event.type === 'workflow.completed') {
          session.emit({ event: 'node_complete', nodeId: '__workflow__' } as never);
        }
      });
    }

    return () => {
      engineUnsub?.();
      eventSub.unsubscribe();
      session.stop();
      telemetrySessionRef.current = null;
    };
  }, [engine]);

  const handleProgressChange = useCallback((snapshot: ProgressSnapshot) => {
    if (loadedPkg) {
      saveProgress(loadedPkg.manifest.id, loadedPkg.manifest.version, snapshot);
    }
  }, []);

  const widgetRegistry = useMemo(() => {
    const registry = createWidgetRegistry();
    registry.register(multipleChoicePractice);
    return registry;
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
        message="Ensure OPEN_EDU_PACKAGE_DIR is set and points to a valid Open-Edu package directory."
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
            <InspectorPanel telemetryEvents={telemetryEvents} />
          </div>
        </RuntimeProvider>
      </AccessibilityProvider>
    </RuntimeThemeProvider>
  );
}
