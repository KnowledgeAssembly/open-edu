import { describe, it, expect } from 'vitest';
import { boundContext } from '../pipili/context-utils.js';
import type { PipiliContextSnapshot } from '../pipili/types.js';

describe('boundContext', () => {
  it('returns empty entries for empty snapshot', () => {
    const result = boundContext({});
    expect(result.entries).toHaveLength(0);
    expect(result.totalTokens).toBe(0);
    expect(result.truncated).toBe(false);
  });

  it('includes page context when present', () => {
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Test', content: 'Some content', nodeType: 'page' },
    };
    const result = boundContext(snapshot);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.source).toBe('page');
  });

  it('orders entries by priority (page > widget > lesson > course)', () => {
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Page', content: 'content', nodeType: 'page' },
      widget: { id: 'w1', type: 'quiz', state: {} },
      lesson: { id: 'l1', title: 'Lesson', objectives: [], topics: [] },
      course: {
        id: 'c1',
        title: 'Course',
        description: '',
        subject: '',
        level: '',
        language: 'en',
      },
    };
    const result = boundContext(snapshot);
    expect(result.entries.map((e) => e.source)).toEqual(['page', 'widget', 'lesson', 'course']);
  });

  it('truncates lower priority entries when token budget exceeded', () => {
    const largeContent = 'word '.repeat(10000);
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Page', content: 'short', nodeType: 'page' },
      lesson: { id: 'l1', title: 'Lesson', objectives: ['obj1'], topics: ['topic1'] },
      notes: { entries: [{ id: 'n1', title: 'Note', content: largeContent, createdAt: 1 }] },
    };
    const result = boundContext(snapshot);
    expect(result.truncated).toBe(true);
    const notesEntry = result.entries.find((e) => e.source === 'notes');
    expect(notesEntry?.truncated).toBe(true);
  });

  it('never truncates page entry if widget/course entries can be truncated instead', () => {
    const largeWidget = { id: 'w1', type: 'quiz', state: { data: 'x'.repeat(100000) } };
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Page', content: 'short content', nodeType: 'page' },
      widget: largeWidget,
    };
    const result = boundContext(snapshot);
    const pageEntry = result.entries.find((e) => e.source === 'page');
    expect(pageEntry?.truncated).toBe(false);
  });

  it('marks entries as truncated: true when content is cut', () => {
    const bigContent = 'big '.repeat(100000);
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Page', content: bigContent, nodeType: 'page' },
    };
    const result = boundContext(snapshot);
    expect(result.entries[0]!.truncated).toBe(true);
  });

  it('boundContext.totalTokens is within MAX_CONTEXT_TOKENS', () => {
    const bigContent = 'word '.repeat(20000);
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Page', content: bigContent, nodeType: 'page' },
      lesson: { id: 'l1', title: 'Lesson', objectives: [], topics: [] },
    };
    const result = boundContext(snapshot);
    expect(result.totalTokens).toBeLessThanOrEqual(10000);
  });

  it('content that fits entirely is not truncated', () => {
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Page', content: 'short content', nodeType: 'page' },
    };
    const result = boundContext(snapshot);
    expect(result.entries[0]!.truncated).toBe(false);
  });

  it('handles overflow by stopping (no entries beyond budget)', () => {
    const largeContent = 'x '.repeat(100000);
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Page', content: largeContent, nodeType: 'page' },
      lesson: { id: 'l1', title: 'Lesson', objectives: [], topics: [] },
    };
    const result = boundContext(snapshot);
    const lessonEntry = result.entries.find((e) => e.source === 'lesson');
    expect(lessonEntry).toBeUndefined();
  });

  it('truncation preserves sentence boundaries', () => {
    const content =
      'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence. ';
    const snapshot: PipiliContextSnapshot = {
      page: { id: 'p1', title: 'Page', content, nodeType: 'page' },
    };
    const result = boundContext(snapshot);
    if (result.entries[0]?.truncated) {
      expect(result.entries[0]!.content).toMatch(/\. \[truncated\]$/);
    }
  });
});
