import { describe, it, expect } from 'vitest';
import { createWidgetRegistry, registerAllBuiltins } from '../registry';

describe('Foundation stub auto-registration', () => {
  const STUB_IDS = [
    'core.callout',
    'core.image-compare',
    'core.hotspot',
    'core.timeline',
    'science.label-diagram',
    'science.image-label',
  ];

  for (const id of STUB_IDS) {
    it(`registers ${id} in default registry`, () => {
      const registry = createWidgetRegistry();
      registerAllBuiltins(registry);
      expect(registry.has(id)).toBe(true);
      expect(registry.get(id)).toBeDefined();
    });
  }

  it('registers all 21 builtins (15 stable + 6 stubs)', () => {
    const registry = createWidgetRegistry();
    registerAllBuiltins(registry);
    expect(registry.getAll()).toHaveLength(21);
  });
});
