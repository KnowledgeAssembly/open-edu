#!/usr/bin/env node
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDataDir = join(__dirname, '..', 'src', 'data');
const distDataDir = join(__dirname, '..', 'dist', 'data');

mkdirSync(distDataDir, { recursive: true });
for (const file of readdirSync(srcDataDir).filter((name) => name.endsWith('.json'))) {
  copyFileSync(join(srcDataDir, file), join(distDataDir, file));
}
console.log(`Copied ${srcDataDir}/*.json -> ${distDataDir}`);