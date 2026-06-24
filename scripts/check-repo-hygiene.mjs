#!/usr/bin/env node

import { execSync } from 'child_process';
import { statSync } from 'fs';

const errors = [];

function lsFiles(pattern) {
  const result = execSync(`git ls-files ${pattern}`, { encoding: 'utf8' }).trim();
  return result ? result.split('\n').filter(Boolean) : [];
}

const trackedDists = lsFiles('packages/*/dist/ apps/*/dist/');
if (trackedDists.length > 0) {
  for (const f of trackedDists) errors.push(`Committed dist/ file: ${f}`);
}

const dsStore = lsFiles('*.DS_Store');
if (dsStore.length > 0) {
  for (const f of dsStore) errors.push(`Committed .DS_Store file: ${f}`);
}

const logFiles = lsFiles('*.log');
if (logFiles.length > 0) {
  for (const f of logFiles) errors.push(`Committed log file: ${f}`);
}

const eduDirs = lsFiles('.edu/');
if (eduDirs.length > 0) {
  for (const f of eduDirs) errors.push(`Committed .edu telemetry path: ${f}`);
}

const allFiles = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
for (const file of allFiles) {
  if (!file) continue;
  if (file.startsWith('examples/') && file.includes('/assets/')) continue;
  try {
    const size = statSync(file).size;
    if (size > 2 * 1024 * 1024) {
      errors.push(`File exceeds 2 MB (${(size / 1024 / 1024).toFixed(1)} MB): ${file}`);
    }
  } catch {
    // file might have been deleted between ls-files and stat
  }
}

if (errors.length > 0) {
  console.error('\nRepository hygiene check FAILED:\n');
  for (const err of errors) {
    console.error(`  \u274c ${err}`);
  }
  process.exit(1);
} else {
  console.log('\n\u2705 Repository hygiene check passed.');
}
