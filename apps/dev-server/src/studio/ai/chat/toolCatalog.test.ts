import { describe, it, expect } from 'vitest';
import {
  companionToolCatalog,
  editItemInput,
  generateCourseInput,
  generateItemInput,
} from './toolCatalog.js';

describe('companionToolCatalog', () => {
  it('registers the three generation tools with contract metadata', () => {
    expect(companionToolCatalog.map((t) => t.id)).toEqual([
      'generate_course',
      'generate_item',
      'edit_item',
    ]);
    for (const tool of companionToolCatalog) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.permission.kind).toBe('propose');
    }
  });

  it('validates generate_course input', () => {
    const parsed = generateCourseInput.parse({ notes: 'math', packageDir: '/pkg' });
    expect(parsed.notes).toBe('math');
    expect(generateCourseInput.safeParse({ notes: 'x' }).success).toBe(false);
  });

  it('validates generate_item input and rejects unknown kinds', () => {
    const parsed = generateItemInput.parse({ kind: 'quiz', description: 'a quiz', packageDir: '/pkg' });
    expect(parsed.kind).toBe('quiz');
    expect(generateItemInput.safeParse({ kind: 'reflection', description: 'x', packageDir: '/pkg' }).success).toBe(false);
  });

  it('validates edit_item input with optional params', () => {
    const parsed = editItemInput.parse({
      kind: 'lesson',
      intent: 'rewrite',
      currentContent: '# Original',
      packageDir: '/pkg',
    });
    expect(parsed.intent).toBe('rewrite');
    expect(parsed.params).toBeUndefined();

    const withParams = editItemInput.parse({
      kind: 'lesson',
      intent: 'difficulty',
      currentContent: '# Original',
      params: { direction: 'easier' },
      packageDir: '/pkg',
    });
    expect(withParams.params).toEqual({ direction: 'easier' });
  });
});