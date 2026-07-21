import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { NotesSearchPanel } from '../NotesSearchPanel';

vi.mock('@open-edu/storage', () => ({
  listNotes: vi.fn(async () => [
    {
      id: 'note-1',
      title: 'Algebra Basics',
      content: 'Algebra is the study of variables and equations.',
      favorite: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
  getNoteTags: vi.fn(async () => ['math']),
}));

vi.mock('minisearch', () => {
  const MockMiniSearch = vi.fn(() => ({
    addAll: vi.fn(),
    search: vi.fn(() => []),
  }));
  return { default: MockMiniSearch };
});

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
      <LiveRegionProvider>{ui}</LiveRegionProvider>
    </I18nProvider>,
  );
}

describe('NotesSearchPanel', () => {
  it('renders search input', () => {
    renderWithProvider(<NotesSearchPanel onOpenNote={vi.fn()} />);

    expect(screen.getByPlaceholderText(/search notes/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search notes/i })).toBeInTheDocument();
  });

  it('shows no results state when searched with no matches', async () => {
    renderWithProvider(<NotesSearchPanel onOpenNote={vi.fn()} />);

    const input = screen.getByPlaceholderText(/search notes/i);
    await userEvent.type(input, 'nonexistent', { delay: 10 });

    expect(await screen.findByText(/no matches/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('renders search results when query matches', async () => {
    const onOpenNote = vi.fn();

    renderWithProvider(<NotesSearchPanel onOpenNote={onOpenNote} />);

    const input = screen.getByPlaceholderText(/search notes/i);
    await userEvent.type(input, 'algebra', { delay: 10 });

    expect(await screen.findByText(/no matches/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(onOpenNote).not.toHaveBeenCalled();
  });
});
