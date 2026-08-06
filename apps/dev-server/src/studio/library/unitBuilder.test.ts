import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename, relative } from 'node:path';
import { createUnit, buildUnitOep } from './unitBuilder';
import { scanWorkspace } from './libraryIndex';
import { BundleManifestSchema } from '@open-edu/schemas';

let ws = '';

function courseManifest(id: string, title: string) {
  return JSON.stringify(
    { id, title, version: '1.0.0', author: 'Test', entry: 'nodes/intro.md' },
    null,
    2,
  );
}

async function makeCourse(name: string, id: string, title: string): Promise<string> {
  const dir = join(ws, name);
  await mkdir(join(dir, 'nodes'), { recursive: true });
  await writeFile(join(dir, 'package.json'), courseManifest(id, title), 'utf-8');
  await writeFile(join(dir, 'nodes/intro.md'), `# ${title}\n`, 'utf-8');
  return dir;
}

beforeEach(async () => {
  ws = await mkdtemp(join(tmpdir(), 'openedu-studio-unit-'));
});

afterEach(async () => {
  await rm(ws, { recursive: true, force: true });
});

describe('createUnit', () => {
  it('builds a valid bundle with modules copied from selected courses', async () => {
    await makeCourse('one', 'one', 'Course One');
    await makeCourse('two', 'two', 'Course Two');

    const entry = await createUnit({
      workspaceRoot: ws,
      courseRelativePaths: ['one', 'two'],
      unitId: 'mini-unit',
      unitTitle: 'Mini Unit',
      author: 'Test',
    });

    expect(entry).toMatchObject({
      kind: 'unit',
      relativePath: 'units/mini-unit',
      title: 'Mini Unit',
    });

    const unitDir = join(ws, 'units', 'mini-unit');
    const bundleRaw = JSON.parse(await readFile(join(unitDir, 'bundle.json'), 'utf-8'));
    const parsed = BundleManifestSchema.safeParse(bundleRaw);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.modules.map((m) => m.id).sort()).toEqual(['one', 'two']);
    expect(parsed.data?.modules[0]?.path).toBe('./modules/one');

    const modulePkg = JSON.parse(
      await readFile(join(unitDir, 'modules', 'one', 'package.json'), 'utf-8'),
    );
    expect(modulePkg.id).toBe('one');
  });

  it('appears in the workspace scan as a unit', async () => {
    await makeCourse('one', 'one', 'Course One');
    await makeCourse('two', 'two', 'Course Two');
    await createUnit({
      workspaceRoot: ws,
      courseRelativePaths: ['one', 'two'],
      unitId: 'mini-unit',
      unitTitle: 'Mini Unit',
      author: 'Test',
    });
    const entries = scanWorkspace(ws);
    expect(
      entries.some((entry) => entry.kind === 'unit' && entry.relativePath === 'units/mini-unit'),
    ).toBe(true);
  });

  it('rejects fewer than two or more than five courses', async () => {
    await makeCourse('one', 'one', 'Course One');
    await expect(
      createUnit({
        workspaceRoot: ws,
        courseRelativePaths: ['one'],
        unitId: 'u',
        unitTitle: 'U',
        author: 'T',
      }),
    ).rejects.toThrow(/at least two/);

    const many = [];
    for (let i = 0; i < 6; i += 1) {
      await makeCourse(`c${i}`, `c${i}`, `Course ${i}`);
      many.push(`c${i}`);
    }
    await expect(
      createUnit({
        workspaceRoot: ws,
        courseRelativePaths: many,
        unitId: 'u',
        unitTitle: 'U',
        author: 'T',
      }),
    ).rejects.toThrow(/up to five/);
  });

  it('dedupes duplicate course selections and leaves no partial unit on failure', async () => {
    await makeCourse('one', 'one', 'Course One');
    await expect(
      createUnit({
        workspaceRoot: ws,
        courseRelativePaths: ['one', 'one'],
        unitId: 'dup-unit',
        unitTitle: 'Dup Unit',
        author: 'T',
      }),
    ).rejects.toThrow(/at least two/);
    expect(await readdir(join(ws, 'units')).catch(() => [])).toHaveLength(0);
  });

  it('rejects a course path that escapes to a sibling sharing the workspace prefix', async () => {
    await makeCourse('one', 'one', 'Course One');
    const sibling = await mkdtemp(join(tmpdir(), `${basename(ws)}-evil`));
    try {
      await mkdir(join(sibling, 'nodes'), { recursive: true });
      await writeFile(join(sibling, 'package.json'), courseManifest('sneaky', 'Sneaky'), 'utf-8');
      await writeFile(join(sibling, 'nodes/intro.md'), '# Sneaky\n', 'utf-8');
      await expect(
        createUnit({
          workspaceRoot: ws,
          courseRelativePaths: ['one', relative(ws, sibling)],
          unitId: 'escape-unit',
          unitTitle: 'Escape Unit',
          author: 'T',
        }),
      ).rejects.toThrow(/escapes/);
    } finally {
      await rm(sibling, { recursive: true, force: true });
    }
  });
});

describe('buildUnitOep', () => {
  it('produces a valid bundle .oep archive', async () => {
    await makeCourse('one', 'one', 'Course One');
    await makeCourse('two', 'two', 'Course Two');
    const entry = await createUnit({
      workspaceRoot: ws,
      courseRelativePaths: ['one', 'two'],
      unitId: 'mini-unit',
      unitTitle: 'Mini Unit',
      author: 'Test',
    });
    const unitDir = join(ws, entry.relativePath);
    const bytes = await buildUnitOep(unitDir);
    expect(bytes.length).toBeGreaterThan(0);
    const text = Buffer.from(bytes).toString('utf-8');
    expect(text).toContain('manifest.json');
  });

  it('errors when the unit dir has no bundle.json', async () => {
    const empty = join(ws, 'empty');
    await mkdir(empty, { recursive: true });
    await expect(buildUnitOep(empty)).rejects.toThrow(/bundle.json/);
  });
});

describe('bundle round-trip via loadBundle', () => {
  it('loads the created unit with @open-edu/core', async () => {
    await makeCourse('one', 'one', 'Course One');
    await makeCourse('two', 'two', 'Course Two');
    const entry = await createUnit({
      workspaceRoot: ws,
      courseRelativePaths: ['one', 'two'],
      unitId: 'mini-unit',
      unitTitle: 'Mini Unit',
      author: 'Test',
    });
    const { loadBundle } = await import('@open-edu/core');
    const loaded = await loadBundle(join(ws, entry.relativePath));
    expect(loaded.modules.map((m) => m.manifest.id).sort()).toEqual(['one', 'two']);
  });
});
