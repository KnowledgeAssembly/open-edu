import { describe, it } from 'node:test';
import { ok, strictEqual, deepStrictEqual } from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverOpenEdu } from '../discover-openedu.mjs';

function createTempRepo() {
  const base = join(tmpdir(), `openedu-discovery-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

function addFile(dir, subpath, content = '') {
  const full = join(dir, subpath);
  const parent = join(full, '..');
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
  writeFileSync(full, content);
}

describe('discover-openedu', () => {
  it('reports portable mode for a non-repo directory', () => {
    const dir = createTempRepo();
    try {
      const result = discoverOpenEdu(dir);
      strictEqual(result.mode, 'portable');
      strictEqual(result.repoRoot, null);
      deepStrictEqual(result.capabilities, {
        compiler: false, cli: false, widgetCatalog: false, pipeline: false, examples: false,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects an Open-Edu repository root via pnpm-workspace.yaml', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml', 'packages:\n  - "packages/*"');
      const result = discoverOpenEdu(dir);
      strictEqual(result.mode, 'repository');
      strictEqual(result.repoRoot, dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not claim compiler capability when only directory exists (no executable)', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/course-compiler/package.json', '{"name":"@open-edu/course-compiler"}');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.compiler, false, 'compiler should be false without CLI executable');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects CLI capability when dist/cli.js exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/cli/package.json', '{"name":"@open-edu/cli"}');
      addFile(dir, 'packages/cli/dist/cli.js', '#!/usr/bin/env node');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.cli, true);
      strictEqual(result.executable.cli, true);
      ok(result.commands.validate !== null);
      ok(result.commands.lintContent !== null);
      ok(result.commands.dev !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns build prerequisites when CLI package exists but dist is missing', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/cli/package.json', '{"name":"@open-edu/cli"}');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.cli, false, 'cli should not be executable without dist');
      strictEqual(result.executable.cli, false);
      ok(result.prerequisites.length > 0, 'should have build prerequisites');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects widget catalog when catalog data file exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/core/src/widget-catalog-data.json', '[]');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.widgetCatalog, true);
      ok(result.paths.catalogData !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects pipeline capability when packages/pipeline exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/pipeline/package.json', '{"name":"@open-edu/pipeline"}');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.pipeline, true);
      ok(result.paths.pipelineRoot !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects examples when examples/ directory exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'examples/.gitkeep');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.examples, true);
      ok(result.paths.examplesDir !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('walks upward to find repo root from a subdirectory', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      const subDir = join(dir, 'some/deep/nested/path');
      mkdirSync(subDir, { recursive: true });
      const result = discoverOpenEdu(subDir);
      strictEqual(result.repoRoot, dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lists unavailable capabilities', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      const result = discoverOpenEdu(dir);
      ok(Array.isArray(result.unavailable));
      ok(result.unavailable.length > 0);
      ok(result.unavailable.includes('compiler'));
      ok(result.unavailable.includes('pipeline'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns explicit false capabilities, not undefined', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      const result = discoverOpenEdu(dir);
      for (const [key, val] of Object.entries(result.capabilities)) {
        strictEqual(typeof val, 'boolean', `capability ${key} must be boolean, got ${typeof val}`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});