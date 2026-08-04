import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { CanvasAnimationRenderer } from '../CanvasAnimationRenderer.js';

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
  })) as unknown as CanvasRenderingContext2D;
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

const sortingConfig = {
  backend: 'canvas' as const,
  trigger: 'step' as const,
  effects: [
    { target: 'bar-0', effect: 'flow', step: 30 },
    { target: 'bar-1', effect: 'flow', step: 50 },
    { target: 'bar-2', effect: 'flow', step: 20 },
    { target: 'bar-3', effect: 'flow', step: 80 },
  ],
};

describe('CanvasAnimationRenderer', () => {
  it('renders canvas element', () => {
    render(
      <CanvasAnimationRenderer
        config={sortingConfig}
        reducedMotion={false}
        ariaLabel="Sorting visualization"
      />,
      { wrapper },
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows controls when not reduced motion', () => {
    render(
      <CanvasAnimationRenderer
        config={sortingConfig}
        reducedMotion={false}
        ariaLabel="Sorting visualization"
      />,
      { wrapper },
    );
    expect(screen.getByTestId('canvas-play')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-step')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-reset')).toBeInTheDocument();
  });

  it('hides controls when reduced motion', () => {
    render(
      <CanvasAnimationRenderer
        config={sortingConfig}
        reducedMotion
        ariaLabel="Sorting visualization"
      />,
      { wrapper },
    );
    expect(screen.queryByTestId('canvas-play')).not.toBeInTheDocument();
  });

  it('draws frame on reset', () => {
    render(
      <CanvasAnimationRenderer
        config={sortingConfig}
        reducedMotion={false}
        ariaLabel="Sorting visualization"
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByTestId('canvas-reset'));
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas.getContext).toHaveBeenCalled();
  });
});
