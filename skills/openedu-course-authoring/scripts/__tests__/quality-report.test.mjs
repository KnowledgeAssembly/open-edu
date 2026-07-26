import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createQualityReport } from '../quality-report.mjs';

function createTempDir() {
  const base = join(tmpdir(), `qr-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

function writeJSON(dir, filename, obj) {
  writeFileSync(join(dir, filename), JSON.stringify(obj, null, 2));
}

function makeValidSpec() {
  return {
    format: 'openedu-course-spec',
    version: 1,
    generatedAt: new Date().toISOString(),
    metadata: {
      title: 'Test Course',
      description: 'A test course',
      author: 'Test Author',
      difficulty: 'beginner',
      estimatedHours: 1,
      generated: true,
    },
    lessons: [
      {
        id: 'lesson-01',
        title: 'Lesson One',
        objectives: ['Learn something'],
        coreIdea: 'The main concept',
        examples: ['Example 1'],
        misconceptions: ['Misconception 1'],
        estimatedMinutes: 15,
        activities: [
          { step: 'observe', order: 1, type: 'reading', description: 'Read the introduction' },
          { step: 'guided_practice', order: 2, type: 'exercise', description: 'Try this' },
          { step: 'mastery_check', order: 3, type: 'quiz', description: 'Quiz' },
        ],
      },
    ],
  };
}

describe('quality-report', () => {
  it('creates a merged report with schemaVersion', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify([{
        id: 'lesson-01', title: 'L1', objectives: ['obj1'],
        coreIdea: 'idea', examples: ['ex'], misconceptions: ['mc'],
        activityPlan: [{ type: 'reading', step: 'observe', order: 1, description: 'Read' }],
        estimatedMinutes: 15,
      }]));
      const report = createQualityReport({
        specPath: join(dir, 'course-spec.json'),
        outputDir: dir,
        discovery: { mode: 'portable' },
      });
      strictEqual(report.schemaVersion, 1);
      strictEqual(report.mode, 'portable');
      strictEqual(report.validationMode, 'structural-only');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('retains structural diagnostics in the report', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', { format: 'invalid', version: 2 });
      const report = createQualityReport({
        specPath: join(dir, 'course-spec.json'),
        outputDir: dir,
        discovery: { mode: 'portable' },
      });
      ok(report.findings.errors.length > 0);
      const validationPhase = report.phases.find((p) => p.name === 'validation');
      strictEqual(validationPhase.status, 'failed');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('retains quality findings in the report', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify([{
        id: 'lesson-01', title: 'L1', objectives: [],
        coreIdea: 'idea', examples: ['ex'], misconceptions: ['mc'],
        activityPlan: [{ type: 'reading', step: 'observe', order: 1, description: 'Read' }],
        estimatedMinutes: 15,
      }]));
      const report = createQualityReport({
        specPath: join(dir, 'course-spec.json'),
        outputDir: dir,
        discovery: { mode: 'portable' },
      });
      ok(report.findings.errors.some((f) => f.checkId === 'QC-COM-01'),
       'validation errors should appear as QC-COM-01 in findings');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes quality-report.json', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify([{
        id: 'lesson-01', title: 'L1', objectives: ['obj1'],
        coreIdea: 'idea', examples: ['ex'], misconceptions: ['mc'],
        activityPlan: [{ type: 'reading', step: 'observe', order: 1, description: 'Read' }],
        estimatedMinutes: 15,
      }]));
      createQualityReport({
        specPath: join(dir, 'course-spec.json'),
        outputDir: dir,
        discovery: { mode: 'portable' },
      });
      ok(existsSync(join(dir, 'quality-report.json')));
      const written = JSON.parse(readFileSync(join(dir, 'quality-report.json'), 'utf-8'));
      strictEqual(written.schemaVersion, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('success is false when any error phase exists', () => {
    const dir = createTempDir();
    try {
      const report = createQualityReport({
        specPath: join(dir, 'nonexistent.json'),
        outputDir: dir,
        discovery: { mode: 'portable' },
      });
      strictEqual(report.success, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips package phases in portable mode', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const report = createQualityReport({
        specPath: join(dir, 'course-spec.json'),
        outputDir: dir,
        discovery: { mode: 'portable' },
      });
      const compilePhase = report.phases.find((p) => p.name === 'package-compile');
      strictEqual(compilePhase, undefined, 'portable mode should not have package-compile');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('includes package phases in repository mode with cli-unavailable', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const report = createQualityReport({
        specPath: join(dir, 'course-spec.json'),
        outputDir: dir,
        discovery: { mode: 'repository' },
      });
      const compilePhase = report.phases.find((p) => p.name === 'package-compile');
      ok(compilePhase);
      strictEqual(compilePhase.status, 'skipped');
      strictEqual(compilePhase.skippedReason, 'cli-unavailable');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports summary with phase counts', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const report = createQualityReport({
        specPath: join(dir, 'course-spec.json'),
        outputDir: dir,
        discovery: { mode: 'portable' },
      });
      ok(typeof report.summary.totalPhases === 'number');
      ok(typeof report.summary.passed === 'number');
      ok(typeof report.summary.failed === 'number');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});