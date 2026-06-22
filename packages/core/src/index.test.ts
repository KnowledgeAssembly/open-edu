import { describe, it, expect } from 'vitest';
import { CORE_VERSION } from './index';

describe('@open-edu/core', () => {
  it('should export a version', () => {
    expect(CORE_VERSION).toBe('0.1.0');
  });
});
