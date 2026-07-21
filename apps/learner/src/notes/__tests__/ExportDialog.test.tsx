import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { ExportDialog } from '../ExportDialog';
import type { NoteRecord } from '../../notesStorage';

vi.mock('../../notesStorage', () => ({
  safeListNotes: vi.fn().mockResolvedValue([
    {
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      favorite: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'note-2',
      title: 'Second Note',
      content: 'More content',
      favorite: true,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ]),
  safeGetNoteTags: vi.fn().mockResolvedValue(['math']),
}));

const baseNote: NoteRecord = {
  id: 'note-1',
  title: 'Test Note',
  content: 'Test content',
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

describe('ExportDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders open dialog with export options', () => {
    renderWithProvider(<ExportDialog open={true} onOpenChange={vi.fn()} note={baseNote} />);

    expect(screen.getAllByText(/export notes/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/export this note/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/export all notes/i)).toBeInTheDocument();
    expect(screen.getByText(/markdown/i)).toBeInTheDocument();
    expect(screen.getByText(/json/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProvider(<ExportDialog open={false} onOpenChange={vi.fn()} note={baseNote} />);

    expect(screen.queryByText(/export notes/i)).not.toBeInTheDocument();
  });

  it('export triggers download for single note', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.assign(globalThis.URL, { createObjectURL, revokeObjectURL });

    renderWithProvider(<ExportDialog open={true} onOpenChange={onOpenChange} note={baseNote} />);

    const exportBtn = screen.getByRole('button', { name: /^export$/i });
    await user.click(exportBtn);

    await vi.waitFor(() => {
      expect(createObjectURL).toHaveBeenCalledOnce();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
