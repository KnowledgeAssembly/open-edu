import { describe, it, expect } from 'vitest';
import { ACCESSIBILITY_VERSION } from './version';

describe('@open-edu/accessibility', () => {
  it('should export a version', () => {
    expect(ACCESSIBILITY_VERSION).toBe('0.1.0');
  });
});
