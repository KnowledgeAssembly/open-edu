import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import axe from 'axe-core';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { OasAnimationWrapper } from '../OasAnimationWrapper.js';
import { DotLottiePlayer } from '../DotLottiePlayer.js';
import { CssAnimationRenderer } from '../CssAnimationRenderer.js';
import { CanvasAnimationRenderer } from '../CanvasAnimationRenderer.js';
import type { AnimationConfig } from '@open-edu/schemas';

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: () => <div data-testid="mocked-dotlottie" />,
  PlayerEvents: {
    Complete: 'complete',
    Pause: 'pause',
    Ready: 'ready',
    Play: 'play',
    DataReady: 'data_ready',
    Error: 'error',
    Stop: 'stop',
  },
}));

vi.mock('canvas', () => ({}));

(globalThis as { axe?: typeof axe }).axe = axe;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });
  return results.violations;
}

describe('axe-core accessibility audits', () => {
  beforeEach(() => {
    cleanup();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    });
  });

  it('OasAnimationWrapper with lottie backend is accessible', async () => {
    const { container } = render(
      <OasAnimationWrapper config={{ backend: 'lottie', src: 'test.lottie' }} showControls />,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('OasAnimationWrapper with CSS backend is accessible', async () => {
    const { container } = render(
      <OasAnimationWrapper
        config={{ backend: 'css', effects: [{ target: 'test', effect: 'fade' }] }}
        staticChildren={<p>Static content</p>}
      />,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('OasAnimationWrapper with SVG backend is accessible', async () => {
    const { container } = render(
      <OasAnimationWrapper config={{ backend: 'svg', src: 'test.svg' }} />,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('DotLottiePlayer fallback is accessible', async () => {
    const { container } = render(
      <DotLottiePlayer
        src="test.lottie"
        ariaLabel="Test animation"
        staticFallback={
          <div role="img" aria-label="Static fallback">
            Static
          </div>
        }
      />,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('CssAnimationRenderer is accessible', async () => {
    const { container } = render(
      <CssAnimationRenderer effects={[{ target: 'test', effect: 'fade' }]} reducedMotion={false}>
        <p>Animated content</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });

  it('CanvasAnimationRenderer is accessible', async () => {
    const config: AnimationConfig = {
      backend: 'canvas',
      trigger: 'step',
      reducedMotion: 'instant',
      effects: [
        { target: 'bar-0', effect: 'flow', step: 30 },
        { target: 'bar-1', effect: 'flow', step: 50 },
      ],
    };

    const { container } = render(
      <CanvasAnimationRenderer config={config} reducedMotion={false} ariaLabel="Sorting visualization" />,
      { wrapper },
    );
    const violations = await runAxe(container);
    expect(violations).toHaveLength(0);
  });
});
