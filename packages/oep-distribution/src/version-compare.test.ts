import { describe, it, expect } from 'vitest';
import { semverGreaterThan, semverEquals, parseSemver } from './version-compare';

describe('parseSemver', () => {
  it('parses valid semver', () => {
    expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('handles zeros', () => {
    expect(parseSemver('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 });
  });
});

describe('semverGreaterThan', () => {
  it('major version wins', () => {
    expect(semverGreaterThan('2.0.0', '1.9.9')).toBe(true);
    expect(semverGreaterThan('1.0.0', '2.0.0')).toBe(false);
  });

  it('minor version wins when major equal', () => {
    expect(semverGreaterThan('1.3.0', '1.2.9')).toBe(true);
  });

  it('patch version wins when major+minor equal', () => {
    expect(semverGreaterThan('1.2.3', '1.2.2')).toBe(true);
  });

  it('same version is not greater', () => {
    expect(semverGreaterThan('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('semverEquals', () => {
  it('same versions are equal', () => {
    expect(semverEquals('1.0.0', '1.0.0')).toBe(true);
  });

  it('different versions are not equal', () => {
    expect(semverEquals('1.0.0', '1.0.1')).toBe(false);
  });
});
