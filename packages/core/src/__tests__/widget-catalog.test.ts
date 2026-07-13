import { describe, it, expect } from 'vitest';
import { generateWidgetCatalog, type WidgetCatalogInput } from '../widget-catalog';

const SAMPLE_CATALOG: WidgetCatalogInput = {
  widgets: [
    {
      id: 'core.matching',
      name: 'Matching',
      description: 'Match items between two columns',
      domain: 'core',
      status: 'stable',
      learningIntents: ['practice'],
      legacyId: 'open-edu.matching',
    },
    {
      id: 'core.multiple-choice',
      name: 'Multiple Choice',
      description: 'Single or multi-question multiple choice',
      domain: 'core',
      status: 'stable',
      learningIntents: ['assess', 'practice'],
    },
    {
      id: 'math.fraction-visual',
      name: 'Fraction Visual',
      description: 'Visualize fractions',
      domain: 'math',
      status: 'stable',
      learningIntents: ['practice'],
    },
    {
      id: 'core.callout',
      name: 'Callout',
      description: 'Information callout',
      domain: 'core',
      status: 'experimental',
    },
    {
      id: 'core.multiple-choice-practice',
      name: 'Multiple Choice Practice',
      description: 'Practice mode multiple choice',
      domain: 'core',
      status: 'deprecated',
      deprecated: true,
      replacement: 'core.multiple-choice',
    },
  ],
};

describe('generateWidgetCatalog', () => {
  it('generates markdown for all widgets', () => {
    const catalog = generateWidgetCatalog(SAMPLE_CATALOG);
    expect(catalog).toContain('Widget Catalog');
    expect(catalog).toContain('core.matching');
    expect(catalog).toContain('core.multiple-choice');
    expect(catalog).toContain('math.fraction-visual');
    expect(catalog).toContain('open-edu.matching');
  });

  it('includes learning intents for each widget', () => {
    const catalog = generateWidgetCatalog(SAMPLE_CATALOG);
    expect(catalog).toContain('Practice');
    expect(catalog).toContain('Assess');
  });

  it('marks deprecated widgets', () => {
    const catalog = generateWidgetCatalog(SAMPLE_CATALOG);
    expect(catalog).toContain('[DEPRECATED]');
  });

  it('marks experimental widgets', () => {
    const catalog = generateWidgetCatalog(SAMPLE_CATALOG);
    expect(catalog).toContain('(experimental)');
  });

  it('groups widgets by domain', () => {
    const catalog = generateWidgetCatalog(SAMPLE_CATALOG);
    expect(catalog).toContain('Core Widgets');
    expect(catalog).toContain('Math Widgets');
  });

  it('shows legacy IDs', () => {
    const catalog = generateWidgetCatalog(SAMPLE_CATALOG);
    expect(catalog).toContain('Legacy ID: `open-edu.matching`');
  });

  it('shows replacement for deprecated widgets', () => {
    const catalog = generateWidgetCatalog(SAMPLE_CATALOG);
    expect(catalog).toContain('Use `core.multiple-choice` instead');
  });

  it('returns minimal catalog for empty input', () => {
    const catalog = generateWidgetCatalog({ widgets: [] });
    expect(catalog).toContain('Widget Catalog');
    expect(catalog).not.toContain('Core Widgets');
  });
});
