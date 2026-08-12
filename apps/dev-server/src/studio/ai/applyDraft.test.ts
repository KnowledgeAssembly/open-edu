import { describe, it, expect, vi } from 'vitest';
import { applyDraft, applyDraftBatch } from './applyDraft';
import type { DraftItem } from './types';

const mockApi = {
  writeFile: vi.fn().mockResolvedValue({ success: true }),
  getOutline: vi.fn().mockResolvedValue({
    activities: [
      { id: 'n1', path: 'nodes/lesson-1.md', title: 'Lesson 1', kind: 'lesson' },
    ],
    title: 'Test Course',
  }),
  saveOutlineOrder: vi.fn().mockResolvedValue({ success: true }),
};

describe('applyDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies draft to file and appends to outline', async () => {
    const draft: DraftItem = {
      kind: 'lesson',
      title: 'New Lesson',
      content: '# New Lesson\n\nContent',
    };

    const result = await applyDraft(mockApi as any, draft, { mode: 'file' });

    expect(result.path).toBeTruthy();
    expect(mockApi.writeFile).toHaveBeenCalled();
    expect(mockApi.getOutline).toHaveBeenCalled();
    expect(mockApi.saveOutlineOrder).toHaveBeenCalled();
  });

  it('applies draft to buffer using applyToEditor callback', async () => {
    const draft: DraftItem = {
      kind: 'lesson',
      title: 'Updated Lesson',
      content: '# Updated\n\nNew content',
    };

    const applyToEditor = vi.fn();

    const result = await applyDraft(mockApi as any, draft, {
      mode: 'buffer',
      applyToEditor,
    });

    expect(applyToEditor).toHaveBeenCalledWith(draft);
    expect(mockApi.writeFile).not.toHaveBeenCalled();
    expect(result.path).toBeUndefined();
  });

  it('uses custom path when provided', async () => {
    const draft: DraftItem = {
      kind: 'lesson',
      title: 'Custom Path',
      content: '# Custom\n\nContent',
    };

    await applyDraft(mockApi as any, draft, {
      mode: 'file',
      path: 'nodes/my-custom-lesson.md',
    });

    expect(mockApi.writeFile).toHaveBeenCalledWith('nodes/my-custom-lesson.md', draft.content);
  });
});

describe('applyDraftBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes multiple drafts and appends to outline', async () => {
    const drafts: DraftItem[] = [
      { kind: 'lesson', title: 'Lesson 1', content: '# Lesson 1\n\nContent' },
      { kind: 'quiz', title: 'Quiz 1', content: '{"type":"quiz","question":"Q?","options":[]}' },
    ];

    const result = await applyDraftBatch(mockApi as any, drafts);

    expect(result).toHaveLength(2);
    expect(mockApi.writeFile).toHaveBeenCalledTimes(2);
    expect(mockApi.saveOutlineOrder).toHaveBeenCalled();
  });

  it('throws error when write fails mid-batch', async () => {
    mockApi.writeFile.mockRejectedValueOnce(new Error('Disk full'));

    const drafts: DraftItem[] = [
      { kind: 'lesson', title: 'L1', content: '# L1' },
      { kind: 'quiz', title: 'Q1', content: '{}' },
    ];

    await expect(applyDraftBatch(mockApi as any, drafts)).rejects.toThrow('Disk full');
  });
});