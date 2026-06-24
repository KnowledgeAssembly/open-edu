#!/usr/bin/env node
import { Command } from 'commander';
import { validatePackage } from './commands/validate.js';
import { devPackage } from './commands/dev.js';
import { buildPackage } from './commands/build.js';
import { packagePackage } from './commands/package.js';
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
  .action(async (packageDir: string) => {
    const json = program.optsWithGlobals().json;
    const result = await validatePackage(packageDir, { json });
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

function handleResult(result: CliResult, json: boolean | undefined): void {
  if (json) {
    console.log(formatJsonResult(result));
  }
  process.exit(result.success ? 0 : result.code);
}

program.parse(process.argv);
