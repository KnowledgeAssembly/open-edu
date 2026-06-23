import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusProvider, useFocusContext } from './FocusContext';
import { useEffect, type ReactNode, type RefObject } from 'react';

function TestConsumer({
  children,
  onRender,
}: {
  children?: ReactNode;
  onRender?: (value: ReturnType<typeof useFocusContext>) => void;
}): JSX.Element {
  const value = useFocusContext();
  onRender?.(value);
  return <div data-testid="consumer">{children}</div>;
}

function StateTest(): JSX.Element {
  const ctx = useFocusContext();
  useEffect(() => {
    ctx.setActiveDescendantId('option-1');
  }, []);
  return <div data-testid="descendant">{ctx.activeDescendantId ?? 'null'}</div>;
}

describe('FocusProvider', () => {
  it('should render children', () => {
    render(
      <FocusProvider>
        <div data-testid="child">child</div>
      </FocusProvider>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('should provide focus context to consumers', () => {
    let captured: ReturnType<typeof useFocusContext> | undefined;
    render(
      <FocusProvider>
        <TestConsumer
          onRender={(v) => {
            captured = v;
          }}
        />
      </FocusProvider>,
    );
    expect(captured).toBeDefined();
    expect(typeof captured!.setActiveDescendantId).toBe('function');
    expect(typeof captured!.registerNavigableGroup).toBe('function');
    expect(typeof captured!.unregisterNavigableGroup).toBe('function');
    expect(typeof captured!.getNavigableGroup).toBe('function');
  });

  it('should throw when useFocusContext is used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow(
      'useFocusContext must be used within a <FocusProvider>',
    );
  });

  it('should manage activeDescendantId state', async () => {
    render(
      <FocusProvider>
        <StateTest />
      </FocusProvider>,
    );
    const el = await screen.findByTestId('descendant');
    expect(el.textContent).toBe('option-1');
  });

  it('should register and retrieve navigable groups', () => {
    let captured: ReturnType<typeof useFocusContext> | undefined;
    const ref = { current: document.createElement('div') } as RefObject<HTMLElement | null>;
    render(
      <FocusProvider>
        <TestConsumer
          onRender={(v) => {
            captured = v;
          }}
        />
      </FocusProvider>,
    );
    captured!.registerNavigableGroup('quiz-1', ref);
    expect(captured!.getNavigableGroup('quiz-1')).toBe(ref.current);
    captured!.unregisterNavigableGroup('quiz-1');
    expect(captured!.getNavigableGroup('quiz-1')).toBeNull();
  });
});
