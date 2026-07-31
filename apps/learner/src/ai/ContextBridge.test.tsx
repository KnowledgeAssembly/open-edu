import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ContextBridge } from './ContextBridge';
import type { ContextManager } from '@open-edu/ai-companion';

vi.mock('@open-edu/runtime', () => ({
  useRuntimeOptional: vi.fn(),
}));

import { useRuntimeOptional } from '@open-edu/runtime';

describe('ContextBridge', () => {
  it('updates context manager when runtime context changes', () => {
    const updateContext = vi.fn();
    const mockManager = { updateContext } as unknown as ContextManager;

    (useRuntimeOptional as ReturnType<typeof vi.fn>).mockReturnValue({
      loadedPackage: { manifest: { id: 'bio101', title: 'Biology 101' } },
      currentNodeId: 'lesson-1',
      currentNode: {
        content: '# Cell Structure\n\nCells are the building blocks of life.',
        node: { type: 'lesson', title: 'Cell Structure' },
      },
    });

    render(<ContextBridge contextManager={mockManager} />);
    expect(updateContext).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 'bio101',
        courseTitle: 'Biology 101',
        lessonId: 'lesson-1',
        lessonTitle: 'Cell Structure',
      }),
    );
  });

  it('passes the current node markdown as pageContent', () => {
    const updateContext = vi.fn();
    const mockManager = { updateContext } as unknown as ContextManager;

    (useRuntimeOptional as ReturnType<typeof vi.fn>).mockReturnValue({
      loadedPackage: { manifest: { id: 'bio101', title: 'Biology 101' } },
      currentNodeId: 'lesson-1',
      currentNode: {
        content: '# Cell Structure\n\nCells are the building blocks of life.',
        node: { type: 'lesson', title: 'Cell Structure' },
      },
    });

    render(<ContextBridge contextManager={mockManager} />);
    expect(updateContext).toHaveBeenCalledWith(
      expect.objectContaining({
        pageContent: '# Cell Structure\n\nCells are the building blocks of life.',
      }),
    );
  });

  it('omits pageContent when there is no current node', () => {
    const updateContext = vi.fn();
    const mockManager = { updateContext } as unknown as ContextManager;

    (useRuntimeOptional as ReturnType<typeof vi.fn>).mockReturnValue({
      loadedPackage: { manifest: { id: 'bio101', title: 'Biology 101' } },
      currentNodeId: 'lesson-1',
      currentNode: null,
    });

    render(<ContextBridge contextManager={mockManager} />);
    expect(updateContext).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: 'lesson-1',
        lessonTitle: 'lesson-1',
        pageContent: undefined,
      }),
    );
  });

  it('does nothing when runtime is null', () => {
    const updateContext = vi.fn();
    const mockManager = { updateContext } as unknown as ContextManager;

    (useRuntimeOptional as ReturnType<typeof vi.fn>).mockReturnValue(null);

    render(<ContextBridge contextManager={mockManager} />);
    expect(updateContext).not.toHaveBeenCalled();
  });
});
