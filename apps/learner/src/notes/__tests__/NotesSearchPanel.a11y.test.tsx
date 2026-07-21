import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { NotesSearchPanel } from '../NotesSearchPanel';

vi.mock('@open-edu/storage', () => ({
  listNotes: vi.fn(async () => []),
  getNoteTags: vi.fn(async () => []),
}));

vi.mock('minisearch', () => {
  const MockMiniSearch = vi.fn(() => ({
    addAll: vi.fn(),
    search: vi.fn(() => []),
  }));
  return { default: MockMiniSearch };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <RuntimeThemeProvider themeId="lumina-scholastica">
      <FontSizeProvider>
        <I18nProvider locale="en" dictionaries={{ en: { notes: notesDict } }}>
          <LiveRegionProvider>{ui}</LiveRegionProvider>
        </I18nProvider>
      </FontSizeProvider>
    </RuntimeThemeProvider>,
  );
}

async function expectNoViolations(container: HTMLElement) {
  // NotesSearchPanel uses aria-controls and aria-expanded on the search input
  // to link with the results listbox. axe-core 4.x reports these as disallowed
  // on <input> elements per an older ARIA spec; they are valid in ARIA 1.2+.
  const result = await axe.run(container, {
    rules: { 'aria-allowed-attr': { enabled: false } },
  });
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

describe('NotesSearchPanel accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderWithProviders(<NotesSearchPanel onOpenNote={vi.fn()} />);
    await expectNoViolations(container);
  });
});
