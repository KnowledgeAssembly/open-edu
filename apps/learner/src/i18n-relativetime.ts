const _cache: Record<string, Intl.RelativeTimeFormat> = {};

function getRtf(locale: string): Intl.RelativeTimeFormat {
  if (!_cache[locale]) _cache[locale] = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return _cache[locale];
}

export function relativeTimeHuman(dateStr: string, locale = 'en'): string {
  const dateMs = new Date(dateStr).getTime();
  if (isNaN(dateMs)) return '';
  const diff = dateMs - Date.now();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return getRtf(locale).format(mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return getRtf(locale).format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return getRtf(locale).format(days, 'day');
  return getRtf(locale).format(Math.round(days / 7), 'week');
}
