import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessibilityProvider } from './accessibility-provider';
import { useAriaContext } from './aria/AriaContext';
import { useFocusContext } from './focus/FocusContext';
import { useEffect } from 'react';

function CombinedTest({
  onAria,
  onFocus,
}: {
  onAria?: (v: ReturnType<typeof useAriaContext>) => void;
  onFocus?: (v: ReturnType<typeof useFocusContext>) => void;
}): JSX.Element {
  const aria = useAriaContext();
  const focus = useFocusContext();
  useEffect(() => {
    onAria?.(aria);
  }, [aria, onAria]);
  useEffect(() => {
    onFocus?.(focus);
  }, [focus, onFocus]);
  return <div data-testid="combined">works</div>;
}

describe('AccessibilityProvider', () => {
  it('should render children', () => {
    render(
      <AccessibilityProvider>
        <div data-testid="child">child</div>
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('should provide both aria and focus contexts', () => {
    let ariaVal: ReturnType<typeof useAriaContext> | undefined;
    let focusVal: ReturnType<typeof useFocusContext> | undefined;
    render(
      <AccessibilityProvider>
        <CombinedTest
          onAria={(v) => {
            ariaVal = v;
          }}
          onFocus={(v) => {
            focusVal = v;
          }}
        />
      </AccessibilityProvider>,
    );
    expect(ariaVal).toBeDefined();
    expect(ariaVal!.announce).toBeDefined();
    expect(focusVal).toBeDefined();
    expect(focusVal!.setActiveDescendantId).toBeDefined();
  });
});
