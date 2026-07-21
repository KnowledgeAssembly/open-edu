import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { NoteEditorPage } from '../NoteEditorPage';

vi.mock('@open-edu/storage', () => ({
  saveNote: vi.fn(async () => undefined),
  deleteNote: vi.fn(async () => undefined),
  getNote: vi.fn(),
}));

import { getNote } from '@open-edu/storage';

const mockGetNote = vi.mocked(getNote);

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('NoteEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockGetNote.mockReturnValue(new Promise(() => {}));
    renderWithProvider(<NoteEditorPage noteId="note-1" onNavigate={vi.fn()} />);
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('renders editor when note loads', async () => {
    mockGetNote.mockResolvedValue({
      id: 'note-1',
      title: 'Loaded Note',
      content: 'Loaded content.',
      favorite: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    renderWithProvider(<NoteEditorPage noteId="note-1" onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Loaded Note')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Loaded content.')).toBeInTheDocument();
  });

  it('shows not-found message when note is null', async () => {
    mockGetNote.mockResolvedValue(undefined);
    renderWithProvider(<NoteEditorPage noteId="nonexistent" onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/no matches/i)).toBeInTheDocument();
    });
  });
});
