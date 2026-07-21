import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { NotePanel } from '../NotePanel';
import type { NoteRecord } from '../../notesStorage';

const mockNote: NoteRecord = {
  id: 'note-1',
  title: 'Accessible Panel Note',
  content: 'Content for a11y audit.',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  courseId: 'course-1',
  lessonId: 'lesson-1',
};

const storageMock = vi.hoisted(() => ({
  listNotes: vi.fn(async () => [mockNote]),
  saveNote: vi.fn(async () => undefined),
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
  const result = await axe.run(container);
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

describe('NotePanel accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderWithProviders(
      <NotePanel courseId="course-1" lessonId="lesson-1" onOpenInNotes={vi.fn()} />,
    );
    await expectNoViolations(container);
  });
});
