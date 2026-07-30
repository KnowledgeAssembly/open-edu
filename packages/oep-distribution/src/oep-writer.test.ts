import { describe, it, expect } from 'vitest';
import { OepWriter } from './oep-writer';
import { OepReader } from './oep-reader';
import { OEP_FORMAT, OEP_FORMAT_VERSION } from '@open-edu/schemas';
import type { DistributionManifest } from '@open-edu/schemas';

const encoder = new TextEncoder();

describe('OepWriter', () => {
  it('builds a valid .oep and round-trips through reader', async () => {
    const manifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: 'test-course',
      version: '1.0.0',
      title: 'Test Course',
      checksum: { algorithm: 'sha256' as const, value: '' },
      contentRoot: 'course/',
      signature: { status: 'unsigned' as const },
    } as const;

    const pkgJson = JSON.stringify({
      id: 'test-course',
      version: '1.0.0',
      title: 'Test Course',
      author: 'test',
      entry: 'intro',
    });

    const introMd = '# Introduction\n\nWelcome to the course.';
    const lessonMd = '# Lesson 1\n\nContent here.';

    const courseFiles = new Map<string, Uint8Array>();
    courseFiles.set('package.json', encoder.encode(pkgJson));
    courseFiles.set('nodes/intro.md', encoder.encode(introMd));
    courseFiles.set('nodes/lesson-1.md', encoder.encode(lessonMd));

    const { bytes, checksumValue } = await OepWriter.build({ manifest, courseFiles });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    expect(checksumValue).toHaveLength(64);
    expect(checksumValue).toMatch(/^[a-f0-9]{64}$/);

    const reader = new OepReader();
    const extraction = await reader.read(bytes);

    expect(extraction.manifest.id).toBe('test-course');
    expect(extraction.manifest.version).toBe('1.0.0');
    expect(extraction.manifest.checksum.value).toBe(checksumValue);
    expect(extraction.courseManifest!.id).toBe('test-course');
    expect(extraction.nodes!['course/nodes/intro.md']).toBe(introMd);
    expect(extraction.nodes!['course/nodes/lesson-1.md']).toBe(lessonMd);
  });

  it('produces reproducible output for same input', async () => {
    const manifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: 'repro-test',
      version: '1.0.0',
      title: 'Repro Test',
      checksum: { algorithm: 'sha256' as const, value: '' },
      contentRoot: 'course/',
      signature: { status: 'unsigned' as const },
    } as const;

    const courseFiles = new Map<string, Uint8Array>();
    courseFiles.set(
      'package.json',
      encoder.encode(
        JSON.stringify({
          id: 'repro-test',
          version: '1.0.0',
          title: 'Repro Test',
          author: 'test',
          entry: 'a',
        }),
      ),
    );
    courseFiles.set('nodes/a.md', encoder.encode('# Node A'));

    const a = await OepWriter.build({ manifest, courseFiles });
    const b = await OepWriter.build({ manifest, courseFiles });

    expect(a.checksumValue).toBe(b.checksumValue);
    expect(a.bytes.length).toBe(b.bytes.length);
  });
});

describe('OepWriter - bundle', () => {
  it('builds a valid bundle .oep that can be read back', async () => {
    const bundleManifest = {
      type: 'bundle' as const,
      id: 'bundle-test',
      title: 'Bundle Test',
      version: '1.0.0',
      author: 'test',
      modules: [
        {
          id: 'mod-a',
          title: 'Module A',
          path: './modules/mod-a',
          dependsOn: [],
          estimatedDuration: 10,
        },
        {
          id: 'mod-b',
          title: 'Module B',
          path: './modules/mod-b',
          dependsOn: ['mod-a'],
          estimatedDuration: 15,
        },
      ],
    };

    const moduleFiles = new Map<string, Map<string, Uint8Array>>();
    for (const mod of bundleManifest.modules) {
      const files = new Map<string, Uint8Array>();
      files.set(
        'package.json',
        encoder.encode(
          JSON.stringify({
            id: mod.id,
            title: mod.title,
            version: '1.0.0',
            author: 'test',
            entry: 'nodes/start.md',
          }),
        ),
      );
      files.set('nodes/start.md', encoder.encode(`# ${mod.title}\n\nStart here.`));
      if (mod.id === 'mod-b') {
        files.set('assets/icon.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
      }
      moduleFiles.set(mod.id, files);
    }

    const manifest: DistributionManifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id: 'bundle-test',
      version: '1.0.0',
      title: 'Bundle Test',
      checksum: { algorithm: 'sha256', value: '' },
      contentRoot: 'bundle/',
      signature: { status: 'unsigned' },
    };

    const { bytes, checksumValue } = await OepWriter.buildBundle({
      manifest,
      bundleManifest,
      moduleFiles,
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    expect(checksumValue).toMatch(/^[a-f0-9]{64}$/);

    const reader = new OepReader();
    const extraction = await reader.read(bytes);

    expect(extraction.manifest.type).toBe('bundle');
    expect(extraction.manifest.checksum.value).toBe(checksumValue);
    expect(extraction.bundleManifest).toBeDefined();
    expect((extraction.bundleManifest as Record<string, unknown>).id).toBe('bundle-test');
    expect(extraction.modules).toHaveLength(2);
    expect(extraction.modules![0]!.manifest.id).toBe('mod-a');
    expect(extraction.modules![0]!.nodes['bundle/modules/mod-a/nodes/start.md']).toContain(
      'Module A',
    );
    expect(Object.keys(extraction.modules![1]!.assets)).toHaveLength(1);
  });

  it('produces reproducible bundle output', async () => {
    const bundleManifest = {
      type: 'bundle' as const,
      id: 'repro-bundle',
      title: 'Repro',
      version: '1.0.0',
      author: 'test',
      modules: [{ id: 'm1', title: 'M1', path: './modules/m1', dependsOn: [] }],
    };
    const moduleFiles = new Map<string, Map<string, Uint8Array>>();
    const files = new Map<string, Uint8Array>();
    files.set(
      'package.json',
      encoder.encode(
        JSON.stringify({ id: 'm1', title: 'M1', version: '1.0.0', author: 't', entry: 'a' }),
      ),
    );
    files.set('nodes/a.md', encoder.encode('# A'));
    moduleFiles.set('m1', files);

    const manifest: DistributionManifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id: 'repro-bundle',
      version: '1.0.0',
      title: 'Repro',
      checksum: { algorithm: 'sha256', value: '' },
      contentRoot: 'bundle/',
      signature: { status: 'unsigned' },
    };

    const a = await OepWriter.buildBundle({ manifest, bundleManifest, moduleFiles });
    const b = await OepWriter.buildBundle({ manifest, bundleManifest, moduleFiles });

    expect(a.checksumValue).toBe(b.checksumValue);
    expect(a.bytes).toEqual(b.bytes);
  });
});
