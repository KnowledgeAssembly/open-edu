import { describe, it, expect } from 'vitest';
import { LOG_LEVELS, LOG_LEVEL_VALUES } from './types.js';

describe('LOG_LEVELS', () => {
  it('contains debug, info, warn, error', () => {
    expect(LOG_LEVELS).toEqual(['debug', 'info', 'warn', 'error']);
  });
});

describe('LOG_LEVEL_VALUES', () => {
  it('debug < info < warn < error', () => {
    expect(LOG_LEVEL_VALUES.debug).toBeLessThan(LOG_LEVEL_VALUES.info);
    expect(LOG_LEVEL_VALUES.info).toBeLessThan(LOG_LEVEL_VALUES.warn);
    expect(LOG_LEVEL_VALUES.warn).toBeLessThan(LOG_LEVEL_VALUES.error);
  });
});
