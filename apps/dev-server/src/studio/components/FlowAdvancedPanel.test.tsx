import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { FlowAdvancedPanel } from './FlowAdvancedPanel';
import type { StudioApi } from '../studioApi.js';
import type { ActivitySummary } from '../types.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const linearActivities: ActivitySummary[] = [
  { id: 'nodes/a.md', path: 'nodes/a.md', title: 'Intro', kind: 'lesson' },
  { id: 'nodes/b.json', path: 'nodes/b.json', title: 'Check', kind: 'quiz' },
];

const linearWorkflow = {
  routing: {
    'nodes/a.md': { onComplete: 'nodes/b.json' },
    'nodes/b.json': { onComplete: 'COMPLETED' },
  },
};

const branchingActivities: ActivitySummary[] = [
  { id: 'nodes/checkpoint.json', path: 'nodes/checkpoint.json', title: 'Checkpoint', kind: 'quiz' },
  { id: 'nodes/reflection.md', path: 'nodes/reflection.md', title: 'Reflection', kind: 'lesson' },
  { id: 'nodes/remediation.md', path: 'nodes/remediation.md', title: 'Remediation', kind: 'lesson' },
];

const branchingWorkflow = {
  routing: {
    'nodes/checkpoint.json': {
      conditions: [
        { if: 'score >= 80', then: 'nodes/reflection.md' },
        { if: 'score < 80', then: 'nodes/remediation.md' },
      ],
    },
    'nodes/reflection.md': { onComplete: 'COMPLETED' },
    'nodes/remediation.md': { onComplete: 'nodes/checkpoint.json' },
  },
};

function makeApi(overrides: Partial<StudioApi> = {}): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn().mockResolvedValue({ activities: linearActivities, title: 'Test' }),
    saveOutlineOrder: vi.fn(),
    applyTemplate: vi.fn(),
    exportOep: vi.fn(),
    readFile: vi.fn().mockResolvedValue({
      path: 'workflow.json',
      content: JSON.stringify(linearWorkflow),
    }),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  } as unknown as StudioApi;
}

describe('FlowAdvancedPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the add-rule button and linear help when there are no branches', async () => {
    render(wrap(<FlowAdvancedPanel api={makeApi()} onError={() => {}} />));
    expect(await screen.findByRole('button', { name: /add a score rule/i })).toBeInTheDocument();
    expect(screen.getByText('Learners go through activities in outline order.')).toBeInTheDocument();
  });

  it('adding a rule renders a row with the activity selects', async () => {
    render(wrap(<FlowAdvancedPanel api={makeApi()} onError={() => {}} />));
    await userEvent.click(await screen.findByRole('button', { name: /add a score rule/i }));
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
    expect(screen.getByLabelText('If score is at least')).toHaveValue(80);
    expect(screen.getByLabelText('Then go to')).toBeInTheDocument();
    expect(screen.getByLabelText('Otherwise go to')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove rule/i })).toBeInTheDocument();
  });

  it('changing min score and saving writes a score-branch workflow', async () => {
    const api = makeApi();
    render(wrap(<FlowAdvancedPanel api={api} onError={() => {}} />));
    await userEvent.click(await screen.findByRole('button', { name: /add a score rule/i }));
    fireEvent.change(screen.getByLabelText('If score is at least'), {
      target: { value: '85' },
    });
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    expect(writeCall).toHaveBeenCalledTimes(1);
    expect(writeCall.mock.calls[0]![0]).toBe('workflow.json');
    const parsed = JSON.parse(writeCall.mock.calls[0]![1] as string);
    expect(parsed.routing['nodes/a.md'].conditions).toEqual([
      { if: 'score >= 85', then: 'nodes/b.json' },
      { if: 'score < 85', then: 'COMPLETED' },
    ]);
    expect(parsed.routing['nodes/b.json']).toEqual({ onComplete: 'COMPLETED' });
  });

  it('removing all rules and saving writes a linear workflow', async () => {
    const api = makeApi();
    render(wrap(<FlowAdvancedPanel api={api} onError={() => {}} />));
    await userEvent.click(await screen.findByRole('button', { name: /add a score rule/i }));
    await userEvent.click(screen.getByRole('button', { name: /remove rule/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    const parsed = JSON.parse(writeCall.mock.calls[0]![1] as string);
    expect(parsed.routing).toEqual(linearWorkflow.routing);
  });

  it('loading a workflow with a recognized branch shows it pre-filled', async () => {
    const api = makeApi({
      getOutline: vi.fn().mockResolvedValue({ activities: branchingActivities, title: 'T' }),
      readFile: vi.fn().mockResolvedValue({
        path: 'workflow.json',
        content: JSON.stringify(branchingWorkflow),
      }),
    });
    render(wrap(<FlowAdvancedPanel api={api} onError={() => {}} />));
    expect(await screen.findByLabelText('If score is at least')).toHaveValue(80);
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
    expect(screen.queryByText('Learners go through activities in outline order.')).toBeNull();
  });

  it('shows the empty state when there are no activities', async () => {
    const api = makeApi({
      getOutline: vi.fn().mockResolvedValue({ activities: [], title: 'T' }),
    });
    render(wrap(<FlowAdvancedPanel api={api} onError={() => {}} />));
    expect(await screen.findByText('Learning path')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add activities in the Outline first, then come back to shape the learning path.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add a score rule/i })).toBeNull();
  });

  it('warns when the loaded workflow contains unrecognized advanced rules', async () => {
    const complexWorkflow = {
      routing: {
        'nodes/a.md': { onComplete: 'nodes/b.json' },
        'nodes/b.json': {
          conditions: [
            { if: 'score >= 90 && attempts < 3', then: 'nodes/a.md' },
            { if: 'score < 90', then: 'COMPLETED' },
          ],
        },
      },
    };
    const api = makeApi({
      readFile: vi.fn().mockResolvedValue({
        path: 'workflow.json',
        content: JSON.stringify(complexWorkflow),
      }),
    });
    render(wrap(<FlowAdvancedPanel api={api} onError={() => {}} />));
    expect(
      await screen.findByText(
        "Some advanced rules aren't shown here and will be replaced when you save.",
      ),
    ).toBeInTheDocument();
  });

  it('reports write errors through onError', async () => {
    const onError = vi.fn();
    const api = makeApi({
      writeFile: vi.fn().mockRejectedValue(new Error('nope')),
    });
    render(wrap(<FlowAdvancedPanel api={api} onError={onError} />));
    await userEvent.click(await screen.findByRole('button', { name: /add a score rule/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('nope')));
  });

  it('shows a transient saved indicator after a successful save', async () => {
    render(wrap(<FlowAdvancedPanel api={makeApi()} onError={() => {}} />));
    await userEvent.click(await screen.findByRole('button', { name: /add a score rule/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});
