import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { LessonActivityEditor } from './LessonActivityEditor';
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

function makeApi(overrides: Partial<StudioApi> = {}): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn(),
    saveOutlineOrder: vi.fn(),
    applyTemplate: vi.fn(),
    exportOep: vi.fn(),
    readFile: vi.fn().mockResolvedValue({ path: 'nodes/l.md', content: '# Title\n\nBody' }),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
    getAiStatus: vi.fn().mockResolvedValue({ available: false }),
    generateItemEdit: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

describe('LessonActivityEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies an AI draft by replacing the body and re-syncing the title', async () => {
    const api = makeApi();
    render(
      wrap(
        <LessonActivityEditor api={api} path="nodes/l.md" onSaved={() => {}} onError={() => {}} />,
      ),
    );
    await screen.findByDisplayValue('Title');
    mockPanelHandlers.onApply.mockClear();
    await act(async () => {
      mockPanelHandlers.onApply({
        kind: 'lesson',
        title: 'Fractions',
        content: '# Fractions\n\nAll about halves.',
      });
    });
    expect(screen.getByDisplayValue('Fractions')).toBeInTheDocument();
    expect((screen.getByLabelText(/lesson content/i) as HTMLTextAreaElement).value).toContain(
      '# Fractions',
    );
  });

  it('loads markdown and extracts title from first heading', async () => {
    render(
      wrap(
        <LessonActivityEditor
          api={makeApi()}
          path="nodes/l.md"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    expect(await screen.findByDisplayValue('Title')).toBeInTheDocument();
  });

  it('syncing title updates the first markdown heading', async () => {
    render(
      wrap(
        <LessonActivityEditor
          api={makeApi()}
          path="nodes/l.md"
          onSaved={() => {}}
          onError={() => {}}
        />,
      ),
    );
    await screen.findByDisplayValue('Title');
    const titleInput = screen.getByLabelText(/lesson title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Fractions');
    const body = screen.getByLabelText(/lesson content/i) as HTMLTextAreaElement;
    expect(body.value).toMatch(/^# Fractions\n/);
  });

  it('warns when markdown lacks a heading', async () => {
    const api = makeApi({
      readFile: vi.fn().mockResolvedValue({ path: 'nodes/l.md', content: 'No heading' }),
    });
    render(
      wrap(
        <LessonActivityEditor api={api} path="nodes/l.md" onSaved={() => {}} onError={() => {}} />,
      ),
    );
    expect(await screen.findByText('Every lesson has a heading')).toBeInTheDocument();
  });

  it('saves content via writeFile', async () => {
    const api = makeApi();
    render(
      wrap(
        <LessonActivityEditor api={api} path="nodes/l.md" onSaved={() => {}} onError={() => {}} />,
      ),
    );
    await screen.findByDisplayValue('Title');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    expect(writeCall).toHaveBeenCalledWith('nodes/l.md', '# Title\n\nBody');
  });

  it('cancels without writing when onCancel is provided', async () => {
    const api = makeApi();
    const onCancel = vi.fn();
    render(
      wrap(
        <LessonActivityEditor
          api={api}
          path="nodes/l.md"
          onSaved={() => {}}
          onError={() => {}}
          onCancel={onCancel}
        />,
      ),
    );
    await screen.findByDisplayValue('Title');
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    expect(writeCall).not.toHaveBeenCalled();
  });
});
