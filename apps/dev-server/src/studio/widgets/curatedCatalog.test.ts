import { describe, it, expect } from 'vitest';
import { listCuratedWidgets, getCuratedWidget } from './curatedCatalog';

describe('curatedCatalog', () => {
  it('returns only non-deprecated stable widgets with a guide', () => {
    const list = listCuratedWidgets();
    expect(list.length).toBeGreaterThanOrEqual(20);
    expect(list.every((w) => w.id && w.name && !w.deprecated && w.status !== 'deprecated' && w.guide)).toBe(true);
    expect(getCuratedWidget('core.multiple-choice')?.id).toBe('core.multiple-choice');
  });

  it('excludes unknown ids', () => {
    expect(getCuratedWidget('not.a.widget')).toBeUndefined();
  });

  it('excludes deprecated widgets from the list', () => {
    const ids = listCuratedWidgets().map((w) => w.id);
    expect(ids).not.toContain('open-edu.multiple-choice-practice');
  });

  it('sources guide config fields from the real catalog data', () => {
    const widget = getCuratedWidget('core.multiple-choice');
    expect(widget?.guide?.configFields?.length ?? 0).toBeGreaterThan(0);
    const names = widget?.guide?.configFields?.map((field) => field.name) ?? [];
    expect(names).toContain('questions');
  });

  it('exposes a guideMarkdown string for widgets with a guide', () => {
    const markdown = getCuratedWidget('core.multiple-choice')?.guideMarkdown ?? '';
    expect(markdown.length).toBeGreaterThan(0);
    expect(markdown).toContain('Multiple Choice');
  });
});
