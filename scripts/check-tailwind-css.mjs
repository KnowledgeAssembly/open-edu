#!/usr/bin/env node

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RUNTIME_SRC = join(ROOT, 'packages/runtime/src');
const TAILWIND_CSS = join(ROOT, 'apps/dev-server/src/tailwind.css');
const STRICT = process.argv.includes('--strict');
const EXCLUDE_REGEX = /\.(?:test|spec|stories)\.tsx$/;

function walkDir(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const s = statSync(fullPath);
      if (s.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (s.isFile() && entry.endsWith('.tsx') && !EXCLUDE_REGEX.test(entry)) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory does not exist — skip
  }
  return files;
}

function extractSourceClasses(content) {
  const classes = new Set();

  // className="..."
  const attrRegex = /className="([^"]*)"/g;
  let m;
  while ((m = attrRegex.exec(content)) !== null) {
    for (const cls of m[1].split(/\s+/)) {
      if (cls) classes.add(cls);
    }
  }

  // className={`...`} template literals
  const tmplRegex = /className=\{`([^`]*)`\}/g;
  while ((m = tmplRegex.exec(content)) !== null) {
    const cleaned = m[1].replace(/\$\{[^}]*\}/g, '').trim();
    for (const cls of cleaned.split(/\s+/)) {
      if (cls) classes.add(cls);
    }
  }

  // cn(...) — extract string literals within balanced parens
  const cnRegex = /cn\s*\(/g;
  while ((m = cnRegex.exec(content)) !== null) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < content.length && depth > 0) {
      if (content[i] === '(') depth++;
      else if (content[i] === ')') depth--;
      i++;
    }
    const cnBody = content.slice(start, i - 1);
    // Extract single/double-quoted string literals
    const strRegex = /['"]([^'"]*)['"]/g;
    let sm;
    while ((sm = strRegex.exec(cnBody)) !== null) {
      for (const cls of sm[1].split(/\s+/)) {
        if (cls) classes.add(cls);
      }
    }
    // Extract template literal strings (backtick), stripping interpolations
    const tmplRegex = /`([^`]*)`/g;
    let tm;
    while ((tm = tmplRegex.exec(cnBody)) !== null) {
      const cleaned = tm[1].replace(/\$\{[^}]*\}/g, '').trim();
      for (const cls of cleaned.split(/\s+/)) {
        if (cls) classes.add(cls);
      }
    }
  }

  return classes;
}

function extractCssClasses(css) {
  const classes = new Set();
  // Match CSS class selectors, handling Tailwind's escape sequences
  const regex = /\.((?:\\.|[\w-])+(?::(?:\\.|[\w-])+)*)/g;
  let m;
  while ((m = regex.exec(css)) !== null) {
    let name = m[1];
    name = name.replace(/\\(.)/g, '$1');
    classes.add(name);
  }
  return classes;
}

// --- Main ---

try {
  if (!statSync(TAILWIND_CSS).isFile()) throw new Error('not found');
} catch {
  console.error(`\u26a0\ufe0f  ${TAILWIND_CSS} not found. Run the dev-server build first.`);
  process.exit(STRICT ? 1 : 0);
}

const cssContent = readFileSync(TAILWIND_CSS, 'utf-8');
const cssClasses = extractCssClasses(cssContent);

const usedClasses = new Set();
for (const filePath of walkDir(RUNTIME_SRC)) {
  const content = readFileSync(filePath, 'utf-8');
  const extracted = extractSourceClasses(content);
  for (const cls of extracted) {
    usedClasses.add(cls);
  }
}

const missing = [];
for (const cls of usedClasses) {
  // Variant classes appear in the generated CSS with the pseudo-variant suffix
  // appended (e.g. `hover:shadow-md:hover`). Match the source class as a prefix.
  const present =
    cssClasses.has(cls) || [...cssClasses].some((cssClass) => cssClass.startsWith(`${cls}:`));
  if (!present) {
    missing.push(cls);
  }
}

if (missing.length > 0) {
  console.error(`\u26a0\ufe0f  Dev-server Tailwind CSS is stale.`);
  console.error(`   Missing classes: ${missing.join(', ')}`);
  console.error(
    `   Run: pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css`,
  );
  if (STRICT) process.exit(1);
} else {
  console.log('\u2705 All Tailwind classes are present in dev-server CSS.');
}
