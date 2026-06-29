import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { Command } from 'commander';
import { parseCourseSpec } from '../parser/index.js';
import { validateCourseModel } from '../validators/index.js';
import { generatePackage } from '../generators/index.js';
import { loadPackage, loadBundle } from '@open-edu/core';
import type { CompilerDiagnostic } from '../schemas/index.js';

export interface CompileOptions {
  output?: string;
  watch?: boolean;
  verbose?: boolean;
  validate?: boolean;
  format?: string;
}

export interface CompileResult {
  success: boolean;
  diagnostics: CompilerDiagnostic[];
  outputPath?: string;
}

export async function compile(specPath: string, options: CompileOptions): Promise<CompileResult> {
  const resolvedPath = resolve(specPath);
  const diagnostics: CompilerDiagnostic[] = [];

  let content: string;
  try {
    content = await readFile(resolvedPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      diagnostics: [
        { severity: 'error', message: `Cannot read file: ${message}`, code: 'FILE_READ_ERROR' },
      ],
    };
  }

  const parsed = parseCourseSpec(content);
  diagnostics.push(...parsed.diagnostics);

  if (!parsed.model) {
    return { success: false, diagnostics };
  }

  const validationDiags = validateCourseModel(parsed.model);
  diagnostics.push(...validationDiags);

  const hasErrors = diagnostics.some((d) => d.severity === 'error');
  if (hasErrors && options.validate === true) {
    return { success: false, diagnostics };
  }

  const outputDir = options.output
    ? resolve(options.output)
    : resolve(relative(process.cwd(), './out'));

  const genResult = await generatePackage(parsed.model, outputDir, { verbose: options.verbose });
  diagnostics.push(...genResult.diagnostics);

  // Validate generated output with @open-edu/core (only when --validate is passed)
  if (options.validate === true) {
    try {
      if (parsed.model.modules.length === 1) {
        await loadPackage(outputDir);
      } else {
        await loadBundle(outputDir);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      diagnostics.push({
        severity: 'error',
        message: `Generated package validation failed: ${message}`,
        code: 'OUTPUT_VALIDATION_ERROR',
      });
    }
  }

  const finalErrors = diagnostics.filter((d) => d.severity === 'error');
  return {
    success: finalErrors.length === 0,
    diagnostics,
    outputPath: genResult.outputPath,
  };
}

export function createCompileCommand(): Command {
  return new Command('compile')
    .description('Compile a course-spec.md into an OpenEdu educational package')
    .argument('<file>', 'Path to course-spec.md')
    .option('-o, --output <dir>', 'Output directory', './out')
    .option('-w, --watch', 'Watch mode — recompile on file changes', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('--validate', 'Validate output against @open-edu/core schemas', false)
    .option('-f, --format <format>', 'Output format', 'package')
    .action(async (file: string, cmdOptions: Record<string, unknown>) => {
      const options: CompileOptions = {
        output: cmdOptions.output as string | undefined,
        watch: cmdOptions.watch as boolean,
        verbose: cmdOptions.verbose as boolean,
        validate: cmdOptions.validate as boolean,
        format: cmdOptions.format as string | undefined,
      };

      console.log(`Compiling ${file}...`);
      const result = await compile(file, options);

      printDiagnostics(result.diagnostics, options.verbose ?? false);

      if (result.outputPath) {
        console.log(`\nOutput written to: ${result.outputPath}`);
      }

      process.exit(result.success ? 0 : 1);
    });
}

export function printDiagnostics(diagnostics: CompilerDiagnostic[], verbose: boolean): void {
  const groups: {
    error: CompilerDiagnostic[];
    warning: CompilerDiagnostic[];
    info: CompilerDiagnostic[];
  } = {
    error: [],
    warning: [],
    info: [],
  };

  for (const d of diagnostics) {
    groups[d.severity].push(d);
  }

  if (groups.error.length > 0) {
    console.error(`\n\x1b[31mErrors (${groups.error.length}):\x1b[0m`);
    for (const d of groups.error) {
      printDiagnostic(d, verbose);
    }
  }

  if (groups.warning.length > 0) {
    console.error(`\n\x1b[33mWarnings (${groups.warning.length}):\x1b[0m`);
    for (const d of groups.warning) {
      printDiagnostic(d, verbose);
    }
  }

  if (verbose && groups.info.length > 0) {
    console.error(`\n\x1b[36mInfo (${groups.info.length}):\x1b[0m`);
    for (const d of groups.info) {
      printDiagnostic(d, verbose);
    }
  }
}

function printDiagnostic(d: CompilerDiagnostic, _verbose: boolean): void {
  const location = d.location ? ` [${d.location.file ?? ''}:${d.location.line}]` : '';
  const code = d.code ? ` [${d.code}]` : '';
  console.error(`  ${d.message}${code}${location}`);
  if (d.hint) {
    console.error(`    \x1b[2mHint: ${d.hint}\x1b[0m`);
  }
}
