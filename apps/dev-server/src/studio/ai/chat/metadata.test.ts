import { describe, it, expect } from 'vitest';
import { createChatMetadata, studioChatMetadataSchema, MAX_SUGGESTED_NEXT_STEPS } from './metadata';

describe('createChatMetadata', () => {
  it('defaults to explain mode with timestamp', () => {
    const meta = createChatMetadata();
    expect(meta.mode).toBe('explain');
    expect(meta.timestamp).toBeGreaterThan(0);
  });

  it('attaches drafts when provided', () => {
    const drafts = [{ kind: 'lesson' as const, title: 'L', content: '# L' }];
    const meta = createChatMetadata('draft', { drafts });
    expect(meta.mode).toBe('draft');
    expect(meta.drafts).toHaveLength(1);
  });

  it('attaches courseDraft when provided', () => {
    const courseDraft = {
      success: true,
      title: 'C',
      outlinePreview: [],
      quality: [],
      draftId: 'd-1',
    };
    const meta = createChatMetadata('course_draft', { courseDraft });
    expect(meta.courseDraft).toEqual(courseDraft);
  });

  it('caps suggestedNextSteps at MAX_SUGGESTED_NEXT_STEPS', () => {
    const suggestedNextSteps = Array.from({ length: 10 }, (_, i) => `Step ${i}`);
    const meta = createChatMetadata('explain', { suggestedNextSteps });
    expect(meta.suggestedNextSteps).toHaveLength(MAX_SUGGESTED_NEXT_STEPS);
  });

  it('omits empty optional fields', () => {
    const meta = createChatMetadata('explain', {});
    expect(meta.drafts).toBeUndefined();
    expect(meta.courseDraft).toBeUndefined();
    expect(meta.suggestedNextSteps).toBeUndefined();
  });
});

describe('studioChatMetadataSchema', () => {
  it('accepts a valid metadata object', () => {
    const result = studioChatMetadataSchema.safeParse(createChatMetadata('explain'));
    expect(result.success).toBe(true);
  });

  it('rejects suggestedNextSteps longer than max 4', () => {
    const result = studioChatMetadataSchema.safeParse({
      mode: 'explain',
      timestamp: 1,
      suggestedNextSteps: Array.from({ length: 5 }, (_, i) => `Step ${i}`),
    });
    expect(result.success).toBe(false);
  });
});
