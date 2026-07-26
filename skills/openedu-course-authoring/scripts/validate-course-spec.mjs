#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runOpenEduCommand } from './openedu-adapter.mjs';

const VALID_STEPS = ['observe', 'guided_practice', 'independent_practice', 'mastery_check', 'positive_completion'];
const VALID_ACTIVITY_TYPES = ['reading', 'exercise', 'quiz', 'reflection', 'widget'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

/**
 * Validates a course-spec.json file structurally and optionally via the course compiler.
 *
 * @param {string} specPath - path to course-spec.json
 * @param {string} outputDir - directory for quality-report.json
 * @param {ValidateOptions} [options]
 * @returns {ValidationResult}
 */
export function validateCourseSpec(specPath, outputDir, options = {}) {
  const opts = { ...options };
  const skipWrite = opts.skipWrite === true;

  /** @type {ValidationDiagnostic[]} */
  const errors = [];
  /** @type {ValidationDiagnostic[]} */
  const warnings = [];
  let data = null;
  let compilerAvailable = false;
  let compilerResult = null;
  let validationMode = 'structural-only';
  /** @type {Record<string, unknown>[]} */
  const commands = [];

  // Ensure output directory exists
  if (outputDir && !skipWrite) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Check file exists
  if (!specPath || !existsSync(specPath)) {
    errors.push({
      severity: 'error',
      message: `File not found: ${specPath || '(no path provided)'}`,
      code: 'FILE_NOT_FOUND',
    });
    if (!skipWrite) writeReport(outputDir, errors, warnings, data, commands, validationMode, compilerAvailable, compilerResult);
    return {
      success: false, errors, warnings, data, compilerAvailable, compilerResult,
      validationMode, commands,
    };
  }

  // Parse JSON
  let spec;
  try {
    const raw = readFileSync(specPath, 'utf-8');
    spec = JSON.parse(raw);
  } catch (err) {
    errors.push({
      severity: 'error',
      message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      code: 'JSON_PARSE_ERROR',
    });
    if (!skipWrite) writeReport(outputDir, errors, warnings, data, commands, validationMode, compilerAvailable, compilerResult);
    return {
      success: false, errors, warnings, data, compilerAvailable, compilerResult,
      validationMode, commands,
    };
  }

  // Structural checks
  checkTopLevel(spec, errors);
  checkMetadata(spec, errors, warnings);
  checkLessons(spec, errors, warnings);
  checkLessonIdUniqueness(spec, errors);

  data = {
    format: spec?.format,
    version: spec?.version,
    lessonCount: spec?.lessons?.length || 0,
    activityCount: spec?.lessons?.reduce((sum, l) => {
      if (!l || typeof l !== 'object') return sum;
      return sum + (Array.isArray(l.activities) ? l.activities.length : 0);
    }, 0) || 0,
  };

  // Compiler invocation via structured argv or facade function (for tests)
  if (opts.cmdArgv && Array.isArray(opts.cmdArgv)) {
    compilerAvailable = true;

    const argv = opts.cmdArgv.map((arg) => {
      if (arg === '{spec}') return specPath;
      if (arg === '{dir}') return outputDir;
      return arg;
    });

    compilerResult = runOpenEduCommand(argv, { cwd: opts.cwd });

    commands.push({
      phase: 'compile',
      name: 'edu compile',
      command: argv,
      status: compilerResult.status,
      stdout: compilerResult.stdout,
      stderr: compilerResult.stderr,
      durationMs: compilerResult.durationMs,
    });

    validationMode = 'compiler';

    if (compilerResult.status !== 0) {
      errors.push({
        severity: 'error',
        message: `Compiler exited with status ${compilerResult.status}`,
        code: 'COMPILER_FAILED',
        detail: compilerResult.stderr || compilerResult.stdout,
      });
    } else {
      warnings.push({
        severity: 'info',
        message: 'Compiler validation passed',
        code: 'COMPILER_PASSED',
      });
    }
  } else if (opts.facade && typeof opts.facade === 'function') {
    compilerAvailable = true;
    validationMode = 'compiler';

    try {
      compilerResult = opts.facade(specPath, outputDir);

      commands.push({
        phase: 'compile',
        name: 'edu compile (facade)',
        command: [],
        status: compilerResult.status,
        stdout: compilerResult.stdout || '',
        stderr: compilerResult.stderr || '',
        durationMs: compilerResult.durationMs || 0,
      });

      if (compilerResult.status !== 0) {
        errors.push({
          severity: 'error',
          message: `Compiler exited with status ${compilerResult.status}`,
          code: 'COMPILER_FAILED',
          detail: compilerResult.stderr || compilerResult.stdout,
        });
      }
    } catch (err) {
      errors.push({
        severity: 'error',
        message: `Compiler invocation error: ${err instanceof Error ? err.message : String(err)}`,
        code: 'COMPILER_ERROR',
      });
    }
  }

  const success = errors.length === 0;

  if (!skipWrite) writeReport(outputDir, errors, warnings, data, commands, validationMode, compilerAvailable, compilerResult);

  return {
    success, errors, warnings, data, compilerAvailable, compilerResult,
    validationMode, commands,
  };
}

function checkTopLevel(spec, errors) {
  if (!spec || typeof spec !== 'object') {
    errors.push({ severity: 'error', message: 'Spec is not an object', code: 'INVALID_TOP_LEVEL' });
    return;
  }
  if (spec.format !== 'openedu-course-spec') {
    errors.push({
      severity: 'error',
      message: `Invalid format: expected "openedu-course-spec", got "${spec.format}"`,
      code: 'INVALID_FORMAT',
    });
  }
  if (spec.version !== 1) {
    errors.push({
      severity: 'error',
      message: `Invalid version: expected 1, got ${spec.version}`,
      code: 'INVALID_VERSION',
    });
  }
  if (typeof spec.generatedAt !== 'string') {
    errors.push({
      severity: 'error',
      message: 'Missing or invalid generatedAt field',
      code: 'MISSING_GENERATED_AT',
    });
  }
}

function checkMetadata(spec, errors, warnings) {
  const meta = spec?.metadata;
  if (!meta || typeof meta !== 'object') {
    errors.push({ severity: 'error', message: 'Missing metadata object', code: 'MISSING_METADATA' });
    return;
  }
  if (typeof meta.title !== 'string' || meta.title.trim().length === 0) {
    errors.push({ severity: 'error', message: 'Missing or empty metadata.title', code: 'MISSING_TITLE' });
  }
  if (typeof meta.description !== 'string' || meta.description.trim().length === 0) {
    errors.push({ severity: 'error', message: 'Missing or empty metadata.description', code: 'MISSING_DESCRIPTION' });
  }
  if (meta.generated !== true) {
    warnings.push({
      severity: 'warning',
      message: 'metadata.generated should be true for LLM-generated specs',
      code: 'GENERATED_FALSE',
    });
  }
  if (meta.difficulty && !VALID_DIFFICULTIES.includes(meta.difficulty)) {
    errors.push({
      severity: 'error',
      message: `Invalid difficulty: "${meta.difficulty}". Must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
      code: 'INVALID_DIFFICULTY',
    });
  }
  if (meta.estimatedHours !== undefined && (typeof meta.estimatedHours !== 'number' || !Number.isFinite(meta.estimatedHours) || meta.estimatedHours < 0)) {
    errors.push({
      severity: 'error',
      message: 'metadata.estimatedHours must be a non-negative finite number',
      code: 'INVALID_ESTIMATED_HOURS',
    });
  }
}

function checkLessons(spec, errors, warnings) {
  const lessons = spec?.lessons;
  if (!Array.isArray(lessons)) {
    errors.push({ severity: 'error', message: 'Missing or invalid lessons array', code: 'MISSING_LESSONS' });
    return;
  }
  if (lessons.length === 0) {
    errors.push({ severity: 'error', message: 'lessons array is empty', code: 'EMPTY_LESSONS' });
    return;
  }

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const prefix = `lessons[${i}]`;

    if (lesson === null || typeof lesson !== 'object') {
      errors.push({ severity: 'error', message: `${prefix} is not an object`, code: 'INVALID_LESSON' });
      continue;
    }
    if (typeof lesson.id !== 'string' || lesson.id.trim().length === 0) {
      errors.push({ severity: 'error', message: `${prefix}.id is missing or empty`, code: 'MISSING_LESSON_ID' });
    }
    if (typeof lesson.title !== 'string' || lesson.title.trim().length === 0) {
      errors.push({ severity: 'error', message: `${prefix}.title is missing or empty`, code: 'MISSING_LESSON_TITLE' });
    }
    if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix} has no objectives`,
        code: 'MISSING_OBJECTIVES',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    }
    if (typeof lesson.coreIdea !== 'string' || lesson.coreIdea.trim().length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix} has no coreIdea`,
        code: 'MISSING_CORE_IDEA',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    }
    if (!Array.isArray(lesson.examples) || lesson.examples.length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix} has no examples`,
        code: 'MISSING_EXAMPLES',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    }
    if (!Array.isArray(lesson.misconceptions) || lesson.misconceptions.length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix} has no misconceptions`,
        code: 'MISSING_MISCONCEPTIONS',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    }
    if (!Array.isArray(lesson.activities) || lesson.activities.length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix} has no activities`,
        code: 'NO_ACTIVITIES',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    } else {
      checkActivities(lesson.activities, i, errors, warnings);
    }
    if (lesson.estimatedMinutes !== undefined) {
      if (typeof lesson.estimatedMinutes !== 'number' || !Number.isFinite(lesson.estimatedMinutes) || lesson.estimatedMinutes < 0) {
        errors.push({
          severity: 'error',
          message: `${prefix}.estimatedMinutes must be a non-negative finite number`,
          code: 'INVALID_ESTIMATED_MINUTES',
        });
      }
    }
  }
}

function checkActivities(activities, lessonIndex, errors, warnings) {
  for (let j = 0; j < activities.length; j++) {
    const act = activities[j];
    const prefix = `lessons[${lessonIndex}].activities[${j}]`;

    if (act === null || typeof act !== 'object') {
      errors.push({
        severity: 'error',
        message: `${prefix} is not an object`,
        code: 'INVALID_ACTIVITY',
      });
      continue;
    }

    if (!VALID_STEPS.includes(act.step)) {
      errors.push({
        severity: 'error',
        message: `${prefix}.step "${act.step}" is invalid. Must be one of: ${VALID_STEPS.join(', ')}`,
        code: 'INVALID_STEP',
      });
    }
    if (typeof act.order !== 'number' || !Number.isFinite(act.order)) {
      errors.push({
        severity: 'error',
        message: `${prefix}.order must be a finite number`,
        code: 'MISSING_ORDER',
      });
    }
    if (!VALID_ACTIVITY_TYPES.includes(act.type)) {
      errors.push({
        severity: 'error',
        message: `${prefix}.type "${act.type}" is invalid. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`,
        code: 'INVALID_ACTIVITY_TYPE',
      });
    }
    if (typeof act.description !== 'string' || act.description.trim().length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix}.description is missing or empty`,
        code: 'MISSING_ACTIVITY_DESCRIPTION',
      });
    }
    if (act.type === 'widget' && (!act.widgetId || typeof act.widgetId !== 'string' || act.widgetId.trim().length === 0)) {
      errors.push({
        severity: 'error',
        message: `${prefix} is type "widget" but has no widgetId`,
        code: 'MISSING_WIDGET_ID',
      });
    }
    if (act.type === 'quiz') {
      if (!Array.isArray(act.questions) || act.questions.length === 0) {
        errors.push({
          severity: 'error',
          message: `${prefix} is type "quiz" but has no questions`,
          code: 'EMPTY_QUIZ',
        });
      } else {
        for (let k = 0; k < act.questions.length; k++) {
          const q = act.questions[k];
          const qPrefix = `${prefix}.questions[${k}]`;
          if (q === null || typeof q !== 'object') {
            errors.push({ severity: 'error', message: `${qPrefix} is not an object`, code: 'INVALID_QUESTION' });
            continue;
          }
          if (!Array.isArray(q.options) || q.options.length !== 4) {
            errors.push({
              severity: 'error',
              message: `${qPrefix}.options must be an array of exactly 4`,
              code: 'INVALID_QUESTION_OPTIONS',
            });
          }
          if (typeof q.correctIndex !== 'number' || !Number.isFinite(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) {
            errors.push({
              severity: 'error',
              message: `${qPrefix}.correctIndex must be 0-3`,
              code: 'INVALID_CORRECT_INDEX',
            });
          }
        }
      }
    }
  }
}

function checkLessonIdUniqueness(spec, errors) {
  const lessons = spec?.lessons;
  if (!Array.isArray(lessons)) return;
  const seen = new Map();
  for (let i = 0; i < lessons.length; i++) {
    const id = lessons[i]?.id;
    if (!id) continue;
    if (seen.has(id)) {
      errors.push({
        severity: 'error',
        message: `Duplicate lesson ID "${id}" at index ${i} (first seen at index ${seen.get(id)})`,
        code: 'DUPLICATE_LESSON_ID',
      });
    } else {
      seen.set(id, i);
    }
  }
}

function writeReport(outputDir, errors, warnings, data, commands, validationMode, compilerAvailable, compilerResult) {
  const report = {
    success: errors.length === 0,
    timestamp: new Date().toISOString(),
    validationMode,
    compilerAvailable,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    data,
    commands,
    compilerOutput: compilerResult ? {
      status: compilerResult.status,
      stdout: compilerResult.stdout,
      stderr: compilerResult.stderr,
    } : null,
  };
  if (outputDir) {
    const reportPath = join(outputDir, 'quality-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2];
  const outputDir = process.argv[3] || process.cwd();
  if (!specPath) {
    console.error('Usage: node validate-course-spec.mjs <course-spec.json> [output-dir] [--compile <command>]');
    process.exit(1);
  }
  const compileIdx = process.argv.indexOf('--compile');
  const options = {};
  if (compileIdx !== -1 && process.argv[compileIdx + 1]) {
    options.cmdArgv = process.argv[compileIdx + 1].split(/\s+/);
  }
  const result = validateCourseSpec(specPath, outputDir, options);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

/**
 * @typedef {object} ValidateOptions
 * @property {string[]} [cmdArgv] - structured argv array for compiler invocation
 * @property {((specPath: string, outputDir: string) => { status: number, stdout: string, stderr: string, durationMs?: number })} [facade] - test-only compiler facade
 * @property {string} [cwd] - working directory for command execution
 * @property {boolean} [skipWrite] - skip writing quality-report.json (used during orchestration)
 */

/**
 * @typedef {object} ValidationDiagnostic
 * @property {'error'|'warning'|'info'} severity
 * @property {string} message
 * @property {string} [code]
 * @property {string} [detail]
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean} success
 * @property {ValidationDiagnostic[]} errors
 * @property {ValidationDiagnostic[]} warnings
 * @property {object|null} data
 * @property {boolean} compilerAvailable
 * @property {import('./openedu-adapter.mjs').CommandResult|null} compilerResult
 * @property {'structural-only'|'compiler'} validationMode
 * @property {Record<string, unknown>[]} commands
 */