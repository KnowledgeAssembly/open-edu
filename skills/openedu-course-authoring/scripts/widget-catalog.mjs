#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

/**
 * Loads the Open-Edu widget catalog from a JSON file.
 * Returns an unavailable result when the file cannot be read or parsed.
 *
 * @param {string} catalogPath - path to widget-catalog-data.json
 * @returns {CatalogResult}
 */
export function loadWidgetCatalog(catalogPath) {
  if (!catalogPath || !existsSync(catalogPath)) {
    return {
      available: false,
      reason: 'catalog-not-found',
      catalog: [],
    };
  }

  let raw;
  try {
    raw = readFileSync(catalogPath, 'utf-8');
  } catch {
    return {
      available: false,
      reason: 'catalog-read-error',
      catalog: [],
    };
  }

  let entries;
  try {
    entries = JSON.parse(raw);
  } catch {
    return {
      available: false,
      reason: 'catalog-parse-error',
      catalog: [],
    };
  }

  if (!Array.isArray(entries)) {
    return {
      available: false,
      reason: 'catalog-not-array',
      catalog: [],
    };
  }

  return {
    available: true,
    reason: null,
    catalog: entries,
  };
}

/**
 * Finds a widget by its ID in a catalog array.
 *
 * @param {WidgetEntry[]} catalog
 * @param {string} id
 * @returns {WidgetEntry|undefined}
 */
export function getWidgetById(catalog, id) {
  return catalog.find((w) => w.id === id);
}

/**
 * Returns true if the widget ID is a canonical entry (not deprecated, not legacy-only).
 *
 * @param {WidgetEntry[]} catalog
 * @param {string} id
 * @returns {boolean}
 */
export function isCanonicalWidget(catalog, id) {
  const entry = getWidgetById(catalog, id);
  if (!entry) return false;
  return entry.status !== 'deprecated';
}

/**
 * Returns true if the widget ID is marked deprecated in the catalog.
 *
 * @param {WidgetEntry[]} catalog
 * @param {string} id
 * @returns {boolean}
 */
export function isDeprecatedWidget(catalog, id) {
  const entry = getWidgetById(catalog, id);
  if (!entry) return false;
  return entry.status === 'deprecated' || entry.deprecated === true;
}

/**
 * Resolves a legacy widget ID to its canonical form using catalog metadata.
 * Returns the canonical ID or null if no mapping is found.
 *
 * @param {WidgetEntry[]} catalog
 * @param {string} legacyId
 * @returns {string|null}
 */
export function resolveLegacyWidgetId(catalog, legacyId) {
  const entry = getWidgetById(catalog, legacyId);
  if (entry?.replacement) return entry.replacement;

  for (const w of catalog) {
    if (w.legacyId === legacyId) return w.id;
  }

  return null;
}

/**
 * Returns a set of all canonical (non-deprecated) widget IDs from the catalog.
 *
 * @param {WidgetEntry[]} catalog
 * @returns {Set<string>}
 */
export function getCanonicalWidgetIds(catalog) {
  return new Set(
    catalog.filter((w) => w.status !== 'deprecated' && !w.deprecated).map((w) => w.id),
  );
}

// CLI mode: print catalog summary
if (import.meta.url === `file://${process.argv[1]}`) {
  const catalogPath = process.argv[2];
  if (!catalogPath) {
    console.error('Usage: node widget-catalog.mjs <widget-catalog-data.json>');
    process.exit(1);
  }
  const result = loadWidgetCatalog(catalogPath);
  if (!result.available) {
    console.error(`Catalog unavailable: ${result.reason}`);
    process.exit(1);
  }
  const summary = {
    available: true,
    totalEntries: result.catalog.length,
    canonicalCount: result.catalog.filter((w) => w.status !== 'deprecated' && !w.deprecated).length,
    deprecatedCount: result.catalog.filter((w) => w.status === 'deprecated' || w.deprecated).length,
    ids: result.catalog.map((w) => w.id).sort(),
  };
  console.log(JSON.stringify(summary, null, 2));
}

/**
 * @typedef {object} WidgetEntry
 * @property {string} id
 * @property {string} [name]
 * @property {string} [status]
 * @property {boolean} [deprecated]
 * @property {string} [replacement]
 * @property {string} [legacyId]
 * @property {string[]} [keywords]
 * @property {string[]} [learningIntents]
 * @property {string[]} [capabilities]
 * @property {string[]} [accessibility]
 */

/**
 * @typedef {object} CatalogResult
 * @property {boolean} available
 * @property {string|null} reason
 * @property {WidgetEntry[]} catalog
 */