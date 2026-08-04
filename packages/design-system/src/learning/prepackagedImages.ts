import mathCover from './covers/math.svg?url';
import scienceCover from './covers/science.svg?url';
import languageCover from './covers/language.svg?url';
import computerCover from './covers/computer.svg?url';
import artCover from './covers/art.svg?url';
import defaultCover from './covers/default.svg?url';

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

/**
 * Subject-themed prepackaged cover artwork.
 * Swap the SVG files in `./covers/` to update designs without changing this module.
 */
export const PREPACKAGED_IMAGES: Record<CourseCardImageCategory, string> = {
  math: mathCover,
  science: scienceCover,
  language: languageCover,
  computer: computerCover,
  art: artCover,
  default: defaultCover,
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
