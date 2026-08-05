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
        notes: 'short notes',
        packageDir,
        completeText,
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
        notes: NOTES,
        packageDir,
        completeText,
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
        .mockResolvedValue({ success: true, diagnostics: [], outputPath: packageDir });

      const forced = await generateCourseDraft({
        notes: NOTES,
        packageDir,
        completeText: completeTextForce,
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
            expect(options.output).toBe(packageDir);
            expect(options.validate).toBe(true);

            await mkdir(join(packageDir, 'nodes'), { recursive: true });
            await writeFile(
              join(packageDir, 'package.json'),
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
              join(packageDir, 'workflow.json'),
              JSON.stringify({
                routing: { 'nodes/intro.md': { onComplete: 'COMPLETED' } },
              }),
              'utf-8',
            );
            await writeFile(
              join(packageDir, 'nodes/intro.md'),
              '# Fractions Basics\n\nFractions describe equal parts of a whole.\n',
              'utf-8',
            );
            return { success: true, diagnostics: [], outputPath: packageDir };
          },
        );

      const result = await generateCourseDraft({
        notes: NOTES,
        packageDir,
        completeText,
        compile,
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Fractions Basics');
      expect(result.outlinePreview.length).toBeGreaterThanOrEqual(1);
      expect(result.outlinePreview[0]).toMatchObject({ kind: 'lesson' });
      expect(result.quality).toHaveLength(4);
      expect(compile).toHaveBeenCalledWith(
        expect.stringMatching(/course-spec\.json$/),
        expect.objectContaining({ output: packageDir, validate: true }),
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
        notes: NOTES,
        packageDir,
        completeText,
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
});
