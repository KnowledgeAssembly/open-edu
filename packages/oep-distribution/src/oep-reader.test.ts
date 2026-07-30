import { describe, it, expect, beforeEach } from 'vitest';
import { zipSync, unzipSync, strFromU8 } from 'fflate';
import { OepReader, OepReaderError } from './oep-reader';
import { OepWriter } from './oep-writer';
import { computeSha256 } from './checksum';
import { OEP_FORMAT, OEP_FORMAT_VERSION } from '@open-edu/schemas';
import type { DistributionManifest } from '@open-edu/schemas';

const encoder = new TextEncoder();

async function buildTestOep(
  overrides: {
    manifestOverrides?: Record<string, unknown>;
    courseFiles?: Record<string, string>;
  } = {},
): Promise<{ bytes: Uint8Array; manifest: Record<string, unknown> }> {
  const pkgId = (overrides.manifestOverrides?.id as string) ?? 'test-course';
  const version = (overrides.manifestOverrides?.version as string) ?? '2.0.0';
  const title = (overrides.manifestOverrides?.title as string) ?? 'Test Course';

  const manifest = {
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    id: pkgId,
    version,
    title,
    checksum: { algorithm: 'sha256' as const, value: '' },
    contentRoot: 'course/',
    signature: { status: 'unsigned' as const },
  } as DistributionManifest;

  const courseFiles = new Map<string, Uint8Array>();
  courseFiles.set(
    'package.json',
    encoder.encode(
      JSON.stringify({
        id: pkgId,
        version,
        title,
        author: 'test',
        entry: 'intro',
      }),
    ),
  );
  courseFiles.set('nodes/intro.md', encoder.encode('# Intro\n\nHello.'));
  courseFiles.set('nodes/lesson-1.md', encoder.encode('# Lesson 1\n\nMore content.'));
  courseFiles.set('assets/image.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47]));

  if (overrides.courseFiles) {
    for (const [path, content] of Object.entries(overrides.courseFiles)) {
      courseFiles.set(path, encoder.encode(content));
    }
  }

  const result = await OepWriter.build({ manifest, courseFiles });
  return {
    bytes: result.bytes,
    manifest: { ...manifest, checksum: { algorithm: 'sha256', value: result.checksumValue } },
  };
}

describe('OepReader', () => {
  let reader: OepReader;
  beforeEach(() => {
    reader = new OepReader();
  });

  it('reads a valid .oep and extracts content', async () => {
    const { bytes, manifest } = await buildTestOep();
    const extraction = await reader.read(bytes);

    expect(extraction.manifest.id).toBe('test-course');
    expect(extraction.manifest.version).toBe('2.0.0');
    expect(extraction.manifest.checksum.value).toBe((manifest.checksum as { value: string }).value);
    expect(extraction.courseManifest!.id).toBe('test-course');
    expect(Object.keys(extraction.nodes!)).toHaveLength(2);
    expect(extraction.nodes!['course/nodes/intro.md']).toBe('# Intro\n\nHello.');
    expect(Object.keys(extraction.assets!)).toHaveLength(1);
  });

  it('inspect returns metadata without full extraction', async () => {
    const { bytes } = await buildTestOep();
    const inspection = await reader.inspect(bytes);

    expect(inspection.id).toBe('test-course');
    expect(inspection.version).toBe('2.0.0');
    expect(inspection.title).toBe('Test Course');
    expect(inspection.signatureStatus).toBe('unsigned');
  });

  it('rejects archive without manifest.json', async () => {
    const bytes = zipSync({ 'course/package.json': encoder.encode('{}') });
    await expect(reader.read(bytes)).rejects.toThrow(OepReaderError);
  });

  it('rejects archive with checksum mismatch', async () => {
    const entries: Record<string, Uint8Array> = {};
    const manifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: 'x',
      version: '1.0.0',
      title: 'X',
      checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
    };
    entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));
    entries['course/package.json'] = encoder.encode(
      JSON.stringify({ id: 'x', version: '1.0.0', title: 'X', author: 'a', entry: 'x' }),
    );
    entries['course/nodes/x.md'] = encoder.encode('# X');
    const bytes = zipSync(entries);
    await expect(reader.read(bytes)).rejects.toThrow(OepReaderError);
  });

  it('rejects missing course/package.json', async () => {
    const entries: Record<string, Uint8Array> = {};
    entries['manifest.json'] = encoder.encode(
      JSON.stringify({
        format: OEP_FORMAT,
        formatVersion: OEP_FORMAT_VERSION,
        id: 'x',
        version: '1.0.0',
        title: 'X',
        checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
      }),
    );
    const bytes = zipSync(entries);
    await expect(reader.read(bytes)).rejects.toThrow(OepReaderError);
  });

  it('rejects id mismatch between outer and inner manifests', async () => {
    const coursePkg = JSON.stringify({
      id: 'different-id',
      version: '2.0.0',
      title: 'X',
      author: 'a',
      entry: 'intro',
    });
    const entries: Record<string, Uint8Array> = {
      'course/package.json': encoder.encode(coursePkg),
      'course/nodes/intro.md': encoder.encode('# Intro'),
    };
    const tempBytes = zipSync(entries);
    const hash = await computeSha256(tempBytes);
    const manifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: 'test-course',
      version: '2.0.0',
      title: 'Test Course',
      checksum: { algorithm: 'sha256', value: hash },
    };
    entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));
    const bytes = zipSync(entries);
    await expect(reader.read(bytes)).rejects.toThrow(OepReaderError);
  });

  it('rejects archive exceeding size limit', async () => {
    const smallReader = new OepReader({ maxArchiveBytes: 10 });
    const { bytes } = await buildTestOep();
    await expect(smallReader.read(bytes)).rejects.toThrow('exceeds limit');
  });

  it('rejects malformed zip bytes', async () => {
    const badBytes = new Uint8Array([0x00, 0x01, 0x02]);
    await expect(reader.read(badBytes)).rejects.toThrow('invalid zip data');
  });
});

describe('OepReader - bundles', () => {
  let reader: OepReader;
  beforeEach(() => {
    reader = new OepReader();
  });

  async function buildTestBundleOep(
    overrides: {
      id?: string;
      version?: string;
      title?: string;
      modules?: Array<{ id: string; title: string; dependsOn?: string[] }>;
    } = {},
  ): Promise<Uint8Array> {
    const id = overrides.id ?? 'test-bundle';
    const version = overrides.version ?? '1.0.0';
    const title = overrides.title ?? 'Test Bundle';
    const modules = overrides.modules ?? [
      { id: 'mod-a', title: 'Module A', dependsOn: [] },
      { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
    ];

    const moduleFiles = new Map<string, Map<string, Uint8Array>>();
    for (const mod of modules) {
      const files = new Map<string, Uint8Array>();
      files.set(
        'package.json',
        encoder.encode(
          JSON.stringify({
            id: mod.id,
            title: mod.title,
            version,
            author: 'test',
            entry: 'nodes/intro.md',
          }),
        ),
      );
      files.set('nodes/intro.md', encoder.encode(`# ${mod.title}\n\nContent.`));
      moduleFiles.set(mod.id, files);
    }

    const bundleManifest = {
      type: 'bundle' as const,
      id,
      title,
      version,
      author: 'test',
      modules: modules.map((m) => ({
        id: m.id,
        title: m.title,
        path: `./modules/${m.id}`,
        dependsOn: m.dependsOn ?? [],
        estimatedDuration: 10,
      })),
    };

    const distManifest: DistributionManifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id,
      version,
      title,
      contentRoot: 'bundle/',
      checksum: { algorithm: 'sha256', value: '' },
      signature: { status: 'unsigned' },
    };

    const result = await OepWriter.buildBundle({
      manifest: distManifest,
      bundleManifest,
      moduleFiles,
    });
    return result.bytes;
  }

  it('reads a valid bundle .oep and extracts modules', async () => {
    const bytes = await buildTestBundleOep();
    const extraction = await reader.read(bytes);

    expect(extraction.manifest.type).toBe('bundle');
    expect(extraction.manifest.id).toBe('test-bundle');
    expect(extraction.bundleManifest).toBeDefined();
    expect(extraction.modules).toHaveLength(2);
    expect(extraction.courseManifest).toBeUndefined();
  });

  it("extracts each module's nodes and assets", async () => {
    const bytes = await buildTestBundleOep();
    const extraction = await reader.read(bytes);

    const modA = extraction.modules![0]!;
    expect(modA.manifest.id).toBe('mod-a');
    expect(Object.keys(modA.nodes)).toHaveLength(1);
    expect(modA.nodes['bundle/modules/mod-a/nodes/intro.md']).toContain('Module A');

    const modB = extraction.modules![1]!;
    expect(modB.manifest.id).toBe('mod-b');
    expect(modB.nodes['bundle/modules/mod-b/nodes/intro.md']).toContain('Module B');
  });

  it('inspectBundle returns bundle metadata without full extraction', async () => {
    const bytes = await buildTestBundleOep();
    const inspection = await reader.inspectBundle(bytes);

    expect(inspection.id).toBe('test-bundle');
    expect(inspection.type).toBe('bundle');
    expect(inspection.moduleCount).toBe(2);
    expect(inspection.moduleIds).toEqual(['mod-a', 'mod-b']);
  });

  it('rejects bundle missing bundle/bundle.json', async () => {
    // Build a valid bundle, then remove bundle.json and recompute checksum
    const valid = await buildTestBundleOep();
    const unzipped: Record<string, Uint8Array> = {};
    for (const [path, data] of Object.entries(unzipSync(valid))) {
      if (path !== 'bundle/bundle.json') {
        unzipped[path] = data;
      }
    }

    // Recompute checksum for tampered archive
    const paths = Object.keys(unzipped)
      .filter((p) => p.startsWith('bundle/') && p !== 'bundle/' && unzipped[p]!.length > 0)
      .map((p) => p.slice('bundle/'.length))
      .sort();
    const hash = await computeSha256(new TextEncoder().encode(paths.join('\n')));
    const manifest = JSON.parse(strFromU8(unzipped['manifest.json']!));
    manifest.checksum.value = hash;
    unzipped['manifest.json'] = encoder.encode(JSON.stringify(manifest));

    const bytes = zipSync(unzipped);
    await expect(reader.read(bytes)).rejects.toThrow('bundle/bundle.json not found');
  });

  it('rejects bundle with module missing package.json', async () => {
    const valid = await buildTestBundleOep();
    const unzipped: Record<string, Uint8Array> = {};
    for (const [path, data] of Object.entries(unzipSync(valid))) {
      if (path !== 'bundle/modules/mod-a/package.json') {
        unzipped[path] = data;
      }
    }

    // Recompute checksum after removing the file
    const paths = Object.keys(unzipped)
      .filter((p) => p.startsWith('bundle/') && p !== 'bundle/' && unzipped[p]!.length > 0)
      .map((p) => p.slice('bundle/'.length))
      .sort();
    const hash = await computeSha256(new TextEncoder().encode(paths.join('\n')));
    const manifest = JSON.parse(strFromU8(unzipped['manifest.json']!));
    manifest.checksum.value = hash;
    unzipped['manifest.json'] = encoder.encode(JSON.stringify(manifest));

    const tampered = zipSync(unzipped);
    await expect(reader.read(tampered)).rejects.toThrow('missing package.json');
  });

  it('rejects bundle with id mismatch between outer and bundle manifest', async () => {
    const entries: Record<string, Uint8Array> = {};
    const manifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id: 'outer-id',
      version: '1.0.0',
      title: 'Test',
      checksum: { algorithm: 'sha256', value: '' },
      contentRoot: 'bundle/',
      signature: { status: 'unsigned' as const },
    };

    const bundleManifest = {
      type: 'bundle',
      id: 'inner-id',
      title: 'Inner',
      version: '1.0.0',
      author: 'test',
      modules: [{ id: 'm1', title: 'M1', path: './modules/m1', dependsOn: [] }],
    };

    entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));
    entries['bundle/bundle.json'] = encoder.encode(JSON.stringify(bundleManifest));
    entries['bundle/modules/m1/package.json'] = encoder.encode(
      JSON.stringify({ id: 'm1', title: 'M1', version: '1.0.0', author: 't', entry: 'a' }),
    );
    entries['bundle/modules/m1/nodes/a.md'] = encoder.encode('# A');

    const paths = Object.keys(entries)
      .filter((p) => p.startsWith('bundle/') && p !== 'bundle/' && entries[p]!.length > 0)
      .map((p) => p.slice('bundle/'.length))
      .sort();
    const hash = await computeSha256(new TextEncoder().encode(paths.join('\n')));
    manifest.checksum.value = hash;
    entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));

    const bytes = zipSync(entries);
    await expect(reader.read(bytes)).rejects.toThrow(OepReaderError);
  });

  it('rejects inspectBundle on a non-bundle archive', async () => {
    const { bytes } = await buildTestOep();
    await expect(reader.inspectBundle(bytes)).rejects.toThrow(OepReaderError);
  });
});
