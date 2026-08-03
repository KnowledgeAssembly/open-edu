import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import type { AnimationConfigInput } from '@open-edu/schemas';
import { useOasAnimation } from '../useOasAnimation.js';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

const validConfig: AnimationConfigInput = {
  backend: 'lottie',
  src: 'assets/animations/water-cycle.lottie',
  effects: [{ target: 'evaporation', effect: 'flow' }],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOasAnimation', () => {
  it('starts idle and transitions through play/pause/stop', () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() => useOasAnimation(validConfig, onStatusChange), {
      wrapper,
    });

    expect(result.current.status).toBe('idle');

    act(() => result.current.play());
    expect(result.current.status).toBe('started');
    expect(onStatusChange).toHaveBeenCalledWith('started');

    act(() => result.current.pause());
    expect(result.current.status).toBe('paused');

    act(() => result.current.stop());
    expect(result.current.status).toBe('idle');
    expect(result.current.currentStep).toBe(0);
  });

  it('handles player events including completion', () => {
    const { result } = renderHook(() => useOasAnimation(validConfig), { wrapper });

    act(() => result.current.handlePlayerEvent('started'));
    expect(result.current.status).toBe('started');

    act(() => result.current.handlePlayerEvent('completed'));
    expect(result.current.status).toBe('completed');
  });

  it('jumps to completed under reduced motion', () => {
    const matchMediaMock = vi.fn((query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMediaMock);

    const { result } = renderHook(() => useOasAnimation(validConfig), { wrapper });

    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.status).toBe('completed');

    vi.unstubAllGlobals();
  });

  it('stays idle for invalid configs without throwing', () => {
    const { result } = renderHook(
      () => useOasAnimation({ backend: 'flash' } as unknown as AnimationConfigInput),
      { wrapper },
    );

    expect(result.current.status).toBe('idle');

    act(() => result.current.play());
    expect(result.current.status).toBe('idle');
    act(() => result.current.nextStep());
    expect(result.current.status).toBe('idle');
  });

  it('clamps step navigation to bounds and reports total steps', () => {
    const onStatusChange = vi.fn();
    const config: AnimationConfigInput = {
      backend: 'lottie',
      effects: [
        { target: 'a', effect: 'flow', step: 1 },
        { target: 'b', effect: 'pulse', step: 2 },
        { target: 'c', effect: 'draw', step: 3 },
      ],
    };
    const { result } = renderHook(() => useOasAnimation(config, onStatusChange), {
      wrapper,
    });

    expect(result.current.totalSteps).toBe(3);

    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(1);
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(2);
    act(() => result.current.nextStep());
    expect(result.current.currentStep).toBe(2);

    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(1);
    act(() => result.current.prevStep());
    act(() => result.current.prevStep());
    expect(result.current.currentStep).toBe(0);
  });

  it('announces step changes via live region', () => {
    const { result } = renderHook(() => useOasAnimation(validConfig), { wrapper });

    act(() => result.current.nextStep());
    expect(document.body.innerHTML).toContain('Step 1 of 1');
  });
});
