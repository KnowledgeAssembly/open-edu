import { describe, it, expect } from 'vitest';
import { SCHEMAS_VERSION } from './index';

describe('@open-edu/schemas', () => {
  it('should export a version', () => {
    expect(SCHEMAS_VERSION).toBe('0.1.0');
  });
});
