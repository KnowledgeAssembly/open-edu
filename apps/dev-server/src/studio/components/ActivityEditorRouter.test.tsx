import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { ActivityEditorRouter } from './ActivityEditorRouter';
import type { StudioApi } from '../studioApi.js';

const { mockPanelHandlers } = vi.hoisted(() => ({
  mockPanelHandlers: { onApply: vi.fn(), onApplyBatch: vi.fn() },
}));

vi.mock('./AiEditPanel.js', () => ({
  AiEditPanel: ({
    onApply,
    onApplyBatch,
  }: {
    onApply: (item: unknown) => void;
    onApplyBatch: (items: unknown[]) => void;
  }) => {
    mockPanelHandlers.onApply.mockImplementation(onApply);
    mockPanelHandlers.onApplyBatch.mockImplementation(onApplyBatch);
    return <div data-testid="ai-edit-panel" />;
  },
}));

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

function makeApi(content: string, path = 'nodes/x.md'): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn(),
    saveOutlineOrder: vi.fn(),
    applyTemplate: vi.fn(),
    exportOep: vi.fn(),
    readFile: vi.fn().mockResolvedValue({ path, content }),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
    getAiStatus: vi.fn().mockResolvedValue({ available: false }),
    generateItemEdit: vi.fn(),
  } as unknown as StudioApi;
}

describe('ActivityEditorRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes markdown to the lesson editor', async () => {
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi('# Hi', 'nodes/l.md')}
          path="nodes/l.md"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByLabelText(/lesson content/i)).toBeInTheDocument();
  });

  it('routes quiz json to the quiz editor', async () => {
    const content = JSON.stringify({
      type: 'quiz',
      question: 'Q?',
      options: [
        { id: 'a', text: 'A', correct: true },
        { id: 'b', text: 'B', correct: false },
      ],
    });
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi(content, 'nodes/q.json')}
          path="nodes/q.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByLabelText(/question/i)).toBeInTheDocument();
  });

  it('routes practice json to the practice editor', async () => {
    const content = JSON.stringify({
      type: 'exercise',
      widget: 'core.multiple-choice',
      config: {},
    });
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi(content, 'nodes/p.json')}
          path="nodes/p.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByLabelText(/lesson title/i)).toBeInTheDocument();
  });

  it('shows advanced-activity message for other activity types', async () => {
    const content = JSON.stringify({ type: 'reflection', prompt: 'Think about it' });
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi(content, 'nodes/r.json')}
          path="nodes/r.json"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(
      await screen.findByText('Open Developer mode for advanced activity types.'),
    ).toBeInTheDocument();
  });

  it('forwards onCancel to the active editor and cancels from a lesson', async () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi('# Hi', 'nodes/l.md')}
          path="nodes/l.md"
          onSaved={() => {}}
          onError={() => {}}
          onCancel={onCancel}
        />,
      ),
    );
    await screen.findByLabelText(/lesson content/i);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('threads onApplyBatch to the active editor', async () => {
    const onApplyBatch = vi.fn();
    render(
      wrap(
        <ActivityEditorRouter
          api={makeApi('# Hi', 'nodes/l.md')}
          path="nodes/l.md"
          onSaved={() => {}}
          onError={() => {}}
          onApplyBatch={onApplyBatch}
        />,
      ),
    );
    await screen.findByLabelText(/lesson content/i);
    expect(mockPanelHandlers.onApplyBatch).toBeDefined();
    mockPanelHandlers.onApplyBatch.mockClear();
    const items = [{ kind: 'lesson', title: 'New', content: '# New\n\nBody' }];
    mockPanelHandlers.onApplyBatch(items);
    expect(onApplyBatch).toHaveBeenCalledWith(items);
  });
});
