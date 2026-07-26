#!/usr/bin/env node
import { discoverRepository } from './openedu-adapter.mjs';

/**
 * Discovers an Open-Edu repository and returns a summary suitable for
 * consumer scripts. Delegates to the shared adapter for actual detection.
 *
 * @param {string} startDir
 * @returns {DiscoverySummary}
 */
export function discoverOpenEdu(startDir = process.cwd()) {
  const full = discoverRepository(startDir);

  const flatCaps = {
    compiler: full.capabilities.compiler.executable,
    cli: full.capabilities.cli.executable,
    widgetCatalog: full.capabilities.widgetCatalog,
    pipeline: full.capabilities.pipeline.packagePresent,
    examples: full.capabilities.examples,
  };

  const stringCommands = {};
  for (const [key, cmd] of Object.entries(full.commands)) {
    if (cmd.argv) {
      stringCommands[key] = cmd.argv.join(' ');
    } else if (cmd.prerequisites.length > 0) {
      stringCommands[key] = `[prerequisites: ${cmd.prerequisites.map((p) => p.command.join(' ')).join('; ')}]`;
    } else {
      stringCommands[key] = null;
    }
  }

  return {
    mode: full.mode,
    repoRoot: full.repoRoot,
    capabilities: flatCaps,
    commands: {
      compile: stringCommands.compile || null,
      validate: stringCommands.validate || null,
      lintContent: stringCommands.lintContent || null,
      dev: stringCommands.dev || null,
      generateCatalog: stringCommands.generateCatalog || null,
      pipelineGenerate: stringCommands.pipelineGenerate || null,
    },
    paths: full.paths,
    unavailable: full.unavailable,
    executable: {
      cli: full.capabilities.cli.executable,
    },
    prerequisites: full.capabilities.cli.packagePresent && !full.capabilities.cli.executable
      ? ['pnpm --filter @open-edu/cli build']
      : [],
  };
}

// CLI mode: print JSON to stdout
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = discoverOpenEdu(process.argv[2] || process.cwd());
  console.log(JSON.stringify(result, null, 2));
}

/**
 * @typedef {object} DiscoverySummary
 * @property {'portable'|'repository'} mode
 * @property {string|null} repoRoot
 * @property {{ compiler: boolean, cli: boolean, widgetCatalog: boolean, pipeline: boolean, examples: boolean }} capabilities
 * @property {{ compile: string|null, validate: string|null, lintContent: string|null, dev: string|null, generateCatalog: string|null, pipelineGenerate: string|null }} commands
 * @property {{ compilerRoot: string|null, cliRoot: string|null, widgetsRoot: string|null, pipelineRoot: string|null, catalogData: string|null, examplesDir: string|null }} paths
 * @property {string[]} unavailable
 * @property {{ cli: boolean }} executable
 * @property {string[]} prerequisites
 */