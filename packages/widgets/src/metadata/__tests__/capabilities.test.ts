import { describe, it, expect } from 'vitest';
import type { WidgetCapabilities } from '../capabilities';

describe('WidgetCapabilities', () => {
  it('has all capability flags as optional booleans', () => {
    const caps: WidgetCapabilities = {};
    expect(caps.supportsObserveMode).toBeUndefined();
    expect(caps.supportsKeyboard).toBeUndefined();
    expect(caps.supportsScreenReader).toBeUndefined();
    expect(caps.supportsHints).toBeUndefined();
    expect(caps.supportsRetry).toBeUndefined();
    expect(caps.supportsScoring).toBeUndefined();
    expect(caps.supportsVoice).toBeUndefined();
    expect(caps.supportsOffline).toBeUndefined();
    expect(caps.supportsPrinting).toBeUndefined();
    expect(caps.supportsTouch).toBeUndefined();
    expect(caps.supportsMouse).toBeUndefined();
    expect(caps.supportsAnalytics).toBeUndefined();
    expect(caps.supportsRewards).toBeUndefined();
    expect(caps.supportsAccessibility).toBeUndefined();
    expect(caps.supportsAnimation).toBeUndefined();
    expect(caps.supportsLocalization).toBeUndefined();
  });

  it('allows setting all capabilities', () => {
    const caps: WidgetCapabilities = {
      supportsObserveMode: true,
      supportsKeyboard: true,
      supportsScreenReader: true,
      supportsHints: false,
      supportsRetry: true,
      supportsScoring: true,
      supportsVoice: true,
      supportsOffline: true,
      supportsPrinting: false,
      supportsTouch: true,
      supportsMouse: true,
      supportsAnalytics: true,
      supportsRewards: true,
      supportsAccessibility: true,
      supportsAnimation: false,
      supportsLocalization: true,
    };
    expect(caps.supportsObserveMode).toBe(true);
    expect(caps.supportsKeyboard).toBe(true);
    expect(caps.supportsAnimation).toBe(false);
    expect(caps.supportsPrinting).toBe(false);
  });
});