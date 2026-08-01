import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateMetadataDir } from './metadata.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures');

describe('validateMetadataDir', () => {
  it('accepts the good fixture course', () => {
    expect(validateMetadataDir(join(fixtures, 'courses'))).toEqual([]);
  });

  it('reports schema violations', () => {
    const errors = validateMetadataDir(join(fixtures, 'courses-broken'));
    expect(errors.length).toBeGreaterThan(0);
  });
});
