import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveRegionProvider, useLiveRegion } from './live-region';
import { useEffect } from 'react';

function Announcer({ message, priority }: { message: string; priority?: 'polite' | 'assertive' }): null {
  const { announce } = useLiveRegion();
  useEffect(() => {
    announce(message, priority);
  }, [message, priority, announce]);
  return null;
}

function FallbackTest(): null {
  const { announce } = useLiveRegion();
  useEffect(() => {
    announce('fallback test');
  }, [announce]);
  return null;
}

describe('LiveRegionProvider', () => {
  it('should render children', () => {
    render(
      <LiveRegionProvider>
        <div data-testid="child">child</div>
      </LiveRegionProvider>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('should render polite and assertive live region containers', () => {
    const { container } = render(
      <LiveRegionProvider>
        <div>content</div>
      </LiveRegionProvider>,
    );
    const politeRegion = container.querySelector('[data-testid="live-region-polite"]');
    const assertiveRegion = container.querySelector('[data-testid="live-region-assertive"]');
    expect(politeRegion).toBeTruthy();
    expect(assertiveRegion).toBeTruthy();
    expect(politeRegion?.getAttribute('aria-live')).toBe('polite');
    expect(assertiveRegion?.getAttribute('aria-live')).toBe('assertive');
  });

  it('should announce polite messages', () => {
    vi.useFakeTimers();
    const { container } = render(
      <LiveRegionProvider>
        <Announcer message="Welcome to the lesson" priority="polite" />
      </LiveRegionProvider>,
    );
    const politeRegion = container.querySelector('[data-testid="live-region-polite"]');
    expect(politeRegion?.textContent).toContain('Welcome to the lesson');
    vi.useRealTimers();
  });

  it('should announce assertive messages', () => {
    vi.useFakeTimers();
    const { container } = render(
      <LiveRegionProvider>
        <Announcer message="Workflow complete!" priority="assertive" />
      </LiveRegionProvider>,
    );
    const assertiveRegion = container.querySelector('[data-testid="live-region-assertive"]');
    expect(assertiveRegion?.textContent).toContain('Workflow complete!');
    vi.useRealTimers();
  });

  it('should use fallback silently without a parent provider', () => {
    render(<FallbackTest />);
    expect(true).toBe(true);
  });
});
