#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runOpenEduCommand } from './openedu-adapter.mjs';

/**
 * Validates a compiled Open-Edu package by running compile, validate, and lint commands
 * in sequence. Each phase is skipped if the prerequisite command is missing.
 *
 * @param {ValidatePackageInput} input
 * @returns {PackageValidationResult}
 */
export function validateCompiledPackage({ specPath, outputDir, commands, cwd } = {}) {
  /** @type {PackagePhase[]} */
  const phases = [];
  /** @type {Record<string, unknown>[]} */
  const commandResults = [];
  let overallSuccess = true;

  if (!specPath) {
    return {
      success: false,
      phases: [{
        name: 'validate',
        status: 'skipped',
        skippedReason: 'no-spec-path',
        errors: ['No spec path provided'],
        warnings: [],
      }],
      commands: [],
    };
  }

  // Phase 1: Compile
  if (!commands?.compile) {
    phases.push({
      name: 'compile',
      status: 'skipped',
      skippedReason: 'command-unavailable',
      errors: [],
      warnings: [],
    });
    overallSuccess = false;
  } else {
    const compileCmd = resolvePlaceholders(commands.compile, specPath, outputDir);
    const result = runOpenEduCommand(compileCmd, { cwd });

    commandResults.push({
      phase: 'compile',
      name: 'edu compile',
      command: compileCmd,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
    });

    if (result.status !== 0) {
      phases.push({
        name: 'compile',
        status: 'failed',
        errors: ['Compiler exited with non-zero status'],
        warnings: [],
        stdout: result.stdout,
        stderr: result.stderr,
      });
      overallSuccess = false;
      return { success: false, phases, commands: commandResults };
    }

    phases.push({
      name: 'compile',
      status: 'passed',
      errors: [],
      warnings: [],
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  // Phase 2: Package validation
  if (!commands?.validate) {
    phases.push({
      name: 'validate-package',
      status: 'skipped',
      skippedReason: 'command-unavailable',
      errors: [],
      warnings: [],
    });
  } else {
    const validateCmd = resolvePlaceholders(commands.validate, specPath, outputDir);
    const result = runOpenEduCommand(validateCmd, { cwd });

    commandResults.push({
      phase: 'validate-package',
      name: 'edu validate',
      command: validateCmd,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
    });

    if (result.status !== 0) {
      phases.push({
        name: 'validate-package',
        status: 'failed',
        errors: ['Package validation failed'],
        warnings: [],
        stdout: result.stdout,
        stderr: result.stderr,
      });
      overallSuccess = false;
    } else {
      phases.push({
        name: 'validate-package',
        status: 'passed',
        errors: [],
        warnings: [],
        stdout: result.stdout,
        stderr: result.stderr,
      });
    }
  }

  // Phase 3: Lint
  if (!commands?.lint) {
    phases.push({
      name: 'lint',
      status: 'skipped',
      skippedReason: 'command-unavailable',
      errors: [],
      warnings: [],
    });
  } else {
    const lintCmd = resolvePlaceholders(commands.lint, specPath, outputDir);
    const result = runOpenEduCommand(lintCmd, { cwd });

    commandResults.push({
      phase: 'lint',
      name: 'edu lint',
      command: lintCmd,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
    });

    const lintWarnings = [];
    if (result.status !== 0) {
      lintWarnings.push('Lint found issues');
    }

    phases.push({
      name: 'lint',
      status: result.status === 0 ? 'passed' : 'failed',
      errors: result.status !== 0 ? ['Lint reported errors'] : [],
      warnings: lintWarnings,
      stdout: result.stdout,
      stderr: result.stderr,
    });

    if (result.status !== 0) {
      overallSuccess = false;
    }
  }

  // Check package manifest
  const searchDirs = outputDir
    ? [outputDir, join(outputDir, 'package')]
    : [join(specPath, '..', 'package')];

  let hasManifest = false;
  for (const d of searchDirs) {
    if (existsSync(join(d, 'package.json')) || existsSync(join(d, 'bundle.json'))) {
      hasManifest = true;
      break;
    }
  }

  if (!hasManifest && phases.some((p) => p.name === 'compile' && p.status === 'passed')) {
    phases.push({
      name: 'manifest-check',
      status: 'failed',
      errors: ['No package.json or bundle.json found in output directory after compilation'],
      warnings: [],
    });
    overallSuccess = false;
  }

  return { success: overallSuccess, phases, commands: commandResults };
}

function resolvePlaceholders(argv, specPath, outputDir) {
  return argv.map((arg) => {
    let resolved = arg;
    if (resolved.includes('{spec}') && specPath) resolved = resolved.replace(/\{spec\}/g, specPath);
    if (resolved.includes('{dir}') && outputDir) resolved = resolved.replace(/\{dir\}/g, outputDir);
    return resolved;
  });
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2];
  const outputDir = process.argv[3];
  if (!specPath || !outputDir) {
    console.error('Usage: node validate-package.mjs <course-spec.json> <output-dir>');
    process.exit(1);
  }
  const result = validateCompiledPackage({ specPath, outputDir, commands: {}, cwd: process.cwd() });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

/**
 * @typedef {object} ValidatePackageInput
 * @property {string} specPath
 * @property {string} outputDir
 * @property {{ compile?: string[], validate?: string[], lint?: string[] }} [commands]
 * @property {string} [cwd]
 */

/**
 * @typedef {object} PackagePhase
 * @property {string} name
 * @property {'passed'|'failed'|'skipped'} status
 * @property {string} [skippedReason]
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {string} [stdout]
 * @property {string} [stderr]
 */

/**
 * @typedef {object} PackageValidationResult
 * @property {boolean} success
 * @property {PackagePhase[]} phases
 * @property {Record<string, unknown>[]} commands
 */