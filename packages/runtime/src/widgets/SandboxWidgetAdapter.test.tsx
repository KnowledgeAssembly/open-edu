import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { PROTOCOL_API_VERSION } from '@open-edu/widget-sdk';
import axe from 'axe-core';
import type { SandboxWidgetAdapterProps } from './SandboxWidgetAdapter';
import { SandboxWidgetAdapter } from './SandboxWidgetAdapter';
import { READY_TIMEOUT_MS } from './sandbox-limits';

const MOCK_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
});
