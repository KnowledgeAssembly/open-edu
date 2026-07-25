import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { summarizeQuality } from '../summarize-quality.mjs';

function createTempDir() {
  const base = join(tmpdir(), `quality-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

function makeBlueprint() {
  return [
    {
      id: 'lesson-01',
      title: 'Lesson One',
      objectives: ['Identify parts of a fraction', 'Compare fractions with same denominator'],
      activityPlan: [
        { type: 'reading', step: 'observe' },
        { type: 'widget', step: 'guided_practice', widgetId: 'math.fraction-visual' },
        { type: 'quiz', step: 'mastery_check' },
      ],
      estimatedMinutes: 20,
    },
    {
      id: 'lesson-02',
      title: 'Lesson Two',
      objectives: ['Add fractions with like denominators'],
      activityPlan: [
        { type: 'reading', step: 'observe' },
        { type: 'exercise', step: 'independent_practice' },
      ],
      estimatedMinutes: 60,
    },
  ];
}

function makeValidationResult(overrides = {}) {
  return {
    success: true,
    errors: [],
    warnings: [],
    data: {
      lessonCount: 2,
      activityCount: 5,
    },
    compilerAvailable: false,
    ...overrides,
  };
}

describe('summarize-quality', () => {
  it('reports success for fully aligned course', () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(makeBlueprint()));
      const result = summarizeQuality(dir, makeValidationResult());
      strictEqual(result.success, true);
      ok(result.findings.length > 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports error for uncovered objective when no matching activity exists', () => {
    const dir = createTempDir();
    try {
      const blueprint = [
        {
          id: 'lesson-01',
          title: 'L1',
          objectives: ['Objective with no matching activity type'],
          activityPlan: [], // no activities
          estimatedMinutes: 15,
        },
      ];
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(blueprint));
      const result = summarizeQuality(dir, makeValidationResult({ data: { lessonCount: 1, activityCount: 0 } }), null);
      const objErrors = result.findings.filter((f) => f.checkId === 'QC-OBJ-01');
      ok(objErrors.length > 0, 'should have objective coverage errors');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags overlong lesson', () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(makeBlueprint()));
      const result = summarizeQuality(dir, makeValidationResult());
      const durFindings = result.findings.filter((f) => f.checkId === 'QC-DUR-02');
      ok(durFindings.length > 0, 'should flag the 60-minute lesson');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags legacy widget IDs', () => {
    const dir = createTempDir();
    try {
      const blueprint = [
        {
          id: 'lesson-01',
          title: 'L1',
          objectives: ['obj1'],
          activityPlan: [
            { type: 'widget', step: 'guided_practice', widgetId: 'open-edu.multiple-choice' },
          ],
          estimatedMinutes: 15,
        },
      ];
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(blueprint));
      const result = summarizeQuality(dir, makeValidationResult());
      const wdgFindings = result.findings.filter((f) => f.checkId === 'QC-WDG-01');
      ok(wdgFindings.length > 0, 'should flag legacy widget ID');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags deprecated widget IDs', () => {
    const dir = createTempDir();
    try {
      const blueprint = [
        {
          id: 'lesson-01',
          title: 'L1',
          objectives: ['obj1'],
          activityPlan: [
            { type: 'widget', step: 'guided_practice', widgetId: 'open-edu.multiple-choice-practice' },
          ],
          estimatedMinutes: 15,
        },
      ];
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(blueprint));
      const result = summarizeQuality(dir, makeValidationResult());
      const depWarnings = result.findings.filter((f) => f.checkId === 'QC-WDG-02');
      ok(depWarnings.length > 0, 'should flag deprecated widget');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags lessons with no mastery_check or quiz', () => {
    const dir = createTempDir();
    try {
      const blueprint = [
        {
          id: 'lesson-01',
          title: 'L1',
          objectives: ['obj1'],
          activityPlan: [
            { type: 'reading', step: 'observe' },
            { type: 'exercise', step: 'independent_practice' },
          ],
          estimatedMinutes: 15,
        },
      ];
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(blueprint));
      const result = summarizeQuality(dir, makeValidationResult({ data: { lessonCount: 1, activityCount: 2 } }), null);
      const asmFindings = result.findings.filter((f) => f.checkId === 'QC-ASM-02');
      ok(asmFindings.length > 0, 'should flag missing assessment');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes quality-report.json', () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(makeBlueprint()));
      summarizeQuality(dir, makeValidationResult());
      const report = JSON.parse(readFileSync(join(dir, 'quality-report.json'), 'utf-8'));
      ok(report.findings.length > 0);
      ok(typeof report.summary === 'object');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
