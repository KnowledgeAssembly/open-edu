import { describe, it, expect } from 'vitest';
import { PackageManifestSchema, SkillsSchema } from './manifest';

describe('PackageManifestSchema', () => {
  const validManifest = {
    id: 'intro-to-variables',
    title: 'Introduction to Variables',
    version: '1.0.0',
    author: 'Open-Edu',
    entry: 'nodes/lesson-01.md',
  };

  it('should accept a valid manifest', () => {
    expect(PackageManifestSchema.parse(validManifest)).toEqual(validManifest);
  });

  it('should reject missing id', () => {
    const { id: _id, ...rest } = validManifest;
    expect(() => PackageManifestSchema.parse(rest)).toThrow();
  });

  it('should reject empty id', () => {
    expect(() => PackageManifestSchema.parse({ ...validManifest, id: '' })).toThrow();
  });

  it('should reject id with uppercase letters', () => {
    expect(() => PackageManifestSchema.parse({ ...validManifest, id: 'Intro-To-Vars' })).toThrow();
  });

  it('should accept kebab-case id with hyphens and underscores', () => {
    const m = PackageManifestSchema.parse({
      ...validManifest,
      id: 'my_package_v2',
    });
    expect(m.id).toBe('my_package_v2');
  });

  it('should reject missing title', () => {
    const { title: _title, ...rest } = validManifest;
    expect(() => PackageManifestSchema.parse(rest)).toThrow();
  });

  it('should reject version not in semver format', () => {
    expect(() => PackageManifestSchema.parse({ ...validManifest, version: '1.0' })).toThrow();
    expect(() => PackageManifestSchema.parse({ ...validManifest, version: 'v1.0.0' })).toThrow();
  });

  it('should reject missing author', () => {
    const { author: _author, ...rest } = validManifest;
    expect(() => PackageManifestSchema.parse(rest)).toThrow();
  });

  it('should reject missing entry', () => {
    const { entry: _entry, ...rest } = validManifest;
    expect(() => PackageManifestSchema.parse(rest)).toThrow();
  });

  it('should strip unexpected fields', () => {
    const result = PackageManifestSchema.parse({
      ...validManifest,
      extraField: 'should be removed',
    });
    expect(result).not.toHaveProperty('extraField');
  });

  it('should accept long but valid field values', () => {
    const m = PackageManifestSchema.parse({
      ...validManifest,
      title: 'a'.repeat(256),
      entry: '/'.repeat(512),
    });
    expect(m.title).toHaveLength(256);
  });

  it('should reject oversize title', () => {
    expect(() =>
      PackageManifestSchema.parse({ ...validManifest, title: 'a'.repeat(257) }),
    ).toThrow();
  });
});

describe('SkillsSchema', () => {
  it('should accept a list of skill names', () => {
    expect(SkillsSchema.parse(['javascript.variables', 'javascript.constants'])).toEqual([
      'javascript.variables',
      'javascript.constants',
    ]);
  });

  it('should accept an empty list', () => {
    expect(SkillsSchema.parse([])).toEqual([]);
  });

  it('should reject empty skill name', () => {
    expect(() => SkillsSchema.parse([''])).toThrow();
  });
});
