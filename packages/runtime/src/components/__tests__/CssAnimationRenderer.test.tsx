import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CssAnimationRenderer, effectToClass } from '../CssAnimationRenderer.js';

function wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

describe('CssAnimationRenderer', () => {
  it('renders children with fade animation class', () => {
    render(
      <CssAnimationRenderer effects={[{ target: 'test', effect: 'fade' }]} reducedMotion={false}>
        <p data-testid="content">Hello</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const container = screen.getByTestId('css-animation-renderer');
    expect(container).toHaveClass('oas-animate-fade');
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders children without animation when reducedMotion is true', () => {
    render(
      <CssAnimationRenderer effects={[{ target: 'test', effect: 'fade' }]} reducedMotion>
        <p data-testid="content">Hello</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const container = screen.getByTestId('css-animation-renderer');
    expect(container).not.toHaveClass('oas-animate-fade');
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('applies speed multiplier to duration', () => {
    render(
      <CssAnimationRenderer
        effects={[{ target: 'test', effect: 'pulse', duration: 200 }]}
        reducedMotion={false}
        speed={2}
      >
        <p>Content</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const container = screen.getByTestId('css-animation-renderer');
    expect(container).toHaveStyle({ animationDuration: '100ms' });
  });

  it('falls back to no animation for unknown effects', () => {
    render(
      <CssAnimationRenderer effects={[{ target: 'test', effect: 'flow' }]} reducedMotion={false}>
        <p>Content</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const container = screen.getByTestId('css-animation-renderer');
    expect(container).not.toHaveClass('oas-animate-fade');
    expect(container).not.toHaveClass('oas-animate-slide');
  });

  it('renders children with no effects', () => {
    render(
      <CssAnimationRenderer effects={[]} reducedMotion={false}>
        <p data-testid="content">No effects</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

describe('CssAnimationRenderer celebration effects', () => {
  const celebrationEffects = ['badge', 'confetti', 'sparkle', 'celebrate'] as const;

  it('exposes celebration effects in effectToClass', () => {
    for (const effect of celebrationEffects) {
      expect(effectToClass[effect]).toBe(`oas-animate-${effect}`);
    }
  });

  it('applies celebration animation classes', () => {
    for (const effect of celebrationEffects) {
      const { unmount } = render(
        <CssAnimationRenderer effects={[{ target: 'reward', effect }]} reducedMotion={false}>
          <p>Reward</p>
        </CssAnimationRenderer>,
        { wrapper },
      );
      expect(screen.getByTestId('css-animation-renderer')).toHaveClass(`oas-animate-${effect}`);
      unmount();
    }
  });

  it('calls onComplete after animationend', () => {
    const onComplete = vi.fn();
    render(
      <CssAnimationRenderer
        effects={[{ target: 'reward', effect: 'badge' }]}
        reducedMotion={false}
        onComplete={onComplete}
      >
        <p>Reward</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const el = screen.getByTestId('css-animation-renderer');
    el.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete immediately when reducedMotion is true', () => {
    const onComplete = vi.fn();
    render(
      <CssAnimationRenderer
        effects={[{ target: 'reward', effect: 'badge' }]}
        reducedMotion
        onComplete={onComplete}
      >
        <p>Reward</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
