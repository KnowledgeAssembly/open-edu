import { describe, expect, it } from 'vitest';
import { parseReleaseTag, parseChecksums } from './github.js';

describe('parseReleaseTag', () => {
  it('extracts id and version', () => {
    expect(parseReleaseTag('tribal-art-v0.4.0')).toEqual({ id: 'tribal-art', version: '0.4.0' });
    expect(parseReleaseTag('level-b-math-v1.10.2')).toEqual({
      id: 'level-b-math',
      version: '1.10.2',
    });
  });

  it('rejects non-conforming tags', () => {
    expect(parseReleaseTag('tribal-art-0.4.0')).toBeNull();
    expect(parseReleaseTag('tribal-art-v0.4')).toBeNull();
    expect(parseReleaseTag('')).toBeNull();
  });
});

describe('parseChecksums', () => {
  it('maps filename to sha256', () => {
    const sha = 'a'.repeat(64);
    const map = parseChecksums(
      `${sha}  tribal-art-0.4.0.oep\n${'b'.repeat(64)} *other.oep\njunk line\n`,
    );
    expect(map.get('tribal-art-0.4.0.oep')).toBe(sha);
    expect(map.get('other.oep')).toBe('b'.repeat(64));
    expect(map.size).toBe(2);
  });
});
