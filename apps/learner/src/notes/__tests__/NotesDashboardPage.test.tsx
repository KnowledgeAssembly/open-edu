import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { NotesDashboardPage } from '../NotesDashboardPage';

vi.mock('../NotesSearchPanel', () => ({
  NotesSearchPanel: () => <div data-testid="mocked-search" />,
}));

const storageMock = vi.hoisted(() => ({
  listNotes: vi.fn(),
  saveNote: vi.fn(),
  getNoteTags: vi.fn(),
  setNoteFavorite: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('@open-edu/storage', () => storageMock);

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('NotesDashboardPage', () => {
  beforeEach(() => {
    storageMock.listNotes.mockResolvedValue([
      {
        id: 'note-1',
        title: 'My First Note',
        content: 'Content of first note.',
        favorite: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'note-2',
        title: 'Favorite Note',
        content: 'Content of favorite note.',
        favorite: true,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
    storageMock.saveNote.mockResolvedValue(undefined);
    storageMock.getNoteTags.mockResolvedValue(['math']);
    storageMock.setNoteFavorite.mockResolvedValue(undefined);
    storageMock.deleteNote.mockResolvedValue(undefined);
  });

  it('renders dashboard with notes list', async () => {
    renderWithProvider(<NotesDashboardPage onNavigate={vi.fn()} />);

    expect(await screen.findByText('My First Note')).toBeInTheDocument();
    expect(await screen.findByText('Favorite Note')).toBeInTheDocument();

    expect(screen.getByText(/recent notes/i)).toBeInTheDocument();
    expect(screen.getByText(/favorites/i)).toBeInTheDocument();
  });

  it('calls onNavigate when create button is clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    renderWithProvider(<NotesDashboardPage onNavigate={onNavigate} />);

    const createBtn = await screen.findByRole('button', { name: /new note/i });
    await user.click(createBtn);

    expect(onNavigate).toHaveBeenCalledWith({ view: 'note-editor', noteId: expect.any(String) });
  });
});
