import { describe, it, expect } from 'vitest';
import { loadBundle } from '@open-edu/core';
import { join } from 'node:path';

describe('level-b-math bundle', () => {
  it('should load all 3 modules', async () => {
    const bundle = await loadBundle(join(__dirname));
    expect(bundle.manifest.id).toBe('level-b-math');
    expect(bundle.modules).toHaveLength(3);
    expect(bundle.moduleMap.has('addition_basics')).toBe(true);
    expect(bundle.moduleMap.has('addition_carry')).toBe(true);
    expect(bundle.moduleMap.has('adding_fractions')).toBe(true);
  });

  it('should have correct dependency chain', () => {
    const manifest = JSON.parse(
      require('fs').readFileSync(join(__dirname, 'bundle.json'), 'utf-8'),
    );
    const mod1 = manifest.modules.find((m: any) => m.id === 'addition_basics');
    const mod2 = manifest.modules.find((m: any) => m.id === 'addition_carry');
    const mod3 = manifest.modules.find((m: any) => m.id === 'adding_fractions');
    expect(mod1.dependsOn).toEqual([]);
    expect(mod2.dependsOn).toEqual(['addition_basics']);
    expect(mod3.dependsOn).toEqual(['addition_carry']);
  });

  it('should load bundle-level rewards and cards', async () => {
    const bundle = await loadBundle(join(__dirname));
    expect(bundle.rewards).not.toBeNull();
    expect(bundle.rewards!.triggers[0]!.onEvent).toBe('bundle_complete');
    expect(bundle.cards).not.toBeNull();
    expect(bundle.cards!.cards[0]!.unlock.type).toBe('bundleCompleted');
  });
});
