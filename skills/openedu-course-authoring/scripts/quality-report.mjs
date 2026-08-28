#!/usr/bin/env node
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { validateCourseSpec } from './validate-course-spec.mjs';
import { summarizeQuality } from './summarize-quality.mjs';
import { validateCompiledPackage } from './validate-package.mjs';

/**
 * Creates a merged quality report from validation, quality, and package phases.
 * This is the only module that should write quality-report.json during orchestration.
 *
 * @param {QualityReportInput} input
 * @returns {MergedReport}
 */
export function createQualityReport({
  specPath,
  outputDir,
  discovery,
  packageCommands,
  qualityOptions,
  cwd,
}) {
  /** @type {MergedPhase[]} */
  const phases = [];
  const errors = [];
  const warnings = [];
  const infos = [];

  const mode = discovery?.mode || 'portable';
  const capabilities = discovery?.capabilities
    ? flattenCapabilities(discovery.capabilities)
    : {};

  const artifacts = {
    specPath: specPath || null,
    outputDir: outputDir || null,
    qualityReport: null,
  };

  // Phase 1: Structural + compiler validation
  const validationOptions = { skipWrite: true };
  if (qualityOptions?.cmdArgv) {
    validationOptions.cmdArgv = qualityOptions.cmdArgv;
  }
  if (cwd) validationOptions.cwd = cwd;

  const validationResult = validateCourseSpec(specPath, outputDir, validationOptions);

  phases.push({
    name: 'validation',
    status: validationResult.success ? 'passed' : 'failed',
    errors: validationResult.errors?.map((e) => e.message) || [],
    warnings: validationResult.warnings?.map((w) => w.message) || [],
    validationMode: validationResult.validationMode,
    compilerAvailable: validationResult.compilerAvailable,
    commands: validationResult.commands || [],
    skippedReason: null,
  });

  // Phase 2: Package validation (compile + validate + lint)
  if (mode === 'repository' && qualityOptions?.packageValidate && packageCommands) {
    const pkgResult = validateCompiledPackage({
      specPath,
      outputDir,
      commands: packageCommands,
      cwd,
    });

    for (const phase of pkgResult.phases) {
      const cmdEvidence = pkgResult.commands.find((c) => c.phase === phase.name) || null;
      phases.push({
        name: `package-${phase.name}`,
        status: phase.status,
        errors: phase.errors,
        warnings: phase.warnings,
        validationMode: null,
        compilerAvailable: null,
        commands: cmdEvidence ? [cmdEvidence] : [],
        skippedReason: phase.skippedReason || null,
      });
    }
    artifacts.packageCommands = pkgResult.commands;
  } else if (mode === 'repository') {
    phases.push({
      name: 'package-compile',
      status: 'skipped',
      errors: [],
      warnings: [],
      validationMode: null,
      compilerAvailable: null,
      commands: [],
      skippedReason: 'cli-unavailable',
    });
    phases.push({
      name: 'package-validate',
      status: 'skipped',
      errors: [],
      warnings: [],
      validationMode: null,
      compilerAvailable: null,
      commands: [],
      skippedReason: 'cli-unavailable',
    });
    phases.push({
      name: 'package-lint',
      status: 'skipped',
      errors: [],
      warnings: [],
      validationMode: null,
      compilerAvailable: null,
      commands: [],
      skippedReason: 'cli-unavailable',
    });
  }

  // Phase 3: Quality rubric
  const findOpts = { ...qualityOptions, reportPath: false, mode };
  const qualityResult = summarizeQuality(outputDir, validationResult, findOpts);

  phases.push({
    name: 'quality',
    status: qualityResult.success ? 'passed' : 'failed',
    errors: [],
    warnings: [],
    validationMode: null,
    compilerAvailable: null,
    commands: [],
    skippedReason: null,
  });

  // Merge findings from quality
  for (const f of qualityResult.findings) {
    if (f.severity === 'error') errors.push(f);
    else if (f.severity === 'warning') warnings.push(f);
    else infos.push(f);
  }

  const overallSuccess = !phases.some((p) => p.status === 'failed');

  const report = {
    schemaVersion: 1,
    success: overallSuccess,
    mode,
    validationMode: validationResult.validationMode,
    capabilities,
    artifacts,
    phases,
    findings: { errors, warnings, infos },
    summary: {
      totalPhases: phases.length,
      passed: phases.filter((p) => p.status === 'passed').length,
      failed: phases.filter((p) => p.status === 'failed').length,
      skipped: phases.filter((p) => p.status === 'skipped').length,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalInfos: infos.length,
      learnerProfile: qualityResult.summary?.learnerProfile || null,
    },
    timestamp: new Date().toISOString(),
  };

  // Write the merged report
  if (outputDir) {
    const reportPath = join(outputDir, 'quality-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    artifacts.qualityReport = reportPath;
  }

  return report;
}

function flattenCapabilities(caps) {
  if (typeof caps === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(caps)) {
      if (typeof val === 'object' && val !== null && 'executable' in val) {
        result[key] = val.executable ? 'executable' : (val.packagePresent ? 'present-not-built' : 'absent');
      } else {
        result[key] = val;
      }
    }
    return result;
  }
  return caps;
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2];
  const outputDir = process.argv[3] || process.cwd();

  if (!specPath) {
    console.error('Usage: node quality-report.mjs <course-spec.json> [output-dir]');
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  const report = createQualityReport({
    specPath,
    outputDir,
    discovery: { mode: 'portable' },
    qualityOptions: {},
  });

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.success ? 0 : 1);
}

/**
 * @typedef {object} QualityReportInput
 * @property {string} specPath
 * @property {string} outputDir
 * @property {object} [discovery]
 * @property {{ mode?: string, capabilities?: object }} [discovery]
 * @property {{ compile?: string[], validate?: string[], lint?: string[] }} [packageCommands]
 * @property {object} [qualityOptions]
 * @property {string} [cwd]
 */

/**
 * @typedef {object} MergedPhase
 * @property {string} name
 * @property {'passed'|'failed'|'skipped'} status
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {string|null} validationMode
 * @property {boolean|null} compilerAvailable
 * @property {Record<string, unknown>[]} commands
 * @property {string|null} skippedReason
 */

/**
 * @typedef {object} MergedReport
 * @property {number} schemaVersion
 * @property {boolean} success
 * @property {string} mode
 * @property {string} validationMode
 * @property {Record<string, unknown>} capabilities
 * @property {Record<string, unknown>} artifacts
 * @property {MergedPhase[]} phases
 * @property {{ errors: object[], warnings: object[], infos: object[] }} findings
 * @property {object} summary
 * @property {string} timestamp
 */