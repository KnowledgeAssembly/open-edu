import { describe, it, expect } from 'vitest';
import { listCuratedWidgets, getCuratedWidget, CURATED_WIDGET_IDS } from './curatedCatalog';

describe('curatedCatalog', () => {
  it('returns only allowlisted stable widgets', () => {
    const list = listCuratedWidgets();
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.every((w) => w.id && w.name && !w.deprecated)).toBe(true);
    expect(getCuratedWidget('core.multiple-choice')?.id).toBe('core.multiple-choice');
  });

  it('excludes unknown ids', () => {
    expect(getCuratedWidget('not.a.widget')).toBeUndefined();
  });

  it('drops allowlisted ids that are missing from the catalog', () => {
    for (const id of listCuratedWidgets().map((w) => w.id)) {
      expect(CURATED_WIDGET_IDS).toContain(id);
    }
  });
});
