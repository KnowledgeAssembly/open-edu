import { describe, it, expect } from 'vitest';
import { resolveSpecExtension } from './specFile';

describe('resolveSpecExtension', () => {
  it('accepts .md and .json filenames case-insensitively', () => {
    expect(resolveSpecExtension('course-spec.md')).toBe('.md');
    expect(resolveSpecExtension('Course-Spec.MD')).toBe('.md');
    expect(resolveSpecExtension('course-spec.json')).toBe('.json');
    expect(resolveSpecExtension('spec.JSON')).toBe('.json');
  });

  it('rejects unsupported extensions', () => {
    expect(resolveSpecExtension('notes.txt')).toBeNull();
    expect(resolveSpecExtension('course.pdf')).toBeNull();
    expect(resolveSpecExtension('course')).toBeNull();
  });
});
