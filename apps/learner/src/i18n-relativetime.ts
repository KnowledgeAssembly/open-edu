const _cache: Record<string, Intl.RelativeTimeFormat> = {};

function getRtf(locale: string): Intl.RelativeTimeFormat {
  if (!_cache[locale]) _cache[locale] = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return _cache[locale];
}

export function relativeTimeHuman(dateStr: string, locale = 'en'): string {
  const dateMs = new Date(dateStr).getTime();
  if (isNaN(dateMs)) return '';
  const diff = dateMs - Date.now();
  const absMins = Math.abs(diff / 60000);
  if (absMins < 1) return getRtf(locale).format(0, 'minute');
  const mins = diff > 0 ? Math.floor(absMins) : -Math.floor(absMins);
  if (absMins < 60) return getRtf(locale).format(mins, 'minute');
  const absHours = absMins / 60;
  const hours = diff > 0 ? Math.floor(absHours) : -Math.floor(absHours);
  if (absHours < 24) return getRtf(locale).format(hours, 'hour');
  const absDays = absHours / 24;
  const days = diff > 0 ? Math.floor(absDays) : -Math.floor(absDays);
  if (absDays < 7) return getRtf(locale).format(days, 'day');
  const weeks = diff > 0 ? Math.floor(absDays / 7) : -Math.floor(absDays / 7);
  return getRtf(locale).format(weeks, 'week');
}
