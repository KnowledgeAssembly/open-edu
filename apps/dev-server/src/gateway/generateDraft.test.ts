// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateDraft } from './generateDraft.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SPEC = resolve(
  import.meta.dirname,
  '__tests__',
  'fixtures',
  'runtime-smoke-course-spec.json',
);

describe('generateDraft', () => {
  it('returns a complete draft response for a spec request', async () => {
    const spec = await readFile(SPEC, 'utf-8');
    const result = await generateDraft({ spec, specExt: '.json' }, 'req-1');
    expect(result.success).toBe(true);
    expect(result.requestId).toBe('req-1');
    expect(result.title).toBeTruthy();
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some((f) => f.path === 'package.json')).toBe(true);
    expect(result.outlinePreview.length).toBeGreaterThan(0);
  });

  it('returns a complete draft for notes when a completion is provided', async () => {
    const spec = await readFile(SPEC, 'utf-8');
    const result = await generateDraft(
      { notes: 'Teach fractions so students can add and subtract them confidently.' },
      'req-2',
      { completeText: async () => spec, isAvailable: () => true },
    );
    expect(result.success).toBe(true);
    expect(result.files.some((f) => f.path.startsWith('nodes/'))).toBe(true);
  });

  it('throws missing-config when AI is unavailable', async () => {
    await expect(
      generateDraft({ notes: 'x'.repeat(50) }, 'req-3', { isAvailable: () => false }),
    ).rejects.toMatchObject({ code: 'missing-config', status: 503 });
  });

  it('maps a compile failure to a safe gateway error', async () => {
    await expect(
      generateDraft({ spec: '{}', specExt: '.json' }, 'req-4', { isAvailable: () => true }),
    ).rejects.toMatchObject({ code: 'generation-error' });
  });

  it('throws invalid-request when neither notes nor spec is present', async () => {
    await expect(
      generateDraft({} as never, 'req-5', { isAvailable: () => true }),
    ).rejects.toThrow();
  });
});
