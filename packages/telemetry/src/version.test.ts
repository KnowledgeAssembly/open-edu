import { describe, it, expect } from 'vitest';
import { TELEMETRY_VERSION } from './version';

describe('TELEMETRY_VERSION', () => {
  it('should export version 0.1.0', () => {
    expect(TELEMETRY_VERSION).toBe('0.1.0');
  });
});
