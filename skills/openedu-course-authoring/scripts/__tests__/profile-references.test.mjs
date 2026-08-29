import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const referencesDir = join(__dirname, '..', '..', 'references');

const PROFILES = [
  { key: 'neurotypical', file: 'profile-neurotypical.md', defaultProfile: true },
  { key: 'autism', file: 'profile-autism.md', defaultProfile: false },
  { key: 'school', file: 'profile-school.md', defaultProfile: false },
  { key: 'college', file: 'profile-college.md', defaultProfile: false },
];

function loadProfile(file) {
  const path = join(referencesDir, file);
  ok(existsSync(path), `${file} should exist`);
  return readFileSync(path, 'utf-8');
}

describe('profile reference contract (SKILL-SPEC §5.3)', () => {
  for (const { key, file, defaultProfile } of PROFILES) {
    it(`${file} follows the two-section contract`, () => {
      const content = loadProfile(file);

      ok(content.startsWith(`# Profile:`), `${file} must start with a "# Profile:" heading`);
      ok(content.includes(`- key: ${key}`), `${file} must declare key ${key}`);
      ok(content.includes(`- default: ${defaultProfile}`), `${file} must declare default: ${defaultProfile}`);
      ok(content.includes('- description:'), `${file} must include a description`);
      ok(content.includes('## Guidance Deltas'), `${file} must include "## Guidance Deltas"`);
      ok(content.includes('## Output Deltas'), `${file} must include "## Output Deltas"`);
      ok(
        content.indexOf('## Guidance Deltas') < content.indexOf('## Output Deltas'),
        `${file} must order Guidance Deltas before Output Deltas`,
      );
    });
  }

  it('the autism profile covers the binding ALX 2.0 deltas', () => {
    const content = loadProfile('profile-autism.md');
    const requiredMarkers = [
      '`set` to `"autism"`',
      '`add` `["sensory-friendly", "predictable-structure", "literal-language"]`',
      'observe',
      'guided_practice',
      'independent_practice',
      'mastery_check',
      'positive_completion',
      'Let\'s try again',
      'literal',
      'sensory-friendly',
    ];
    for (const marker of requiredMarkers) {
      ok(content.includes(marker), `profile-autism.md should include "${marker}"`);
    }
  });

  it('the neurotypical profile declares no per-profile additions beyond output encoding', () => {
    const content = loadProfile('profile-neurotypical.md');
    strictEqual(content.includes('`set` to `"neurotypical"`'), true);
    strictEqual(content.includes('`set` to `[]`'), true);
  });
});