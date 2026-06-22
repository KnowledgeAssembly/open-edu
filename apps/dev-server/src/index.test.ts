import { describe, it, expect } from 'vitest';
import { DEV_SERVER_VERSION } from './index';

describe('@open-edu/dev-server', () => {
  it('should export a version', () => {
    expect(DEV_SERVER_VERSION).toBe('0.1.0');
  });
});
