import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CssAnimationRenderer } from '../CssAnimationRenderer.js';

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
