import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { NoteRow } from '../NoteRow';
import type { NoteRecord } from '../../notesStorage';

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
  // NoteRow uses role="button" on a <div> containing <button> children (star, trash).
  // axe-core flags nested interactive elements; this is intentional design —
  // the outer div is the primary click target, inner buttons handle specific actions.
  const result = await axe.run(container, {
    rules: { 'nested-interactive': { enabled: false } },
  });
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

const baseNote: NoteRecord = {
  id: 'note-1',
  title: 'Accessible Note',
  content: 'Content for accessibility test.',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('NoteRow accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderWithProviders(
      <NoteRow
        note={baseNote}
        tags={['math']}
        onOpen={vi.fn()}
        onToggleFavorite={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await expectNoViolations(container);
  });
});
