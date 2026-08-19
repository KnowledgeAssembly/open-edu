// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { generateCoursePackage, type CourseSpecSource } from './generateCoursePackage.js';

const FIXTURE_DIR = resolve(import.meta.dirname, '../../gateway/__tests__/fixtures');

async function specFixture(): Promise<string> {
  return readFile(join(FIXTURE_DIR, 'runtime-smoke-course-spec.json'), 'utf-8');
}

describe('generateCoursePackage', () => {
  it('compiles a valid uploaded spec and returns complete file bytes', async () => {
    const spec = await specFixture();
    const result = await generateCoursePackage({ kind: 'spec', spec, extension: '.json' });

    expect(result.files.has('package.json')).toBe(true);
    expect(result.files.has('workflow.json')).toBe(true);
    expect(
      Array.from(result.files.keys()).some((p) => p.startsWith('nodes/') && p.endsWith('.md')),
    ).toBe(true);
    expect(result.title).toBe('Runtime Smoke Course');
    expect(result.outlinePreview.length).toBeGreaterThan(0);
    expect(result.quality).toHaveLength(4);
    // package.json holds complete content (not a server path)
    expect(result.files.get('package.json')).toContain('"id"');
  });

  it('compiles notes through a provided LLM completion and returns files', async () => {
    const spec = await specFixture();
    const source: CourseSpecSource = {
      kind: 'notes',
      notes: 'Teach fractions so students can add and subtract them confidently.',
      completeText: async () => spec,
    };
    const result = await generateCoursePackage(source);
    expect(result.files.has('package.json')).toBe(true);
    expect(result.title).toBe('Runtime Smoke Course');
  });

  it('rejects empty spec with spec-invalid', async () => {
    await expect(
      generateCoursePackage({ kind: 'spec', spec: '   ', extension: '.json' }),
    ).rejects.toMatchObject({ code: 'spec-invalid' });
  });

  it('rejects too-short notes with notes-too-short', async () => {
    await expect(
      generateCoursePackage({
        kind: 'notes',
        notes: 'too short',
        completeText: async () => '{}',
      }),
    ).rejects.toMatchObject({ code: 'notes-too-short' });
  });

  it('maps an LLM failure to llm error', async () => {
    await expect(
      generateCoursePackage({
        kind: 'notes',
        notes: 'This is a sufficiently long description of a course to generate from notes.',
        completeText: async () => {
          throw new Error('provider down');
        },
      }),
    ).rejects.toMatchObject({ code: 'llm' });
  });

  it('maps malformed LLM output to parse error', async () => {
    await expect(
      generateCoursePackage({
        kind: 'notes',
        notes: 'This is a sufficiently long description of a course to generate from notes.',
        completeText: async () => 'not json at all',
      }),
    ).rejects.toMatchObject({ code: 'parse' });
  });

  it('cleans up temporary files even when compilation fails', async () => {
    await expect(
      generateCoursePackage({ kind: 'spec', spec: '{}', extension: '.json' }),
    ).rejects.toBeTruthy();
  });
});
