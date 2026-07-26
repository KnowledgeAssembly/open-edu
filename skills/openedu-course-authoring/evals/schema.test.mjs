import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const evalsPath = join(__dirname, 'evals.json');

function loadEvals() {
  return JSON.parse(readFileSync(evalsPath, 'utf-8'));
}

describe('evals.json schema validation', () => {
  const data = loadEvals();

  it('has the correct skill_name', () => {
    strictEqual(data.skill_name, 'openedu-course-authoring');
  });

  it('has an evals array with 9 entries', () => {
    ok(Array.isArray(data.evals));
    strictEqual(data.evals.length, 9);
  });

  it('all eval IDs are unique', () => {
    const ids = data.evals.map((e) => e.id);
    const uniqueIds = new Set(ids);
    strictEqual(ids.length, uniqueIds.size, `Duplicate IDs found: ${JSON.stringify(ids)}`);
  });

  it('all eval IDs are positive integers', () => {
    for (const e of data.evals) {
      ok(Number.isInteger(e.id), `eval ID ${e.id} is not an integer`);
      ok(e.id > 0, `eval ID ${e.id} is not positive`);
    }
  });

  it('all prompts are non-empty strings', () => {
    for (const e of data.evals) {
      ok(typeof e.prompt === 'string', `eval ${e.id}: prompt is not a string`);
      ok(e.prompt.trim().length > 0, `eval ${e.id}: prompt is empty`);
    }
  });

  it('all expected_output are non-empty strings', () => {
    for (const e of data.evals) {
      ok(typeof e.expected_output === 'string', `eval ${e.id}: expected_output is not a string`);
      ok(e.expected_output.trim().length > 0, `eval ${e.id}: expected_output is empty`);
    }
  });

  it('all files are arrays', () => {
    for (const e of data.evals) {
      ok(
        Array.isArray(e.files),
        `eval ${e.id}: files is not an array (got ${typeof e.files})`
      );
    }
  });

  it('all expectations are arrays of strings', () => {
    for (const e of data.evals) {
      ok(
        Array.isArray(e.expectations),
        `eval ${e.id}: expectations is not an array (got ${typeof e.expectations})`
      );
      for (let i = 0; i < e.expectations.length; i++) {
        const exp = e.expectations[i];
        ok(typeof exp === 'string', `eval ${e.id}: expectation[${i}] is not a string`);
        ok(exp.trim().length > 0, `eval ${e.id}: expectation[${i}] is empty`);
      }
    }
  });

  describe('portable evals (IDs 1, 2, 3)', () => {
    for (const id of [1, 2, 3]) {
      it(`eval ${id} has portable mode in expected_output`, () => {
        const e = data.evals.find((ev) => ev.id === id);
        ok(e, `eval ${id} not found`);
        ok(
          e.expected_output.includes('Mode: portable') || e.expected_output.includes('mode: portable'),
          `eval ${id}: expected_output does not indicate portable mode`
        );
      });

      it(`eval ${id} expects course-spec.json in files`, () => {
        const e = data.evals.find((ev) => ev.id === id);
        ok(e.files.includes('course-spec.json'), `eval ${id}: course-spec.json not in files`);
      });
    }
  });

  describe('repository evals (IDs 4, 5)', () => {
    for (const id of [4, 5]) {
      it(`eval ${id} has repository mode in expected_output`, () => {
        const e = data.evals.find((ev) => ev.id === id);
        ok(e, `eval ${id} not found`);
        ok(
          e.expected_output.includes('Mode: repository') || e.expected_output.includes('mode: repository'),
          `eval ${id}: expected_output does not indicate repository mode`
        );
      });
    }
  });

  describe('source-material eval (ID 5)', () => {
    it('eval 5 references the PDF pipeline', () => {
      const e = data.evals.find((ev) => ev.id === 5);
      ok(e.expected_output.includes('pipeline'), 'expected_output does not mention pipeline');
      ok(
        e.expected_output.includes('math profile') || e.expected_output.includes('math'),
        'expected_output does not mention math profile'
      );
      ok(
        e.files.includes('quality-report.json'),
        'quality-report.json not in files'
      );
    });
  });

  describe('unsupported-widget eval (ID 7)', () => {
    it('eval 7 describes fallback behavior', () => {
      const e = data.evals.find((ev) => ev.id === 7);
      ok(e.expected_output.includes('unsupported'), 'expected_output does not mention unsupported');
      ok(
        e.expected_output.includes('fall back') || e.expected_output.includes('fallback'),
        'expected_output does not mention fallback'
      );
    });

    it('eval 7 does not expect course-spec.json in files', () => {
      const e = data.evals.find((ev) => ev.id === 7);
      ok(!e.files.includes('course-spec.json'), 'eval 7 should not list course-spec.json as a file artifact');
    });
  });

  describe('missing-input eval (ID 6)', () => {
    it('eval 6 describes clarification behavior', () => {
      const e = data.evals.find((ev) => ev.id === 6);
      ok(
        e.expected_output.includes('clarif') || e.expected_output.includes('follow-up'),
        'expected_output does not describe clarification behavior'
      );
    });

    it('eval 6 has no files', () => {
      const e = data.evals.find((ev) => ev.id === 6);
      strictEqual(e.files.length, 0, 'eval 6 should have no files');
    });
  });

  describe('multilingual eval (ID 9)', () => {
    it('eval 9 specifies locale es-MX', () => {
      const e = data.evals.find((ev) => ev.id === 9);
      ok(
        e.prompt.includes('es-MX') && e.expected_output.includes('es-MX'),
        'es-MX locale not found in prompt and expected_output'
      );
    });
  });

  describe('existing-output eval (ID 8)', () => {
    it('eval 8 describes overwrite safety behavior', () => {
      const e = data.evals.find((ev) => ev.id === 8);
      ok(
        e.expected_output.includes('overwrite') || e.expected_output.includes('overwriting'),
        'expected_output does not describe overwrite behavior'
      );
      ok(
        e.expected_output.includes('confirmation') || e.expected_output.includes('permission'),
        'expected_output does not describe confirmation behavior'
      );
    });
  });
});