import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { OutlineView } from './OutlineView';
import type { StudioApi } from '../studioApi.js';
import type { ActivitySummary } from '../types.js';
import type { CuratedWidget } from '../widgets/curatedCatalog.js';

const { mockCatalog } = vi.hoisted(() => {
  const multipleChoice: CuratedWidget = {
    id: 'core.multiple-choice',
    name: 'Multiple Choice',
    description: 'Select the correct answer from a list of options',
    domain: 'core',
    guide: { configFields: [] },
  };
  return {
    mockCatalog: {
      multipleChoice,
      matching: {
        id: 'core.matching',
        name: 'Matching',
        domain: 'core',
        guide: { configFields: [] },
      } as CuratedWidget,
    },
  };
});

vi.mock('../widgets/curatedCatalog.js', () => ({
  listCuratedWidgets: () => [mockCatalog.multipleChoice, mockCatalog.matching],
  getCuratedWidget: (id: string) =>
    id === 'core.multiple-choice' ? mockCatalog.multipleChoice : undefined,
}));

const { mockAcceptDraft } = vi.hoisted(() => ({ mockAcceptDraft: vi.fn() }));

vi.mock('./AiAddDialog.js', () => ({
  AiAddDialog: ({ onAccept }: { onAccept: (item: unknown) => void }) => {
    mockAcceptDraft.mockImplementation(onAccept);
    return <div data-testid="ai-add-dialog" />;
  },
}));

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const sampleActivities: ActivitySummary[] = [
  { id: 'nodes/a.md', path: 'nodes/a.md', title: 'Intro', kind: 'lesson' },
  { id: 'nodes/q.json', path: 'nodes/q.json', title: 'Check', kind: 'quiz' },
];

function makeApi(overrides: Partial<StudioApi> = {}): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn().mockResolvedValue({ activities: sampleActivities, title: 'Test' }),
    saveOutlineOrder: vi.fn().mockResolvedValue({ success: true }),
    applyTemplate: vi.fn(),
    exportOep: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    getAiStatus: vi.fn().mockResolvedValue({ available: true }),
    generateItemAdd: vi.fn(),
    ...overrides,
  } as unknown as StudioApi;
}

describe('OutlineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders activities with kind badges', async () => {
    render(wrap(<OutlineView api={makeApi()} onEdit={() => {}} onError={() => {}} />));
    expect(await screen.findByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('Lesson')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
  });

  it('saves new order on move down', async () => {
    const api = makeApi();
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    await userEvent.click(screen.getByRole('button', { name: /move intro down/i }));
    expect(api.saveOutlineOrder).toHaveBeenCalledWith(['nodes/q.json', 'nodes/a.md']);
  });

  it('adds a lesson and persists outline order', async () => {
    const api = makeApi();
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    await userEvent.click(screen.getByRole('button', { name: /add lesson/i }));
    expect(api.writeFile).toHaveBeenCalled();
    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    const path = writeCall.mock.calls[0]![0] as string;
    expect(path.startsWith('nodes/lesson-')).toBe(true);
    expect(api.saveOutlineOrder).toHaveBeenCalled();
    const orderCall = api.saveOutlineOrder as ReturnType<typeof vi.fn>;
    expect(orderCall.mock.calls.at(-1)![0]).toEqual([...sampleActivities.map((a) => a.path), path]);
  });

  it('adds a quiz with a correct option', async () => {
    const api = makeApi();
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    await userEvent.click(screen.getByRole('button', { name: 'Add quiz' }));
    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    const path = writeCall.mock.calls[0]![0] as string;
    expect(path.endsWith('.json')).toBe(true);
    const content = writeCall.mock.calls[0]![1] as string;
    const parsed = JSON.parse(content);
    expect(parsed.type).toBe('quiz');
    expect(parsed.options.some((o: { correct?: boolean }) => o.correct)).toBe(true);
  });

  it('adds a practice via the widget picker and persists outline order', async () => {
    const api = makeApi();
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    await userEvent.click(screen.getByRole('button', { name: /add practice/i }));
    const useButtons = await screen.findAllByRole('button', { name: /use this practice/i });
    await userEvent.click(useButtons[0]!);
    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    const path = writeCall.mock.calls[0]![0] as string;
    expect(path.startsWith('nodes/practice-')).toBe(true);
    expect(path.endsWith('.json')).toBe(true);
    const content = writeCall.mock.calls[0]![1] as string;
    const parsed = JSON.parse(content);
    expect(parsed.type).toBe('exercise');
    expect(parsed.widget).toBe('core.multiple-choice');
    expect(api.saveOutlineOrder).toHaveBeenCalled();
    const orderCall = api.saveOutlineOrder as ReturnType<typeof vi.fn>;
    expect(orderCall.mock.calls.at(-1)![0]).toEqual([...sampleActivities.map((a) => a.path), path]);
  });

  it('navigates to edit for an activity', async () => {
    const onEdit = vi.fn();
    render(wrap(<OutlineView api={makeApi()} onEdit={onEdit} onError={() => {}} />));
    await screen.findByText('Intro');
    const list = screen.getByRole('list');
    await userEvent.click(within(list).getAllByRole('button', { name: /edit/i })[0]!);
    expect(onEdit).toHaveBeenCalledWith('nodes/a.md');
  });

  it('shows empty state when no activities', async () => {
    const api = makeApi({ getOutline: vi.fn().mockResolvedValue({ activities: [], title: 'T' }) });
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    expect(await screen.findByText('Add your first activity to get started.')).toBeInTheDocument();
  });

  it('reports load errors', async () => {
    const onError = vi.fn();
    const api = makeApi({ getOutline: vi.fn().mockRejectedValue(new Error('nope')) });
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={onError} />));
    expect(await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('nope')));
  });

  it('opens the AI draft dialog from the outline button', async () => {
    render(wrap(<OutlineView api={makeApi()} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    await userEvent.click(screen.getByRole('button', { name: /ai draft/i }));
    expect(screen.getByTestId('ai-add-dialog')).toBeInTheDocument();
  });

  it('accepting an AI draft writes the file, appends the row, and persists order', async () => {
    const api = makeApi();
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    mockAcceptDraft.mockClear();

    await act(async () => {
      mockAcceptDraft({
        kind: 'quiz',
        title: 'Drafted quiz',
        content: JSON.stringify({
          type: 'quiz',
          question: 'Drafted?',
          options: [
            { id: 'a', text: 'A', correct: true },
            { id: 'b', text: 'B', correct: false },
            { id: 'c', text: 'C', correct: false },
            { id: 'd', text: 'D', correct: false },
          ],
        }),
      });
    });

    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    const path = writeCall.mock.calls[0]![0] as string;
    expect(path).toMatch(/^nodes\/quiz-\d+\.json$/);
    expect(api.saveOutlineOrder).toHaveBeenCalled();
    const orderCall = api.saveOutlineOrder as ReturnType<typeof vi.fn>;
    expect(orderCall.mock.calls.at(-1)![0]).toEqual([...sampleActivities.map((a) => a.path), path]);
  });

  it('renders empty (not spinner) via within list when activities present', async () => {
    render(wrap(<OutlineView api={makeApi()} onEdit={() => {}} onError={() => {}} />));
    const list = await screen.findByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('deletes an activity and persists the new order', async () => {
    const api = makeApi();
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete check/i }));
    });
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });
    expect(api.deleteFile).toHaveBeenCalledWith('nodes/q.json');
    expect(api.saveOutlineOrder).toHaveBeenCalledWith(['nodes/a.md']);
    expect(screen.queryByText('Check')).not.toBeInTheDocument();
  });

  it('cancel does not delete', async () => {
    const api = makeApi();
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete check/i }));
    });
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    expect(api.deleteFile).not.toHaveBeenCalled();
    expect(screen.getByText('Check')).toBeInTheDocument();
  });

  it('deleting the last activity succeeds with an empty order', async () => {
    const api = makeApi({
      getOutline: vi.fn().mockResolvedValue({
        activities: [{ id: 'nodes/a.md', path: 'nodes/a.md', title: 'Intro', kind: 'lesson' }],
        title: 'Test',
      }),
    });
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
    await screen.findByText('Intro');
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete intro/i }));
    });
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });
    expect(api.deleteFile).toHaveBeenCalledWith('nodes/a.md');
    expect(api.saveOutlineOrder).toHaveBeenCalledWith([]);
    expect(await screen.findByText('Add your first activity to get started.')).toBeInTheDocument();
  });

  it('reconciles with the server when persisting the new order fails', async () => {
    const getOutline = vi.fn().mockResolvedValue({ activities: sampleActivities, title: 'Test' });
    const onError = vi.fn();
    const api = makeApi({
      getOutline,
      saveOutlineOrder: vi.fn().mockRejectedValue(new Error('save failed')),
    });
    render(wrap(<OutlineView api={api} onEdit={() => {}} onError={onError} />));
    await screen.findByText('Intro');
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete check/i }));
    });
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });
    expect(onError).toHaveBeenCalledWith('save failed');
    expect(await screen.findByText('Check')).toBeInTheDocument();
  });
});
