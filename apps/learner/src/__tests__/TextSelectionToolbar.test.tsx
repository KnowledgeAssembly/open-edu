import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { TextSelectionToolbar } from '../ai/TextSelectionToolbar';
import type { SearchResponse } from '@open-edu/ai-companion';

const mockSearch = vi.fn() as ReturnType<typeof vi.fn> & ((query: string) => SearchResponse);

const defaultSearchResponse: SearchResponse = {
  query: '',
  instant: { entry: null, suggestions: [] },
  enriched: Promise.resolve({
    ftsResults: [],
    cachedAiResponse: null,
    courseReferences: [],
  }),
};

const mockSetPanelState = vi.fn();
const mockSendMessage = vi.fn();

vi.mock('../ai/CompanionProvider', () => ({
  useCompanion: () => ({
    setPanelState: mockSetPanelState,
    search: mockSearch,
  }),
}));

vi.mock('../ai/PipiliChatProvider', () => ({
  usePipiliChat: () => ({
    sendMessage: mockSendMessage,
  }),
}));

function setMockSelection(text: string, top: number, left: number): void {
  const range = {
    getBoundingClientRect: () => ({
      top,
      left,
      width: 100,
      height: 20,
      bottom: top + 20,
      right: left + 100,
      x: left,
      y: top,
      toJSON: () => {},
    }),
    collapsed: false,
    startContainer: document.body,
    endContainer: document.body,
    commonAncestorContainer: document.body,
    startOffset: 0,
    endOffset: text.length,
  };

  const mockSelection = {
    isCollapsed: false,
    toString: () => text,
    getRangeAt: () => range,
    rangeCount: 1,
    removeAllRanges: vi.fn(),
    anchorNode: document.body,
    focusNode: document.body,
    type: 'Range',
  } as unknown as Selection;

  Object.defineProperty(window, 'getSelection', {
    value: () => mockSelection,
    writable: true,
    configurable: true,
  });
}

function clearMockSelection(): void {
  Object.defineProperty(window, 'getSelection', {
    value: () => null,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  clearMockSelection();
  vi.clearAllMocks();
  mockSearch.mockReset();
  mockSearch.mockReturnValue(defaultSearchResponse);
});

describe('TextSelectionToolbar', () => {
  it('renders nothing when no text is selected', () => {
    clearMockSelection();
    render(<TextSelectionToolbar />);
    expect(screen.queryByTestId('text-selection-toolbar')).not.toBeInTheDocument();
  });

  it('appears when text is selected and mouseup fires', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('selected text', 100, 200);

    fireEvent.mouseUp(document);

    await waitFor(() => {
      const toolbar = screen.getByTestId('text-selection-toolbar');
      expect(toolbar).toBeInTheDocument();
      expect(toolbar).toHaveAttribute('role', 'toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Text selection actions');
    });
  });

  it('renders all 5 action buttons', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('some text', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByTestId('toolbar-action-explain')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-action-define')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-action-translate')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-action-pronounce')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-action-ask')).toBeInTheDocument();
    });
  });

  it('calls setPanelState and sendMessage on Explain action', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('gravity', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByTestId('toolbar-action-explain')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toolbar-action-explain'));

    expect(mockSetPanelState).toHaveBeenCalledWith('floating');
    expect(mockSendMessage).toHaveBeenCalledWith('Explain this: "gravity"');
  });

  it('calls setPanelState and sendMessage on Define action', async () => {
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
        },
        suggestions: [],
      },
      enriched: Promise.resolve({
        ftsResults: [],
        cachedAiResponse: null,
        courseReferences: [],
      }),
    });

    render(<TextSelectionToolbar />);

    setMockSelection('gravity', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByTestId('toolbar-action-define')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toolbar-action-define'));

    expect(mockSetPanelState).toHaveBeenCalledWith('floating');
    expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining('Define'));
    expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining('gravity'));
    expect(mockSendMessage).toHaveBeenCalledWith(expect.stringContaining('The force'));
  });

  it('calls setPanelState and sendMessage on Translate action', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('hello world', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByTestId('toolbar-action-translate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toolbar-action-translate'));

    expect(mockSetPanelState).toHaveBeenCalledWith('floating');
    expect(mockSendMessage).toHaveBeenCalledWith('Translate this to simple English: "hello world"');
  });

  it('calls setPanelState and sendMessage on Ask action', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('why is the sky blue', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByTestId('toolbar-action-ask')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toolbar-action-ask'));

    expect(mockSetPanelState).toHaveBeenCalledWith('floating');
    expect(mockSendMessage).toHaveBeenCalledWith('why is the sky blue');
  });

  it('hides toolbar after action is performed', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('gravity', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByTestId('text-selection-toolbar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toolbar-action-explain'));

    await waitFor(() => {
      expect(screen.queryByTestId('text-selection-toolbar')).not.toBeInTheDocument();
    });
  });

  it('provides correct aria-labels for all buttons', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('test', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByLabelText('Explain')).toBeInTheDocument();
      expect(screen.getByLabelText('Define')).toBeInTheDocument();
      expect(screen.getByLabelText('Translate')).toBeInTheDocument();
      expect(screen.getByLabelText('Pronounce')).toBeInTheDocument();
      expect(screen.getByLabelText('Ask')).toBeInTheDocument();
    });
  });

  it('hides toolbar when clicking outside', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('test', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByTestId('text-selection-toolbar')).toBeInTheDocument();
    });

    clearMockSelection();
    fireEvent.mouseDown(document);

    await waitFor(() => {
      expect(screen.queryByTestId('text-selection-toolbar')).not.toBeInTheDocument();
    });
  });

  it('has keyboard accessible buttons', async () => {
    render(<TextSelectionToolbar />);

    setMockSelection('test', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      const explainBtn = screen.getByTestId('toolbar-action-explain');
      expect(explainBtn.tagName).toBe('BUTTON');
    });
  });

  it('has no accessibility violations', async () => {
    const axe = await import('axe-core');
    render(<TextSelectionToolbar />);

    setMockSelection('test', 100, 200);
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(screen.getByTestId('text-selection-toolbar')).toBeInTheDocument();
    });

    const results = await axe.default.run(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results.violations).toHaveLength(0);
  });
});
