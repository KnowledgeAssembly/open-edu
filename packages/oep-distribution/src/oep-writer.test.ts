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

  it('preserves .lottie and .svg assets byte-for-byte', async () => {
    const manifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: 'anim-course',
      version: '1.0.0',
      title: 'Animation Course',
      checksum: { algorithm: 'sha256' as const, value: '' },
      contentRoot: 'course/',
      signature: { status: 'unsigned' as const },
    } as const;

    const courseFiles = new Map<string, Uint8Array>();
    courseFiles.set(
      'package.json',
      encoder.encode(
        JSON.stringify({
          id: 'anim-course',
          version: '1.0.0',
          title: 'Animation Course',
          author: 'test',
          entry: 'nodes/lesson.md',
        }),
      ),
    );
    courseFiles.set('nodes/lesson.md', encoder.encode('# Lesson'));
    const lottieBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x01, 0x02]);
    const svgBytes = new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0x3e, 0x3c, 0x2f, 0x73, 0x76, 0x67, 0x3e]);
    courseFiles.set('assets/animations/water-cycle.lottie', lottieBytes);
    courseFiles.set('assets/diagrams/heart.svg', svgBytes);

    const { bytes, checksumValue } = await OepWriter.build({ manifest, courseFiles });

    const reader = new OepReader();
    const extraction = await reader.read(bytes);

    expect(extraction.manifest.checksum.value).toBe(checksumValue);
    expect(extraction.assets!['course/assets/animations/water-cycle.lottie']).toEqual(lottieBytes);
    expect(extraction.assets!['course/assets/diagrams/heart.svg']).toEqual(svgBytes);
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

  it('round-trips bundle-level rewards and cards', async () => {
    const bundleRewards = {
      triggers: [
        {
          onEvent: 'bundle_complete',
          rewards: [{ action: 'badge.award', badge: 'bundle-finisher' }],
        },
      ],
    };
    const bundleCards = {
      cards: [
        {
          id: 'bundle-card',
          title: 'Bundle Card',
          type: 'achievement',
          category: 'Achievement',
          summary: 'Finished the bundle',
          unlock: { type: 'bundleCompleted' },
        },
      ],
    };
    const bundleManifest = {
      type: 'bundle' as const,
      id: 'rewards-bundle',
      title: 'Rewards Bundle',
      version: '1.0.0',
      author: 'test',
      modules: [{ id: 'mod-a', title: 'Module A', path: './modules/mod-a', dependsOn: [] }],
      rewards: './rewards.json',
      cards: './cards.json',
    };

    const moduleFiles = new Map<string, Map<string, Uint8Array>>();
    const files = new Map<string, Uint8Array>();
    files.set(
      'package.json',
      encoder.encode(
        JSON.stringify({
          id: 'mod-a',
          title: 'Module A',
          version: '1.0.0',
          author: 't',
          entry: 'a',
        }),
      ),
    );
    files.set('nodes/a.md', encoder.encode('# A'));
    moduleFiles.set('mod-a', files);

    const manifest: DistributionManifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id: 'rewards-bundle',
      version: '1.0.0',
      title: 'Rewards Bundle',
      checksum: { algorithm: 'sha256', value: '' },
      contentRoot: 'bundle/',
      signature: { status: 'unsigned' },
    };

    const bundleFiles = new Map([
      ['bundle/rewards.json', encoder.encode(JSON.stringify(bundleRewards))],
      ['bundle/cards.json', encoder.encode(JSON.stringify(bundleCards))],
    ]);

    const archive = await OepWriter.buildBundle({
      manifest,
      bundleManifest,
      moduleFiles,
      bundleFiles,
    });
    const extraction = await new OepReader().read(archive.bytes);

    expect((extraction.bundleManifest as Record<string, unknown>).rewards).toBe('./rewards.json');
    expect((extraction.bundleManifest as Record<string, unknown>).cards).toBe('./cards.json');
    expect(extraction.rewards).toEqual(bundleRewards);
    expect(extraction.cards).toEqual(bundleCards);
  });

  it('leaves rewards/cards undefined when the bundle omits them', async () => {
    const bundleManifest = {
      type: 'bundle' as const,
      id: 'plain-bundle',
      title: 'Plain Bundle',
      version: '1.0.0',
      author: 'test',
      modules: [{ id: 'mod-a', title: 'Module A', path: './modules/mod-a', dependsOn: [] }],
    };
    const moduleFiles = new Map<string, Map<string, Uint8Array>>();
    const files = new Map<string, Uint8Array>();
    files.set(
      'package.json',
      encoder.encode(
        JSON.stringify({
          id: 'mod-a',
          title: 'Module A',
          version: '1.0.0',
          author: 't',
          entry: 'a',
        }),
      ),
    );
    files.set('nodes/a.md', encoder.encode('# A'));
    moduleFiles.set('mod-a', files);

    const manifest: DistributionManifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id: 'plain-bundle',
      version: '1.0.0',
      title: 'Plain Bundle',
      checksum: { algorithm: 'sha256', value: '' },
      contentRoot: 'bundle/',
      signature: { status: 'unsigned' },
    };

    const archive = await OepWriter.buildBundle({ manifest, bundleManifest, moduleFiles });
    const extraction = await new OepReader().read(archive.bytes);
    expect(extraction.rewards).toBeUndefined();
    expect(extraction.cards).toBeUndefined();
  });
});
