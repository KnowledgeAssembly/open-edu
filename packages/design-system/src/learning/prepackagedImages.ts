export type CourseCardImageCategory =
  | 'math'
  | 'science'
  | 'language'
  | 'computer'
  | 'art'
  | 'default';

export interface CourseCardImageOptions {
  image?: string | null;
  subject?: string | null;
  tags?: string[] | null;
  title?: string | null;
}

const CATEGORY_KEYWORDS: Record<Exclude<CourseCardImageCategory, 'default'>, string[]> = {
  math: ['math', 'mathematics', 'algebra', 'geometry', 'arithmetic', 'fraction', 'number'],
  science: ['science', 'biology', 'chemistry', 'physics', 'nature', 'earth', 'life'],
  language: ['language', 'reading', 'literacy', 'english', 'writing', 'literature', 'grammar'],
  computer: [
    'computer',
    'computing',
    'programming',
    'coding',
    'technology',
    'javascript',
    'software',
  ],
  art: ['art', 'design', 'music', 'creative', 'drawing', 'painting'],
};

function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Lightweight subject-themed SVG covers (token-aligned soft palettes). */
const PREPACKAGED_IMAGES: Record<CourseCardImageCategory, string> = {
  math: toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#bfdbfe"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="120" cy="90" r="48" fill="#93c5fd" opacity="0.55"/>
  <circle cx="520" cy="260" r="70" fill="#60a5fa" opacity="0.35"/>
  <text x="320" y="185" text-anchor="middle" font-family="Georgia, serif" font-size="92" fill="#1e3a8a" opacity="0.55">∑</text>
  <text x="210" y="250" font-family="ui-sans-serif,system-ui" font-size="36" fill="#1d4ed8" opacity="0.45">1 + 2 = 3</text>
</svg>`),
  science:
    toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d1fae5"/>
      <stop offset="100%" stop-color="#a7f3d0"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="160" cy="110" r="42" fill="#34d399" opacity="0.45"/>
  <circle cx="480" cy="240" r="64" fill="#10b981" opacity="0.3"/>
  <ellipse cx="320" cy="180" rx="70" ry="28" fill="none" stroke="#065f46" stroke-width="8" opacity="0.4"/>
  <ellipse cx="320" cy="180" rx="28" ry="70" fill="none" stroke="#065f46" stroke-width="8" opacity="0.4"/>
  <circle cx="320" cy="180" r="14" fill="#047857" opacity="0.55"/>
</svg>`),
  language:
    toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffedd5"/>
      <stop offset="100%" stop-color="#fed7aa"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <rect x="170" y="80" width="140" height="200" rx="10" fill="#fdba74" opacity="0.7"/>
  <rect x="330" y="70" width="140" height="210" rx="10" fill="#fb923c" opacity="0.55"/>
  <text x="320" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="64" fill="#9a3412" opacity="0.5">Aa</text>
</svg>`),
  computer:
    toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e0e7ff"/>
      <stop offset="100%" stop-color="#c7d2fe"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <rect x="170" y="90" width="300" height="170" rx="16" fill="#818cf8" opacity="0.45"/>
  <rect x="195" y="115" width="250" height="110" rx="8" fill="#eef2ff" opacity="0.85"/>
  <rect x="250" y="270" width="140" height="16" rx="4" fill="#6366f1" opacity="0.45"/>
  <text x="320" y="185" text-anchor="middle" font-family="ui-monospace,monospace" font-size="42" fill="#312e81" opacity="0.55">&lt;/&gt;</text>
</svg>`),
  art: toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fce7f3"/>
      <stop offset="100%" stop-color="#fbcfe8"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="220" cy="150" r="54" fill="#f472b6" opacity="0.5"/>
  <circle cx="320" cy="210" r="64" fill="#e879f9" opacity="0.4"/>
  <circle cx="420" cy="140" r="48" fill="#c084fc" opacity="0.45"/>
  <path d="M160 280 C240 220,400 220,480 280" fill="none" stroke="#9d174d" stroke-width="10" opacity="0.35"/>
</svg>`),
  default:
    toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="140" cy="100" r="50" fill="#94a3b8" opacity="0.35"/>
  <circle cx="500" cy="250" r="72" fill="#64748b" opacity="0.25"/>
  <rect x="220" y="120" width="200" height="120" rx="18" fill="#cbd5e1" opacity="0.65"/>
  <circle cx="320" cy="180" r="28" fill="#475569" opacity="0.4"/>
</svg>`),
};

export function resolveCourseCardImageCategory(
  options: Omit<CourseCardImageOptions, 'image'> = {},
): CourseCardImageCategory {
  const haystack = [options.subject, ...(options.tags ?? []), options.title]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();

  if (!haystack) return 'default';

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [Exclude<CourseCardImageCategory, 'default'>, string[]]
  >) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }

  return 'default';
}

export function getPrepackagedCourseCardImage(
  category: CourseCardImageCategory = 'default',
): string {
  return PREPACKAGED_IMAGES[category] ?? PREPACKAGED_IMAGES.default;
}

/**
 * Resolve a course/bundle card cover image.
 * Custom manifest `image` wins; otherwise a subject-themed prepackaged SVG is used.
 */
export function getCourseCardImage(options: CourseCardImageOptions = {}): string {
  if (options.image && options.image.trim().length > 0) {
    return options.image;
  }
  return getPrepackagedCourseCardImage(resolveCourseCardImageCategory(options));
}
