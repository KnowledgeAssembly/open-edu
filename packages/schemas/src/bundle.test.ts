import { describe, it, expect } from 'vitest';
import { BundleManifestSchema } from './bundle';

const validBundle = {
  id: 'level-b-math',
  title: 'Level B Math',
  version: '1.0.0',
  author: 'Open-Edu',
  modules: [
    {
      id: 'addition_basics',
      title: 'Addition Basics',
      path: './modules/addition_basics',
      dependsOn: [],
    },
    {
      id: 'addition_carry',
      title: 'Addition with Carry',
      path: './modules/addition_carry',
      dependsOn: ['addition_basics'],
    },
  ],
};

describe('BundleManifestSchema', () => {
  it('should accept a valid bundle manifest', () => {
    const result = BundleManifestSchema.parse(validBundle);
    expect(result.id).toBe('level-b-math');
    expect(result.modules).toHaveLength(2);
    expect(result.type).toBe('bundle');
  });

  it('should default type to "bundle"', () => {
    const { type: _t, ...withoutType } = validBundle as { type?: string };
    const result = BundleManifestSchema.parse(withoutType);
    expect(result.type).toBe('bundle');
  });

  it('should reject missing id', () => {
    const { id: _id, ...rest } = validBundle;
    expect(() => BundleManifestSchema.parse(rest)).toThrow();
  });

  it('should reject empty modules array', () => {
    expect(() => BundleManifestSchema.parse({ ...validBundle, modules: [] })).toThrow();
  });

  it('should reject duplicate module ids', () => {
    const dupModules = [
      { id: 'mod-a', title: 'Mod A', path: './mod-a' },
      { id: 'mod-a', title: 'Mod A Dupe', path: './mod-a-dupe' },
    ];
    expect(() => BundleManifestSchema.parse({ ...validBundle, modules: dupModules })).toThrow(
      'Duplicate module id',
    );
  });

  it('should reject non-semver version', () => {
    expect(() => BundleManifestSchema.parse({ ...validBundle, version: '1.0' })).toThrow();
    expect(() => BundleManifestSchema.parse({ ...validBundle, version: 'v1.0.0' })).toThrow();
  });

  it('should reject missing title', () => {
    const { title: _t, ...rest } = validBundle;
    expect(() => BundleManifestSchema.parse(rest)).toThrow();
  });

  it('should reject missing author', () => {
    const { author: _a, ...rest } = validBundle;
    expect(() => BundleManifestSchema.parse(rest)).toThrow();
  });

  it('should reject missing path on module', () => {
    const { path: _p, ...noPath } = validBundle.modules[0]!;
    expect(() =>
      BundleManifestSchema.parse({
        ...validBundle,
        modules: [noPath, validBundle.modules[1]!],
      }),
    ).toThrow();
  });

  it('should accept optional fields', () => {
    const withOptional = {
      ...validBundle,
      level: 'level-b',
      subject: 'math',
      description: 'A math bundle',
      skills: ['algebra.basics'],
      rewards: './rewards.json',
    };
    const result = BundleManifestSchema.parse(withOptional);
    expect(result.level).toBe('level-b');
    expect(result.subject).toBe('math');
    expect(result.description).toBe('A math bundle');
    expect(result.skills).toEqual(['algebra.basics']);
    expect(result.rewards).toBe('./rewards.json');
  });

  it('should reject module id with uppercase', () => {
    expect(() =>
      BundleManifestSchema.parse({
        ...validBundle,
        modules: [{ id: 'UpperCase', title: 'Bad', path: './bad' }, ...validBundle.modules],
      }),
    ).toThrow('kebab-case');
  });

  it('should accept kebab-case module ids with underscores', () => {
    const result = BundleManifestSchema.parse({
      ...validBundle,
      modules: [{ id: 'my_module_v2', title: 'My Module', path: './mymod' }],
    });
    expect(result.modules[0]!.id).toBe('my_module_v2');
  });

  it('accepts an optional cards path', () => {
    const result = BundleManifestSchema.parse({ ...validBundle, cards: './cards.json' });
    expect(result.cards).toBe('./cards.json');
  });

  it('rejects rewards/cards paths that escape the bundle directory', () => {
    expect(() =>
      BundleManifestSchema.parse({ ...validBundle, rewards: '../rewards.json' }),
    ).toThrow('must be a relative path');
    expect(() => BundleManifestSchema.parse({ ...validBundle, cards: '/etc/cards.json' })).toThrow(
      'must be a relative path',
    );
    expect(() => BundleManifestSchema.parse({ ...validBundle, cards: '..\\cards.json' })).toThrow(
      'must be a relative path',
    );
  });
});
