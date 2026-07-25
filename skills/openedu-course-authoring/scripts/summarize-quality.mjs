#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const canonicalWidgetIds = new Set([
  'core.matching', 'core.multiple-choice', 'core.visual-counting', 'core.drag-drop',
  'core.sequencing', 'core.fill-blank', 'core.story-question', 'core.real-world',
  'core.chart-reader', 'core.callout', 'core.image-compare', 'core.hotspot',
  'core.timeline', 'core.audio-player', 'core.video-player',
  'math.fraction-visual', 'math.place-value-chart', 'math.grid-area',
  'math.clock-time', 'math.measurement-scale', 'math.number-line',
  'science.label-diagram', 'science.image-label', 'science.process-diagram',
  'language.flashcard', 'social.map',
]);

const deprecatedWidgetIds = new Set([
  'open-edu.multiple-choice-practice',
]);

const legacyToCanonical = {
  'open-edu.matching': 'core.matching',
  'open-edu.multiple-choice': 'core.multiple-choice',
  'open-edu.visual-counting': 'core.visual-counting',
  'open-edu.drag-drop': 'core.drag-drop',
  'open-edu.sequencing': 'core.sequencing',
  'open-edu.fill-blank': 'core.fill-blank',
  'open-edu.story-question': 'core.story-question',
  'open-edu.real-world': 'core.real-world',
  'open-edu.fraction-visual': 'math.fraction-visual',
  'open-edu.place-value-chart': 'math.place-value-chart',
  'open-edu.grid-area': 'math.grid-area',
  'open-edu.chart-reader': 'core.chart-reader',
  'open-edu.clock-time': 'math.clock-time',
  'open-edu.measurement-scale': 'math.measurement-scale',
};

const nonMeasurableVerbs = [
  'understand', 'know', 'learn', 'appreciate', 'be familiar', 'grasp',
  'realize', 'believe', 'think about', 'feel', 'perceive',
];

/**
 * Combines validation diagnostics with a lesson blueprint to produce a quality report.
 * @param {string} outputDir - directory containing blueprint and report artifacts
 * @param {object} validationResult - result from validateCourseSpec
 * @param {string|null} catalogPath - path to widget-catalog-data.json (or null)
 * @returns {QualityResult}
 */
export function summarizeQuality(outputDir, validationResult, catalogPath) {
  /** @type {QualityFinding[]} */
  const findings = [];

  // Load blueprint
  let blueprint = [];
  const blueprintPath = join(outputDir, 'lesson-blueprints.json');
  if (existsSync(blueprintPath)) {
    try {
      blueprint = JSON.parse(readFileSync(blueprintPath, 'utf-8'));
    } catch {
      findings.push({
        checkId: 'QC-COM-02',
        severity: 'warning',
        message: 'lesson-blueprints.json could not be parsed',
      });
    }
  }

  // Merge validation errors/warnings
  if (validationResult?.errors) {
    for (const e of validationResult.errors) {
      findings.push({
        checkId: 'QC-COM-01',
        severity: 'error',
        message: e.message,
      });
    }
  }
  if (validationResult?.warnings) {
    for (const w of validationResult.warnings) {
      findings.push({
        checkId: 'QC-COM-03',
        severity: 'warning',
        message: w.message,
      });
    }
  }

  // Check each lesson in blueprint
  let totalObjectives = 0;
  let totalActivities = 0;
  let totalMinutes = 0;
  let widgetsUsed = 0;

  for (const lesson of blueprint) {
    const lessonObj = lesson.objectives || [];
    const activities = lesson.activityPlan || [];
    const lessonId = lesson.id || 'unknown';
    totalObjectives += lessonObj.length;
    totalActivities += activities.length;
    totalMinutes += lesson.estimatedMinutes || 0;

    // QC-OBJ-01: Every objective covered by at least one activity
    if (lessonObj.length > 0 && activities.length === 0) {
      findings.push({
        checkId: 'QC-OBJ-01',
        severity: 'error',
        message: `Lesson "${lessonId}" has ${lessonObj.length} objective(s) but no activities`,
      });
    }

    // QC-OBJ-03: No lesson > 6 objectives
    if (lessonObj.length > 6) {
      findings.push({
        checkId: 'QC-OBJ-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" has ${lessonObj.length} objectives (max recommended: 6)`,
      });
    }

    // QC-OBJ-04: Measurable action verbs
    for (const obj of lessonObj) {
      const lower = obj.toLowerCase();
      for (const verb of nonMeasurableVerbs) {
        if (lower.startsWith(verb)) {
          findings.push({
            checkId: 'QC-OBJ-04',
            severity: 'warning',
            message: `Objective "${obj}" in lesson "${lessonId}" uses non-measurable verb "${verb}"`,
          });
          break;
        }
      }
    }

    // QC-ASM-02: Mastery check or quiz present
    if (activities.length > 0) {
      const hasAssessment = activities.some(
        (a) => a.step === 'mastery_check' || a.type === 'quiz',
      );
      if (!hasAssessment) {
        findings.push({
          checkId: 'QC-ASM-02',
          severity: 'warning',
          message: `Lesson "${lessonId}" has activities but no mastery_check or quiz`,
        });
      }
    }

    // QC-DUR-02: No single lesson > 45 min
    if (lesson.estimatedMinutes && lesson.estimatedMinutes > 45) {
      findings.push({
        checkId: 'QC-DUR-02',
        severity: 'warning',
        message: `Lesson "${lessonId}" is ${lesson.estimatedMinutes} min (max recommended: 45)`,
      });
    }

    // QC-DUR-03: No lesson < 5 min unless intentional
    if (lesson.estimatedMinutes !== undefined && lesson.estimatedMinutes < 5) {
      findings.push({
        checkId: 'QC-DUR-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" is only ${lesson.estimatedMinutes} min`,
      });
    }

    // QC-PROG-02: Sequential order
    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      if (act.order !== undefined && act.order !== i + 1) {
        findings.push({
          checkId: 'QC-PROG-02',
          severity: 'warning',
          message: `Lesson "${lessonId}" activity ${i} has order ${act.order} (expected ${i + 1})`,
        });
        break;
      }
    }

    // Check widget activities
    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      if (act.type !== 'widget' || !act.widgetId) continue;
      widgetsUsed++;

      // QC-WDG-01: Canonical ID
      if (!canonicalWidgetIds.has(act.widgetId)) {
        const canonical = legacyToCanonical[act.widgetId];
        findings.push({
          checkId: 'QC-WDG-01',
          severity: 'error',
          message: `Widget "${act.widgetId}" in lesson "${lessonId}" is not a canonical ID${canonical ? ` (use "${canonical}" instead)` : ''}`,
        });
      }

      // QC-WDG-02: Not deprecated
      if (deprecatedWidgetIds.has(act.widgetId)) {
        findings.push({
          checkId: 'QC-WDG-02',
          severity: 'error',
          message: `Widget "${act.widgetId}" in lesson "${lessonId}" is deprecated (use "core.multiple-choice" instead)`,
        });
      }
    }

    // QC-COM-03: coreIdea, examples, misconceptions
    if (!lesson.coreIdea || lesson.coreIdea.trim().length === 0) {
      findings.push({
        checkId: 'QC-COM-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" is missing coreIdea`,
      });
    }
    if (!Array.isArray(lesson.examples) || lesson.examples.length === 0) {
      findings.push({
        checkId: 'QC-COM-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" is missing examples`,
      });
    }
    if (!Array.isArray(lesson.misconceptions) || lesson.misconceptions.length === 0) {
      findings.push({
        checkId: 'QC-COM-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" is missing misconceptions`,
      });
    }
  }

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  const report = {
    success: errorCount === 0,
    timestamp: new Date().toISOString(),
    summary: {
      lessons: blueprint.length || (validationResult?.data?.lessonCount || 0),
      objectives: totalObjectives,
      activities: totalActivities || (validationResult?.data?.activityCount || 0),
      widgetsUsed,
      totalEstimatedMinutes: totalMinutes,
      errors: errorCount,
      warnings: warningCount,
      infos: infoCount,
    },
    findings,
  };

  writeFileSync(join(outputDir, 'quality-report.json'), JSON.stringify(report, null, 2));

  return report;
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const outputDir = process.argv[2] || process.cwd();
  let validationResult = null;
  const vrPath = join(outputDir, 'quality-report.json');
  if (existsSync(vrPath)) {
    try {
      validationResult = JSON.parse(readFileSync(vrPath, 'utf-8'));
    } catch { /* ignore */ }
  }
  const result = summarizeQuality(outputDir, validationResult || { errors: [], warnings: [], data: null }, null);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}
