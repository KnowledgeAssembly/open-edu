import { describe, it, expect } from 'vitest';
import { WIDGETS_VERSION } from './index';

describe('@open-edu/widgets', () => {
  it('should export a version', () => {
    expect(WIDGETS_VERSION).toBe('0.1.0');
  });
});
