import { describe, it, expect } from 'vitest';
import type { AccessibilityMetadata } from '../accessibility';

describe('AccessibilityMetadata', () => {
  it('has all accessibility fields as optional booleans', () => {
    const a11y: AccessibilityMetadata = {};
    expect(a11y.highContrast).toBeUndefined();
    expect(a11y.keyboardOnly).toBeUndefined();
    expect(a11y.screenReader).toBeUndefined();
    expect(a11y.tts).toBeUndefined();
    expect(a11y.captions).toBeUndefined();
    expect(a11y.signLanguageReady).toBeUndefined();
    expect(a11y.easyLanguage).toBeUndefined();
    expect(a11y.reducedMotion).toBeUndefined();
    expect(a11y.audioDescription).toBeUndefined();
    expect(a11y.focusManagement).toBeUndefined();
    expect(a11y.ariaSupport).toBeUndefined();
  });

  it('allows partial accessibility declarations', () => {
    const a11y: AccessibilityMetadata = {
      highContrast: true,
      keyboardOnly: true,
      screenReader: true,
    };
    expect(a11y.highContrast).toBe(true);
    expect(a11y.tts).toBeUndefined();
  });
});