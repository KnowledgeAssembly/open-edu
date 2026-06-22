import { describe, it, expect } from 'vitest';
import { RUNTIME_VERSION } from './index';

describe('@open-edu/runtime', () => {
  it('should export a version', () => {
    expect(RUNTIME_VERSION).toBe('0.1.0');
  });
});
