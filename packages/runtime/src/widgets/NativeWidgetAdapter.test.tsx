import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { NativeWidgetAdapter } from './NativeWidgetAdapter';
import { RuntimeProvider, useRuntime } from '../context/RuntimeContext';
import type { LoadedPackage } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';
import type { NodeAnswer, TelemetryEvent } from '@open-edu/schemas';
import type { WidgetDefinition } from '@open-edu/widgets';

function makePackage(): LoadedPackage {
  return {
    rootDir: '/tmp/test',
    manifest: {
      id: 'test',
      title: 'Test',
      version: '1.0.0',
      author: 'A',
      entry: 'nodes/lesson-01.md',
    },
    workflow: { routing: {} },
    rewards: null,
    cards: null,
    nodes: [
      {
        path: '/tmp/nodes/ex-01.md',
        relativePath: 'nodes/ex-01.md',
        content: '',
        node: { type: 'exercise', skills: undefined } as never,
      },
    ],
    assetPaths: [],
  };
}

interface StubEngine {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  completeNode: ReturnType<typeof vi.fn>;
  navigateTo: ReturnType<typeof vi.fn>;
  __listener: ((e: WorkflowEvent) => void) | null;
}

function makeEngine(initialNodeId: string): StubEngine & WorkflowEngine {
  const stub = {
    start: vi.fn(() => {
      queueMicrotask(() =>
        stub.__listener?.({ type: 'node.entered', nodeId: initialNodeId, timestamp: 1 }),
      );
    }),
    stop: vi.fn(),
    subscribe: vi.fn((listener: (e: WorkflowEvent) => void) => {
      stub.__listener = listener;
      return () => {
        stub.__listener = null;
      };
    }),
    completeNode: vi.fn(),
    navigateTo: vi.fn(),
    __listener: null as ((e: WorkflowEvent) => void) | null,
  };
  return stub as unknown as StubEngine & WorkflowEngine;
}

function renderAdapter(
  definition: WidgetDefinition,
  node: Record<string, unknown>,
  onTelemetryEvent?: (event: TelemetryEvent) => void,
  adapterExtra: {
    intendedWidgetId?: string;
    intendedWidgetVersion?: string;
    configOverride?: Record<string, unknown>;
  } = {},
) {
  const pkg = makePackage();
  const engine = makeEngine('nodes/ex-01.md');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
      <RuntimeProvider loadedPackage={pkg} engine={engine} onTelemetryEvent={onTelemetryEvent}>
        {children}
      </RuntimeProvider>
    </I18nProvider>
  );
  const utils = render(
    <NativeWidgetAdapter
      definition={definition}
      node={{ type: 'exercise', ...node } as never}
      nodeId="nodes/ex-01.md"
      intendedWidgetId={adapterExtra.intendedWidgetId}
      intendedWidgetVersion={adapterExtra.intendedWidgetVersion}
      configOverride={adapterExtra.configOverride}
    />,
    { wrapper },
  );
  return { ...utils, engine };
}

describe('NativeWidgetAdapter', () => {
  it('renders a registered widget through the adapter', () => {
    const definition: WidgetDefinition = {
      id: 'test-widget',
      render: () => <div data-testid="native-content">Hello Widget</div>,
    };

    renderAdapter(definition, { widget: 'test-widget' });

    expect(screen.getByTestId('native-content')).toBeInTheDocument();
    expect(screen.getByText('Hello Widget')).toBeInTheDocument();
  });

  it('saves an answer with native provenance when complete fires', () => {
    let capturedAnswers: Record<string, NodeAnswer> = {};
    function AnswersCapturer() {
      const { answers } = useRuntime();
      capturedAnswers = answers;
      return <div data-testid="captured">{JSON.stringify(answers)}</div>;
    }

    const definition: WidgetDefinition = {
      id: 'core.matching',
      version: '1.0.0',
      render: (props) => (
        <button type="button" onClick={() => props.complete(85, { finished: true })}>
          Complete
        </button>
      ),
    };

    const pkg = makePackage();
    const engine = makeEngine('nodes/ex-01.md');
    render(
      <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
        <RuntimeProvider loadedPackage={pkg} engine={engine}>
          <AnswersCapturer />
          <NativeWidgetAdapter
            definition={definition}
            node={{ type: 'exercise', widget: 'core.matching' }}
            nodeId="nodes/ex-01.md"
          />
        </RuntimeProvider>
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    const saved = capturedAnswers['nodes/ex-01.md'];
    expect(saved).toBeDefined();
    expect(saved?.type).toBe('widget');
    expect((saved as { data: unknown }).data).toEqual({ finished: true });
    expect((saved as { intendedWidgetId?: string }).intendedWidgetId).toBe('core.matching');
    expect((saved as { renderedWidgetId?: string }).renderedWidgetId).toBe('core.matching');
    expect((saved as { renderedViaFallback?: boolean }).renderedViaFallback).toBe(false);
    expect((saved as { score?: number }).score).toBe(85);
  });

  it('records fallback provenance when intendedWidgetId differs from the rendered widget', () => {
    let capturedAnswers: Record<string, NodeAnswer> = {};
    function AnswersCapturer() {
      const { answers } = useRuntime();
      capturedAnswers = answers;
      return <div data-testid="captured">{JSON.stringify(answers)}</div>;
    }

    const definition: WidgetDefinition = {
      id: 'core.multiple-choice',
      version: '2.0.0',
      render: (props) => (
        <button type="button" onClick={() => props.complete(60, { submitted: true })}>
          Fallback Complete
        </button>
      ),
    };

    const pkg = makePackage();
    const engine = makeEngine('nodes/ex-01.md');
    render(
      <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
        <RuntimeProvider loadedPackage={pkg} engine={engine}>
          <AnswersCapturer />
          <NativeWidgetAdapter
            definition={definition}
            node={{
              type: 'exercise',
              widget: 'community.example.counter',
              config: { prompt: 'Hi' },
            }}
            nodeId="nodes/ex-01.md"
            intendedWidgetId="community.example.counter"
            intendedWidgetVersion="1.0.0"
            configOverride={{ question: 'Hi', options: [] }}
          />
        </RuntimeProvider>
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fallback Complete' }));

    const saved = capturedAnswers['nodes/ex-01.md'];
    expect(saved).toBeDefined();
    expect((saved as { intendedWidgetId?: string }).intendedWidgetId).toBe(
      'community.example.counter',
    );
    expect((saved as { intendedWidgetVersion?: string }).intendedWidgetVersion).toBe('1.0.0');
    expect((saved as { renderedWidgetId?: string }).renderedWidgetId).toBe('core.multiple-choice');
    expect((saved as { renderedWidgetVersion?: string }).renderedWidgetVersion).toBe('2.0.0');
    expect((saved as { renderedViaFallback?: boolean }).renderedViaFallback).toBe(true);
  });

  it('emits widget_interaction telemetry from emitInteraction', () => {
    const onTelemetryEvent = vi.fn();
    const definition: WidgetDefinition = {
      id: 'core.matching',
      version: '1.0.0',
      render: (props) => (
        <button type="button" onClick={() => props.emitInteraction({ action: 'reveal', step: 1 })}>
          Reveal
        </button>
      ),
    };

    renderAdapter(definition, { widget: 'core.matching' }, onTelemetryEvent);

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }));

    expect(onTelemetryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'widget_interaction',
        widgetId: 'core.matching',
        action: 'reveal',
        data: { step: 1 },
      }),
    );
  });
});
