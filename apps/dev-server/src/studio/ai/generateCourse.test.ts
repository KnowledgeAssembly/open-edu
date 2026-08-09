import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateCourseDraft } from './generateCourse';

const NOTES =
  'Teach fourth graders how to add and subtract fractions with like denominators. ' +
  'Start with visual fraction strips, then practice word problems about sharing pizza.';

async function makePackageDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'openedu-studio-ai-test-'));
}

describe('generateCourseDraft', () => {
  it('rejects notes that are too short without calling the LLM or compiler', async () => {
    const packageDir = await makePackageDir();
    try {
      const completeText = vi.fn();
      const compile = vi.fn();
      const result = await generateCourseDraft({
        source: { kind: 'notes', notes: 'short notes', completeText },
        packageDir,
        compile,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.quality).toEqual([]);
      expect(result.outlinePreview).toEqual([]);
      expect(completeText).not.toHaveBeenCalled();
      expect(compile).not.toHaveBeenCalled();
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite a package that already has nodes unless force is set', async () => {
    const packageDir = await makePackageDir();
    try {
      await mkdir(join(packageDir, 'nodes'), { recursive: true });
      await writeFile(join(packageDir, 'nodes/intro.md'), '# Intro\n\nExisting content', 'utf-8');

      const completeText = vi.fn();
      const compile = vi.fn();
      const result = await generateCourseDraft({
        source: { kind: 'notes', notes: NOTES, completeText },
        packageDir,
        compile,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(compile).not.toHaveBeenCalled();
      expect(completeText).not.toHaveBeenCalled();

      const completeTextForce = vi
        .fn()
        .mockResolvedValue('{"format":"openedu-course-spec","version":1,"generatedAt":"now"}');
      const compileForce = vi
        .fn()
        .mockImplementation(
          async (_specPath: string, options: { output: string; validate: boolean }) => {
            expect(options.validate).toBe(true);
            await mkdir(options.output, { recursive: true });
            await writeFile(
              join(options.output, 'package.json'),
              JSON.stringify({
                id: 'fractions-basics',
                title: 'Fractions Basics',
                version: '1.0.0',
                author: 'Test Author',
                entry: 'nodes/intro.md',
              }),
              'utf-8',
            );
            return { success: true, diagnostics: [], outputPath: options.output };
          },
        );

      const forced = await generateCourseDraft({
        source: { kind: 'notes', notes: NOTES, completeText: completeTextForce },
        packageDir,
        compile: compileForce,
        force: true,
      });

      expect(forced.success).toBe(true);
      expect(compileForce).toHaveBeenCalled();
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('compiles a draft into a valid package and reports outline + quality', async () => {
    const packageDir = await makePackageDir();
    try {
      const specJson = JSON.stringify({
        format: 'openedu-course-spec',
        version: 1,
        generatedAt: new Date().toISOString(),
        metadata: {
          title: 'Fractions Basics',
          description: 'Learn to add and subtract like-denominator fractions.',
          author: 'OpenEdu Studio',
          generated: true,
        },
        lessons: [
          {
            id: 'fractions-intro',
            title: 'Fractions Basics',
            objectives: ['Identify fraction parts'],
            coreIdea: 'Fractions describe equal parts of a whole.',
            activities: [
              {
                step: 'observe',
                order: 1,
                type: 'reading',
                description: 'Read about fractions',
              },
            ],
          },
        ],
      });
      const completeText = vi.fn().mockResolvedValue(`\`\`\`json\n${specJson}\n\`\`\``);

      const compile = vi
        .fn()
        .mockImplementation(
          async (specPath: string, options: { output: string; validate: boolean }) => {
            expect(specPath.endsWith('.json')).toBe(true);
            expect(options.output).not.toBe(packageDir);
            expect(options.validate).toBe(true);

            await mkdir(join(options.output, 'nodes'), { recursive: true });
            await writeFile(
              join(options.output, 'package.json'),
              JSON.stringify(
                {
                  id: 'fractions-basics',
                  title: 'Fractions Basics',
                  version: '1.0.0',
                  author: 'Test Author',
                  entry: 'nodes/intro.md',
                },
                null,
                2,
              ),
              'utf-8',
            );
            await writeFile(
              join(options.output, 'workflow.json'),
              JSON.stringify({
                routing: { 'nodes/intro.md': { onComplete: 'COMPLETED' } },
              }),
              'utf-8',
            );
            await writeFile(
              join(options.output, 'nodes/intro.md'),
              '# Fractions Basics\n\nFractions describe equal parts of a whole.\n',
              'utf-8',
            );
            return { success: true, diagnostics: [], outputPath: options.output };
          },
        );

      const result = await generateCourseDraft({
        source: { kind: 'notes', notes: NOTES, completeText },
        packageDir,
        compile,
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Fractions Basics');
      expect(result.outlinePreview.length).toBeGreaterThanOrEqual(1);
      expect(result.outlinePreview[0]).toMatchObject({ kind: 'lesson' });
      expect(result.quality).toHaveLength(4);
      expect(compile).toHaveBeenCalledWith(
        expect.stringMatching(/course-spec\.json$/),
        expect.objectContaining({ validate: true }),
      );
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('reports compile failures through the quality mapping', async () => {
    const packageDir = await makePackageDir();
    try {
      const completeText = vi
        .fn()
        .mockResolvedValue('{"format":"openedu-course-spec","version":1,"generatedAt":"now"}');
      const compile = vi.fn().mockResolvedValue({
        success: false,
        diagnostics: [{ severity: 'error', message: 'missing title', code: 'MISSING_TITLE' }],
      });

      const result = await generateCourseDraft({
        source: { kind: 'notes', notes: NOTES, completeText },
        packageDir,
        compile,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('missing title');
      expect(result.quality).toHaveLength(4);
      const completeness = result.quality.find((item) => item.id === 'completeness');
      expect(completeness?.passed).toBe(false);
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  const SPEC_JSON = JSON.stringify({
    format: 'openedu-course-spec',
    version: 1,
    generatedAt: new Date().toISOString(),
    metadata: {
      title: 'Uploaded Fractions',
      description: 'Learn to add and subtract like-denominator fractions.',
      author: 'Test Author',
    },
    lessons: [
      {
        id: 'fractions-intro',
        title: 'Uploaded Fractions',
        objectives: ['Identify fraction parts'],
        coreIdea: 'Fractions describe equal parts of a whole.',
        activities: [
          {
            step: 'observe',
            order: 1,
            type: 'reading',
            description: 'Read about fractions',
          },
        ],
      },
    ],
  });

  function successfulCompile(specExt: string) {
    return vi
      .fn()
      .mockImplementation(
        async (specPath: string, options: { output: string; validate: boolean }) => {
          expect(specPath.endsWith(specExt)).toBe(true);
          expect(options.validate).toBe(true);

          await mkdir(join(options.output, 'nodes'), { recursive: true });
          await writeFile(
            join(options.output, 'package.json'),
            JSON.stringify(
              {
                id: 'fractions-basics',
                title: 'Uploaded Fractions',
                version: '1.0.0',
                author: 'Test Author',
                entry: 'nodes/intro.md',
              },
              null,
              2,
            ),
            'utf-8',
          );
          await writeFile(
            join(options.output, 'workflow.json'),
            JSON.stringify({ routing: { 'nodes/intro.md': { onComplete: 'COMPLETED' } } }),
            'utf-8',
          );
          await writeFile(
            join(options.output, 'nodes/intro.md'),
            '# Uploaded Fractions\n\nFractions describe equal parts of a whole.\n',
            'utf-8',
          );
          return { success: true, diagnostics: [], outputPath: options.output };
        },
      );
  }

  it('compiles an uploaded .json spec into a valid package without calling the LLM', async () => {
    const packageDir = await makePackageDir();
    try {
      const completeText = vi.fn();
      const compile = successfulCompile('.json');
      const result = await generateCourseDraft({
        source: { kind: 'spec', spec: SPEC_JSON, extension: '.json' },
        packageDir,
        compile,
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Uploaded Fractions');
      expect(result.outlinePreview.length).toBeGreaterThanOrEqual(1);
      expect(result.quality).toHaveLength(4);
      expect(completeText).not.toHaveBeenCalled();
      expect(compile).toHaveBeenCalledWith(
        expect.stringMatching(/course-spec\.json$/),
        expect.objectContaining({ validate: true, output: expect.not.stringMatching(packageDir) }),
      );
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('compiles an uploaded .md spec through the markdown parser', async () => {
    const packageDir = await makePackageDir();
    try {
      const compile = successfulCompile('.md');
      const result = await generateCourseDraft({
        source: { kind: 'spec', spec: '# My Course\n\nSome content', extension: '.md' },
        packageDir,
        compile,
      });

      expect(result.success).toBe(true);
      expect(compile).toHaveBeenCalledWith(
        expect.stringMatching(/course-spec\.md$/),
        expect.objectContaining({ validate: true }),
      );
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('rejects an empty uploaded spec before touching the compiler', async () => {
    const packageDir = await makePackageDir();
    try {
      const compile = vi.fn();
      const result = await generateCourseDraft({
        source: { kind: 'spec', spec: '   ', extension: '.json' },
        packageDir,
        compile,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('spec-invalid');
      expect(compile).not.toHaveBeenCalled();
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('reports invalid spec content through the compile failure + quality mapping', async () => {
    const packageDir = await makePackageDir();
    try {
      const compile = vi.fn().mockResolvedValue({
        success: false,
        diagnostics: [{ severity: 'error', message: 'bad', code: 'X' }],
      });
      const result = await generateCourseDraft({
        source: { kind: 'spec', spec: '{ "not": "a spec" }', extension: '.json' },
        packageDir,
        compile,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('compile');
      expect(result.error).toBe('bad');
      expect(result.quality).toHaveLength(4);
      const completeness = result.quality.find((item) => item.id === 'completeness');
      expect(completeness?.passed).toBe(false);
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite a non-empty package from an uploaded spec unless force is set', async () => {
    const packageDir = await makePackageDir();
    try {
      await mkdir(join(packageDir, 'nodes'), { recursive: true });
      await writeFile(join(packageDir, 'nodes/intro.md'), '# Intro\n\nExisting content', 'utf-8');

      const compile = vi.fn();
      const result = await generateCourseDraft({
        source: { kind: 'spec', spec: SPEC_JSON, extension: '.json' },
        packageDir,
        compile,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('has-content');
      expect(compile).not.toHaveBeenCalled();

      const compileForce = successfulCompile('.json');
      const forced = await generateCourseDraft({
        source: { kind: 'spec', spec: SPEC_JSON, extension: '.json' },
        packageDir,
        compile: compileForce,
        force: true,
      });

      expect(forced.success).toBe(true);
      expect(compileForce).toHaveBeenCalled();
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });
});
