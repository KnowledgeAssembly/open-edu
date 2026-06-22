import { describe, it, expect } from 'vitest';
import { REWARDS_VERSION } from './index';

describe('@open-edu/rewards', () => {
  it('should export a version', () => {
    expect(REWARDS_VERSION).toBe('0.1.0');
  });
});
