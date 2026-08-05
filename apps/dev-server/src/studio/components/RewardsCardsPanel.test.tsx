import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { RewardsCardsPanel } from './RewardsCardsPanel';
import type { StudioApi } from '../studioApi.js';

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => {},
  });
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => {},
  });
});

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const outline = {
  title: 'Test Course',
  activities: [{ id: 'nodes/q1.json', path: 'nodes/q1.json', title: 'Quiz 1', kind: 'quiz' }],
};

function makeApi(overrides: Partial<StudioApi> = {}): StudioApi {
  return {
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn().mockResolvedValue(outline),
    saveOutlineOrder: vi.fn(),
    applyTemplate: vi.fn(),
    exportOep: vi.fn(),
    readFile: vi.fn().mockRejectedValue(new Error('404')),
    writeFile: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  } as unknown as StudioApi;
}

const EMPTY_TEXT = 'No rewards yet. Add a badge or card to celebrate progress.';

describe('RewardsCardsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty state when there are no rewards or cards', async () => {
    render(wrap(<RewardsCardsPanel api={makeApi()} onError={() => {}} />));
    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add completion badge/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add quiz-pass badge/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add knowledge card/i })).toBeInTheDocument();
  });

  it('adding a completion badge writes a workflow_complete rewards.json', async () => {
    const api = makeApi();
    render(wrap(<RewardsCardsPanel api={api} onError={() => {}} />));
    await screen.findByText(EMPTY_TEXT);
    await userEvent.click(screen.getByRole('button', { name: /add completion badge/i }));
    await userEvent.type(screen.getByLabelText('Badge name'), 'Course star');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add/i }));

    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    expect(writeCall).toHaveBeenCalledTimes(1);
    expect(writeCall.mock.calls[0]![0]).toBe('rewards.json');
    const parsed = JSON.parse(writeCall.mock.calls[0]![1] as string);
    expect(parsed.triggers).toEqual([
      { onEvent: 'workflow_complete', rewards: [{ action: 'badge.award', badge: 'Course star' }] },
    ]);
  });

  it('adding a quiz-pass badge writes a node_complete trigger with a score condition on the selected quiz', async () => {
    const api = makeApi({
      getOutline: vi.fn().mockResolvedValue({
        title: 'Test Course',
        activities: [
          { id: 'nodes/q1.json', path: 'nodes/q1.json', title: 'Quiz 1', kind: 'quiz' },
          { id: 'nodes/q2.json', path: 'nodes/q2.json', title: 'Quiz 2', kind: 'quiz' },
        ],
      }),
    });
    render(wrap(<RewardsCardsPanel api={api} onError={() => {}} />));
    await screen.findByText(EMPTY_TEXT);
    await userEvent.click(screen.getByRole('button', { name: /add quiz-pass badge/i }));
    await userEvent.type(screen.getByLabelText('Badge name'), 'Quiz star');
    fireEvent.click(screen.getByRole('combobox', { name: /quiz activity/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Quiz 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add/i }));

    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    expect(writeCall).toHaveBeenCalledTimes(1);
    expect(writeCall.mock.calls[0]![0]).toBe('rewards.json');
    const parsed = JSON.parse(writeCall.mock.calls[0]![1] as string);
    expect(parsed.triggers).toEqual([
      {
        onEvent: 'node_complete',
        rewards: [
          {
            action: 'badge.award',
            badge: 'Quiz star',
            condition: { type: 'score', nodeId: 'nodes/q2.json', minScore: 80 },
          },
        ],
      },
    ]);
  });

  it('disables the quiz badge form and hints when the outline has no quiz', async () => {
    const api = makeApi({
      getOutline: vi.fn().mockResolvedValue({
        title: 'T',
        activities: [{ id: 'nodes/a.md', path: 'nodes/a.md', title: 'Intro', kind: 'lesson' }],
      }),
    });
    render(wrap(<RewardsCardsPanel api={api} onError={() => {}} />));
    await screen.findByText(EMPTY_TEXT);
    await userEvent.click(screen.getByRole('button', { name: /add quiz-pass badge/i }));
    expect(screen.getByText('Add a quiz to your outline first.')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('adding a knowledge card writes a cards.json entry with a chain unlock', async () => {
    const api = makeApi();
    render(wrap(<RewardsCardsPanel api={api} onError={() => {}} />));
    await screen.findByText(EMPTY_TEXT);
    await userEvent.click(screen.getByRole('button', { name: /add knowledge card/i }));
    await userEvent.type(screen.getByLabelText('Card title'), 'Photosynthesis');
    await userEvent.type(screen.getByLabelText('Card text'), 'Plants make food from light.');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add/i }));

    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    expect(writeCall).toHaveBeenCalledTimes(1);
    expect(writeCall.mock.calls[0]![0]).toBe('cards.json');
    const parsed = JSON.parse(writeCall.mock.calls[0]![1] as string);
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0]).toMatchObject({
      id: expect.stringMatching(/^photosynthesis-\d+$/),
      title: 'Photosynthesis',
      category: 'Knowledge',
      type: 'knowledge',
      summary: 'Plants make food from light.',
      unlock: { type: 'chain', completedNodeIds: ['nodes/q1.json'] },
    });
  });

  it('renders existing rewards in plain language', async () => {
    const api = makeApi({
      readFile: vi.fn().mockImplementation((path: string) => {
        if (path === 'rewards.json') {
          return Promise.resolve({
            path,
            content: JSON.stringify({
              triggers: [
                {
                  onEvent: 'workflow_complete',
                  rewards: [{ action: 'badge.award', badge: 'finish-star' }],
                },
                {
                  onEvent: 'node_complete',
                  rewards: [
                    {
                      action: 'badge.award',
                      badge: 'quiz-star',
                      condition: { type: 'score', nodeId: 'nodes/q1.json', minScore: 80 },
                    },
                  ],
                },
              ],
            }),
          });
        }
        return Promise.reject(new Error('404'));
      }),
    });
    render(wrap(<RewardsCardsPanel api={api} onError={() => {}} />));
    expect(await screen.findByText('finish-star')).toBeInTheDocument();
    expect(screen.getByText('When learner finishes the course')).toBeInTheDocument();
    expect(screen.getByText('quiz-star')).toBeInTheDocument();
    expect(screen.getByText('When learner passes Quiz 1')).toBeInTheDocument();
  });

  it('merges a second completion badge into the existing workflow_complete trigger', async () => {
    const api = makeApi({
      readFile: vi.fn().mockImplementation((path: string) => {
        if (path === 'rewards.json') {
          return Promise.resolve({
            path,
            content: JSON.stringify({
              triggers: [
                {
                  onEvent: 'workflow_complete',
                  rewards: [{ action: 'badge.award', badge: 'first-star' }],
                },
              ],
            }),
          });
        }
        return Promise.reject(new Error('404'));
      }),
    });
    render(wrap(<RewardsCardsPanel api={api} onError={() => {}} />));
    await screen.findByText('first-star');
    await userEvent.click(screen.getByRole('button', { name: /add completion badge/i }));
    await userEvent.type(screen.getByLabelText('Badge name'), 'second-star');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add/i }));

    const writeCall = api.writeFile as ReturnType<typeof vi.fn>;
    const parsed = JSON.parse(writeCall.mock.calls[0]![1] as string);
    expect(parsed.triggers).toHaveLength(1);
    expect(parsed.triggers[0].onEvent).toBe('workflow_complete');
    expect(parsed.triggers[0].rewards.map((r: { badge: string }) => r.badge)).toEqual([
      'first-star',
      'second-star',
    ]);
  });

  it('reports write errors through onError', async () => {
    const onError = vi.fn();
    const api = makeApi({
      writeFile: vi.fn().mockRejectedValue(new Error('nope')),
    });
    render(wrap(<RewardsCardsPanel api={api} onError={onError} />));
    await screen.findByText(EMPTY_TEXT);
    await userEvent.click(screen.getByRole('button', { name: /add knowledge card/i }));
    await userEvent.type(screen.getByLabelText('Card title'), 'Title');
    await userEvent.type(screen.getByLabelText('Card text'), 'Body');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add/i }));
    expect(await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('nope')));
  });
});
