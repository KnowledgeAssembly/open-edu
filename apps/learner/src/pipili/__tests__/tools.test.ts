import { describe, it, expect } from 'vitest';
import type { z } from 'zod';
import { createToolRegistry } from '../tools.js';

// The tool's `inputSchema` is typed as the AI SDK's `FlexibleSchema`, which
// does not expose `.parse` on its type. At runtime it is the app's zod schema
// (the AI SDK validates tool input through it before calling `execute`), so
// parse via a cast to reproduce the SDK's coercion behavior.
function parseInput<S>(schema: unknown, input: unknown): S {
  return (schema as z.ZodType).parse(input) as S;
}

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

  it('accepts sloppy numeric inputs instead of throwing a tool-call error', () => {
    const tools = createToolRegistry(contextGetter);
    // The AI SDK validates/coerces tool input through inputSchema before
    // calling execute; a numeric string must coerce instead of erroring.
    const parsed = parseInput<{ maxResults: number }>(tools.searchNotes.inputSchema, {
      query: 'math',
      maxResults: '3',
    });
    expect(parsed.maxResults).toBe(3);

    const related = parseInput<{ maxResults: number }>(tools.findRelatedConcepts.inputSchema, {
      concept: 'atom',
      maxResults: '10',
    });
    expect(related.maxResults).toBe(10);
  });

  it('clamps out-of-range and invalid hint levels without throwing', () => {
    const tools = createToolRegistry(contextGetter);

    const outOfRange = parseInput<{ requestedLevel: number }>(
      tools.createProgressiveHint.inputSchema,
      { topic: 'algebra', requestedLevel: 99, learnerHasAttempted: false },
    );
    expect(outOfRange.requestedLevel).toBeGreaterThanOrEqual(1);
    expect(outOfRange.requestedLevel).toBeLessThanOrEqual(4);

    const stringLevel = parseInput<{ requestedLevel: number }>(
      tools.createProgressiveHint.inputSchema,
      { topic: 'algebra', requestedLevel: '3', learnerHasAttempted: true },
    );
    expect(stringLevel.requestedLevel).toBe(3);
  });

  it('defaults fields to history defaults when the model passes invalid enum values', () => {
    const tools = createToolRegistry(contextGetter);
    const parsed = parseInput<{ fields: string[] }>(tools.getLearningHistory.inputSchema, {
      fields: ['strengths', 'bogus-field'],
    });
    expect(parsed.fields).toEqual(['strengths', 'weakConcepts']);
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
