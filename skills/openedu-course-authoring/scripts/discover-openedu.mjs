#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Walks upward from `startDir` to find an Open-Edu repository root.
 * Returns a DiscoveryResult with explicit capabilities and commands.
 * @param {string} startDir
 * @returns {DiscoveryResult}
 */
export function discoverOpenEdu(startDir = process.cwd()) {
  const repoRoot = findRepoRoot(startDir);

  const result = {
    mode: repoRoot ? 'repository' : 'portable',
    repoRoot,
    capabilities: {
      compiler: false,
      cli: false,
      widgetCatalog: false,
      pipeline: false,
      examples: false,
    },
    commands: {
      compile: null,
      validate: null,
      lintContent: null,
      dev: null,
      generateCatalog: null,
      pipelineGenerate: null,
    },
    paths: {
      compilerRoot: null,
      cliRoot: null,
      widgetsRoot: null,
      pipelineRoot: null,
      catalogData: null,
      examplesDir: null,
    },
    unavailable: [],
  };

  if (!repoRoot) {
    result.unavailable = ['compiler', 'cli', 'widgetCatalog', 'pipeline', 'examples'];
    return result;
  }

  // Compiler
  const compilerPath = join(repoRoot, 'packages', 'course-compiler');
  if (existsSync(join(compilerPath, 'package.json'))) {
    result.capabilities.compiler = true;
    result.paths.compilerRoot = compilerPath;
    result.commands.compile = 'edu compile {spec} --output {dir} --validate';
  }

  // CLI
  const cliPath = join(repoRoot, 'packages', 'cli');
  if (existsSync(join(cliPath, 'package.json'))) {
    result.capabilities.cli = true;
    result.paths.cliRoot = cliPath;
    result.commands.validate = 'edu validate {dir}';
    result.commands.lintContent = 'edu lint-content {dir}';
    result.commands.dev = 'edu dev {dir}';
  }

  // Widgets
  const widgetsPath = join(repoRoot, 'packages', 'widgets');
  if (existsSync(join(widgetsPath, 'package.json'))) {
    result.paths.widgetsRoot = widgetsPath;
    result.commands.generateCatalog = 'pnpm --filter @open-edu/widgets generate:catalog';
  }

  // Widget Catalog Data
  const catalogDataPath = join(repoRoot, 'packages', 'core', 'src', 'widget-catalog-data.json');
  if (existsSync(catalogDataPath)) {
    result.capabilities.widgetCatalog = true;
    result.paths.catalogData = catalogDataPath;
  }

  // Pipeline
  const pipelinePath = join(repoRoot, 'packages', 'pipeline');
  if (existsSync(join(pipelinePath, 'package.json'))) {
    result.capabilities.pipeline = true;
    result.paths.pipelineRoot = pipelinePath;
    result.commands.pipelineGenerate =
      'pnpm --filter @open-edu/pipeline curriculum:generate --pdf {file} --subject {subject}';
  }

  // Examples
  const examplesPath = join(repoRoot, 'examples');
  if (existsSync(examplesPath)) {
    result.capabilities.examples = true;
    result.paths.examplesDir = examplesPath;
  }

  // Unavailable
  for (const [key, val] of Object.entries(result.capabilities)) {
    if (!val) result.unavailable.push(key);
  }

  return result;
}

/**
 * Walks upward from `start` looking for `pnpm-workspace.yaml`.
 * @param {string} start
 * @returns {string|null}
 */
function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// CLI mode: print JSON to stdout
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = discoverOpenEdu(process.argv[2] || process.cwd());
  console.log(JSON.stringify(result, null, 2));
}
