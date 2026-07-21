import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { NotePanel } from '../NotePanel';
import type { NoteRecord } from '../../notesStorage';

const mockNote: NoteRecord = {
  id: 'note-1',
  title: 'Panel Note',
  content: 'Note content here.',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  courseId: 'course-1',
  lessonId: 'lesson-1',
};

const storageMock = vi.hoisted(() => ({
  listNotes: vi.fn(),
  saveNote: vi.fn(async () => undefined),
}));

vi.mock('@open-edu/storage', () => storageMock);

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('NotePanel', () => {
  beforeEach(() => {
    storageMock.listNotes.mockResolvedValue([mockNote]);
  });

  it('renders loading state initially', () => {
    renderWithProvider(<NotePanel courseId="course-1" lessonId="lesson-1" />);

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('renders note editor after loading', async () => {
    renderWithProvider(<NotePanel courseId="course-1" lessonId="lesson-1" />);

    expect(await screen.findByDisplayValue('Panel Note')).toBeInTheDocument();
    expect(screen.getByText(/note content here/i)).toBeInTheDocument();
  });

  it('renders open in dashboard link when onOpenInNotes provided', async () => {
    renderWithProvider(
      <NotePanel courseId="course-1" lessonId="lesson-1" onOpenInNotes={vi.fn()} />,
    );

    expect(await screen.findByText(/open in notes/i)).toBeInTheDocument();
  });
});
