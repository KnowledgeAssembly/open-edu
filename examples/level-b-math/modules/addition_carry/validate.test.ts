import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { join } from 'node:path';

describe('addition_carry', () => {
  it('should load and validate', async () => {
    const pkg = await loadPackage(join(__dirname));
    expect(pkg.manifest.id).toBe('addition_carry');
    expect(pkg.nodes).toHaveLength(2);
  });
});
