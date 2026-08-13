import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commitCourseDraft } from './commitCourseDraft';
import { generateCourseDraft } from './generateCourse';

const NOTES =
  'Teach fourth graders how to add and subtract fractions with like denominators.';

async function makePackageDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'openedu-studio-commit-test-'));
}

describe('commitCourseDraft', () => {
  it('rejects an unknown draftId', async () => {
    const packageDir = await makePackageDir();
    try {
      const result = await commitCourseDraft({
        draftId: 'nonexistent',
        packageDir,
      });
      expect(result.success).toBe(false);
      expect(result.code).toBe('draft-not-found');
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('refuses to commit when package has content and force is not set', async () => {
    const packageDir = await makePackageDir();
    try {
      const compile = vi.fn().mockImplementation(
        async (_specPath: string, options: { output: string }) => {
          await mkdir(join(options.output, 'nodes'), { recursive: true });
          await writeFile(
            join(options.output, 'package.json'),
            JSON.stringify({ id: 'test', title: 'Test', version: '1.0.0', author: 'T' }),
            'utf-8',
          );
          return { success: true, diagnostics: [], outputPath: options.output };
        },
      );

      // Generate draft on empty package
      const draft = await generateCourseDraft({
        source: { kind: 'notes', notes: NOTES, completeText: vi.fn().mockResolvedValue('{"format":"openedu-course-spec","version":1,"metadata":{"title":"T","description":"D","author":"A"},"lessons":[]}') },
        packageDir,
        compile,
      });

      expect(draft.success).toBe(true);
      expect(draft.draftId).toBeTruthy();

      // Now add content to package
      await mkdir(join(packageDir, 'nodes'), { recursive: true });
      await writeFile(join(packageDir, 'nodes/intro.md'), '# Intro\n\nExisting', 'utf-8');

      const result = await commitCourseDraft({
        draftId: draft.draftId,
        packageDir,
      });
      expect(result.success).toBe(false);
      expect(result.code).toBe('has-content');
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('commits a draft to an empty package successfully', async () => {
    const packageDir = await makePackageDir();
    try {
      const compile = vi.fn().mockImplementation(
        async (_specPath: string, options: { output: string }) => {
          await mkdir(join(options.output, 'nodes'), { recursive: true });
          await writeFile(
            join(options.output, 'package.json'),
            JSON.stringify({
              id: 'test-course',
              title: 'Test',
              version: '1.0.0',
              author: 'Test Author',
              entry: 'nodes/intro.md',
            }),
            'utf-8',
          );
          await writeFile(
            join(options.output, 'workflow.json'),
            JSON.stringify({ routing: { 'nodes/intro.md': { onComplete: 'COMPLETED' } } }),
            'utf-8',
          );
          await writeFile(
            join(options.output, 'nodes/intro.md'),
            '# Test\n\nContent',
            'utf-8',
          );
          return { success: true, diagnostics: [], outputPath: options.output };
        },
      );

      const draft = await generateCourseDraft({
        source: { kind: 'notes', notes: NOTES, completeText: vi.fn().mockResolvedValue('{"format":"openedu-course-spec","version":1,"metadata":{"title":"Test","description":"D","author":"A"},"lessons":[]}') },
        packageDir,
        compile,
      });

      expect(draft.success).toBe(true);
      expect(draft.draftId).toBeTruthy();

      const result = await commitCourseDraft({
        draftId: draft.draftId,
        packageDir,
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Test');

      // Verify files were written to packageDir
      const { existsSync, readFileSync } = await import('node:fs');
      expect(existsSync(join(packageDir, 'package.json'))).toBe(true);
      expect(existsSync(join(packageDir, 'nodes/intro.md'))).toBe(true);
      expect(existsSync(join(packageDir, 'workflow.json'))).toBe(true);
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

  it('commits even when package has content if force is true', async () => {
    const packageDir = await makePackageDir();
    try {
      const compile = vi.fn().mockImplementation(
        async (_specPath: string, options: { output: string }) => {
          await mkdir(join(options.output, 'nodes'), { recursive: true });
          await writeFile(
            join(options.output, 'package.json'),
            JSON.stringify({
              id: 'new-course',
              title: 'New',
              version: '1.0.0',
              author: 'Test Author',
              entry: 'nodes/lesson.md',
            }),
            'utf-8',
          );
          await writeFile(
            join(options.output, 'nodes/lesson.md'),
            '# New\n\nContent',
            'utf-8',
          );
          return { success: true, diagnostics: [], outputPath: options.output };
        },
      );

      // Generate draft on empty package
      const draft = await generateCourseDraft({
        source: { kind: 'notes', notes: NOTES, completeText: vi.fn().mockResolvedValue('{"format":"openedu-course-spec","version":1,"metadata":{"title":"New","description":"D","author":"A"},"lessons":[]}') },
        packageDir,
        compile,
      });

      expect(draft.success).toBe(true);
      expect(draft.draftId).toBeTruthy();

      // Now add content to package
      await mkdir(join(packageDir, 'nodes'), { recursive: true });
      await writeFile(join(packageDir, 'nodes/intro.md'), '# Old\n\nContent', 'utf-8');

      const result = await commitCourseDraft({
        draftId: draft.draftId,
        packageDir,
        force: true,
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('New');
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });
});