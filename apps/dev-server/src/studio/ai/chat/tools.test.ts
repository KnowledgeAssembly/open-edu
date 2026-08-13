import { describe, it, expect, vi } from 'vitest';
import { draftActivity } from './tools';

vi.mock('../itemGenerate', () => ({
  generateItemAdd: vi.fn(),
  generateItemEdit: vi.fn(),
  ItemRequestError: class extends Error {
    code = 'invalid-request';
    constructor(reason: string) {
      super(reason);
    }
  },
}));

describe('draftActivity', () => {
  it('wraps generateItemAdd for new lesson drafts', async () => {
    const { generateItemAdd } = await import('../itemGenerate');
    vi.mocked(generateItemAdd).mockResolvedValueOnce({
      ok: true,
      item: { kind: 'lesson', title: 'Water Cycle', content: '# Water Cycle\n' },
    });

    const result = await draftActivity({
      type: 'draft_new',
      kind: 'lesson',
      description: 'Create a lesson about the water cycle',
      packageDir: '/test/course',
    });

    expect(generateItemAdd).toHaveBeenCalledWith({
      kind: 'lesson',
      description: 'Create a lesson about the water cycle',
      packageDir: '/test/course',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.kind).toBe('lesson');
    }
  });

  it('wraps generateItemEdit for existing activity edits', async () => {
    const { generateItemEdit } = await import('../itemGenerate');
    vi.mocked(generateItemEdit).mockResolvedValueOnce({
      ok: true,
      items: [{ kind: 'quiz', title: 'Q1', content: '{}' }],
    });

    const result = await draftActivity({
      type: 'edit_existing',
      kind: 'quiz',
      currentContent: '{"type":"quiz"}',
      intent: 'rewrite',
      packageDir: '/test/course',
    });

    expect(generateItemEdit).toHaveBeenCalledWith({
      kind: 'quiz',
      intent: 'rewrite',
      currentContent: '{"type":"quiz"}',
      params: undefined,
      packageDir: '/test/course',
    });
    expect(result.ok).toBe(true);
  });

  it('returns error when generateItemAdd fails', async () => {
    const { generateItemAdd } = await import('../itemGenerate');
    vi.mocked(generateItemAdd).mockResolvedValueOnce({
      ok: false,
      code: 'item-retry-failed',
      error: 'LLM failure',
    });

    const result = await draftActivity({
      type: 'draft_new',
      kind: 'lesson',
      description: 'Test',
      packageDir: '/test/course',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('LLM failure');
    }
  });

  it('requires currentContent for edits', async () => {
    const result = await draftActivity({
      type: 'edit_existing',
      kind: 'lesson',
      intent: 'rewrite',
      packageDir: '/test/course',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('currentContent');
    }
  });
});
