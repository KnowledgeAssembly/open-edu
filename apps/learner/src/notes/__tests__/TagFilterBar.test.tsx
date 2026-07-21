import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { TagFilterBar } from '../TagFilterBar';

vi.mock('@open-edu/storage', () => ({
  getNoteTags: vi.fn(async () => ['existing-tag']),
  listAllTags: vi.fn(async () => ['math', 'science', 'history']),
  addNoteTag: vi.fn(async () => undefined),
  removeNoteTag: vi.fn(async () => undefined),
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('TagFilterBar', () => {
  it('renders in edit mode with tag input', async () => {
    renderWithProvider(<TagFilterBar mode="edit" noteId="note-1" />);

    expect(await screen.findByText('existing-tag')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /add tag/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add tag/i })).toBeInTheDocument();
  });

  it('renders in filter mode with all tags', async () => {
    const onActiveTagChange = vi.fn();

    renderWithProvider(
      <TagFilterBar mode="filter" activeTag={undefined} onActiveTagChange={onActiveTagChange} />,
    );

    expect(await screen.findByText('math')).toBeInTheDocument();
    expect(screen.getByText('science')).toBeInTheDocument();
    expect(screen.getByText('history')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear filter/i })).not.toBeInTheDocument();
  });

  it('shows clear filter button when a tag is active', async () => {
    renderWithProvider(<TagFilterBar mode="filter" activeTag="math" onActiveTagChange={vi.fn()} />);

    expect(await screen.findByText(/clear filter/i)).toBeInTheDocument();
  });

  it('calls onActiveTagChange when filter tag is clicked', async () => {
    const user = userEvent.setup();
    const onActiveTagChange = vi.fn();

    renderWithProvider(
      <TagFilterBar mode="filter" activeTag={undefined} onActiveTagChange={onActiveTagChange} />,
    );

    const tagBtn = await screen.findByText('math');
    await user.click(tagBtn);
    expect(onActiveTagChange).toHaveBeenCalledWith('math');
  });
});
