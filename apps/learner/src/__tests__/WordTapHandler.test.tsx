import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { WordTapHandler } from '../ai/WordTapHandler';
import type { SearchResponse } from '@open-edu/ai-companion';

const mockSearch = vi.fn() as ReturnType<typeof vi.fn> & ((query: string) => SearchResponse);
const mockSetPanelState = vi.fn();
const mockSendMessage = vi.fn();

const defaultSearchResponse = {
  query: '',
  instant: { entry: null, suggestions: [] },
  enriched: Promise.resolve({
    ftsResults: [],
    cachedAiResponse: null,
    courseReferences: [],
  }),
};

vi.mock('../ai/CompanionProvider', () => ({
  useCompanion: () => ({
    setPanelState: mockSetPanelState,
    sendMessage: mockSendMessage,
    search: mockSearch,
    context: {},
    messages: [],
    isLoading: false,
    clearConversation: vi.fn(),
    contextManager: { getCurrentContext: vi.fn(), subscribe: vi.fn(), updateContext: vi.fn() },
  }),
}));

function getMockRange(textNode: Node, length: number): Range {
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, length);
  return range;
}

beforeEach(() => {
  if (!('caretRangeFromPoint' in document)) {
    Object.defineProperty(document, 'caretRangeFromPoint', {
      value: () => null,
      writable: true,
      configurable: true,
    });
  }
  mockSearch.mockReturnValue(defaultSearchResponse);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

function renderWithWordTap(children: React.ReactNode) {
  const result = render(<WordTapHandler>{children}</WordTapHandler>);
  const contentDiv = result.container.firstChild as HTMLElement;
  const wordEl = contentDiv.querySelector('p')!;
  const range = getMockRange(wordEl.firstChild!, wordEl.textContent!.length);
  const spyCaret = vi.spyOn(document, 'caretRangeFromPoint').mockReturnValue(range);
  return { ...result, contentDiv, wordEl, spyCaret };
}

function doubleTap(wordEl: HTMLElement, x = 50, y = 50) {
  fireEvent.mouseDown(wordEl, { clientX: x, clientY: y });
  fireEvent.mouseUp(wordEl, { clientX: x, clientY: y });
  fireEvent.mouseDown(wordEl, { clientX: x, clientY: y });
  fireEvent.mouseUp(wordEl, { clientX: x, clientY: y });
}

function singleClick(wordEl: HTMLElement, x = 50, y = 50) {
  fireEvent.mouseDown(wordEl, { clientX: x, clientY: y });
  fireEvent.mouseUp(wordEl, { clientX: x, clientY: y });
}

describe('WordTapHandler', () => {
  it('renders children', () => {
    render(
      <WordTapHandler>
        <p>Hello world</p>
      </WordTapHandler>,
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('does not show popover on single tap', () => {
    mockSearch.mockReturnValue({
      query: 'gravity',
      instant: {
        entry: {
          word: 'gravity',
          phonetic: 'ɡrævɪti',
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'The force that attracts a body toward the center of the earth',
              example: 'Gravity keeps us on the ground.',
            },
          ],
          synonyms: ['attraction', 'pull'],
        },
        suggestions: [],
      },
      enriched: Promise.resolve({
        ftsResults: [],
        cachedAiResponse: null,
        courseReferences: [],
      }),
    });

    const { wordEl } = renderWithWordTap(<p>gravity</p>);
    singleClick(wordEl);

    expect(screen.queryByTestId('word-tap-popover')).not.toBeInTheDocument();
  });

  it('shows popover on double-tap of a known word', () => {
    mockSearch.mockReturnValue({
      query: 'gravity',
      instant: {
        entry: {
          word: 'gravity',
          phonetic: 'ɡrævɪti',
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'The force that attracts a body toward the center of the earth',
              example: 'Gravity keeps us on the ground.',
            },
          ],
          synonyms: ['attraction', 'pull'],
        },
        suggestions: [],
      },
      enriched: Promise.resolve({
        ftsResults: [],
        cachedAiResponse: null,
        courseReferences: [],
      }),
    });

    const { contentDiv, wordEl } = renderWithWordTap(<p>gravity</p>);

    expect(contentDiv).toHaveAttribute('data-testid', 'word-tap-container');

    doubleTap(wordEl);

    const popover = screen.getByTestId('word-tap-popover');
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveAttribute('role', 'dialog');
    expect(popover).toHaveAttribute('aria-label', 'Definition for gravity');
  });

  it('shows full definition in popover with phonetic and part of speech', () => {
    mockSearch.mockReturnValue({
      query: 'gravity',
      instant: {
        entry: {
          word: 'gravity',
          phonetic: 'ɡrævɪti',
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'The force that attracts a body toward the center of the earth',
              example: 'Gravity keeps us on the ground.',
            },
          ],
          synonyms: ['attraction', 'pull'],
        },
        suggestions: [],
      },
      enriched: Promise.resolve({
        ftsResults: [],
        cachedAiResponse: null,
        courseReferences: [],
      }),
    });

    const { wordEl } = renderWithWordTap(<p>gravity</p>);
    doubleTap(wordEl);

    const popover = screen.getByTestId('word-tap-popover');
    expect(popover).toHaveTextContent('gravity');
    expect(popover).toHaveTextContent('ɡrævɪti');
    expect(popover).toHaveTextContent('noun');
    expect(popover).toHaveTextContent(
      'The force that attracts a body toward the center of the earth',
    );
    expect(popover).toHaveTextContent(/Gravity keeps us on the ground/);
    expect(popover).toHaveTextContent(/attraction/);
  });

  it('shows suggestions when no exact match is found', () => {
    mockSearch.mockReturnValue({
      query: 'gravi',
      instant: {
        entry: null,
        suggestions: ['gravity', 'gravel', 'gravy'],
      },
      enriched: Promise.resolve({
        ftsResults: [],
        cachedAiResponse: null,
        courseReferences: [],
      }),
    });

    const { wordEl } = renderWithWordTap(<p>gravi</p>);
    doubleTap(wordEl);

    expect(screen.getByText('Did you mean?')).toBeInTheDocument();
  });

  it('does not show popover on drag (text selection)', () => {
    const { wordEl } = renderWithWordTap(<p>gravity</p>);

    fireEvent.mouseDown(wordEl, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(wordEl, { clientX: 100, clientY: 100 });

    expect(screen.queryByTestId('word-tap-popover')).not.toBeInTheDocument();
  });

  it('shows loading state then results for unknown words', async () => {
    let resolveEnriched!: (value: unknown) => void;
    const enrichedDeferred = new Promise((resolve) => {
      resolveEnriched = resolve;
    });

    mockSearch.mockReturnValue({
      query: 'graviti',
      instant: {
        entry: null,
        suggestions: [],
      },
      enriched: enrichedDeferred,
    });

    const { wordEl } = renderWithWordTap(<p>graviti</p>);
    doubleTap(wordEl);

    expect(screen.getByText('Looking up...')).toBeInTheDocument();

    act(() => {
      resolveEnriched({
        ftsResults: [
          {
            word: 'gravity',
            phonetic: 'ɡrævɪti',
            partOfSpeech: 'noun',
            definitions: [
              {
                definition: 'The force that attracts a body toward the center of the earth',
                example: 'Gravity keeps us on the ground.',
              },
            ],
          },
        ],
        cachedAiResponse: null,
        courseReferences: [],
      });
    });

    await waitFor(() => {
      const popover = screen.getByTestId('word-tap-popover');
      expect(popover).toHaveTextContent(/gravity/i);
      expect(popover).toHaveTextContent(/ɡrævɪti/);
    });
  });

  it('shows Ask AI button in popover for unknown words', async () => {
    let resolveEnriched!: (value: unknown) => void;
    const enrichedDeferred = new Promise((resolve) => {
      resolveEnriched = resolve;
    });

    mockSearch.mockReturnValue({
      query: 'gravity',
      instant: {
        entry: null,
        suggestions: [],
      },
      enriched: enrichedDeferred,
    });

    const { wordEl } = renderWithWordTap(<p>gravity</p>);
    doubleTap(wordEl);

    expect(screen.getByText('Looking up...')).toBeInTheDocument();

    act(() => {
      resolveEnriched({
        ftsResults: [],
        cachedAiResponse: null,
        courseReferences: [],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('word-popover-ask-ai')).toBeInTheDocument();
    });
  });

  it('closes popover when clicking outside', async () => {
    mockSearch.mockReturnValue({
      query: 'gravity',
      instant: {
        entry: {
          word: 'gravity',
          phonetic: 'ɡrævɪti',
          partOfSpeech: 'noun',
          definitions: [{ definition: 'The force that attracts a body', example: undefined }],
        },
        suggestions: [],
      },
      enriched: Promise.resolve({
        ftsResults: [],
        cachedAiResponse: null,
        courseReferences: [],
      }),
    });

    const { wordEl } = renderWithWordTap(<p>gravity</p>);
    doubleTap(wordEl);

    await waitFor(() => {
      expect(screen.getByTestId('word-tap-popover')).toBeInTheDocument();
    });

    const backdrop = screen.getByTestId('word-tap-popover').parentElement;
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);

    await waitFor(() => {
      expect(screen.queryByTestId('word-tap-popover')).not.toBeInTheDocument();
    });
  });

  it('has no accessibility violations', async () => {
    const axe = await import('axe-core');
    mockSearch.mockReturnValue({
      query: 'gravity',
      instant: {
        entry: {
          word: 'gravity',
          phonetic: 'ɡrævɪti',
          partOfSpeech: 'noun',
          definitions: [{ definition: 'The force that attracts a body', example: undefined }],
          synonyms: ['attraction'],
        },
        suggestions: [],
      },
      enriched: Promise.resolve({
        ftsResults: [],
        cachedAiResponse: null,
        courseReferences: [],
      }),
    });

    const { wordEl } = renderWithWordTap(<p>gravity</p>);
    doubleTap(wordEl);

    await waitFor(() => {
      expect(screen.getByTestId('word-tap-popover')).toBeInTheDocument();
    });

    const results = await axe.default.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toHaveLength(0);
  });
});
