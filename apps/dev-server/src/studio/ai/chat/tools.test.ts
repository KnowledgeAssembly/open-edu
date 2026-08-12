import { describe, it, expect, vi } from 'vitest';
import { draftActivity } from './tools';

vi.mock('../studioLlm', () => ({
  completeWithLlm: vi.fn().mockResolvedValue(JSON.stringify({ title: 'Test Lesson', markdown: '# Hello\n\nWorld' })),
  isAiAvailable: vi.fn().mockReturnValue(true),
}));

vi.mock('../prompts/index.js', () => ({
  buildLessonAddPrompt: vi.fn().mockReturnValue('build lesson add prompt'),
  buildQuizAddPrompt: vi.fn().mockReturnValue('build quiz add prompt'),
  buildPracticeAddPrompt: vi.fn().mockReturnValue('build practice add prompt'),
  buildLessonEditPrompt: vi.fn().mockReturnValue('build lesson edit prompt'),
  buildQuizEditPrompt: vi.fn().mockReturnValue('build quiz edit prompt'),
  buildPracticeEditPrompt: vi.fn().mockReturnValue('build practice edit prompt'),
  renderCourseContext: vi.fn().mockReturnValue('course context'),
  extractJsonObject: vi.fn().mockImplementation((raw: string) => JSON.parse(raw)),
}));

vi.mock('../itemGenerate', () => ({
  readCourseContext: vi.fn().mockReturnValue(['Lesson 1']),
  mapToDraftItem: vi.fn().mockImplementation((kind: string, parsed: Record<string, unknown>) => ({
    kind,
    title: typeof parsed.title === 'string' ? parsed.title : 'New item',
    content: kind === 'lesson' ? (typeof parsed.markdown === 'string' ? parsed.markdown : '') : JSON.stringify(parsed),
  })),
  validateItemDraft: vi.fn().mockReturnValue(null),
  ItemRequestError: class extends Error {
    code = 'invalid-request';
    constructor(reason: string) {
      super(reason);
    }
  },
}));

describe('draftActivity', () => {
  it('creates a new lesson draft', async () => {
    const result = await draftActivity({
      type: 'draft_new',
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

  it('creates a new quiz draft', async () => {
    const result = await draftActivity({
      type: 'draft_new',
      kind: 'quiz',
      description: 'Create a quiz about fractions',
      packageDir: '/test/course',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.kind).toBe('quiz');
    }
  });

  it('returns error when LLM fails', async () => {
    const { completeWithLlm } = await import('../studioLlm');
    vi.mocked(completeWithLlm).mockRejectedValueOnce(new Error('LLM failure'));

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
});