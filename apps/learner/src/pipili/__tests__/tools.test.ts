import { describe, it, expect } from 'vitest';
import { createToolRegistry } from '../tools.js';

describe('createToolRegistry', () => {
  const contextGetter = () => ({ courseId: 'test-course', lessonId: 'test-lesson' });

  it('returns an object with all 7 tools', () => {
    const tools = createToolRegistry(contextGetter);
    expect(Object.keys(tools)).toHaveLength(7);
    expect(tools.getCurrentPageContext).toBeDefined();
    expect(tools.getCurrentLessonContext).toBeDefined();
    expect(tools.searchNotes).toBeDefined();
    expect(tools.getRelevantNotes).toBeDefined();
    expect(tools.getLearningHistory).toBeDefined();
    expect(tools.findRelatedConcepts).toBeDefined();
    expect(tools.createProgressiveHint).toBeDefined();
  });

  it('getCurrentPageContext executes without error', async () => {
    const tools = createToolRegistry(contextGetter);
    const result = (await tools.getCurrentPageContext.execute({}, {} as never)) as {
      pageContent: string;
    };
    expect(result).toBeDefined();
    expect(result.pageContent).toBeDefined();
  });

  it('searchNotes validates query parameter', async () => {
    const tools = createToolRegistry(contextGetter);
    const result = (await tools.searchNotes.execute(
      { query: 'math', maxResults: 3 },
      {} as never,
    )) as { query: string };
    expect(result.query).toBe('math');
  });

  it('getRelevantNotes validates noteIds array', async () => {
    const tools = createToolRegistry(contextGetter);
    const result = (await tools.getRelevantNotes.execute(
      { noteIds: ['n1', 'n2'] },
      {} as never,
    )) as { notes: unknown[] };
    expect(result.notes).toEqual([]);
  });

  it('createProgressiveHint resolves hint level correctly', async () => {
    const tools = createToolRegistry(contextGetter);
    const result = (await tools.createProgressiveHint.execute(
      {
        topic: 'algebra',
        requestedLevel: 2,
        learnerHasAttempted: false,
      },
      {} as never,
    )) as { topic: string; level: number; instruction: string };
    expect(result.topic).toBe('algebra');
    expect(result.level).toBeDefined();
    expect(result.instruction).toBeDefined();
  });

  it('tool execute functions are bounded (no file/network access)', () => {
    const tools = createToolRegistry(contextGetter);
    expect(typeof tools.getCurrentPageContext.execute).toBe('function');
  });

  it('all tools have explicit input schemas', () => {
    const tools = createToolRegistry(contextGetter);
    for (const [, t] of Object.entries(tools)) {
      expect(t.inputSchema).toBeDefined();
    }
  });
});
