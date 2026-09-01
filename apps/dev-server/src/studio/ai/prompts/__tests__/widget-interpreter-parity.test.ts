import { describe, it, expect, vi, beforeAll } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isCatalogWidgetId, assertCatalogWidgetId } from '../buildPrompt.js';

vi.mock('../../../widgets/curatedCatalog.js', () => ({
  listCuratedWidgets: () => [
    {
      id: 'core.multiple-choice',
      name: 'Multiple Choice',
      status: 'stable',
    },
    {
      id: 'community.example.counter',
      name: 'Counter',
      status: 'experimental',
    },
  ],
}));

let isCanonicalWidget: (catalog: any[], id: string) => boolean;
let isDeprecatedWidget: (catalog: any[], id: string) => boolean;
let resolveLegacyWidgetId: (catalog: any[], legacyId: string) => string | null;

describe('Widget Interpreter Parity', () => {
  beforeAll(async () => {
    const scriptPath = join(
      process.cwd(),
      '../../skills/openedu-course-authoring/scripts/widget-catalog.mjs',
    );
    const mod = await import(pathToFileURL(scriptPath).href);
    isCanonicalWidget = mod.isCanonicalWidget;
    isDeprecatedWidget = mod.isDeprecatedWidget;
    resolveLegacyWidgetId = mod.resolveLegacyWidgetId;
  });

  const catalogFixture = [
    {
      id: 'core.multiple-choice',
      name: 'Multiple Choice',
      status: 'stable',
    },
    {
      id: 'community.example.counter',
      name: 'Counter',
      status: 'experimental',
    },
    {
      id: 'old.legacy-counter',
      name: 'Old Counter',
      status: 'deprecated',
      replacement: 'community.example.counter',
    },
  ];

  it('agrees on canonical widget identification', () => {
    expect(isCanonicalWidget(catalogFixture, 'core.multiple-choice')).toBe(true);
    expect(isCatalogWidgetId('core.multiple-choice')).toBe(true);

    expect(isCanonicalWidget(catalogFixture, 'community.example.counter')).toBe(true);
    expect(isCatalogWidgetId('community.example.counter')).toBe(true);

    expect(isCanonicalWidget(catalogFixture, 'old.legacy-counter')).toBe(false);
    expect(isCatalogWidgetId('old.legacy-counter')).toBe(false);
  });

  it('agrees on deprecated widget resolution and rejection', () => {
    expect(isDeprecatedWidget(catalogFixture, 'old.legacy-counter')).toBe(true);
    expect(resolveLegacyWidgetId(catalogFixture, 'old.legacy-counter')).toBe(
      'community.example.counter',
    );

    expect(() => assertCatalogWidgetId('old.legacy-counter')).toThrow(/Unknown or revoked/);
  });

  it('agrees on unknown widget ids', () => {
    expect(isCanonicalWidget(catalogFixture, 'nonexistent.widget')).toBe(false);
    expect(isCatalogWidgetId('nonexistent.widget')).toBe(false);
    expect(() => assertCatalogWidgetId('nonexistent.widget')).toThrow(/Unknown or revoked/);
  });
});
