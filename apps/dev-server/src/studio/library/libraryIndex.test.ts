import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanWorkspace, resolveWorkspace, parentOf, isSafeRelativePath } from './libraryIndex';

let root = '';

async function makeWorkspace(): Promise<string> {
  root = await mkdtemp(join(tmpdir(), 'openedu-studio-lib-'));
  return root;
}

function courseManifest(id: string, title: string) {
  return JSON.stringify(
    { id, title, version: '1.0.0', author: 'Test', entry: 'nodes/intro.md' },
    null,
    2,
  );
}

async function writeCourse(dir: string, id: string, title: string) {
  await mkdir(join(dir, 'nodes'), { recursive: true });
  await writeFile(join(dir, 'package.json'), courseManifest(id, title), 'utf-8');
  await writeFile(join(dir, 'nodes/intro.md'), `# ${title}\n`, 'utf-8');
}

async function writeUnit(dir: string, id: string, title: string, modules: string[]) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'bundle.json'),
    JSON.stringify(
      {
        id,
        title,
        version: '1.0.0',
        author: 'Test',
        modules: modules.map((moduleId) => ({
          id: moduleId,
          title: moduleId,
          path: `./modules/${moduleId}`,
          dependsOn: [],
        })),
      },
      null,
      2,
    ),
    'utf-8',
  );
}

beforeEach(async () => {
  await makeWorkspace();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('scanWorkspace', () => {
  it('classifies top-level courses and units', async () => {
    await writeCourse(join(root, 'fractions'), 'fractions', 'Fractions');
    await writeUnit(join(root, 'my-unit'), 'my-unit', 'My Unit', ['fractions']);

    const entries = scanWorkspace(root);
    expect(entries).toHaveLength(2);
    const course = entries.find((entry) => entry.kind === 'course');
    const unit = entries.find((entry) => entry.kind === 'unit');
    expect(course).toMatchObject({
      id: 'fractions',
      title: 'Fractions',
      relativePath: 'fractions',
    });
    expect(unit).toMatchObject({
      id: 'my-unit',
      title: 'My Unit',
      relativePath: 'my-unit',
      kind: 'unit',
    });
  });

  it('skips node_modules, .git, .archive, .edu and dist', async () => {
    await mkdir(join(root, 'node_modules'), { recursive: true });
    await mkdir(join(root, '.git'), { recursive: true });
    await mkdir(join(root, '.archive'), { recursive: true });
    await mkdir(join(root, '.edu'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    await writeCourse(join(root, 'a-course'), 'a-course', 'A Course');

    const entries = scanWorkspace(root);
    expect(entries.map((entry) => entry.relativePath)).toEqual(['a-course']);
  });

  it('does not surface bundle modules as top-level entries', async () => {
    await writeUnit(join(root, 'units', 'math-unit'), 'math-unit', 'Math Unit', ['mod-a', 'mod-b']);
    await writeCourse(join(root, 'units', 'math-unit', 'modules', 'mod-a'), 'mod-a', 'Mod A');
    await writeCourse(join(root, 'units', 'math-unit', 'modules', 'mod-b'), 'mod-b', 'Mod B');

    const entries = scanWorkspace(root);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'math-unit',
      kind: 'unit',
      relativePath: 'units/math-unit',
    });
  });

  it('ignores directories whose package.json is not an OpenEdu manifest', async () => {
    await mkdir(join(root, 'random'), { recursive: true });
    await writeFile(
      join(root, 'random', 'package.json'),
      JSON.stringify({ name: 'some-node-package', version: '1.0.0' }),
      'utf-8',
    );
    expect(scanWorkspace(root)).toHaveLength(0);
  });

  it('returns [] for a missing workspace root', () => {
    expect(scanWorkspace(join(root, 'does-not-exist'))).toEqual([]);
  });

  it('sorts entries by most recently updated first', async () => {
    await writeCourse(join(root, 'old'), 'old', 'Old');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await writeCourse(join(root, 'new'), 'new', 'New');

    const entries = scanWorkspace(root);
    expect(entries[0]?.id).toBe('new');
    expect(entries[1]?.id).toBe('old');
  });
});

describe('resolveWorkspace', () => {
  beforeEach(() => {
    delete process.env.OPEN_EDU_STUDIO_WORKSPACE;
  });

  it('uses OPEN_EDU_STUDIO_WORKSPACE when set', () => {
    process.env.OPEN_EDU_STUDIO_WORKSPACE = '/tmp/my-workspace';
    expect(resolveWorkspace('/tmp/my-workspace/some-course')).toBe('/tmp/my-workspace');
  });

  it('falls back to the parent of the active package dir', () => {
    expect(resolveWorkspace('/tmp/ws/some-course')).toBe('/tmp/ws');
    expect(parentOf('/a/b/c')).toBe('/a/b');
  });
});

describe('isSafeRelativePath', () => {
  it('accepts simple relative paths', () => {
    expect(isSafeRelativePath('fractions')).toBe(true);
    expect(isSafeRelativePath('units/mini-unit')).toBe(true);
  });

  it('rejects traversal and absolute paths', () => {
    expect(isSafeRelativePath('../escape')).toBe(false);
    expect(isSafeRelativePath('a/../../b')).toBe(false);
    expect(isSafeRelativePath('/abs')).toBe(false);
    expect(isSafeRelativePath('')).toBe(false);
  });

  it('rejects backslashes and null bytes (Windows-safe)', () => {
    expect(isSafeRelativePath('..\\escape')).toBe(false);
    expect(isSafeRelativePath('a\\b')).toBe(false);
    expect(isSafeRelativePath('a\u0000b')).toBe(false);
  });
});
