import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCompileCommand, compile } from './index.js';

const VALID_JSON = JSON.stringify({
  format: 'openedu-course-spec',
  version: 1,
  generatedAt: '2026-07-01T00:00:00.000Z',
  metadata: { title: 'Test', description: 'Test course', generated: true },
  lessons: [
    {
      id: 'lesson-101',
      title: 'Test Lesson',
      objectives: ['Learn'],
      coreIdea: 'Core idea',
      examples: [],
      misconceptions: [],
      activities: [],
    },
  ],
});

const VALID_MD = `---
title: Introduction to Algebra
description: Learn the basics of algebra
---

# Module 1: Algebra Basics

This module covers the foundation of algebra.

## Lesson 1.1: Variables

**Objectives:**
- Understand what a variable represents

Variables are symbols that represent quantities.

### Activity: Reading

Read the chapter on variables.
`;

describe('createCompileCommand', () => {
  it('returns a Command with name compile', () => {
    const cmd = createCompileCommand();
    expect(cmd.name()).toBe('compile');
  });

  it('accepts a file argument', () => {
    const cmd = createCompileCommand();
    expect(cmd.name()).toBe('compile');
  });

  it('has --output option with default ./out', () => {
    const cmd = createCompileCommand();
    const outputOption = cmd.options.find((o) => o.long === '--output');
    expect(outputOption).toBeDefined();
  });

  it('has --validate option with default false', () => {
    const cmd = createCompileCommand();
    const validateOption = cmd.options.find((o) => o.long === '--validate');
    expect(validateOption).toBeDefined();
  });

  it('has --verbose option', () => {
    const cmd = createCompileCommand();
    const verboseOption = cmd.options.find((o) => o.long === '--verbose');
    expect(verboseOption).toBeDefined();
  });

  it('has --watch option', () => {
    const cmd = createCompileCommand();
    const watchOption = cmd.options.find((o) => o.long === '--watch');
    expect(watchOption).toBeDefined();
  });

  it('has --format option', () => {
    const cmd = createCompileCommand();
    const formatOption = cmd.options.find((o) => o.long === '--format');
    expect(formatOption).toBeDefined();
  });
});

describe('compile extension detection', () => {
  function withTempFile(name: string, content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'compile-test-'));
    const filePath = join(dir, name);
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  it('compiles a .json file successfully', async () => {
    const jsonPath = withTempFile('course-spec.json', VALID_JSON);
    const result = await compile(jsonPath, { output: mkdtempSync(join(tmpdir(), 'out-')) });
    expect(result.success).toBe(true);
  });

  it('compiles a .md file successfully', async () => {
    const mdPath = withTempFile('course-spec.md', VALID_MD);
    const result = await compile(mdPath, { output: mkdtempSync(join(tmpdir(), 'out-')) });
    expect(result.success).toBe(true);
  });

  it('detects .JSON mixed case extension', async () => {
    const jsonPath = withTempFile('course-spec.JSON', VALID_JSON);
    const result = await compile(jsonPath, { output: mkdtempSync(join(tmpdir(), 'out-')) });
    expect(result.success).toBe(true);
  });

  it('errors on missing file', async () => {
    const result = await compile('/nonexistent/file.md', { output: '/tmp/out' });
    expect(result.success).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'FILE_READ_ERROR')).toBe(true);
  });

  it('errors on invalid JSON content with .json extension', async () => {
    const jsonPath = withTempFile('bad.json', '{ invalid json }');
    const result = await compile(jsonPath, { output: mkdtempSync(join(tmpdir(), 'out-')) });
    expect(result.success).toBe(false);
  });

  it('errors on invalid markdown content with .md extension', async () => {
    const mdPath = withTempFile('bad.md', 'not a valid course spec');
    const result = await compile(mdPath, { output: mkdtempSync(join(tmpdir(), 'out-')) });
    expect(result.success).toBe(false);
  });
});
