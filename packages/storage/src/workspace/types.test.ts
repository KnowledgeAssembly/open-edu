import { describe, it, expect } from 'vitest';
import type { CourseWorkspace } from './types.js';

describe('workspace types', () => {
  it('compiles the CourseWorkspace interface', () => {
    // Compile-only check: the interface resolves and is usable as a structural type.
    const _check: CourseWorkspace | null = null;
    expect(_check).toBeNull();
  });
});
