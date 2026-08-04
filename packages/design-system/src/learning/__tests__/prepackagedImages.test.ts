import { describe, it, expect } from 'vitest';
import {
  getCourseCardImage,
  getPrepackagedCourseCardImage,
  resolveCourseCardImageCategory,
} from '../prepackagedImages.js';

describe('prepackagedImages', () => {
  it('prefers an explicit image when provided', () => {
    expect(
      getCourseCardImage({
        image: 'https://cdn.example.com/cover.png',
        subject: 'math',
      }),
    ).toBe('https://cdn.example.com/cover.png');
  });

  it('ignores blank image strings and falls back', () => {
    const fallback = getCourseCardImage({ image: '   ', subject: 'math' });
    expect(fallback).toBe(getPrepackagedCourseCardImage('math'));
  });

  it('resolves categories from subject, tags, and title', () => {
    expect(resolveCourseCardImageCategory({ subject: 'math' })).toBe('math');
    expect(resolveCourseCardImageCategory({ tags: ['biology'] })).toBe('science');
    expect(resolveCourseCardImageCategory({ title: 'Intro to JavaScript' })).toBe('computer');
    expect(resolveCourseCardImageCategory({ title: 'Reading Adventures' })).toBe('language');
    expect(resolveCourseCardImageCategory({ tags: ['creative', 'drawing'] })).toBe('art');
    expect(resolveCourseCardImageCategory({ title: 'General Studies' })).toBe('default');
  });

  it('returns SVG asset URLs for each category', () => {
    for (const category of ['math', 'science', 'language', 'computer', 'art', 'default'] as const) {
      const src = getPrepackagedCourseCardImage(category);
      expect(src).toContain(`${category}.svg`);
    }
  });
});
