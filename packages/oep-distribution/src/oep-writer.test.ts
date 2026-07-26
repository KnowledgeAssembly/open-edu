import { describe, it, expect } from 'vitest';
import { OepWriter } from './oep-writer';
import { OepReader } from './oep-reader';
import { OEP_FORMAT, OEP_FORMAT_VERSION } from '@open-edu/schemas';

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
    expect(extraction.courseManifest.id).toBe('test-course');
    expect(extraction.nodes['course/nodes/intro.md']).toBe(introMd);
    expect(extraction.nodes['course/nodes/lesson-1.md']).toBe(lessonMd);
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
