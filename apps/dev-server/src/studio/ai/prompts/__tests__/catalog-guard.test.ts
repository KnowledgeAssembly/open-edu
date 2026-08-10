import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { compile } from '@open-edu/course-compiler';
import { CourseModelSchema } from '@open-edu/course-compiler';
import { parseCourseSpecJSON } from '@open-edu/course-compiler';
import { renderWidgetCatalogSection, buildCourseSpecPrompt } from '../index.js';

vi.mock('../../../widgets/curatedCatalog.js', () => ({
  listCuratedWidgets: () => [
    {
      id: 'core.multiple-choice',
      name: 'Multiple Choice',
      domain: 'core',
      guide: { configFields: [] },
    },
    {
      id: 'math.fraction-visual',
      name: 'Fraction Visual',
      domain: 'math',
      guide: { configFields: [] },
    },
  ],
}));

const FIXTURE_DIR = join(__dirname, 'fixtures');
const PROMPT_DIR = join(__dirname, '..');
const CATALOG_ID_REGEX = /\b(?:core|math|open-edu)\.[a-z0-9-]+/i;

function readPromptSource(filename: string): string {
  const path = join(PROMPT_DIR, filename);
  if (!existsSync(path)) throw new Error(`Missing prompt source: ${filename}`);
  return readFileSync(path, 'utf-8');
}

describe('catalog guard', () => {
  it('renderWidgetCatalogSection lists every curated widget id', () => {
    const section = renderWidgetCatalogSection();
    expect(section).toContain('AVAILABLE WIDGETS');
    expect(section).toContain('core.multiple-choice');
    expect(section).toContain('math.fraction-visual');
  });

  it('the full-course prompt injects catalog ids', () => {
    const prompt = buildCourseSpecPrompt('Fractions');
    expect(prompt).toContain('core.multiple-choice');
  });

  it('prompt source never hardcodes a widget-id literal', () => {
    for (const filename of ['coursePrompt.ts', 'itemAddPrompts.ts', 'itemEditPrompts.ts']) {
      const source = readPromptSource(filename);
      expect(CATALOG_ID_REGEX.test(source)).toBe(false);
    }
  });
});

describe('contract guard', () => {
  it('the fixture mirrors the contract and parses into a valid CourseModel', () => {
    const specText = readFileSync(join(FIXTURE_DIR, 'course-spec.sample.json'), 'utf-8');
    const { model, diagnostics } = parseCourseSpecJSON(specText);
    expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(model).not.toBeNull();
    expect(CourseModelSchema.safeParse(model).success).toBe(true);
    expect(model?.modules[0]?.lessons).toHaveLength(2);
  });

  it('compiles the fixture end-to-end with validation', async () => {
    const specPath = join(FIXTURE_DIR, 'course-spec.sample.json');
    const outputDir = await mkdtemp(join(tmpdir(), 'openedu-spec-guard-'));
    try {
      const result = await compile(specPath, { output: outputDir, validate: true });
      const errors = result.diagnostics.filter((d) => d.severity === 'error');
      expect(result.success).toBe(true);
      expect(errors).toHaveLength(0);
      const files = readdirSync(join(outputDir, 'nodes'));
      expect(files.some((f) => extname(f) === '.md')).toBe(true);
      expect(files.some((f) => extname(f) === '.json')).toBe(true);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it('the contract names the required top-level keys', () => {
    const source = readPromptSource('coursePrompt.ts');
    for (const key of ['format', 'version', 'generatedAt', 'metadata', 'lessons']) {
      expect(source).toContain(`"${key}"`);
    }
  });
});
