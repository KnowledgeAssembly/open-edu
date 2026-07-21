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
          role="radio"
          aria-checked={locale === loc}
          aria-label={LOCALE_LABELS[loc] ?? loc}
          onClick={() => setLocale(loc)}
          className={
            locale === loc
              ? 'rounded-sm px-3 py-1.5 text-sm font-semibold underline underline-offset-2'
              : 'hover:bg-primary/10 cursor-pointer rounded-sm px-3 py-1.5 text-sm'
          }
        >
          {LOCALE_LABELS[loc] ?? loc}
        </button>
      ))}
    </div>
  );
}
