#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createLlmProvider } from '@open-edu/llm-config';
import { runPipeline } from '../graph/index.js';
import type { PipelineReport } from '../graph/index.js';
import * as logger from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

config();
config({ path: join(__dirname, '..', '..', '..', '..', '.env') });

const LEVEL_A_CONCEPT_IDS: string[] = [];

interface CLIOptions {
  pdf: string;
  level: string;
  subject: string;
  force: boolean;
  chapter?: number;
  llmProvider?: string;
  llmModel?: string;
  interactive: boolean;
  dryRun: boolean;
  verbose: boolean;
  outputDir: string;
  maxRetries: number;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    pdf: '',
    level: 'B',
    subject: 'math',
    force: false,
    interactive: false,
    dryRun: false,
    verbose: false,
    outputDir: join(__dirname, '..', '..', '..', '..', 'output'),
    maxRetries: 3,
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
      case '--interactive':
        options.interactive = true;
        break;
      case '--dry-run':
        options.dryRun = true;
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
  --verbose             Detailed logging per stage
  --output-dir <path>   Custom output directory (default: ./output)
  --max-retries <num>   Max retries per concept (default: 3)
  --chapter <num>       Process only a single chapter (e.g., --chapter 3)
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

  let llm;
  try {
    llm = createLlmProvider(
      options.llmProvider
        ? {
            provider: options.llmProvider,
            model: options.llmModel || 'gpt-4o-mini',
            apiKey: process.env.OPENAI_API_KEY || '',
            maxTokens: 4096,
            temperature: 0.3,
          }
        : undefined,
    );
    logger.success('LLM provider initialized');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to initialize LLM provider: ${msg}`);
    process.exit(1);
  }

  try {
    const report: PipelineReport = await runPipeline(llm, {
      pdfPath: options.pdf,
      levelCode: options.level.toUpperCase(),
      subject: options.subject,
      force: options.force,
      chapterFilter: options.chapter,
      outputDir: options.outputDir,
      llmProvider: options.llmProvider || process.env.LLM_PROVIDER || 'openai',
      llmModel: options.llmModel || process.env.LLM_MODEL || 'gpt-4o-mini',
      interactive: options.interactive,
      dryRun: options.dryRun,
      verbose: options.verbose,
      maxRetries: options.maxRetries,
      levelAConceptIds: LEVEL_A_CONCEPT_IDS,
    });

    logger.divider();
    logger.info('Summary');
    logger.divider();

    logger.reportTable([
      {
        label: 'Chapters Processed',
        value: report.chaptersProcessed,
        status: report.chaptersProcessed > 0 ? 'ok' : 'fail',
      },
      {
        label: 'Concepts Generated',
        value: report.conceptsGenerated,
        status: report.conceptsGenerated > 0 ? 'ok' : 'fail',
      },
      {
        label: 'Activities Generated',
        value: report.activitiesGenerated,
        status: report.activitiesGenerated > 0 ? 'ok' : 'fail',
      },
      {
        label: 'Course Spec Written',
        value: report.filesWritten,
        status: report.status !== 'failed' ? 'ok' : 'fail',
      },
      {
        label: 'Validation Errors',
        value: report.validationErrors,
        status: report.validationErrors === 0 ? 'ok' : 'fail',
      },
      { label: 'Retries Needed', value: report.retriesNeeded, status: 'warn' },
      {
        label: 'Failed Concepts',
        value: report.failedConcepts,
        status: report.failedConcepts === 0 ? 'ok' : 'fail',
      },
    ]);

    const durationSec = (report.duration / 1000).toFixed(1);
    logger.info(`Done in ${durationSec}s`);

    if (report.errors.length > 0) {
      logger.error(`\nErrors (${report.errors.length}):`);
      for (const err of report.errors) {
        logger.error(`  • ${err}`);
      }
    }

    if (report.warnings.length > 0) {
      logger.warn(`\nWarnings (${report.warnings.length}):`);
      for (const w of report.warnings.slice(0, 10)) {
        logger.warn(`  • ${w}`);
      }
      if (report.warnings.length > 10) {
        logger.warn(`  ... and ${report.warnings.length - 10} more`);
      }
    }

    process.exit(report.status === 'complete' ? 0 : 1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pipeline failed: ${msg}`);
    process.exit(1);
  }
}

runPipelineCLI();
