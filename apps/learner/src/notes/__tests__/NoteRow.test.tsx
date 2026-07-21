import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { NoteRow } from '../NoteRow';
import type { NoteRecord } from '../../notesStorage';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
      {ui}
    </I18nProvider>,
  );
}

const baseNote: NoteRecord = {
  id: 'note-1',
  title: 'My Test Note',
  content: 'This is the content of the note for testing purposes.',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('NoteRow', () => {
  it('renders title, snippet, and tags', () => {
    const tags = ['math', 'algebra'];
    renderWithProvider(
      <NoteRow
        note={baseNote}
        tags={tags}
        onOpen={vi.fn()}
        onToggleFavorite={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('My Test Note')).toBeInTheDocument();
    expect(screen.getByText(/This is the content/)).toBeInTheDocument();
    expect(screen.getByText('math')).toBeInTheDocument();
    expect(screen.getByText('algebra')).toBeInTheDocument();
  });

  it('click handlers for open/favorite/delete work', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onToggleFavorite = vi.fn();
    const onDelete = vi.fn();
    const tags: string[] = [];

    renderWithProvider(
      <NoteRow
        note={baseNote}
        tags={tags}
        onOpen={onOpen}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTestId('note-row'));
    expect(onOpen).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /mark as favorite/i }));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /delete note/i }));
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders note row container with test id', () => {
    renderWithProvider(
      <NoteRow
        note={baseNote}
        tags={[]}
        onOpen={vi.fn()}
        onToggleFavorite={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByTestId('note-row')).toBeInTheDocument();
  });
});
