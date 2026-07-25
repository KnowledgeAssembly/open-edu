#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const VALID_STEPS = ['observe', 'guided_practice', 'independent_practice', 'mastery_check', 'positive_completion'];
const VALID_ACTIVITY_TYPES = ['reading', 'exercise', 'quiz', 'reflection', 'widget'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

/**
 * Validates a course-spec.json file structurally. If `compilerPath` is provided,
 * attempts to invoke the course-compiler for deeper validation.
 * @param {string} specPath - path to course-spec.json
 * @param {string} outputDir - directory for quality-report.json
 * @returns {ValidationResult}
 */
export function validateCourseSpec(specPath, outputDir) {
  /** @type {ValidationDiagnostic[]} */
  const errors = [];
  /** @type {ValidationDiagnostic[]} */
  const warnings = [];
  let data = null;
  let compilerAvailable = false;

  // Check file exists
  if (!existsSync(specPath)) {
    errors.push({
      severity: 'error',
      message: `File not found: ${specPath}`,
      code: 'FILE_NOT_FOUND',
    });
    writeReport(outputDir, false, errors, warnings, data, false);
    return { success: false, errors, warnings, data, compilerAvailable: false };
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
    writeReport(outputDir, false, errors, warnings, data, false);
    return { success: false, errors, warnings, data, compilerAvailable: false };
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
    activityCount: spec?.lessons?.reduce((sum, l) => sum + (l.activities?.length || 0), 0) || 0,
  };

  const success = errors.length === 0;

  writeReport(outputDir, success, errors, warnings, data, compilerAvailable);

  return { success, errors, warnings, data, compilerAvailable };
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
  if (meta.estimatedHours !== undefined && (typeof meta.estimatedHours !== 'number' || meta.estimatedHours < 0)) {
    errors.push({
      severity: 'error',
      message: 'metadata.estimatedHours must be a non-negative number',
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

    if (typeof lesson.id !== 'string' || lesson.id.trim().length === 0) {
      errors.push({ severity: 'error', message: `${prefix}.id is missing or empty`, code: 'MISSING_LESSON_ID' });
    }
    if (typeof lesson.title !== 'string' || lesson.title.trim().length === 0) {
      errors.push({ severity: 'error', message: `${prefix}.title is missing or empty`, code: 'MISSING_LESSON_TITLE' });
    }
    if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0) {
      warnings.push({
        severity: 'warning',
        message: `${prefix} has no objectives`,
        code: 'MISSING_OBJECTIVES',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    }
    if (typeof lesson.coreIdea !== 'string' || lesson.coreIdea.trim().length === 0) {
      warnings.push({
        severity: 'warning',
        message: `${prefix} has no coreIdea`,
        code: 'MISSING_CORE_IDEA',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    }
    if (!Array.isArray(lesson.activities) || lesson.activities.length === 0) {
      warnings.push({
        severity: 'warning',
        message: `${prefix} has no activities`,
        code: 'NO_ACTIVITIES',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    } else {
      checkActivities(lesson.activities, i, errors, warnings);
    }
    if (lesson.estimatedMinutes !== undefined && (typeof lesson.estimatedMinutes !== 'number' || lesson.estimatedMinutes < 0)) {
      warnings.push({
        severity: 'warning',
        message: `${prefix}.estimatedMinutes must be a non-negative number`,
        code: 'INVALID_ESTIMATED_MINUTES',
      });
    }
  }
}

function checkActivities(activities, lessonIndex, errors, warnings) {
  for (let j = 0; j < activities.length; j++) {
    const act = activities[j];
    const prefix = `lessons[${lessonIndex}].activities[${j}]`;

    if (!VALID_STEPS.includes(act.step)) {
      errors.push({
        severity: 'error',
        message: `${prefix}.step "${act.step}" is invalid. Must be one of: ${VALID_STEPS.join(', ')}`,
        code: 'INVALID_STEP',
      });
    }
    if (typeof act.order !== 'number') {
      errors.push({
        severity: 'error',
        message: `${prefix}.order must be a number`,
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
    if (act.type === 'quiz' && (!Array.isArray(act.questions) || act.questions.length === 0)) {
      errors.push({
        severity: 'error',
        message: `${prefix} is type "quiz" but has no questions`,
        code: 'EMPTY_QUIZ',
      });
    }
  }
}

function checkLessonIdUniqueness(spec, errors) {
  const lessons = spec?.lessons;
  if (!Array.isArray(lessons)) return;
  const seen = new Map();
  for (let i = 0; i < lessons.length; i++) {
    const id = lessons[i].id;
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

function writeReport(outputDir, success, errors, warnings, data, compilerAvailable) {
  const report = {
    success,
    timestamp: new Date().toISOString(),
    compilerAvailable,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    data,
  };
  const reportPath = join(outputDir, 'quality-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2];
  const outputDir = process.argv[3] || process.cwd();
  if (!specPath) {
    console.error('Usage: node validate-course-spec.mjs <course-spec.json> [output-dir]');
    process.exit(1);
  }
  const result = validateCourseSpec(specPath, outputDir);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}
