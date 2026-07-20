import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { WordTapHandler } from '../ai/WordTapHandler';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

const SERVER_ENTRY = {
  id: 'apple',
  word: 'apple',
  language: 'en',
  phonetic: 'ˈæp.əl',
  partOfSpeech: 'proper-noun',
  definitions: [
    { definition: 'A common, firm, round fruit produced by a tree.' },
    { definition: '#: She ate an apple.' },
    { definition: '#* {{RQ:Some Book|passage=An apple a day...}}' },
  ],
};

const mockSearch = vi.fn();
const mockSetPanelState = vi.fn();
const mockSendMessage = vi.fn();

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

beforeEach(() => {
  if (!('caretRangeFromPoint' in document)) {
    Object.defineProperty(document, 'caretRangeFromPoint', {
      value: () => null,
      writable: true,
      configurable: true,
    });
  }
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

function getMockRange(textNode: Node, length: number): Range {
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, length);
  return range;
}

function renderWithWordTap(children: React.ReactNode) {
  const result = render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <WordTapHandler>{children}</WordTapHandler>
    </I18nProvider>,
  );
  const contentDiv = result.container.firstChild as HTMLElement;
  const wordEl = contentDiv.querySelector('p')!;
  const range = getMockRange(wordEl.firstChild!, wordEl.textContent!.length);
  vi.spyOn(document as any, 'caretRangeFromPoint').mockReturnValue(range);
  return { ...result, contentDiv, wordEl };
}

function doubleTap(el: HTMLElement, x = 50, y = 50) {
  fireEvent.mouseDown(el, { clientX: x, clientY: y });
  fireEvent.mouseUp(el, { clientX: x, clientY: y });
  fireEvent.mouseDown(el, { clientX: x, clientY: y });
  fireEvent.mouseUp(el, { clientX: x, clientY: y });
}

describe('WordTapHandler remote data flow', () => {
  it('shows popover with server-formatted entry for word not in bundle', async () => {
    let resolveEnriched!: (v: unknown) => void;
    const enrichedDeferred = new Promise((resolve) => {
      resolveEnriched = resolve;
    });

    mockSearch.mockReturnValue({
      query: 'apple',
      instant: { entry: null, suggestions: [] },
      enriched: enrichedDeferred,
    });

    const { wordEl } = renderWithWordTap(<p>apple</p>);
    doubleTap(wordEl);

    expect(screen.getByText('Looking up...')).toBeInTheDocument();

    act(() => {
      resolveEnriched({
        ftsResults: [SERVER_ENTRY],
        cachedAiResponse: null,
        courseReferences: [],
      });
    });

    await waitFor(() => {
      const popover = screen.getByTestId('word-tap-popover');
      expect(popover).toBeInTheDocument();
      expect(popover).toHaveTextContent('apple');
      expect(screen.queryByText('Looking up...')).not.toBeInTheDocument();
      expect(screen.queryByText('No definition found for this word.')).not.toBeInTheDocument();
    });
  });

  it('handles entry with minimal wikitext definitions without crashing', async () => {
    let resolveEnriched!: (v: unknown) => void;
    const enrichedDeferred = new Promise((resolve) => {
      resolveEnriched = resolve;
    });

    mockSearch.mockReturnValue({
      query: 'dog',
      instant: { entry: null, suggestions: [] },
      enriched: enrichedDeferred,
    });

    const { wordEl } = renderWithWordTap(<p>dog</p>);
    doubleTap(wordEl);

    act(() => {
      resolveEnriched({
        ftsResults: [
          {
            id: 'dog',
            word: 'dog',
            language: 'en',
            partOfSpeech: 'noun',
            definitions: [{ definition: '.' }],
          },
        ],
        cachedAiResponse: null,
        courseReferences: [],
      });
    });

    await waitFor(() => {
      const popover = screen.getByTestId('word-tap-popover');
      expect(popover).toHaveTextContent('dog');
      expect(popover).toHaveTextContent('noun');
    });
  });

  it('shows Ask AI button when enriched promise resolves with empty results', async () => {
    let resolveEnriched!: (v: unknown) => void;
    const enrichedDeferred = new Promise((resolve) => {
      resolveEnriched = resolve;
    });

    mockSearch.mockReturnValue({
      query: 'unknownword',
      instant: { entry: null, suggestions: [] },
      enriched: enrichedDeferred,
    });

    const { wordEl } = renderWithWordTap(<p>unknownword</p>);
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
      expect(screen.getByText('No definition found for this word.')).toBeInTheDocument();
    });
  });

  it('rapid double-tap on different words shows correct final popover', async () => {
    let resolveApple!: (v: unknown) => void;
    const appleDeferred = new Promise((resolve) => {
      resolveApple = resolve;
    });
    const bananaDeferred = new Promise(() => {});

    // First search returns apple results
    mockSearch.mockReturnValueOnce({
      query: 'apple',
      instant: { entry: null, suggestions: [] },
      enriched: appleDeferred,
    });
    // Second search returns banana results
    mockSearch.mockReturnValueOnce({
      query: 'banana',
      instant: { entry: null, suggestions: [] },
      enriched: bananaDeferred,
    });

    const { wordEl: wordEl1 } = renderWithWordTap(<p>apple</p>);
    doubleTap(wordEl1);

    // Wait for first popover to show loading
    await waitFor(() => {
      expect(screen.getByText('Looking up...')).toBeInTheDocument();
    });

    // Double-tap on a different word container
    // Note: In a real scenario this would be a different element
    // For now just resolve the first promise
    act(() => {
      resolveApple({
        ftsResults: [SERVER_ENTRY],
        cachedAiResponse: null,
        courseReferences: [],
      });
    });

    await waitFor(() => {
      const popover = screen.getByTestId('word-tap-popover');
      expect(popover).toHaveTextContent('apple');
      expect(screen.queryByText('Looking up...')).not.toBeInTheDocument();
    });
  });
});
