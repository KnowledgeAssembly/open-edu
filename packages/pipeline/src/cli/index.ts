#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { LlmRouter } from '@open-edu/llm-config';
import { runPipelineV2 } from '../graph/index.js';
import type { PipelineResult } from '../graph/index.js';
import * as logger from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

config();
config({ path: join(__dirname, '..', '..', '..', '..', '.env') });

interface CLIOptions {
  pdf: string;
  level: string;
  subject: string;
  force: boolean;
  chapter?: number;
  llmProvider?: string;
  llmModel?: string;
  dryRun: boolean;
  resume: boolean;
  verbose: boolean;
  outputDir: string;
  maxRetries: number;
  format: 'md' | 'json' | 'both';
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    pdf: '',
    level: 'B',
    subject: 'math',
    force: false,
    dryRun: false,
    resume: false,
    verbose: false,
    outputDir: join(__dirname, '..', '..', '..', '..', 'output'),
    maxRetries: 3,
    format: 'both',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pdf':
        options.pdf = args[++i] || '';
        break;
      case '--level':
        options.level = args[++i] || 'B';
        break;
      case '--subject':
        options.subject = args[++i] || 'math';
        break;
      case '--force':
        options.force = true;
        break;
      case '--llm-provider':
        options.llmProvider = args[++i];
        break;
      case '--llm-model':
        options.llmModel = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--resume':
        options.resume = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--output-dir':
        options.outputDir = args[++i] || options.outputDir;
        break;
      case '--max-retries':
        options.maxRetries = parseInt(args[++i] || '3', 10);
        break;
      case '--chapter':
        options.chapter = parseInt(args[++i] || '0', 10);
        break;
      case '--format': {
        const formatVal = args[++i] || 'both';
        if (!['md', 'json', 'both'].includes(formatVal)) {
          console.error(`Invalid format: ${formatVal}. Use md, json, or both.`);
          process.exit(1);
        }
        options.format = formatVal as 'md' | 'json' | 'both';
        break;
      }
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
OpenEdu Pipeline — Curriculum Generator

Usage: pnpm --filter @open-edu/pipeline curriculum:generate [options]

Options:
  --pdf <path>          Path to the PDF file (required)
  --level <code>        Level code (default: B)
  --subject <name>      Subject name (default: math)
  --force               Overwrite existing output file
  --llm-provider <name> LLM provider override (default: from env)
  --llm-model <name>    LLM model override (default: from env)
  --interactive         Enable human-in-the-loop checkpoints
  --dry-run             Validate but don't write files
  --resume              Resume from intermediate artifacts when possible
  --verbose             Detailed logging per stage
  --output-dir <path>   Custom output directory (default: ./output)
  --max-retries <num>   Max retries per concept (default: 3)
  --chapter <num>       Process only a single chapter (e.g., --chapter 3)
  --format <type>       Output format: md, json, both (default: both)
  --help, -h            Show this help message

Examples:
  pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./math.pdf --level B --subject math
  pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./math.pdf --chapter 1 --verbose
`);
}

function validateArgs(options: CLIOptions): string[] {
  const errors: string[] = [];

  if (!options.pdf) {
    errors.push('Missing required option: --pdf <path>');
  } else if (!existsSync(options.pdf)) {
    errors.push(`PDF file not found: ${options.pdf}`);
  } else if (!options.pdf.toLowerCase().endsWith('.pdf')) {
    errors.push(`File is not a PDF: ${options.pdf}`);
  }

  if (!options.level.match(/^[a-zA-Z0-9]+$/)) {
    errors.push('Level must be alphanumeric (e.g., B, C)');
  }

  if (!options.subject.match(/^[a-z]+$/)) {
    errors.push('Subject must be lowercase letters (e.g., math, language)');
  }

  return errors;
}

export async function runPipelineCLI(): Promise<void> {
  const options = parseArgs();

  const cwd = process.env.INIT_CWD || process.cwd();
  if (options.pdf) options.pdf = resolve(cwd, options.pdf);
  options.outputDir = resolve(cwd, options.outputDir);

  logger.divider();
  logger.info('OpenEdu Pipeline — Curriculum Generator');
  logger.divider();
  logger.info(`PDF:      ${options.pdf || '(not specified)'}`);
  logger.info(`Level:    ${options.level}`);
  logger.info(`Subject:  ${options.subject.charAt(0).toUpperCase() + options.subject.slice(1)}`);
  logger.info(`Output:   ${options.outputDir}`);
  if (options.chapter) logger.info(`Chapter:  ${options.chapter} (single chapter mode)`);
  if (options.dryRun) logger.info('Mode:     Dry run (no files written)');

  const validationErrors = validateArgs(options);
  if (validationErrors.length > 0) {
    logger.error('Validation errors:');
    for (const err of validationErrors) {
      logger.error(`  ${err}`);
    }
    printHelp();
    process.exit(1);
  }

  logger.info('');

  let router: LlmRouter;
  try {
    const stageOverride = options.llmProvider
      ? { provider: options.llmProvider, model: options.llmModel || 'gpt-4o-mini' }
      : undefined;
    const stageCfg = stageOverride
      ? { provider: stageOverride.provider, model: stageOverride.model, maxTokens: 4096, temperature: 0.3 }
      : undefined;
    const overrideConfigs = stageCfg
      ? {
          source_inventory: stageCfg,
          concept_map: stageCfg,
          concept_enrichment: stageCfg,
          lesson_blueprint: stageCfg,
          asset_plan: stageCfg,
          activity_generation: stageCfg,
          review: stageCfg,
        }
      : undefined;
    router = new LlmRouter(overrideConfigs);
    logger.success('LLM router initialized');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to initialize LLM router: ${msg}`);
    process.exit(1);
  }

  try {
    const result: PipelineResult = await runPipelineV2(router, {
      pdfPath: options.pdf,
      levelCode: options.level.toUpperCase(),
      subject: options.subject,
      force: options.force,
      chapterFilter: options.chapter,
      outputDir: options.outputDir,
      verbose: options.verbose,
      dryRun: options.dryRun,
      resume: options.resume,
      maxRetries: options.maxRetries,
      format: options.format,
      widgetCategories: [],
    });

    const r = result.report;
    const durationSec = (r.durationMs / 1000).toFixed(1);

    logger.divider();
    logger.info(`Summary — ${r.status} (${durationSec}s)`);
    logger.divider();

    logger.reportTable([
      {
        label: 'Concepts',
        value: r.conceptCount,
        status: r.conceptCount > 0 ? 'ok' : 'fail',
      },
      {
        label: 'Math Validation',
        value: `${r.mathValidation.passed}/${r.mathValidation.totalChecked}`,
        status: r.mathValidation.failed === 0 ? 'ok' : 'fail',
      },
      {
        label: 'Widget Validation',
        value: `${r.widgetValidation.passed}/${r.widgetValidation.totalChecked}`,
        status: r.widgetValidation.failed === 0 ? 'ok' : 'fail',
      },
      {
        label: 'Assets Generated',
        value: r.assetCount,
        status: r.assetCount > 0 ? 'ok' : 'fail',
      },
      {
        label: 'Dependency Cycles',
        value: r.hasCycles ? 'yes' : 'no',
        status: r.hasCycles ? 'fail' : 'ok',
      },
    ]);

    if (r.reviewItems.length > 0) {
      logger.warn(`\nReview items (${r.reviewItems.length}):`);
      for (const item of r.reviewItems.slice(0, 10)) {
        logger.warn(`  • ${item}`);
      }
      if (r.reviewItems.length > 10) {
        logger.warn(`  ... and ${r.reviewItems.length - 10} more`);
      }
    }

    process.exit(r.status === 'complete' ? 0 : 1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pipeline failed: ${msg}`);
    process.exit(1);
  }
}

runPipelineCLI();
