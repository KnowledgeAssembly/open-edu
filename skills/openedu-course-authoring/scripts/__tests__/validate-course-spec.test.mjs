import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateCourseSpec } from '../validate-course-spec.mjs';

function createTempDir() {
  const base = join(tmpdir(), `validate-spec-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
          {
            step: 'observe',
            order: 1,
            type: 'reading',
            description: 'Read the introduction',
          },
          {
            step: 'guided_practice',
            order: 2,
            type: 'exercise',
            description: 'Try this exercise',
            instructions: 'Solve the problem',
          },
        ],
      },
    ],
  };
}

describe('validate-course-spec (structural)', () => {
  it('passes valid spec', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, true);
      strictEqual(result.errors.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects missing file', () => {
    const dir = createTempDir();
    try {
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'FILE_NOT_FOUND'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects malformed JSON', () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'course-spec.json'), '{ not valid json }');
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'JSON_PARSE_ERROR'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects missing required metadata', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      delete spec.metadata.title;
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.length > 0, 'should have at least one error');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects invalid activity type', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities[0].type = 'INVALID_TYPE';
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects duplicate lesson IDs', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons.push({ ...spec.lessons[0] });
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'DUPLICATE_LESSON_ID'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects widget activity without widgetId', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities.push({
        step: 'independent_practice',
        order: 3,
        type: 'widget',
        description: 'A widget activity',
      });
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'MISSING_WIDGET_ID'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports compilerAvailable as false when no compiler path given', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.compilerAvailable, false);
      strictEqual(result.success, true, 'structural-only validation should succeed for valid spec');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('warns on lessons with no objectives', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].objectives = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      ok(result.warnings.some((w) => w.code === 'MISSING_OBJECTIVES'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('warns on lessons with no activities', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      ok(result.warnings.some((w) => w.code === 'NO_ACTIVITIES'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('generates quality-report.json on success', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      validateCourseSpec(join(dir, 'course-spec.json'), dir);
      ok(existsSync(join(dir, 'quality-report.json')), 'quality-report.json should be written');
      const report = JSON.parse(readFileSync(join(dir, 'quality-report.json'), 'utf-8'));
      strictEqual(report.success, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
