import { describe, it, expect } from 'vitest';
import {
  normalizeCoursePath,
  assertSafeCoursePath,
  isTextCourseFile,
  cloneCourseFiles,
  sortCourseFiles,
  courseFilesToRecord,
  recordToCourseFiles,
  UnsafeCoursePathError,
  type StudioFile,
} from './courseFiles.js';

const enc = (s: string) => new TextEncoder().encode(s);

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
    expect(() => assertSafeCoursePath('')).toThrow(UnsafeCoursePathError);
    expect(() => assertSafeCoursePath('///')).toThrow(UnsafeCoursePathError);
  });

  it('rejects absolute POSIX paths', () => {
    expect(() => assertSafeCoursePath('/etc/passwd')).toThrow(UnsafeCoursePathError);
    expect(() => assertSafeCoursePath('nodes/../../etc/passwd')).toThrow(UnsafeCoursePathError);
  });

  it('rejects Windows drive paths', () => {
    expect(() => assertSafeCoursePath('C:/windows/system32')).toThrow(UnsafeCoursePathError);
    expect(() => assertSafeCoursePath('C:\\windows\\system32')).toThrow(UnsafeCoursePathError);
    expect(() => assertSafeCoursePath('D:\\file.txt')).toThrow(UnsafeCoursePathError);
  });

  it('rejects traversal segments', () => {
    expect(() => assertSafeCoursePath('../escape.png')).toThrow(UnsafeCoursePathError);
    expect(() => assertSafeCoursePath('nodes/../escape.md')).toThrow(UnsafeCoursePathError);
    expect(() => assertSafeCoursePath('a/./b.md')).toThrow(UnsafeCoursePathError);
  });

  it('rejects backslash traversal after normalization', () => {
    expect(() => assertSafeCoursePath('..\\..\\escape.png')).toThrow(UnsafeCoursePathError);
    expect(() => assertSafeCoursePath('assets\\..\\escape.png')).toThrow(UnsafeCoursePathError);
  });

  it('rejects null bytes', () => {
    expect(() => assertSafeCoursePath('nodes/\0bad.md')).toThrow(UnsafeCoursePathError);
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

describe('cloneCourseFiles', () => {
  it('deep-copies byte arrays', () => {
    const original: StudioFile = { path: 'a.txt', data: enc('hello') };
    const clone = cloneCourseFiles([original]);
    clone[0]!.data[0] = 90;
    expect(original.data[0]).toBe(104);
  });
});

describe('sortCourseFiles', () => {
  it('sorts deterministically by path', () => {
    const files = [
      { path: 'nodes/quiz.json', data: enc('q') },
      { path: 'package.json', data: enc('p') },
      { path: 'nodes/lesson.md', data: enc('l') },
    ];
    const sorted = sortCourseFiles(files);
    expect(sorted.map((f) => f.path)).toEqual([
      'nodes/lesson.md',
      'nodes/quiz.json',
      'package.json',
    ]);
  });

  it('does not mutate the input', () => {
    const files = [
      { path: 'b', data: enc('b') },
      { path: 'a', data: enc('a') },
    ];
    sortCourseFiles(files);
    expect(files[0]!.path).toBe('b');
  });
});

describe('courseFilesToRecord', () => {
  it('builds a byte record keyed by normalized path', () => {
    const files = [
      { path: 'nodes\\lesson.md', data: enc('# L') },
      { path: 'package.json', data: enc('{}') },
    ];
    const record = courseFilesToRecord(files);
    expect(Object.keys(record).sort()).toEqual(['nodes/lesson.md', 'package.json']);
    expect(new TextDecoder().decode(record['nodes/lesson.md']!)).toBe('# L');
  });

  it('rejects duplicate normalized paths', () => {
    expect(() =>
      courseFilesToRecord([
        { path: 'nodes/a.md', data: enc('a') },
        { path: 'nodes\\a.md', data: enc('a') },
      ]),
    ).toThrow(UnsafeCoursePathError);
  });

  it('rejects traversal paths inside the record', () => {
    expect(() => courseFilesToRecord([{ path: '../escape.png', data: enc('x') }])).toThrow(
      UnsafeCoursePathError,
    );
  });
});

describe('recordToCourseFiles', () => {
  it('converts a record back to sorted, copied StudioFile[]', () => {
    const record: Record<string, Uint8Array> = {
      'package.json': enc('{}'),
      'nodes/lesson.md': enc('# L'),
    };
    const files = recordToCourseFiles(record);
    expect(files.map((f) => f.path)).toEqual(['nodes/lesson.md', 'package.json']);
    files[0]!.data[0] = 90;
    expect(record['nodes/lesson.md']![0]).toBe(35);
  });

  it('rejects unsafe paths from a record', () => {
    expect(() => recordToCourseFiles({ 'assets/../../etc/x': enc('x') })).toThrow(
      UnsafeCoursePathError,
    );
  });
});
