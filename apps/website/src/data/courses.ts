import { Atom, Flower2, Landmark, Palette, Triangle, type LucideIcon } from 'lucide-react';

export type CourseCategory = 'art' | 'science' | 'history' | 'math' | 'life';

export interface CourseMeta {
  id: string;
  titleKey: string;
  descriptionKey: string;
  category: CourseCategory;
  lessonCount: number;
  ageRange: string;
  accent: string;
  icon: LucideIcon;
}

export const COURSES: CourseMeta[] = [
  {
    id: 'indian-tribal-art',
    titleKey: 'website.courses.course_indian_tribal_art',
    descriptionKey: 'website.courses.course_indian_tribal_art_desc',
    category: 'art',
    lessonCount: 12,
    ageRange: '8-12',
    accent: 'bg-primary-container text-on-primary-container',
    icon: Palette,
  },
  {
    id: 'world-of-atoms',
    titleKey: 'website.courses.course_world_of_atoms',
    descriptionKey: 'website.courses.course_world_of_atoms_desc',
    category: 'science',
    lessonCount: 8,
    ageRange: '10-14',
    accent: 'bg-surface-variant text-on-surface-variant',
    icon: Atom,
  },
  {
    id: 'ancient-civilizations',
    titleKey: 'website.courses.course_ancient_civilizations',
    descriptionKey: 'website.courses.course_ancient_civilizations_desc',
    category: 'history',
    lessonCount: 10,
    ageRange: '9-13',
    accent: 'bg-tertiary-container text-on-tertiary-container',
    icon: Landmark,
  },
  {
    id: 'shapes-in-real-world',
    titleKey: 'website.courses.course_shapes_in_real_world',
    descriptionKey: 'website.courses.course_shapes_in_real_world_desc',
    category: 'math',
    lessonCount: 6,
    ageRange: '6-9',
    accent: 'bg-secondary/10 text-secondary',
    icon: Triangle,
  },
  {
    id: 'mindful-moments',
    titleKey: 'website.courses.course_mindful_moments',
    descriptionKey: 'website.courses.course_mindful_moments_desc',
    category: 'life',
    lessonCount: 5,
    ageRange: '7-12',
    accent: 'bg-primary/10 text-primary',
    icon: Flower2,
  },
];

export const COURSE_CATEGORIES: Array<{ id: 'all' | CourseCategory; labelKey: string }> = [
  { id: 'all', labelKey: 'website.courses.filter_all' },
  { id: 'art', labelKey: 'website.courses.filter_art' },
  { id: 'science', labelKey: 'website.courses.filter_science' },
  { id: 'history', labelKey: 'website.courses.filter_history' },
  { id: 'math', labelKey: 'website.courses.filter_math' },
  { id: 'life', labelKey: 'website.courses.filter_life' },
];
