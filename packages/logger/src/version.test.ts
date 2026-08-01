import { describe, it, expect } from 'vitest';
import { LOGGER_VERSION } from './version.js';

describe('LOGGER_VERSION', () => {
  it('is 0.1.0', () => {
    expect(LOGGER_VERSION).toBe('0.1.0');
  });
});
