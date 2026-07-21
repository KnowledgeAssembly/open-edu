#!/usr/bin/env node

// Lint script: detect raw Tailwind font-scale classes in JSX className
// attributes that should use design-token classes (text-body-ui,
// text-caption, text-h1, etc.) instead.
//
// Scans .tsx files for these class tokens:
//   text-(xs|sm|base|lg|xl|2xl|3xl|4xl)
//   text-[\\d+px]
//
// Usage:
//   node scripts/lint-no-raw-text-scales.mjs           -- warn mode
//   node scripts/lint-no-raw-text-scales.mjs --strict  -- fail on violations

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOTS = [
  'apps/learner/src',
  'packages/runtime/src',
];
const EXCLUDE_REGEX = /\.(?:test|spec|stories)\.[jt]sx$|\.d\.ts$/;
const STRICT = process.argv.includes('--strict');

const RAW_TEXT_PATTERNS = [
  /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b/g,
  /\btext-\[\d+px\]/g,
];

let allowlist = [];
try {
  const allowlistPath = join(ROOT, 'scripts/allowlist-raw-text-scales.json');
  allowlist = JSON.parse(readFileSync(allowlistPath, 'utf-8'));
} catch {
  // no allowlist file — treat as empty
}

function walkDir(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const s = statSync(fullPath);
      if (s.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (s.isFile() && entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory does not exist — skip
  }
  return files;
}

function isInsideClassName(line, matchIndex) {
  // Check we're inside className="..." or className={`...`}
  const before = line.slice(0, matchIndex);
  // Look for className=" or className={` or className={`
  const classNameOpen = before.lastIndexOf('className=');
  if (classNameOpen === -1) return false;
  const afterEquals = line.slice(classNameOpen + 'className='.length);
  // Must be followed by " or `{
  if (afterEquals.startsWith('"')) return true;
  if (afterEquals.startsWith('{`') || afterEquals.startsWith('`')) return true;
  return false;
}

function findRawTextScales(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of RAW_TEXT_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const fullMatch = match[0];
        const index = match.index;

        // Check if inside className attribute
        if (!isInsideClassName(line, index)) continue;

        // Check allowlist
        const relPath = relative(ROOT, filePath);
        if (allowlist.some(entry =>
          entry.file === relPath && entry.line === i + 1 && entry.class === fullMatch
        )) continue;

        violations.push({
          file: relPath,
          line: i + 1,
          column: index + 1,
          match: fullMatch,
        });
      }
    }
  }

  return violations;
}

const allViolations = [];

for (const root of SCAN_ROOTS) {
  const absRoot = join(ROOT, root);
  for (const filePath of walkDir(absRoot)) {
    const relPath = relative(ROOT, filePath);
    if (EXCLUDE_REGEX.test(relPath)) continue;
    allViolations.push(...findRawTextScales(filePath));
  }
}

if (allViolations.length > 0) {
  console.error(`\n📏 Raw Text Scale Lint: Found ${allViolations.length} violation(s) in className:\n`);
  for (const v of allViolations) {
    console.error(`  ❌ ${v.file}:${v.line}:${v.column} — "${v.match}"`);
  }
  console.error(`\n  Replace with design-token classes: text-body-ui, text-caption,` +
    ` text-h1, text-h3, text-h4, text-display-sm, text-label, text-label-caps, etc.\n`);

  if (STRICT) {
    process.exit(1);
  } else {
    console.log('  (Running in warn mode. Use --strict to fail on violations.)\n');
  }
} else {
  console.log('✅ Raw Text Scale Lint: No raw font-scale classes detected.');
}
