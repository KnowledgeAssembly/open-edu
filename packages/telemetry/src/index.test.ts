import { describe, it, expect } from 'vitest';
import { TELEMETRY_VERSION } from './index';

describe('@open-edu/telemetry', () => {
  it('should export a version', () => {
    expect(TELEMETRY_VERSION).toBe('0.1.0');
  });
});
