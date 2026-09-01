import { describe, it, expect } from 'vitest';
import { WorkspacePathError } from './errors.js';
import { normalizeCoursePath, assertSafeCoursePath, isTextCourseFile } from './paths.js';

describe('normalizeCoursePath', () => {
  it('normalizes backslashes to forward slashes', () => {
    expect(normalizeCoursePath('nodes\\lesson.md')).toBe('nodes/lesson.md');
  });

  it('strips leading ./ and trailing slashes and collapses repeats', () => {
    expect(normalizeCoursePath('./nodes//lesson.md/')).toBe('nodes/lesson.md');
  });
});

describe('assertSafeCoursePath', () => {
  it('accepts normal relative paths', () => {
    expect(assertSafeCoursePath('package.json')).toBe('package.json');
    expect(assertSafeCoursePath('nodes/lesson.md')).toBe('nodes/lesson.md');
    expect(assertSafeCoursePath('assets/images/logo.png')).toBe('assets/images/logo.png');
  });

  it('rejects empty paths', () => {
    expect(() => assertSafeCoursePath('')).toThrow(WorkspacePathError);
    expect(() => assertSafeCoursePath('///')).toThrow(WorkspacePathError);
  });

  it('rejects absolute POSIX paths', () => {
    expect(() => assertSafeCoursePath('/etc/passwd')).toThrow(WorkspacePathError);
    expect(() => assertSafeCoursePath('nodes/../../etc/passwd')).toThrow(WorkspacePathError);
  });

  it('rejects Windows drive paths', () => {
    expect(() => assertSafeCoursePath('C:/windows/system32')).toThrow(WorkspacePathError);
    expect(() => assertSafeCoursePath('C:\\windows\\system32')).toThrow(WorkspacePathError);
    expect(() => assertSafeCoursePath('D:\\file.txt')).toThrow(WorkspacePathError);
  });

  it('rejects traversal segments', () => {
    expect(() => assertSafeCoursePath('../escape.png')).toThrow(WorkspacePathError);
    expect(() => assertSafeCoursePath('nodes/../escape.md')).toThrow(WorkspacePathError);
    expect(() => assertSafeCoursePath('a/./b.md')).toThrow(WorkspacePathError);
  });

  it('rejects backslash traversal after normalization', () => {
    expect(() => assertSafeCoursePath('..\\..\\escape.png')).toThrow(WorkspacePathError);
    expect(() => assertSafeCoursePath('assets\\..\\escape.png')).toThrow(WorkspacePathError);
  });

  it('rejects null bytes', () => {
    expect(() => assertSafeCoursePath('nodes/\0bad.md')).toThrow(WorkspacePathError);
  });

  it('rejects root-crossing normalized collisions', () => {
    expect(() => assertSafeCoursePath('nodes/../..')).toThrow(WorkspacePathError);
  });
});

describe('isTextCourseFile', () => {
  it('classifies markdown, JSON, and text as text files', () => {
    expect(isTextCourseFile('nodes/lesson.md')).toBe(true);
    expect(isTextCourseFile('nodes/quiz.json')).toBe(true);
    expect(isTextCourseFile('assets/notes.txt')).toBe(true);
  });

  it('classifies unknown extensions as non-text (bytes preserved)', () => {
    expect(isTextCourseFile('assets/diagram.png')).toBe(false);
    expect(isTextCourseFile('widgets/custom.js')).toBe(false);
    expect(isTextCourseFile('file.unknown')).toBe(false);
  });

  it('classifies files without an extension as non-text', () => {
    expect(isTextCourseFile('LICENSE')).toBe(false);
  });
});
