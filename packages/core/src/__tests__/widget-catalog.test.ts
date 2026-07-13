import { describe, it, expect } from 'vitest';
import { generateWidgetCatalog } from '../widget-catalog';
import { createDefaultRegistry } from '@open-edu/widgets';

describe('generateWidgetCatalog', () => {
  it('generates markdown for all registered widgets', () => {
    const registry = createDefaultRegistry();
    const catalog = generateWidgetCatalog(registry);
    expect(catalog).toContain('Widget Catalog');
    expect(catalog).toContain('core.matching');
    expect(catalog).toContain('core.multiple-choice');
    expect(catalog).toContain('math.fraction-visual');
    expect(catalog).toContain('open-edu.matching');
  });

  it('includes learning intent for each widget', () => {
    const registry = createDefaultRegistry();
    const catalog = generateWidgetCatalog(registry);
    expect(catalog).toContain('Practice');
    expect(catalog).toContain('Assess');
  });

  it('marks deprecated widgets', () => {
    const registry = createDefaultRegistry();
    const catalog = generateWidgetCatalog(registry);
    expect(catalog).toContain('deprecated');
  });
});
