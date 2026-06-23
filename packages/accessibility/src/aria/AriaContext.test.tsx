import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AriaProvider, useAriaContext } from './AriaContext';
import { useEffect, type ReactNode } from 'react';

function TestConsumer({
  onRender,
  children,
}: {
  onRender?: (value: ReturnType<typeof useAriaContext>) => void;
  children?: ReactNode;
}): JSX.Element {
  const value = useAriaContext();
  useEffect(() => {
    onRender?.(value);
  }, [value, onRender]);
  return <div data-testid="aria-consumer">{children}</div>;
}

function LandmarkTest(): JSX.Element {
  const ctx = useAriaContext();
  useEffect(() => {
    ctx.registerLandmark('nav', 'navigation', 'Main navigation');
    ctx.registerLandmark('main', 'main', 'Content');
  }, []);
  const landmarks = ctx.getLandmarks();
  return (
    <div>
      <div data-testid="count">{landmarks.length}</div>
      <div data-testid="first-id">{landmarks[0]?.id ?? ''}</div>
      <div data-testid="second-id">{landmarks[1]?.id ?? ''}</div>
    </div>
  );
}

describe('AriaProvider', () => {
  it('should render children', () => {
    render(
      <AriaProvider>
        <div data-testid="child">child</div>
      </AriaProvider>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('should provide aria context to consumers', () => {
    let captured: ReturnType<typeof useAriaContext> | undefined;
    render(
      <AriaProvider>
        <TestConsumer
          onRender={(v) => {
            captured = v;
          }}
        />
      </AriaProvider>,
    );
    expect(captured).toBeDefined();
    expect(typeof captured!.announce).toBe('function');
    expect(typeof captured!.registerLandmark).toBe('function');
    expect(typeof captured!.unregisterLandmark).toBe('function');
    expect(typeof captured!.getLandmarks).toBe('function');
  });

  it('should throw when useAriaContext is used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow(
      'useAriaContext must be used within an <AriaProvider>',
    );
  });

  it('should render live region containers', () => {
    const { container } = render(
      <AriaProvider>
        <div>content</div>
      </AriaProvider>,
    );
    const politeRegion = container.querySelector('[role="status"]');
    const assertiveRegion = container.querySelector('[role="alert"]');
    expect(politeRegion).toBeTruthy();
    expect(assertiveRegion).toBeTruthy();
  });

  it('should register and retrieve landmarks', async () => {
    render(
      <AriaProvider>
        <LandmarkTest />
      </AriaProvider>,
    );
    const count = await screen.findByTestId('count');
    expect(count.textContent).toBe('2');
    const firstId = screen.getByTestId('first-id');
    expect(firstId.textContent).toBe('nav');
    const secondId = screen.getByTestId('second-id');
    expect(secondId.textContent).toBe('main');
  });

  it('should unregister landmarks', async () => {
    let captured: ReturnType<typeof useAriaContext> | undefined;
    render(
      <AriaProvider>
        <TestConsumer
          onRender={(v) => {
            captured = v;
          }}
        />
      </AriaProvider>,
    );
    captured!.registerLandmark('nav', 'navigation', 'Main navigation');
    captured!.unregisterLandmark('nav');
    expect(captured!.getLandmarks()).toHaveLength(0);
  });
});
