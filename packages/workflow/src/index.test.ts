import { describe, it, expect } from 'vitest';
import { WORKFLOW_VERSION } from './index';

describe('@open-edu/workflow', () => {
  it('should export a version', () => {
    expect(WORKFLOW_VERSION).toBe('0.1.0');
  });
});
