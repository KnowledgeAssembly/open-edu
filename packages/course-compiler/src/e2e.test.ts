import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { compile } from './cli/index.js';
import { validateCourseModel } from './validators/semantic-validator.js';
import type { CourseModel } from './schemas/index.js';

describe('end-to-end pipeline', () => {
  it('compiles a valid single-module spec and produces correct output', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'e2e-test-'));
    const specPath = join(tmpDir, 'course-spec.md');

    const spec = `---
title: E2E Test
description: End-to-end test course
author: Test
version: 1.0.0
---

# Test Module

## Lesson 1: Test Lesson

**Objectives:**
- Test the pipeline

This is test content.

### Quiz: Test Quiz

1. What is 1+1?
- [x] 2
- [ ] 3
`;

    const { writeFileSync } = await import('node:fs');
    writeFileSync(specPath, spec, 'utf-8');

    const result = await compile(specPath, { output: join(tmpDir, 'out'), validate: false });

    expect(result.success).toBe(true);
    expect(result.diagnostics).toBeDefined();
    expect(result.outputPath).toBeDefined();

    // Verify output structure
    const outDir = result.outputPath!;
    expect(existsSync(join(outDir, 'package.json'))).toBe(true);
    expect(existsSync(join(outDir, 'workflow.json'))).toBe(true);
    expect(existsSync(join(outDir, 'nodes'))).toBe(true);

    // Verify manifest content
    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf-8'));
    expect(pkg.id).toBe('test-module');
    expect(pkg.title).toBe('Test Module');
    expect(pkg.entry).toContain('nodes/');

    // Verify lesson content exists in nodes directory
    const nodes = readdirSync(join(outDir, 'nodes'));
    const lessonFile = nodes.find((f) => f.endsWith('.md'));
    expect(lessonFile).toBeDefined();

    const lesson = readFileSync(join(outDir, 'nodes', lessonFile!), 'utf-8');
    expect(lesson).toContain('# Test Lesson');
    expect(lesson).toContain('Test the pipeline');
    expect(lesson).toContain('This is test content');
  });

  it('compiles a multi-module bundle spec', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'e2e-bundle-'));
    const specPath = join(tmpDir, 'course-spec.md');

    const spec = `---
title: Bundle Test
description: Test bundle
author: Test
---

# Module 1: First Module

## Lesson 1.1: Lesson One

**Objectives:**
- Learn A

Content A

# Module 2: Second Module

## Lesson 2.1: Lesson One

**Objectives:**
- Learn B

Content B
`;

    const { writeFileSync } = await import('node:fs');
    writeFileSync(specPath, spec, 'utf-8');

    const result = await compile(specPath, { output: join(tmpDir, 'out'), validate: false });

    expect(result.success).toBe(true);

    const outDir = result.outputPath!;
    expect(existsSync(join(outDir, 'bundle.json'))).toBe(true);

    // Module directories exist (directory names are the slugified module IDs)
    const modDirs = readdirSync(join(outDir, 'modules'));
    expect(modDirs.length).toBe(2);
    // Each module directory should have package.json or nodes
    for (const dir of modDirs) {
      expect(existsSync(join(outDir, 'modules', dir, 'package.json'))).toBe(true);
    }

    const bundle = JSON.parse(readFileSync(join(outDir, 'bundle.json'), 'utf-8'));
    expect(bundle.type).toBe('bundle');
    expect(bundle.modules).toHaveLength(2);
  });

  it('reports diagnostics for specs with issues', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'e2e-malformed-'));
    const specPath = join(tmpDir, 'course-spec.md');

    // Spec with no frontmatter title (produces warning)
    const spec = `# Module

## Lesson

Content here.
`;

    const { writeFileSync } = await import('node:fs');
    writeFileSync(specPath, spec, 'utf-8');

    const result = await compile(specPath, { output: join(tmpDir, 'out'), validate: false });

    // Should still produce output since validation is suppressed
    expect(result.success).toBe(true);

    // Should have diagnostics from the parsing step
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(result.diagnostics.some((d) => d.severity === 'warning')).toBe(true);
  });

  it('handles non-existent spec file', async () => {
    const result = await compile('/nonexistent/path/course-spec.md', {});
    expect(result.success).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'FILE_READ_ERROR')).toBe(true);
  });
});

function validModel(): CourseModel {
  return {
    id: 'test-course',
    version: '1.0.0',
    title: 'Test Course',
    modules: [
      {
        id: 'mod-1',
        title: 'Module 1',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            activities: [],
          },
        ],
      },
    ],
  } as unknown as CourseModel;
}

describe('animation config validation', () => {
  it('passes for a widget activity with a valid canvas animation config', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.activities = [
      {
        id: 'act-canvas',
        type: 'widget',
        widgetId: 'core.sorting-visualizer',
        config: {
          animation: {
            backend: 'canvas',
            trigger: 'step',
            effects: [
              { target: 'bar-0', effect: 'flow', step: 30 },
              { target: 'bar-1', effect: 'flow', step: 50 },
            ],
          },
        },
      },
    ];
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'INVALID_ANIMATION_CONFIG')).toBe(false);
  });

  it('passes for a widget activity with a valid CSS animation config', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.activities = [
      {
        id: 'act-css',
        type: 'widget',
        widgetId: 'core.multiple-choice',
        config: {
          animation: {
            backend: 'css',
            trigger: 'answer-correct',
            effects: [{ target: 'feedback', effect: 'highlight' }],
          },
        },
      },
    ];
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'INVALID_ANIMATION_CONFIG')).toBe(false);
  });

  it('reports an invalid canvas animation effect', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.activities = [
      {
        id: 'act-bad-canvas',
        type: 'widget',
        widgetId: 'core.sorting-visualizer',
        config: {
          animation: {
            backend: 'canvas',
            effects: [{ target: 'x', effect: 'sparkles' }],
          },
        },
      },
    ];
    const diags = validateCourseModel(model);
    const invalid = diags.find((d) => d.code === 'INVALID_ANIMATION_CONFIG');
    expect(invalid).toBeDefined();
    expect(invalid?.severity).toBe('error');
  });
});
