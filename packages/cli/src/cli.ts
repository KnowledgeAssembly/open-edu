#!/usr/bin/env node
import { Command } from 'commander';
import { validatePackage } from './commands/validate.js';
import { devPackage } from './commands/dev.js';
import { buildPackage } from './commands/build.js';
import { packagePackage } from './commands/package.js';
import { CLI_VERSION } from './index.js';

const program = new Command();

program.name('edu').description('Open-Edu educational package toolkit').version(CLI_VERSION);

program
  .command('validate')
  .description('Validate an educational package')
  .argument('<package-dir>', 'Path to the educational package directory')
  .action(async (packageDir: string) => {
    const code = await validatePackage(packageDir);
    process.exit(code);
  });

program
  .command('dev')
  .description('Start the dev server for an educational package')
  .argument('<package-dir>', 'Path to the educational package directory')
  .action(async (packageDir: string) => {
    const code = await devPackage(packageDir);
    process.exit(code);
  });

program
  .command('build')
  .description('Build an educational package for distribution')
  .argument('<package-dir>', 'Path to the educational package directory')
  .option('--out-dir <path>', 'Output directory')
  .action(async (packageDir: string, options: { outDir?: string }) => {
    const code = await buildPackage(packageDir, options.outDir);
    process.exit(code);
  });

program
  .command('package')
  .description('Create a distributable archive of an educational package')
  .argument('<package-dir>', 'Path to the educational package directory')
  .option('--output <path>', 'Output directory for the archive')
  .action(async (packageDir: string, options: { output?: string }) => {
    const code = await packagePackage(packageDir, options.output);
    process.exit(code);
  });

program.parse(process.argv);
