import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useAutoFocus } from './useAutoFocus';
import type { RefObject } from 'react';

function TestComponent({ dep }: { dep: string }): JSX.Element {
  const ref = useAutoFocus([dep]) as RefObject<HTMLDivElement>;
  return (
    <div ref={ref} tabIndex={-1} data-testid="auto-focus-target">
      {dep}
    </div>
  );
}

describe('useAutoFocus', () => {
  beforeEach(() => {
    let rafId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(performance.now());
      return ++rafId;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a ref object', () => {
    const { container } = render(<TestComponent dep="hello" />);
    const el = container.querySelector('[data-testid="auto-focus-target"]');
    expect(el).toBeTruthy();
  });

  it('should set tabIndex on the target element', () => {
    render(<TestComponent dep="world" />);
    const el = document.querySelector('[data-testid="auto-focus-target"]');
    expect(el?.getAttribute('tabindex')).toBe('-1');
  });

  it('should focus the target on mount', () => {
    render(<TestComponent dep="mount" />);
    const el = document.querySelector('[data-testid="auto-focus-target"]') as HTMLElement;
    expect(document.activeElement).toBe(el);
  });
});
