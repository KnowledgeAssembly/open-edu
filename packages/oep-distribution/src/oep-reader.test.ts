import { describe, it, expect, beforeEach } from 'vitest';
import { zipSync } from 'fflate';
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
    expect(extraction.courseManifest.id).toBe('test-course');
    expect(Object.keys(extraction.nodes)).toHaveLength(2);
    expect(extraction.nodes['course/nodes/intro.md']).toBe('# Intro\n\nHello.');
    expect(Object.keys(extraction.assets)).toHaveLength(1);
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
