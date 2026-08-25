import { describe, it, expect, beforeEach } from 'vitest';
import {
  listCuratedWidgets,
  getCuratedWidget,
  loadCatalogWidgets,
  __resetCatalogCache,
} from './curatedCatalog';

describe('curatedCatalog', () => {
  beforeEach(() => {
    __resetCatalogCache();
  });

  it('returns only non-deprecated widgets', () => {
    const list = listCuratedWidgets();
    expect(list.length).toBeGreaterThanOrEqual(20);
    expect(list.every((w) => w.id && w.name && !w.deprecated && w.status !== 'deprecated')).toBe(
      true,
    );
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

  it('marks built-in widgets as source builtin, native trustTier, version 0.1.0', () => {
    const matching = getCuratedWidget('core.matching');
    expect(matching?.source).toBe('builtin');
    expect(matching?.trustTier).toBe('native');
    expect(matching?.version).toBe('0.1.0');
  });

  it('merges registry widgets, skipping revoked and flagging experimental/sandboxed', () => {
    const catalog = {
      registryId: 'community-registry',
      origin: 'https://widgets.example.edu',
      widgets: [
        {
          id: 'community.example.counter',
          version: '1.0.0',
          manifestUrl: 'https://widgets.example.edu/community.example.counter/1.0.0/manifest.json',
          status: 'experimental',
          trustTier: 'sandboxed',
          offline: true,
        },
        {
          id: 'community.example.revoked',
          version: '1.0.0',
          manifestUrl: 'https://widgets.example.edu/community.example.revoked/1.0.0/manifest.json',
          status: 'revoked',
          trustTier: 'sandboxed',
          offline: false,
        },
      ],
    };
    const map = loadCatalogWidgets([catalog]);
    const experiment = map.get('community.example.counter');
    expect(experiment?.source).toBe('registry');
    expect(experiment?.trustTier).toBe('sandboxed');
    expect(experiment?.experimental).toBe(true);
    expect(experiment?.version).toBe('1.0.0');
    expect(experiment?.offline).toBe(true);
    expect(experiment?.registryId).toBe('community-registry');
    expect(map.get('community.example.revoked')).toBeUndefined();
  });

  it('lets a built-in win when a registry entry collides with the same id', () => {
    const catalog = {
      registryId: 'collision-registry',
      origin: 'https://widgets.example.edu',
      widgets: [
        {
          id: 'core.matching',
          version: '9.9.9',
          manifestUrl: 'https://widgets.example.edu/core.matching/9.9.9/manifest.json',
          status: 'verified',
          trustTier: 'sandboxed',
          offline: false,
        },
      ],
    };
    const map = loadCatalogWidgets([catalog]);
    const widget = map.get('core.matching');
    expect(widget?.source).toBe('builtin');
    expect(widget?.trustTier).toBe('native');
    expect(widget?.version).toBe('0.1.0');
  });
});
