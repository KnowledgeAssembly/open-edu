import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
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
  const result = await axe.run(container);
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

describe('NoteEditorPage accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no axe violations when note loads', async () => {
    mockGetNote.mockResolvedValue({
      id: 'note-1',
      title: 'Accessible Note',
      content: 'Content for a11y.',
      favorite: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const { container } = renderWithProviders(
      <NoteEditorPage noteId="note-1" onNavigate={vi.fn()} />,
    );
    await waitFor(() => {
      expect(container.querySelector('input')).toBeInTheDocument();
    });
    await expectNoViolations(container);
  });
});
