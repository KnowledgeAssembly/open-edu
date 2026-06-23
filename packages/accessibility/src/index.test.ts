import { describe, it, expect } from 'vitest';
import {
  ACCESSIBILITY_VERSION,
  AccessibilityProvider,
  FocusProvider,
  AriaProvider,
  AxeValidator,
  useAutoFocus,
  useFocusTrap,
  useKeyboardNavigation,
  useAriaContext,
  useFocusContext,
  useAnnouncement,
} from './index';

describe('@open-edu/accessibility exports', () => {
  it('should export a version', () => {
    expect(ACCESSIBILITY_VERSION).toBe('0.1.0');
  });

  it('should export AccessibilityProvider', () => {
    expect(AccessibilityProvider).toBeDefined();
  });

  it('should export FocusProvider', () => {
    expect(FocusProvider).toBeDefined();
  });

  it('should export AriaProvider', () => {
    expect(AriaProvider).toBeDefined();
  });

  it('should export AxeValidator', () => {
    expect(AxeValidator).toBeDefined();
  });

  it('should export hooks', () => {
    expect(useAutoFocus).toBeDefined();
    expect(useFocusTrap).toBeDefined();
    expect(useKeyboardNavigation).toBeDefined();
    expect(useAriaContext).toBeDefined();
    expect(useFocusContext).toBeDefined();
    expect(useAnnouncement).toBeDefined();
  });
});
