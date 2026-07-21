import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { NoteEditor } from '../NoteEditor';
import type { NoteRecord } from '../../notesStorage';

vi.mock('@open-edu/storage', () => ({
  saveNote: vi.fn(async () => undefined),
  deleteNote: vi.fn(async () => undefined),
}));

const baseNote: NoteRecord = {
  id: 'note-1',
  title: 'Original Title',
  content: 'Original content.',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('NoteEditor', () => {
  it('renders title input and body textarea', () => {
    renderWithProvider(<NoteEditor initial={baseNote} />);

    expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original content.')).toBeInTheDocument();
    expect(screen.getByLabelText(/note body/i)).toBeInTheDocument();
  });

  it('title editing renders', async () => {
    const user = userEvent.setup();

    renderWithProvider(<NoteEditor initial={baseNote} />);

    const titleInput = screen.getByDisplayValue('Original Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument();
  });
});
