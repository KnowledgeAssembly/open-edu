import runtimeEn from '@open-edu/i18n/locales/en/runtime.json';
import learnerEn from '@open-edu/i18n/locales/en/learner.json';
import widgetsEn from '@open-edu/i18n/locales/en/widgets.json';
import schemasEn from '@open-edu/i18n/locales/en/schemas.json';
import notesEn from '@open-edu/i18n/locales/en/notes.json';

import runtimeHi from '@open-edu/i18n/locales/hi/runtime.json';
import learnerHi from '@open-edu/i18n/locales/hi/learner.json';
import widgetsHi from '@open-edu/i18n/locales/hi/widgets.json';
import schemasHi from '@open-edu/i18n/locales/hi/schemas.json';
import notesHi from '@open-edu/i18n/locales/hi/notes.json';

import runtimeOr from '@open-edu/i18n/locales/or/runtime.json';
import learnerOr from '@open-edu/i18n/locales/or/learner.json';
import widgetsOr from '@open-edu/i18n/locales/or/widgets.json';
import schemasOr from '@open-edu/i18n/locales/or/schemas.json';
import notesOr from '@open-edu/i18n/locales/or/notes.json';

export const dictionaries: Record<string, Record<string, Record<string, string>>> = {
  en: {
    runtime: runtimeEn as Record<string, string>,
    learner: learnerEn as Record<string, string>,
    widgets: widgetsEn as Record<string, string>,
    schemas: schemasEn as Record<string, string>,
    notes: notesEn as Record<string, string>,
  },
  hi: {
    runtime: runtimeHi as Record<string, string>,
    learner: learnerHi as Record<string, string>,
    widgets: widgetsHi as Record<string, string>,
    schemas: schemasHi as Record<string, string>,
    notes: notesHi as Record<string, string>,
  },
  or: {
    runtime: runtimeOr as Record<string, string>,
    learner: learnerOr as Record<string, string>,
    widgets: widgetsOr as Record<string, string>,
    schemas: schemasOr as Record<string, string>,
    notes: notesOr as Record<string, string>,
  },
};
