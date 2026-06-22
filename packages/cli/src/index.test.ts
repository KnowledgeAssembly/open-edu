import { describe, it, expect } from 'vitest';
import { CLI_VERSION } from './index';

describe('@open-edu/cli', () => {
  it('should export a version', () => {
    expect(CLI_VERSION).toBe('0.1.0');
  });
});
