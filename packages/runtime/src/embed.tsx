import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { LoadedPackage } from '@open-edu/core';
import { loadPackage } from '@open-edu/core';
import { WorkflowEngine } from '@open-edu/workflow';
import type { WorkflowEvent } from '@open-edu/workflow';
import type { TelemetryEvent, ProgressSnapshot } from '@open-edu/schemas';
import type { WidgetRegistry } from '@open-edu/widgets';
import { AccessibilityProvider } from '@open-edu/accessibility';
import { RuntimeProvider, useRuntime } from './context/RuntimeContext.js';
import { RuntimeThemeProvider } from './theme.js';
import { LayoutShell } from './layout/LayoutShell.js';

const ERROR_PREFIX = '[@open-edu/runtime]';

export interface RuntimeEmbedOptions {
  packageSource: string | LoadedPackage;
  container: HTMLElement;
  widgetRegistry?: WidgetRegistry;
  initialProgress?: ProgressSnapshot;
  onProgressChange?: (snapshot: ProgressSnapshot) => void;
  onTelemetryEvent?: (event: TelemetryEvent) => void;
  onAnnouncement?: (message: string, priority: 'polite' | 'assertive') => void;
}

export interface RuntimeEmbedHandle {
  unmount(): void;
  getProgress(): ProgressSnapshot | null;
  reset(): Promise<void>;
}

interface EmbedState {
  loadedPackage: LoadedPackage;
  engine: WorkflowEngine | null;
  engineUnsub: (() => void) | null;
  latestSnapshot: ProgressSnapshot | null;
  resetKey: number;
  didReset: boolean;
}

const mountedContainers = new WeakSet<HTMLElement>();

function workflowEventToTelemetry(event: WorkflowEvent): TelemetryEvent | null {
  const ts = Date.now();
  switch (event.type) {
    case 'node.entered': {
      return {
        event: 'node_open',
        timestamp: ts,
        nodeId: event.nodeId!,
      } as TelemetryEvent;
    }
    case 'node.completed': {
      return {
        event: 'node_complete',
        timestamp: ts,
        nodeId: event.nodeId!,
        score: event.score,
      } as TelemetryEvent;
    }
    case 'workflow.completed': {
      return {
        event: 'workflow_complete',
        timestamp: ts,
      } as TelemetryEvent;
    }
    case 'route.evaluated': {
      if (!event.target) return null;
      return {
        event: 'route_triggered',
        timestamp: ts,
        from: event.nodeId!,
        to: event.target,
        reason: event.reason,
      } as TelemetryEvent;
    }
    default:
      return null;
  }
}

function EmbedAnnouncementBridge({
  onAnnouncement,
}: {
  onAnnouncement: (message: string, priority: 'polite' | 'assertive') => void;
}): null {
  const { currentNode, currentNodeId, isCompleted } = useRuntime();

  useEffect(() => {
    if (!currentNode || !currentNodeId) return;
    const title =
      currentNode.node.title ??
      currentNode.relativePath.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    onAnnouncement(`Now viewing: ${title}`, 'polite');
  }, [currentNodeId, currentNode, onAnnouncement]);

  useEffect(() => {
    if (isCompleted) {
      onAnnouncement('Lesson completed', 'assertive');
    }
  }, [isCompleted, onAnnouncement]);

  return null;
}

interface EmbedRootProps {
  loadedPackage: LoadedPackage;
  engine: WorkflowEngine;
  widgetRegistry?: WidgetRegistry;
  initialProgress?: ProgressSnapshot;
  onProgressChange?: (snapshot: ProgressSnapshot) => void;
  onAnnouncement?: (message: string, priority: 'polite' | 'assertive') => void;
}

function EmbedRoot({
  loadedPackage,
  engine,
  widgetRegistry,
  initialProgress,
  onProgressChange,
  onAnnouncement,
}: EmbedRootProps): JSX.Element {
  return (
    <StrictMode>
      <RuntimeThemeProvider>
        <AccessibilityProvider>
          <RuntimeProvider
            loadedPackage={loadedPackage}
            engine={engine}
            widgetRegistry={widgetRegistry}
            initialProgress={initialProgress}
            onProgressChange={onProgressChange}
          >
            <LayoutShell />
            {onAnnouncement && <EmbedAnnouncementBridge onAnnouncement={onAnnouncement} />}
          </RuntimeProvider>
        </AccessibilityProvider>
      </RuntimeThemeProvider>
    </StrictMode>
  );
}

function createNoopHandle(): RuntimeEmbedHandle {
  return {
    unmount: () => {},
    getProgress: () => null,
    reset: async () => {},
  };
}

export async function createRuntime(options: RuntimeEmbedOptions): Promise<RuntimeEmbedHandle> {
  const { container } = options;

  if (!(container instanceof HTMLElement)) {
    throw new Error(`${ERROR_PREFIX} Container must be an HTMLElement.`);
  }

  if (!container.isConnected) {
    throw new Error(`${ERROR_PREFIX} Container element is not attached to the DOM.`);
  }

  if (mountedContainers.has(container)) {
    throw new Error(`${ERROR_PREFIX} Container already mounted. Call unmount() first.`);
  }

  const root = createRoot(container);
  let unmounted = false;

  let loadedPkg: LoadedPackage;
  try {
    loadedPkg =
      typeof options.packageSource === 'string'
        ? await loadPackage(options.packageSource)
        : options.packageSource;
  } catch (err) {
    root.unmount();
    throw err;
  }

  if (unmounted) {
    root.unmount();
    return createNoopHandle();
  }

  const state: EmbedState = {
    loadedPackage: loadedPkg,
    engine: null,
    engineUnsub: null,
    latestSnapshot: options.initialProgress ?? null,
    resetKey: 0,
    didReset: false,
  };

  const onProgressChange = (snapshot: ProgressSnapshot) => {
    state.latestSnapshot = snapshot;
    options.onProgressChange?.(snapshot);
  };

  function buildEngine(entry: string): WorkflowEngine {
    const eng = new WorkflowEngine(loadedPkg.workflow!, { entry });

    const unsub = eng.subscribe((event: WorkflowEvent) => {
      if (options.onTelemetryEvent) {
        try {
          const telemetryEvent = workflowEventToTelemetry(event);
          if (telemetryEvent) {
            options.onTelemetryEvent(telemetryEvent);
          }
        } catch (err) {
          console.error(`${ERROR_PREFIX} onTelemetryEvent callback threw:`, err);
        }
      }
    });

    state.engine = eng;
    state.engineUnsub = unsub;

    return eng;
  }

  function renderEmbed(): void {
    const entry = state.latestSnapshot?.currentNodeId ?? loadedPkg.manifest.entry;
    const engine = buildEngine(entry);

    const initialProgress = state.didReset ? undefined : options.initialProgress;
    state.didReset = false;

    root.render(
      <EmbedRoot
        key={state.resetKey}
        loadedPackage={loadedPkg}
        engine={engine}
        widgetRegistry={options.widgetRegistry}
        initialProgress={initialProgress}
        onProgressChange={onProgressChange}
        onAnnouncement={options.onAnnouncement}
      />,
    );

    mountedContainers.add(container);
  }

  renderEmbed();

  return {
    unmount(): void {
      if (unmounted) return;
      unmounted = true;
      try {
        state.engineUnsub?.();
      } catch {
        /* safe cleanup */
      }
      try {
        state.engine?.stop();
      } catch {
        /* safe cleanup */
      }
      try {
        root.unmount();
      } catch {
        /* safe cleanup */
      }
      mountedContainers.delete(container);
    },

    getProgress(): ProgressSnapshot | null {
      return state.latestSnapshot;
    },

    async reset(): Promise<void> {
      if (unmounted) return;

      try {
        state.engineUnsub?.();
      } catch {
        /* safe cleanup */
      }
      try {
        state.engine?.stop();
      } catch {
        /* safe cleanup */
      }

      state.resetKey++;
      state.latestSnapshot = null;
      state.didReset = true;

      renderEmbed();
    },
  };
}
