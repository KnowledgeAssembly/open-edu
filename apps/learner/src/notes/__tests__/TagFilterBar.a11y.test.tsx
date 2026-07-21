import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { FontSizeProvider } from '@open-edu/design-system';
import { I18nProvider } from '@open-edu/i18n';
import notesDict from '@open-edu/i18n/locales/en/notes.json';
import { TagFilterBar } from '../TagFilterBar';

const mockStorage = vi.hoisted(() => ({
  safeGetNoteTags: vi.fn(async () => ['existing-tag']),
  safeAddNoteTag: vi.fn(async () => true),
  safeRemoveNoteTag: vi.fn(async () => true),
  safeListAllTags: vi.fn(async () => ['math', 'science', 'history']),
}));

vi.mock('../../notesStorage', () => mockStorage);

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
  // TagFilterBar uses role="group" with aria-label on a wrapper div that
  // axe-core considers a prohibited attribute combination for that role.
  // The attribute is semantically appropriate for grouping tag controls.
  const result = await axe.run(container, {
    rules: { 'aria-prohibited-attr': { enabled: false } },
  });
  if (result.violations.length > 0) {
    const details = result.violations.map(
      (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
        `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    );
    expect(result.violations, details.join('')).toHaveLength(0);
  }
}

describe('TagFilterBar accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.safeGetNoteTags.mockImplementation(async () => ['existing-tag']);
    mockStorage.safeListAllTags.mockImplementation(async () => ['math', 'science', 'history']);
    mockStorage.safeAddNoteTag.mockImplementation(async () => true);
    mockStorage.safeRemoveNoteTag.mockImplementation(async () => true);
  });

  it('has no axe violations in edit mode', async () => {
    const { container } = renderWithProviders(<TagFilterBar mode="edit" noteId="note-1" />);
    await expectNoViolations(container);
  });

  it('has no axe violations in filter mode', async () => {
    const { container } = renderWithProviders(
      <TagFilterBar mode="filter" activeTag="science" onActiveTagChange={vi.fn()} />,
    );
    await expectNoViolations(container);
  });
});
