import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useKeyboardNavigation } from './useKeyboardNavigation';

function NavTest({ enabled = true }: { enabled?: boolean }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  useKeyboardNavigation(ref, enabled);
  return (
    <div ref={ref} data-testid="nav-container">
      <div role="radio" data-testid="item-1" tabIndex={0}>
        Option A
      </div>
      <div role="radio" data-testid="item-2" tabIndex={-1}>
        Option B
      </div>
      <div role="radio" data-testid="item-3" tabIndex={-1}>
        Option C
      </div>
    </div>
  );
}

describe('useKeyboardNavigation', () => {
  it('should render children', () => {
    render(<NavTest />);
    expect(screen.getByTestId('nav-container')).toBeTruthy();
    expect(screen.getByTestId('item-1')).toBeTruthy();
    expect(screen.getByTestId('item-2')).toBeTruthy();
    expect(screen.getByTestId('item-3')).toBeTruthy();
  });

  it('should focus first item on ArrowDown when none focused', () => {
    render(<NavTest />);
    const container = screen.getByTestId('nav-container');
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByTestId('item-1'));
  });

  it('should move focus on ArrowDown', () => {
    render(<NavTest />);
    const item1 = screen.getByTestId('item-1');
    item1.focus();
    fireEvent.keyDown(item1, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByTestId('item-2'));
  });

  it('should move focus on ArrowUp', () => {
    render(<NavTest />);
    const item2 = screen.getByTestId('item-2');
    item2.focus();
    fireEvent.keyDown(item2, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByTestId('item-1'));
  });

  it('should loop back to first on ArrowDown at last item', () => {
    render(<NavTest />);
    const item3 = screen.getByTestId('item-3');
    item3.focus();
    fireEvent.keyDown(item3, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByTestId('item-1'));
  });

  it('should loop to last on ArrowUp at first item', () => {
    render(<NavTest />);
    const item1 = screen.getByTestId('item-1');
    item1.focus();
    fireEvent.keyDown(item1, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByTestId('item-3'));
  });
});
