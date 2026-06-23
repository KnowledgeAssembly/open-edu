import { describe, it, expect } from 'vitest';
import { REWARDS_VERSION } from './version';

describe('REWARDS_VERSION', () => {
  it('should export version 0.1.0', () => {
    expect(REWARDS_VERSION).toBe('0.1.0');
  });
});
