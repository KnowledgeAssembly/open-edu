import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { PROTOCOL_API_VERSION } from '@open-edu/widget-sdk';
import type { InitPayload } from '@open-edu/widget-sdk';
import axe from 'axe-core';
import type { SandboxWidgetAdapterProps } from './SandboxWidgetAdapter';
import { SandboxWidgetAdapter, getActiveFrameCount } from './SandboxWidgetAdapter';
import { READY_TIMEOUT_MS } from './sandbox-limits';

const MOCK_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const MIGRATION_INIT: InitPayload = {
  apiVersion: PROTOCOL_API_VERSION,
  widgetId: 'community.example.counter',
  widgetVersion: '1.0.0',
  instanceId: '',
  nodeId: 'node-migrate',
  config: { prompt: 'Count five' },
  storedState: { schemaVersion: '1', v: 1, data: 'old' },
  locale: 'en',
  theme: 'light',
  themeTokens: {},
  prefersReducedMotion: false,
  capabilities: ['resize', 'telemetry-interaction', 'state-persistence'],
  stateSchemaVersion: '2',
};

function makeSaveEnvelope(
  sequence: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return makeEnvelope('state:save', sequence, overrides);
}

function makeEnvelope(
  type: string,
  sequence: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    apiVersion: PROTOCOL_API_VERSION,
    type,
    instanceId: MOCK_ID,
    nonce: MOCK_ID,
    sequence,
    payload: {},
    ...overrides,
  };
}

function makeReadyEnvelope(sequence = 1, overrides: Record<string, unknown> = {}) {
  return makeEnvelope('ready', sequence, overrides);
}

function makeCompleteEnvelope(sequence = 2, overrides: Record<string, unknown> = {}) {
  return makeEnvelope('complete', sequence, {
    payload: { score: 100, state: { done: true } },
    ...overrides,
  });
}

function dispatchMessage(data: unknown, origin = 'null') {
  const event = new MessageEvent('message', { data, origin });
  window.dispatchEvent(event);
}

function makeProps(overrides: Partial<SandboxWidgetAdapterProps> = {}): SandboxWidgetAdapterProps {
  return {
    nodeId: 'n1',
    srcDoc: '<html><body>hi</body></html>',
    expectedOrigin: 'opaque',
    title: 'Counter widget',
    initPayload: {
      apiVersion: PROTOCOL_API_VERSION,
      widgetId: 'community.example.counter',
      widgetVersion: '1.0.0',
      instanceId: '',
      nodeId: 'n1',
      config: {},
      locale: 'en',
      theme: 'light',
      themeTokens: {},
      prefersReducedMotion: false,
      capabilities: ['resize', 'telemetry-interaction', 'state-persistence', 'locale', 'theme'],
    },
    onReady: vi.fn(),
    onComplete: vi.fn(),
    onStateSave: vi.fn(),
    onInteraction: vi.fn(),
    onError: vi.fn(),
    onDiagnostic: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(MOCK_ID as ReturnType<typeof crypto.randomUUID>);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('SandboxWidgetAdapter', () => {
  it('posts an init envelope after iframe load', () => {
    const props = makeProps();
    const { container } = render(<SandboxWidgetAdapter {...props} />);
    const iframe = container.querySelector('iframe')!;
    expect(iframe).toHaveAttribute('srcDoc');
    expect(iframe).toHaveAttribute('title', 'Counter widget');

    let postedMessage: unknown;
    iframe.contentWindow!.postMessage = vi.fn((msg: unknown) => {
      postedMessage = msg;
    });

    fireEvent.load(iframe);

    expect(postedMessage).toBeDefined();
    const msg = postedMessage as { type: string; apiVersion: string };
    expect(msg.type).toBe('init');
    expect(msg.apiVersion).toBe(PROTOCOL_API_VERSION);
    expect(iframe.contentWindow!.postMessage).toHaveBeenCalled();
  });

  it('accepts ready and calls onReady', () => {
    const props = makeProps();
    render(<SandboxWidgetAdapter {...props} />);
    act(() => {
      dispatchMessage(makeReadyEnvelope(1));
    });
    expect(props.onReady).toHaveBeenCalledTimes(1);
  });

  it('rejects a wrong nonce and still accepts valid ready + complete', () => {
    const props = makeProps();
    render(<SandboxWidgetAdapter {...props} />);

    act(() => {
      dispatchMessage(makeCompleteEnvelope(1, { nonce: 'bad-nonce', type: 'complete' }));
    });
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(props.onDiagnostic).toHaveBeenCalledWith('nonce');

    act(() => {
      dispatchMessage(makeReadyEnvelope(1));
    });
    expect(props.onReady).toHaveBeenCalledTimes(1);

    act(() => {
      dispatchMessage(makeCompleteEnvelope(2));
    });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it('drops pre-ready complete and no-ops after unmount', () => {
    const props = makeProps();
    const { unmount } = render(<SandboxWidgetAdapter {...props} />);
    vi.useFakeTimers();

    act(() => {
      dispatchMessage(makeCompleteEnvelope(1));
    });
    expect(props.onReady).not.toHaveBeenCalled();
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(props.onDiagnostic).toHaveBeenCalledWith('pre-ready-complete');

    act(() => {
      unmount();
    });
    expect(() => vi.advanceTimersByTime(READY_TIMEOUT_MS)).not.toThrow();
  });

  it('iframes expose allow-scripts and never allow-same-origin', () => {
    const props = makeProps();
    const { container } = render(<SandboxWidgetAdapter {...props} />);
    const iframe = container.querySelector('iframe')!;
    const sandbox = iframe.getAttribute('sandbox') ?? '';
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  it('is axe-clean with a localized title', async () => {
    const props = makeProps();
    const { container } = render(<SandboxWidgetAdapter {...props} />);
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
      iframes: false,
    });
    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(violations).toHaveLength(0);
  });

  it('rejects complete under observe-mode without telemetry-interaction', () => {
    const props = makeProps({
      initPayload: {
        ...makeProps().initPayload,
        capabilities: ['observe-mode'],
      },
    });
    render(<SandboxWidgetAdapter {...props} />);
    act(() => {
      dispatchMessage(makeReadyEnvelope(1));
    });
    expect(props.onReady).toHaveBeenCalledTimes(1);
    act(() => {
      dispatchMessage(makeCompleteEnvelope(2));
    });
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(props.onDiagnostic).toHaveBeenCalledWith('observe-mode-complete-rejected');
  });

  it('rejects state:save under observe-mode without telemetry-interaction', () => {
    const props = makeProps({
      initPayload: {
        ...makeProps().initPayload,
        capabilities: ['observe-mode'],
      },
    });
    render(<SandboxWidgetAdapter {...props} />);
    act(() => {
      dispatchMessage(makeReadyEnvelope(1));
    });
    expect(props.onReady).toHaveBeenCalledTimes(1);
    act(() => {
      dispatchMessage(
        makeSaveEnvelope(2, {
          payload: { requestId: 'r1', schemaVersion: '1', state: { v: 1 } },
        }),
      );
    });
    expect(props.onStateSave).not.toHaveBeenCalled();
    expect(props.onDiagnostic).toHaveBeenCalledWith('observe-mode-state-save-rejected');
  });

  it('times out and removes the iframe when ready never arrives', () => {
    vi.useFakeTimers();
    const props = makeProps();
    const { container } = render(<SandboxWidgetAdapter {...props} />);
    expect(container.querySelector('iframe')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(READY_TIMEOUT_MS);
    });

    expect(props.onError).toHaveBeenCalledWith('timeout');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('tracks mounted frames in the module-level activeFrames counter', () => {
    const before = getActiveFrameCount();
    const propsA = makeProps({ nodeId: 'n1' });
    const propsB = makeProps({ nodeId: 'n2' });
    const { container: containerA, unmount: unmountA } = render(
      <SandboxWidgetAdapter {...propsA} />,
    );
    const { container: containerB } = render(<SandboxWidgetAdapter {...propsB} />);

    expect(getActiveFrameCount()).toBe(before + 2);
    expect(containerA.querySelectorAll('iframe')).toHaveLength(1);
    expect(containerB.querySelectorAll('iframe')).toHaveLength(1);

    unmountA();
    expect(getActiveFrameCount()).toBe(before + 1);
  });

  it('gates complete while state-incompatible and unblocks after an accepted migration save', () => {
    const props = makeProps({ initPayload: MIGRATION_INIT });
    const { container } = render(<SandboxWidgetAdapter {...props} />);
    const iframe = container.querySelector('iframe')!;

    const postedMessages: unknown[] = [];
    iframe.contentWindow!.postMessage = vi.fn((msg: unknown) => {
      postedMessages.push(msg);
    });

    act(() => {
      dispatchMessage(makeReadyEnvelope(1));
    });
    expect(props.onReady).toHaveBeenCalledTimes(1);

    act(() => {
      dispatchMessage(makeCompleteEnvelope(2));
    });
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(props.onDiagnostic).toHaveBeenCalledWith('state-incompatible');

    const savePayload = {
      requestId: 'r1',
      schemaVersion: '2',
      state: { schemaVersion: '2', v: 2, data: 'new' },
    };
    act(() => {
      dispatchMessage(makeSaveEnvelope(3, { payload: savePayload }));
    });
    expect(props.onStateSave).toHaveBeenCalledWith(savePayload);

    const update = postedMessages.find((m) => (m as { type: string }).type === 'state:update') as
      | {
          instanceId: string;
          nonce: string;
          sequence: number;
          payload: { accepted: boolean; normalizedState: unknown };
        }
      | undefined;
    expect(update?.instanceId).toBe(MOCK_ID);
    expect(update?.nonce).toBe(MOCK_ID);
    expect(update?.payload).toEqual({
      requestId: 'r1',
      accepted: true,
      normalizedState: savePayload.state,
    });

    act(() => {
      dispatchMessage(makeCompleteEnvelope(4));
    });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledWith({ score: 100, state: { done: true } });
  });

  it('rejects an oversized state save with too-large and does not persist', () => {
    const props = makeProps({ initPayload: MIGRATION_INIT });
    const { container } = render(<SandboxWidgetAdapter {...props} />);
    const iframe = container.querySelector('iframe')!;

    const postedMessages: unknown[] = [];
    iframe.contentWindow!.postMessage = vi.fn((msg: unknown) => {
      postedMessages.push(msg);
    });

    act(() => {
      dispatchMessage(makeReadyEnvelope(1));
    });
    expect(props.onReady).toHaveBeenCalledTimes(1);

    const savePayload = {
      requestId: 'r2',
      schemaVersion: '2',
      state: { blob: 'x'.repeat(80 * 1024) },
    };
    act(() => {
      dispatchMessage(makeSaveEnvelope(2, { payload: savePayload }));
    });
    expect(props.onStateSave).not.toHaveBeenCalled();
    expect(props.onDiagnostic).toHaveBeenCalledWith('state-save-rejected');

    const update = postedMessages.find((m) => (m as { type: string }).type === 'state:update') as
      | { payload: { accepted: boolean; rejectionReason: string } }
      | undefined;
    expect(update?.payload).toEqual({
      requestId: 'r2',
      accepted: false,
      rejectionReason: 'too-large',
    });
  });

  it('rejects a schema-mismatched state save and keeps the complete gate closed', () => {
    const props = makeProps({ initPayload: MIGRATION_INIT });
    const { container } = render(<SandboxWidgetAdapter {...props} />);
    const iframe = container.querySelector('iframe')!;

    const postedMessages: unknown[] = [];
    iframe.contentWindow!.postMessage = vi.fn((msg: unknown) => {
      postedMessages.push(msg);
    });

    act(() => {
      dispatchMessage(makeReadyEnvelope(1));
    });
    expect(props.onReady).toHaveBeenCalledTimes(1);

    const savePayload = { requestId: 'r3', schemaVersion: '1', state: { v: 3 } };
    act(() => {
      dispatchMessage(makeSaveEnvelope(2, { payload: savePayload }));
    });
    expect(props.onStateSave).not.toHaveBeenCalled();
    expect(props.onDiagnostic).toHaveBeenCalledWith('state-save-rejected');

    const update = postedMessages.find((m) => (m as { type: string }).type === 'state:update') as
      | { payload: { accepted: boolean; rejectionReason: string } }
      | undefined;
    expect(update?.payload).toEqual({
      requestId: 'r3',
      accepted: false,
      rejectionReason: 'schema-invalid',
    });

    act(() => {
      dispatchMessage(makeCompleteEnvelope(3));
    });
    expect(props.onComplete).not.toHaveBeenCalled();
    expect(props.onDiagnostic).toHaveBeenCalledWith('state-incompatible');
  });

  it('allows normal complete flow when there is no version mismatch', () => {
    const props = makeProps({
      initPayload: {
        ...makeProps().initPayload,
        storedState: { schemaVersion: '1' },
        stateSchemaVersion: undefined,
      },
    });
    render(<SandboxWidgetAdapter {...props} />);
    act(() => {
      dispatchMessage(makeReadyEnvelope(1));
    });
    act(() => {
      dispatchMessage(makeCompleteEnvelope(2));
    });
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });
});
