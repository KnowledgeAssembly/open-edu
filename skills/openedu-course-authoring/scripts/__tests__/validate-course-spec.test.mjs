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

function makeFakeCompiler(status = 0) {
  return function fakeCompiler(specPath, outputDir) {
    return {
      status,
      stdout: status === 0 ? 'Compilation successful' : '',
      stderr: status !== 0 ? 'Compilation failed: invalid spec' : '',
      durationMs: 5,
    };
  };
}

describe('validate-course-spec (structural-only)', () => {
  it('passes valid spec', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, true);
      strictEqual(result.errors.length, 0);
      strictEqual(result.validationMode, 'structural-only');
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
      strictEqual(result.validationMode, 'structural-only');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('errors on lessons with no objectives (now a compiler-required field)', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].objectives = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'MISSING_OBJECTIVES'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('errors on lessons with no activities', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'NO_ACTIVITIES'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('errors on lessons missing coreIdea', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].coreIdea = '';
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'MISSING_CORE_IDEA'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('errors on lessons missing examples', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].examples = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'MISSING_EXAMPLES'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('errors on lessons missing misconceptions', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].misconceptions = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'MISSING_MISCONCEPTIONS'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles null lesson entries without throwing', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons.push(null);
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'INVALID_LESSON'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles null activity entries without throwing', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities.push(null);
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'INVALID_ACTIVITY'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('validates quiz questions with exactly 4 options', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities.push({
        step: 'mastery_check',
        order: 3,
        type: 'quiz',
        description: 'Quiz time',
        questions: [
          { question: 'Q', options: ['A', 'B', 'C'], correctIndex: 0 },
        ],
      });
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'INVALID_QUESTION_OPTIONS'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('validates quiz correctIndex is 0-3', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities.push({
        step: 'mastery_check',
        order: 3,
        type: 'quiz',
        description: 'Quiz time',
        questions: [
          { question: 'Q', options: ['A', 'B', 'C', 'D'], correctIndex: 5 },
        ],
      });
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'INVALID_CORRECT_INDEX'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates output directory recursively if it does not exist', () => {
    const base = createTempDir();
    const nestedDir = join(base, 'deeply', 'nested', 'output');
    try {
      writeJSON(base, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(base, 'course-spec.json'), nestedDir);
      ok(existsSync(nestedDir), 'nested output directory should be created');
      const report = JSON.parse(readFileSync(join(nestedDir, 'quality-report.json'), 'utf-8'));
      ok(report.validationMode);
    } finally {
      rmSync(base, { recursive: true, force: true });
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

describe('validate-course-spec (profile metadata)', () => {
  it('accepts valid audience and accessibility metadata', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.metadata.audience = 'autism';
      spec.metadata.accessibility = ['sensory-friendly', 'predictable-structure', 'literal-language'];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, true);
      strictEqual(result.errors.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts empty accessibility array (neurotypical default)', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.metadata.audience = 'neurotypical';
      spec.metadata.accessibility = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects an unknown audience key', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.metadata.audience = 'alien';
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'INVALID_AUDIENCE'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects non-string audience', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.metadata.audience = ['autism'];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'INVALID_AUDIENCE'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects non-array accessibility', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.metadata.accessibility = 'sensory-friendly';
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'INVALID_ACCESSIBILITY'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects accessibility arrays with non-string entries', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.metadata.accessibility = ['sensory-friendly', 42];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'INVALID_ACCESSIBILITY'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('validate-course-spec (compiler integration)', () => {
  it('sets compilerAvailable=true and validationMode=compiler with fake command', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, {
        facade: makeFakeCompiler(0),
      });
      strictEqual(result.compilerAvailable, true);
      strictEqual(result.validationMode, 'compiler');
      strictEqual(result.success, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports failure when fake compiler returns non-zero', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, {
        facade: makeFakeCompiler(1),
      });
      strictEqual(result.compilerAvailable, true);
      strictEqual(result.validationMode, 'compiler');
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'COMPILER_FAILED'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('preserves compiler stdout/stderr/status in diagnostics', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, {
        facade: makeFakeCompiler(0),
      });
      ok(result.compilerResult);
      strictEqual(result.compilerResult.status, 0);
      ok(result.compilerResult.stdout.includes('Compilation successful'));
      ok(result.commands.length > 0);
      strictEqual(result.commands[0].phase, 'compile');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});