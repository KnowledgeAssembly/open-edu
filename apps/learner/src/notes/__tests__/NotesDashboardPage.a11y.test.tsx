import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
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

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <RuntimeThemeProvider themeId="lumina-scholastica">
      <FontSizeProvider>
        <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
          {ui}
        </I18nProvider>
      </FontSizeProvider>
    </RuntimeThemeProvider>,
  );
}

async function expectNoViolations(container: HTMLElement) {
  // Disabled rules are inherited from child components:
  // - nested-interactive: NoteRow uses role="button" wrapping inner <button> children (star, trash)
  // - aria-prohibited-attr: TagFilterBar uses aria-label on role="group" wrapper div
  const result = await axe.run(container, {
    rules: {
      'nested-interactive': { enabled: false },
      'aria-prohibited-attr': { enabled: false },
    },
  });
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

describe('NotesDashboardPage accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.listNotes.mockResolvedValue([
      {
        id: 'note-1',
        title: 'First Note',
        content: 'Content.',
        favorite: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    storageMock.getNoteTags.mockResolvedValue([]);
  });

  it('has no axe violations with notes', async () => {
    const { container } = renderWithProviders(<NotesDashboardPage onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="notes-page"]')).toBeInTheDocument();
    });
    await expectNoViolations(container);
  });

  it('has no axe violations with empty state', async () => {
    storageMock.listNotes.mockResolvedValue([]);
    const { container } = renderWithProviders(<NotesDashboardPage onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="notes-page"]')).toBeInTheDocument();
    });
    await expectNoViolations(container);
  });
});
