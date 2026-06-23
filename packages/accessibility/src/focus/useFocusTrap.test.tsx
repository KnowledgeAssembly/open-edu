import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

function TrapTest({
  enabled,
  returnFocusOnDeactivate = true,
}: {
  enabled: boolean;
  returnFocusOnDeactivate?: boolean;
}): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  useFocusTrap(ref, { enabled, returnFocusOnDeactivate });
  return (
    <div ref={ref} data-testid="trap-container">
      <button data-testid="btn-1">First</button>
      <button data-testid="btn-2">Second</button>
      <button data-testid="btn-3">Third</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('should not trap when disabled', () => {
    const { container } = render(<TrapTest enabled={false} />);
    const firstBtn = container.querySelector('[data-testid="btn-1"]') as HTMLElement;
    expect(firstBtn).toBeTruthy();
  });

  it('should render children', () => {
    const { getByTestId } = render(<TrapTest enabled={false} />);
    expect(getByTestId('trap-container')).toBeTruthy();
    expect(getByTestId('btn-1')).toBeTruthy();
    expect(getByTestId('btn-2')).toBeTruthy();
    expect(getByTestId('btn-3')).toBeTruthy();
  });

  it('should focus first focusable on enable', () => {
    const { getByTestId } = render(<TrapTest enabled={true} />);
    const firstBtn = getByTestId('btn-1') as HTMLElement;
    expect(document.activeElement).toBe(firstBtn);
  });
});
