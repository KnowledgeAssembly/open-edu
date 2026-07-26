import { describe, it, expect } from 'vitest';
import { validateZipEntry, validateZipArchive, SecurityViolationError } from './zip-security';

describe('validateZipEntry', () => {
  it('accepts normal paths', () => {
    expect(() => validateZipEntry('course/package.json', 100)).not.toThrow();
  });

  it('accepts root-level entry', () => {
    expect(() => validateZipEntry('manifest.json', 50)).not.toThrow();
  });

  it('rejects backslash paths', () => {
    expect(() => validateZipEntry('course\\evil.js', 10)).toThrow(SecurityViolationError);
  });

  it('rejects absolute paths', () => {
    expect(() => validateZipEntry('/etc/passwd', 10)).toThrow(SecurityViolationError);
  });

  it('rejects parent traversal', () => {
    expect(() => validateZipEntry('../secrets.json', 10)).toThrow(SecurityViolationError);
  });

  it('rejects nested parent traversal', () => {
    expect(() => validateZipEntry('course/nodes/../../../etc/hosts', 10)).toThrow(
      SecurityViolationError,
    );
  });

  it('rejects negative size', () => {
    expect(() => validateZipEntry('course/ok.json', -1)).toThrow(SecurityViolationError);
  });

  it('rejects NaN size', () => {
    expect(() => validateZipEntry('course/ok.json', NaN)).toThrow(SecurityViolationError);
  });

  it('accepts single dot segment', () => {
    expect(() => validateZipEntry('course/./package.json', 100)).not.toThrow();
  });
});

describe('validateZipArchive', () => {
  const opts = { maxArchiveBytes: 10000, maxDecompressedBytes: 50000 };

  it('accepts valid archive within limits', () => {
    expect(() =>
      validateZipArchive(
        5000,
        [
          { path: 'manifest.json', size: 100 },
          { path: 'course/package.json', size: 200 },
          { path: 'course/nodes/lesson.md', size: 300 },
        ],
        opts,
      ),
    ).not.toThrow();
  });

  it('rejects archive exceeding byte limit', () => {
    expect(() => validateZipArchive(20000, [{ path: 'manifest.json', size: 10 }], opts)).toThrow(
      'exceeds limit',
    );
  });

  it('rejects decompressed total exceeding limit', () => {
    expect(() =>
      validateZipArchive(
        1000,
        [
          { path: 'manifest.json', size: 30000 },
          { path: 'course/package.json', size: 30000 },
        ],
        opts,
      ),
    ).toThrow('exceeds limit');
  });

  it('rejects on first bad entry in list', () => {
    expect(() =>
      validateZipArchive(
        1000,
        [
          { path: 'manifest.json', size: 100 },
          { path: '../bad.json', size: 10 },
          { path: 'course/ok.md', size: 50 },
        ],
        opts,
      ),
    ).toThrow('Parent directory traversal');
  });
});
