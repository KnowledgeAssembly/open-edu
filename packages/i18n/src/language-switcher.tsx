import React from 'react';
import { useTranslation } from './context.js';
import type { Locale } from './locale.js';

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी',
  or: 'ଓଡ଼ିଆ',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  bn: 'বাংলা',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  ur: 'اردو',
};

export interface LanguageSwitcherProps {
  supportedLocales?: readonly Locale[];
  className?: string;
}

export function LanguageSwitcher({
  supportedLocales = ['en', 'hi', 'or'] as readonly Locale[],
  className,
}: LanguageSwitcherProps): JSX.Element {
  const { locale, setLocale } = useTranslation();

  return (
    <div className={className} role="group" aria-label="Language selection">
      {supportedLocales.map((loc) => (
        <button
          key={loc}
          type="button"
          role="button"
          aria-pressed={locale === loc}
          aria-label={LOCALE_LABELS[loc] ?? loc}
          onClick={() => setLocale(loc)}
          className={
            locale === loc
              ? 'font-semibold underline'
              : ''
          }
        >
          {LOCALE_LABELS[loc] ?? loc}
        </button>
      ))}
    </div>
  );
}
