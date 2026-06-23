import { useMemo, useEffect, useRef, useState } from 'react';
import { RuntimeProvider, LayoutShell, RuntimeThemeProvider } from '@open-edu/runtime';
import { WorkflowEngine } from '@open-edu/workflow';
import type { WorkflowEvent } from '@open-edu/workflow';
import { TelemetrySession } from '@open-edu/telemetry';
import type { TelemetryEvent } from '@open-edu/schemas';
import { AccessibilityProvider } from '@open-edu/accessibility';
import type { LoadedPackage } from '@open-edu/core';
import { InspectorPanel } from './inspectors/InspectorPanel';

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

  const engine = useMemo(() => {
    if (!loadedPkg?.workflow) return null;
    return new WorkflowEngine(loadedPkg.workflow, {
      entry: loadedPkg.manifest.entry,
    });
  }, []);

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
        <RuntimeProvider loadedPackage={loadedPkg} engine={engine}>
          <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <LayoutShell />
            </div>
            <InspectorPanel telemetryEvents={telemetryEvents} />
          </div>
        </RuntimeProvider>
      </AccessibilityProvider>
    </RuntimeThemeProvider>
  );
}
