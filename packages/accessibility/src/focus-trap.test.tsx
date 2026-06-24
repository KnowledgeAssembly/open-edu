import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusTrap } from './focus-trap';

describe('FocusTrap', () => {
  it('should render children', () => {
    render(
      <FocusTrap>
        <button data-testid="btn">Click</button>
      </FocusTrap>,
    );
    expect(screen.getByTestId('btn')).toBeTruthy();
    expect(screen.getByTestId('focus-trap')).toBeTruthy();
  });

  it('should focus first focusable element when active', () => {
    render(
      <FocusTrap active={true}>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
      </FocusTrap>,
    );
    const first = screen.getByTestId('first') as HTMLElement;
    expect(document.activeElement).toBe(first);
  });

  it('should not focus anything when inactive', () => {
    render(
      <FocusTrap active={false}>
        <button data-testid="first">First</button>
      </FocusTrap>,
    );
    const first = screen.getByTestId('first') as HTMLElement;
    expect(document.activeElement).not.toBe(first);
  });

  it('should cycle from last to first on Tab key', () => {
    render(
      <FocusTrap active={true}>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </FocusTrap>,
    );
    const first = screen.getByTestId('first') as HTMLElement;
    const third = screen.getByTestId('third') as HTMLElement;
    third.focus();
    fireEvent.keyDown(screen.getByTestId('focus-trap'), { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('should cycle from first to last on Shift+Tab key', () => {
    render(
      <FocusTrap active={true}>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </FocusTrap>,
    );
    const first = screen.getByTestId('first') as HTMLElement;
    const third = screen.getByTestId('third') as HTMLElement;
    first.focus();
    fireEvent.keyDown(screen.getByTestId('focus-trap'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(third);
  });

  it('should handle zero focusable children gracefully', () => {
    render(
      <FocusTrap active={true}>
        <p>No focusable elements</p>
      </FocusTrap>,
    );
    const container = screen.getByTestId('focus-trap') as HTMLElement;
    expect(document.activeElement).toBe(container);
  });
});
