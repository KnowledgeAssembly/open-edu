import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { join } from 'node:path';

describe('adding_fractions', () => {
  it('should load and validate', async () => {
    const pkg = await loadPackage(join(__dirname));
    expect(pkg.manifest.id).toBe('adding_fractions');
    expect(pkg.nodes).toHaveLength(1);
  });
});
