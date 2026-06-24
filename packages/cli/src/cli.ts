#!/usr/bin/env node
import { Command } from 'commander';
import { validatePackage } from './commands/validate.js';
import { createPackage } from './commands/create.js';
import { lintContent } from './commands/lint-content.js';
import { devPackage } from './commands/dev.js';
import { buildPackage } from './commands/build.js';
import { packagePackage } from './commands/package.js';
import { widgetCreate } from './commands/widget-create.js';
import { reportTelemetry } from './commands/report.js';
import { generatePrompt, generateFromDescription } from './commands/generate.js';
import { patchPackage } from './commands/patch.js';
import { CLI_VERSION } from './index.js';
import { formatJsonResult } from './utils/json-output.js';
import type { CliResult } from './utils/json-output.js';

const program = new Command();

program.name('edu').description('Open-Edu educational package toolkit').version(CLI_VERSION);

program.option('--json', 'Output results as structured JSON');

program
  .command('validate')
  .description('Validate an educational package')
  .argument('<package-dir>', 'Path to the educational package directory')
  .option('--verify-integrity', 'Verify file integrity against build manifest')
  .action(async (packageDir: string, cmdOptions: { verifyIntegrity?: boolean }) => {
    const json = program.optsWithGlobals().json;
    const result = await validatePackage(packageDir, {
      json,
      verifyIntegrity: cmdOptions.verifyIntegrity,
    });
    handleResult(result, json);
  });

program
  .command('dev')
  .description('Start the dev server for an educational package')
  .argument('<package-dir>', 'Path to the educational package directory')
  .action(async (packageDir: string) => {
    const json = program.optsWithGlobals().json;
    const result = await devPackage(packageDir, { json });
    handleResult(result, json);
  });

program
  .command('build')
  .description('Build an educational package for distribution')
  .argument('<package-dir>', 'Path to the educational package directory')
  .option('--out-dir <path>', 'Output directory')
  .action(async (packageDir: string, cmdOptions: { outDir?: string }) => {
    const json = program.optsWithGlobals().json;
    const result = await buildPackage(packageDir, cmdOptions.outDir, { json });
    handleResult(result, json);
  });

program
  .command('package')
  .description('Create a distributable archive of an educational package')
  .argument('<package-dir>', 'Path to the educational package directory')
  .option('--output <path>', 'Output directory for the archive')
  .action(async (packageDir: string, cmdOptions: { output?: string }) => {
    const json = program.optsWithGlobals().json;
    const result = await packagePackage(packageDir, cmdOptions.output, { json });
    handleResult(result, json);
  });

program
  .command('create')
  .description('Create a new educational package scaffold')
  .argument('<package-dir>', 'Directory to create the package in')
  .option('--id <id>', 'Package ID (kebab-case)')
  .option('--title <title>', 'Package title')
  .option('--author <author>', 'Package author')
  .option('--force', 'Overwrite existing files in non-empty directory')
  .action(
    async (
      packageDir: string,
      cmdOptions: { id?: string; title?: string; author?: string; force?: boolean },
    ) => {
      const json = program.optsWithGlobals().json;
      const id =
        cmdOptions.id || packageDir.split('/').pop() || packageDir.split('\\').pop() || 'package';
      const title = cmdOptions.title || id;
      const author = cmdOptions.author || 'Open-Edu Author';
      const result = await createPackage(packageDir, {
        id,
        title,
        author,
        force: cmdOptions.force,
      });
      const cliResult: CliResult = result.success
        ? { success: true, data: { files: result.files } }
        : { success: false, error: result.error!, code: 1 };
      handleResult(cliResult, json);
    },
  );

program
  .command('report')
  .description('Generate a report from a telemetry JSONL file')
  .argument('<telemetry-jsonl>', 'Path to the telemetry JSONL file')
  .action((filePath: string) => {
    const json = program.optsWithGlobals().json;
    const result = reportTelemetry(filePath, { json });
    handleResult(result, json);
  });

program
  .command('lint-content')
  .description('Run content quality checks on an educational package')
  .argument('<package-dir>', 'Path to the educational package directory')
  .option('--max-warnings <number>', 'Maximum number of warnings allowed', parseInt)
  .action(async (packageDir: string, cmdOptions: { maxWarnings?: number }) => {
    const json = program.optsWithGlobals().json;
    const result = await lintContent(packageDir, { json, maxWarnings: cmdOptions.maxWarnings });
    handleResult(result, json);
  });

const widget = program.command('widget').description('Widget management commands');

widget
  .command('create')
  .description('Create a new widget package')
  .argument('<dir>', 'Directory to create the widget in')
  .option('--id <id>', 'Widget ID')
  .option('--title <title>', 'Widget title')
  .option('--force', 'Overwrite existing files')
  .action(async (dir: string, cmdOptions: { id?: string; title?: string; force?: boolean }) => {
    const json = program.optsWithGlobals().json;
    const id = cmdOptions.id || dir.split('/').pop() || dir.split('\\').pop() || 'widget';
    const result = await widgetCreate(dir, {
      id,
      title: cmdOptions.title,
      force: cmdOptions.force,
    });
    const cliResult: CliResult = result.success
      ? { success: true, data: { files: result.files } }
      : { success: false, error: result.error!, code: 1 };
    handleResult(cliResult, json);
  });

program
  .command('generate')
  .description('Generate agent prompt or scaffold a package from a description')
  .option('--prompt', 'Output the agent prompt template for LLM-based package generation')
  .option('--from-description <text>', 'Generate a package from a natural language description')
  .option('--force', 'Overwrite existing files (used with --from-description)')
  .argument('[package-dir]', 'Package directory (required with --from-description)')
  .action(
    async (
      packageDir: string | undefined,
      cmdOptions: { prompt?: boolean; fromDescription?: string; force?: boolean },
    ) => {
      const json = program.optsWithGlobals().json;

      if (cmdOptions.prompt) {
        const result = await generatePrompt({ json });
        handleResult(result, json);
        return;
      }

      if (cmdOptions.fromDescription) {
        if (!packageDir) {
          const result: CliResult = {
            success: false,
            error: 'package-dir argument is required with --from-description',
            code: 1,
          };
          handleResult(result, json);
          return;
        }
        const result = await generateFromDescription(packageDir, cmdOptions.fromDescription, {
          json,
          force: cmdOptions.force,
        });
        handleResult(result, json);
        return;
      }

      const result: CliResult = {
        success: false,
        error: 'Specify --prompt or --from-description <text>',
        code: 1,
      };
      handleResult(result, json);
    },
  );

program
  .command('patch')
  .description('Apply a deterministic patch to an educational package')
  .argument('<package-dir>', 'Path to the educational package directory')
  .argument('<patch-file>', 'Path to the patch JSON file')
  .option('--dry-run', 'Show planned changes without modifying files')
  .action(async (packageDir: string, patchFile: string, cmdOptions: { dryRun?: boolean }) => {
    const json = program.optsWithGlobals().json;
    const result = await patchPackage(packageDir, patchFile, {
      json,
      dryRun: cmdOptions.dryRun,
    });
    handleResult(result, json);
  });

function handleResult(result: CliResult, json: boolean | undefined): void {
  if (json) {
    console.log(formatJsonResult(result));
  }
  process.exit(result.success ? 0 : result.code);
}

program.parse(process.argv);
