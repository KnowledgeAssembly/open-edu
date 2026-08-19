// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateItem, assertItemBody } from './itemGeneration.js';

describe('generateItem', () => {
  it('maps a successful add result', async () => {
    const result = await generateItem(
      { kind: 'lesson', description: 'Explain fractions' },
      'req-1',
      {
        generateItemAdd: async () => ({
          ok: true,
          item: { kind: 'lesson', title: 'Fractions', content: '# Fractions' },
        }),
      },
    );
    expect(result.ok).toBe(true);
    expect(result.item?.kind).toBe('lesson');
  });

  it('throws a safe generation-error when the provider drafts an invalid item', async () => {
    await expect(
      generateItem({ kind: 'lesson', description: 'Explain fractions' }, 'req-2', {
        generateItemAdd: async () => ({
          ok: false,
          code: 'item-retry-failed',
          error: 'Some internal provider detail',
        }),
      }),
    ).rejects.toMatchObject({ code: 'generation-error' });
  });

  it('maps a successful edit result', async () => {
    const result = await generateItem(
      {
        kind: 'quiz',
        intent: 'rewrite',
        currentContent: '{"type":"quiz","question":"Q","options":[]}',
      },
      'req-3',
      {
        generateItemEdit: async () => ({
          ok: true,
          items: [{ kind: 'lesson' as const, title: 'T', content: '# T' }],
        }),
      },
    );
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.items)).toBe(true);
  });
});

describe('assertItemBody', () => {
  it('distinguishes add from edit by presence of intent', () => {
    expect(assertItemBody({ kind: 'lesson', description: 'x' })).toMatchObject({
      description: 'x',
    });
    expect(assertItemBody({ kind: 'quiz', intent: 'rewrite', currentContent: '{}' })).toMatchObject(
      { intent: 'rewrite' },
    );
  });

  it('throws on invalid inputs', () => {
    expect(() => assertItemBody({ kind: 'nope', description: 'x' })).toThrow();
    expect(() => assertItemBody({ kind: 'quiz', intent: 'bogus', currentContent: '{}' })).toThrow();
  });
});
