import runtimeEn from '@open-edu/i18n/locales/en/runtime.json';
import learnerEn from '@open-edu/i18n/locales/en/learner.json';
import widgetsEn from '@open-edu/i18n/locales/en/widgets.json';
import schemasEn from '@open-edu/i18n/locales/en/schemas.json';
import notesEn from '@open-edu/i18n/locales/en/notes.json';

export const dictionaries: Record<string, Record<string, Record<string, string>>> = {
  en: {
    runtime: runtimeEn as Record<string, string>,
    learner: learnerEn as Record<string, string>,
    widgets: widgetsEn as Record<string, string>,
    schemas: schemasEn as Record<string, string>,
    notes: notesEn as Record<string, string>,
  },
};
