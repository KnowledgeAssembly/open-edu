#!/usr/bin/env node
/**
 * Generates widget-catalog-data.json in @open-edu/core from the canonical
 * source in @open-edu/widgets/src/widget-catalog-source.ts.
 *
 * Run: pnpm --filter @open-edu/widgets generate:catalog
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import the source data directly — no React, no design-system dependency
const { WIDGET_CATALOG_ENTRIES } = await import('../src/widget-catalog-source.ts');

const outputPath = resolve(__dirname, '../../core/src/widget-catalog-data.json');

const json = JSON.stringify(WIDGET_CATALOG_ENTRIES, null, 2) + '\n';
writeFileSync(outputPath, json, 'utf-8');

console.log(`Generated ${WIDGET_CATALOG_ENTRIES.length} widget entries → ${outputPath}`);
