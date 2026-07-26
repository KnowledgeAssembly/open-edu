import { describe, it } from 'node:test';
import { ok, strictEqual, deepStrictEqual } from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadWidgetCatalog,
  getWidgetById,
  isCanonicalWidget,
  isDeprecatedWidget,
  resolveLegacyWidgetId,
  getCanonicalWidgetIds,
} from '../widget-catalog.mjs';

function createTempDir() {
  const base = join(tmpdir(), `widget-catalog-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

function makeFixtureCatalog() {
  return [
    { id: 'core.matching', name: 'Matching', status: 'stable' },
    { id: 'core.multiple-choice', name: 'Multiple Choice', status: 'stable' },
    { id: 'math.fraction-visual', name: 'Fraction Visual', status: 'stable' },
    {
      id: 'open-edu.multiple-choice-practice',
      name: 'MC Practice (Legacy)',
      status: 'deprecated',
      deprecated: true,
      replacement: 'core.multiple-choice',
    },
    {
      id: 'core.sequencing',
      name: 'Sequencing',
      status: 'stable',
      legacyId: 'open-edu.sequencing',
    },
    { id: 'core.experimental-widget', name: 'Experimental', status: 'experimental' },
  ];
}

describe('widget-catalog loadWidgetCatalog', () => {
  it('loads a valid array catalog', () => {
    const dir = createTempDir();
    try {
      const catalogPath = join(dir, 'widget-catalog-data.json');
      writeFileSync(catalogPath, JSON.stringify(makeFixtureCatalog()));
      const result = loadWidgetCatalog(catalogPath);
      strictEqual(result.available, true);
      strictEqual(result.reason, null);
      strictEqual(result.catalog.length, 6);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns unavailable for missing file', () => {
    const dir = createTempDir();
    try {
      const result = loadWidgetCatalog(join(dir, 'nonexistent.json'));
      strictEqual(result.available, false);
      strictEqual(result.reason, 'catalog-not-found');
      deepStrictEqual(result.catalog, []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns unavailable for null/undefined path', () => {
    const result = loadWidgetCatalog(null);
    strictEqual(result.available, false);
    strictEqual(result.reason, 'catalog-not-found');
  });

  it('returns unavailable for malformed JSON', () => {
    const dir = createTempDir();
    try {
      const catalogPath = join(dir, 'widget-catalog-data.json');
      writeFileSync(catalogPath, '{ invalid json }');
      const result = loadWidgetCatalog(catalogPath);
      strictEqual(result.available, false);
      strictEqual(result.reason, 'catalog-parse-error');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns unavailable when JSON is not an array', () => {
    const dir = createTempDir();
    try {
      const catalogPath = join(dir, 'widget-catalog-data.json');
      writeFileSync(catalogPath, '{"id": "not-an-array"}');
      const result = loadWidgetCatalog(catalogPath);
      strictEqual(result.available, false);
      strictEqual(result.reason, 'catalog-not-array');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loads the real Open-Edu widget catalog when available', () => {
    const realPath = join(process.cwd(), 'packages', 'core', 'src', 'widget-catalog-data.json');
    if (!existsSync(realPath)) return; // skip if not in repo
    const result = loadWidgetCatalog(realPath);
    if (result.available) {
      ok(result.catalog.length > 0, 'real catalog should have entries');
      ok(result.catalog[0].id, 'entries should have id field');
    }
  });
});

describe('widget-catalog getWidgetById', () => {
  it('finds a widget by exact ID match', () => {
    const catalog = makeFixtureCatalog();
    const entry = getWidgetById(catalog, 'math.fraction-visual');
    ok(entry);
    strictEqual(entry.name, 'Fraction Visual');
  });

  it('returns undefined for unknown ID', () => {
    const catalog = makeFixtureCatalog();
    const entry = getWidgetById(catalog, 'nonexistent.widget');
    strictEqual(entry, undefined);
  });
});

describe('widget-catalog isCanonicalWidget', () => {
  it('returns true for stable widgets', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(isCanonicalWidget(catalog, 'core.matching'), true);
    strictEqual(isCanonicalWidget(catalog, 'core.multiple-choice'), true);
  });

  it('returns false for deprecated widgets', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(isCanonicalWidget(catalog, 'open-edu.multiple-choice-practice'), false);
  });

  it('returns false for unknown IDs', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(isCanonicalWidget(catalog, 'unknown.widget'), false);
  });

  it('returns true for experimental widgets (not deprecated)', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(isCanonicalWidget(catalog, 'core.experimental-widget'), true);
  });
});

describe('widget-catalog isDeprecatedWidget', () => {
  it('returns true for widgets with status=deprecated', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(isDeprecatedWidget(catalog, 'open-edu.multiple-choice-practice'), true);
  });

  it('returns false for stable widgets', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(isDeprecatedWidget(catalog, 'core.matching'), false);
  });

  it('returns false for unknown IDs', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(isDeprecatedWidget(catalog, 'unknown.widget'), false);
  });
});

describe('widget-catalog resolveLegacyWidgetId', () => {
  it('resolves legacy ID via replacement field', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(
      resolveLegacyWidgetId(catalog, 'open-edu.multiple-choice-practice'),
      'core.multiple-choice',
    );
  });

  it('resolves legacy ID via legacyId field on canonical entry', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(resolveLegacyWidgetId(catalog, 'open-edu.sequencing'), 'core.sequencing');
  });

  it('returns null for unknown legacy IDs', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(resolveLegacyWidgetId(catalog, 'nonexistent.legacy'), null);
  });

  it('does not silently rewrite an unknown ID in quality report (returns null)', () => {
    const catalog = makeFixtureCatalog();
    strictEqual(resolveLegacyWidgetId(catalog, 'open-edu.piano-simulator'), null);
  });
});

describe('widget-catalog getCanonicalWidgetIds', () => {
  it('returns a Set of non-deprecated widget IDs', () => {
    const catalog = makeFixtureCatalog();
    const ids = getCanonicalWidgetIds(catalog);
    ok(ids instanceof Set);
    strictEqual(ids.has('core.matching'), true);
    strictEqual(ids.has('core.multiple-choice'), true);
    strictEqual(ids.has('open-edu.multiple-choice-practice'), false);
  });

  it('accepts a new widget ID without code changes', () => {
    const catalog = [
      ...makeFixtureCatalog(),
      { id: 'physics.quantum-simulator', name: 'Quantum Sim', status: 'stable' },
    ];
    const ids = getCanonicalWidgetIds(catalog);
    strictEqual(ids.has('physics.quantum-simulator'), true);
  });
});