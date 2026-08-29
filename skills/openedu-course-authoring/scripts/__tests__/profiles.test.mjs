import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveProfile, loadProfileConfig, listProfiles, getGradeBandConfig, GRADE_BANDS } from '../profiles.mjs';

function createTempDir() {
  const base = join(tmpdir(), `profiles-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

describe('resolveProfile', () => {
  it('normalizes valid input (trim + lowercase) as explicit', () => {
    strictEqual(resolveProfile('  AUTISM ').key, 'autism');
    strictEqual(resolveProfile('  AUTISM ').source, 'explicit');
    strictEqual(resolveProfile('Neurotypical').key, 'neurotypical');
    strictEqual(resolveProfile('Neurotypical').source, 'explicit');
    strictEqual(resolveProfile('school').key, 'school');
    strictEqual(resolveProfile('College').key, 'college');
  });

  it('defaults to neurotypical when input is missing', () => {
    for (const input of [undefined, null, '', '   ']) {
      const resolved = resolveProfile(input);
      strictEqual(resolved.key, 'neurotypical');
      strictEqual(resolved.source, 'defaulted');
    }
  });

  it('maps unknown input to the closest supported profile', () => {
    const expectations = [
      ['autistic', 'autism'],
      ['spectrum', 'autism'],
      ['asd', 'autism'],
      ['k12', 'school'],
      ['school-age', 'school'],
      ['university', 'college'],
      ['higher-ed', 'college'],
      ['adult', 'college'],
    ];
    for (const [input, expected] of expectations) {
      const resolved = resolveProfile(input);
      strictEqual(resolved.key, expected, `input "${input}" should map to ${expected}`);
      strictEqual(resolved.source, 'mapped');
    }
  });

  it('maps unknown input that matches nothing to neurotypical', () => {
    const resolved = resolveProfile('mystery-learner');
    strictEqual(resolved.key, 'neurotypical');
    strictEqual(resolved.source, 'mapped');
  });
});

describe('loadProfileConfig', () => {
  it('loads the autism profile config from the shipped file', () => {
    const config = loadProfileConfig('autism');
    strictEqual(config.key, 'autism');
    strictEqual(config.name, 'Autism Spectrum');
    strictEqual(config.audience, 'autism');
    strictEqual(config.difficultyBias, 'beginner');
    ok(config.accessibility.includes('sensory-friendly'));
    ok(config.accessibility.includes('literal-language'));
    strictEqual(config.pacingRangeMinutes[1], 30);
  });

  it('loads the neurotypical profile config from the shipped file', () => {
    const config = loadProfileConfig('neurotypical');
    strictEqual(config.key, 'neurotypical');
    strictEqual(config.audience, 'neurotypical');
    strictEqual(config.accessibility.length, 0);
    strictEqual(config.difficultyBias, null);
    strictEqual(config.schemaVersion, 1);
    strictEqual(config.defaultProfile, 'neurotypical');
  });

  it('resolves aliases before loading config', () => {
    const config = loadProfileConfig('autistic');
    strictEqual(config.key, 'autism');
    strictEqual(config.source, 'mapped');
    strictEqual(config.name, 'Autism Spectrum');
  });

  it('throws a clear error when the config is missing a profile key', () => {
    const dir = createTempDir();
    try {
      const configPath = join(dir, 'profiles.config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          schemaVersion: 1,
          defaultProfile: 'neurotypical',
          profiles: { neurotypical: { name: 'Neurotypical', audience: 'neurotypical', accessibility: [] } },
        }),
      );
      ok.throws(() => loadProfileConfig('college', { configPath }), /No profile config entry/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws a clear error when the config file is missing', () => {
    const dir = createTempDir();
    try {
      ok.throws(() => loadProfileConfig('neurotypical', { configPath: join(dir, 'missing.json') }), /Failed to read/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('listProfiles', () => {
  it('lists all four configured profile keys', () => {
    const keys = listProfiles();
    strictEqual(keys.length, 4);
    for (const key of ['neurotypical', 'autism', 'school', 'college']) {
      ok(keys.includes(key), `expected "${key}" in ${JSON.stringify(keys)}`);
    }
  });
});

describe('grade bands', () => {
  it('exposes the five school grade bands in order', () => {
    strictEqual(GRADE_BANDS.length, 5);
    strictEqual(GRADE_BANDS[0], 'early_primary');
    strictEqual(GRADE_BANDS[GRADE_BANDS.length - 1], 'senior_secondary');
  });

  it('loads per-band pacing from the school profile config', () => {
    const config = loadProfileConfig('school');
    ok(config.gradeBands, 'school config should include gradeBands');
    strictEqual(config.gradeBands.early_primary.pacingRangeMinutes[0], 10);
    strictEqual(config.gradeBands.middle_school.pacingRangeMinutes[1], 35);
    strictEqual(config.gradeBands.senior_secondary.pacingRangeMinutes[0], 30);
  });

  it('returns grade-band config via getGradeBandConfig', () => {
    const early = getGradeBandConfig('school', 'early_primary');
    strictEqual(early.pacingRangeMinutes[0], 10);
    strictEqual(early.pacingRangeMinutes[1], 20);

    const senior = getGradeBandConfig('school', 'senior_secondary');
    strictEqual(senior.pacingRangeMinutes[1], 45);
  });

  it('returns null for unknown or non-school grade bands', () => {
    strictEqual(getGradeBandConfig('school', 'phd'), null);
    strictEqual(getGradeBandConfig('college', 'early_primary'), null);
    strictEqual(getGradeBandConfig('neurotypical', 'early_primary'), null);
  });
});