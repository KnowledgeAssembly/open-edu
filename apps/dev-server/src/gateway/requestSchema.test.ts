// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  generateDraftRequestSchema,
  itemAddRequestSchema,
  itemEditRequestSchema,
  chatRequestSchema,
  generateDraftResponseSchema,
  MAX_CHAT_MESSAGES,
} from './requestSchema.js';

describe('generateDraftRequestSchema', () => {
  it('accepts a notes-only request', () => {
    expect(generateDraftRequestSchema.safeParse({ notes: 'Teach fractions' }).success).toBe(true);
  });

  it('accepts a spec request with extension', () => {
    expect(
      generateDraftRequestSchema.safeParse({ spec: '{"x":1}', specExt: '.json' }).success,
    ).toBe(true);
  });

  it('rejects requests with both notes and spec', () => {
    expect(
      generateDraftRequestSchema.safeParse({ notes: 'a', spec: 'b', specExt: '.json' }).success,
    ).toBe(false);
  });

  it('rejects requests with neither notes nor spec', () => {
    expect(generateDraftRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unsupported spec extensions', () => {
    expect(generateDraftRequestSchema.safeParse({ spec: '{}', specExt: '.txt' }).success).toBe(
      false,
    );
  });
});

describe('item schemas', () => {
  it('accepts a valid add request', () => {
    expect(
      itemAddRequestSchema.safeParse({ kind: 'lesson', description: 'Explain X' }).success,
    ).toBe(true);
  });

  it('rejects a missing description', () => {
    expect(itemAddRequestSchema.safeParse({ kind: 'quiz', description: '' }).success).toBe(false);
  });

  it('accepts a valid edit request', () => {
    expect(
      itemEditRequestSchema.safeParse({
        kind: 'quiz',
        intent: 'difficulty',
        currentContent: '{}',
        params: { direction: 'easier' },
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown intent', () => {
    expect(
      itemEditRequestSchema.safeParse({
        kind: 'lesson',
        intent: 'bogus',
        currentContent: '# X',
      }).success,
    ).toBe(false);
  });
});

describe('chatRequestSchema', () => {
  it('accepts a valid chat request', () => {
    expect(
      chatRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'hello' }],
      }).success,
    ).toBe(true);
  });

  it('rejects too many messages', () => {
    const messages = Array.from({ length: MAX_CHAT_MESSAGES + 1 }, (_, i) => ({
      role: 'user' as const,
      content: String(i),
    }));
    expect(chatRequestSchema.safeParse({ messages }).success).toBe(false);
  });

  it('rejects invalid message roles', () => {
    expect(
      chatRequestSchema.safeParse({ messages: [{ role: 'admin', content: 'x' }] }).success,
    ).toBe(false);
  });
});

describe('generateDraftResponseSchema', () => {
  it('validates a complete draft response', () => {
    const result = generateDraftResponseSchema.safeParse({
      requestId: 'req-1',
      success: true,
      title: 'Course',
      files: [{ path: 'package.json', content: '{}', encoding: 'utf8' }],
      outlinePreview: [{ title: 'Lesson', kind: 'lesson' }],
      quality: [{ id: 'objectives', labelKey: 'studio.ai.quality.objectives', passed: true }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a response missing files', () => {
    const result = generateDraftResponseSchema.safeParse({
      requestId: 'req-1',
      success: true,
      title: 'Course',
      files: [],
      outlinePreview: [],
      quality: [],
    });
    expect(result.success).toBe(false);
  });
});
