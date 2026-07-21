import { describe, it, expect } from 'vitest';
import notesEn from '@open-edu/i18n/locales/en/notes.json';

describe('notes i18n keys', () => {
  const requiredKeys = [
    'nav.notes',
    'dashboard.title',
    'dashboard.subtitle',
    'dashboard.section.recent',
    'dashboard.section.favorites',
    'dashboard.section.tags',
    'dashboard.empty.title',
    'dashboard.empty.body',
    'dashboard.create',
    'dashboard.delete.confirm',
    'row.open',
    'row.favorite.add',
    'row.favorite.remove',
    'row.delete',
    'row.snippet.empty',
    'editor.title.placeholder',
    'editor.body.placeholder',
    'editor.body.label',
    'editor.save.saving',
    'editor.save.saved',
    'editor.save.failed',
    'editor.delete',
    'editor.export',
    'editor.tags.label',
    'editor.tags.add',
    'editor.tags.placeholder',
    'editor.tags.remove',
    'editor.course.label',
    'editor.lesson.label',
    'panel.title',
    'panel.empty',
    'panel.open_in_dashboard',
    'search.placeholder',
    'search.label',
    'search.no_results',
    'search.results.aria',
    'search.snippet.empty',
    'export.title',
    'export.markdown',
    'export.json',
    'export.single',
    'export.all',
    'export.cancel',
    'tag.filter.title',
    'tag.filter.clear',
    'tag.aria.list',
    'tag.aria.filter',
  ];

  for (const key of requiredKeys) {
    it(`has non-empty value for "${key}"`, () => {
      const value = (notesEn as Record<string, string>)[key];
      expect(value).toBeDefined();
      expect(value!.trim().length).toBeGreaterThan(0);
    });
  }
});
