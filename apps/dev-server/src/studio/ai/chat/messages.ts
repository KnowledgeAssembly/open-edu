import studioEn from '@open-edu/i18n/locales/en/studio.json';

type StudioDict = Record<string, string>;

const dictionaries: Record<string, StudioDict> = {
  en: studioEn as StudioDict,
};

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
    template,
  );
}

/** Server-side studio copy lookup (chat handler has no React i18n context). */
export function studioChatMessage(
  key: string,
  locale = 'en',
  params?: Record<string, string>,
): string {
  const dict = dictionaries[locale] ?? dictionaries.en;
  const template = dict?.[key] ?? dictionaries.en?.[key] ?? key;
  return interpolate(template, params);
}
