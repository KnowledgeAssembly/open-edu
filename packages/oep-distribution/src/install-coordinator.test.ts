import { describe, it, expect, vi, beforeEach } from 'vitest';
import { zipSync } from 'fflate';
import { InstallCoordinator } from './install-coordinator';
import type { StorageAdapter, StoredCourseRecord } from './install-coordinator';
import { OepWriter } from './oep-writer';
import { OEP_FORMAT, OEP_FORMAT_VERSION } from '@open-edu/schemas';
import type { DistributionManifest } from '@open-edu/schemas';
import type { CourseSource } from './types';
import { BUNDLE_DIR } from './types';

const encoder = new TextEncoder();

function makeTestCourseSource(bytes: Uint8Array): CourseSource {
  return {
    kind: 'file',
    label: 'test.oep',
    getBytes: () => Promise.resolve(bytes),
  };
}

async function buildTestOep(id: string, version: string, title: string): Promise<Uint8Array> {
  const manifest = {
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    id,
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
        id,
        version,
        title,
        author: 'test',
        entry: 'intro',
      }),
    ),
  );
  courseFiles.set('nodes/intro.md', encoder.encode('# Intro'));
  courseFiles.set('nodes/lesson.md', encoder.encode('# Lesson'));

  const result = await OepWriter.build({ manifest, courseFiles });
  return result.bytes;
}

async function buildTestBundleOep(
  id: string,
  version: string,
  title: string,
  moduleCount: number = 2,
): Promise<Uint8Array> {
  const modules = Array.from({ length: moduleCount }, (_, i) => ({
    id: `mod-${String.fromCharCode(97 + i)}`,
    title: `Module ${String.fromCharCode(65 + i)}`,
  }));

  const moduleFiles = new Map<string, Map<string, Uint8Array>>();
  for (const mod of modules) {
    const files = new Map<string, Uint8Array>();
    files.set('package.json', encoder.encode(JSON.stringify({
      id: mod.id, title: mod.title, version, author: 'test', entry: 'nodes/intro.md',
    })));
    files.set('nodes/intro.md', encoder.encode(`# ${mod.title}\n\nContent.`));
    moduleFiles.set(mod.id, files);
  }

  const bundleManifest = {
    id, title, version, author: 'test', type: 'bundle' as const,
    modules: modules.map((m) => ({
      id: m.id, title: m.title, path: `./modules/${m.id}`, dependsOn: [] as string[], estimatedDuration: 10,
    })),
  };

  const distManifest: DistributionManifest = {
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    type: 'bundle',
    id, version, title,
    contentRoot: BUNDLE_DIR,
    checksum: { algorithm: 'sha256', value: '' },
    signature: { status: 'unsigned' },
  };

  const result = await OepWriter.buildBundle({ manifest: distManifest, bundleManifest, moduleFiles });
  return result.bytes;
}

describe('InstallCoordinator', () => {
  let storage: StorageAdapter;
  let coordinator: InstallCoordinator;
  let storedCourses: Map<string, StoredCourseRecord>;

  beforeEach(() => {
    storedCourses = new Map();
    storage = {
      getInstalledCourse: vi.fn(async (id: string) => storedCourses.get(id)),
      saveCourse: vi.fn(async (course: StoredCourseRecord) => {
        storedCourses.set(course.id, course);
      }),
      replaceCourse: vi.fn(async (courseId: string, course: StoredCourseRecord) => {
        if (!storedCourses.has(courseId)) {
          throw new Error(`Course "${courseId}" is not installed`);
        }
        storedCourses.set(courseId, course);
      }),
    };
    coordinator = new InstallCoordinator(storage);
  });

  it('installs a valid .oep and saves to storage', async () => {
    const bytes = await buildTestOep('science-grade7', '1.0.0', 'Science Grade 7');
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.install(source);

    expect(result.success).toBe(true);
    expect(result.courseId).toBe('science-grade7');
    expect(result.version).toBe('1.0.0');

    const saved = storedCourses.get('science-grade7');
    expect(saved).toBeDefined();
    expect(saved!.version).toBe('1.0.0');
    expect((saved!.distributionMeta as Record<string, string>).sourceKind).toBe('file');
  });

  it('inspect returns metadata without installing', async () => {
    const bytes = await buildTestOep('test-inspect', '3.0.0', 'Test Inspect');
    const source = makeTestCourseSource(bytes);
    const inspection = await coordinator.inspect(source);

    expect(inspection.id).toBe('test-inspect');
    expect(inspection.version).toBe('3.0.0');

    expect(storedCourses.has('test-inspect')).toBe(false);
  });

  it('fails on checksum mismatch', async () => {
    const entries: Record<string, Uint8Array> = {};
    const coursePkg = JSON.stringify({
      id: 'bad-checksum',
      version: '1.0.0',
      title: 'Bad',
      author: 'test',
      entry: 'intro',
    });
    entries['course/package.json'] = encoder.encode(coursePkg);
    entries['course/nodes/intro.md'] = encoder.encode('# Intro');
    entries['course/nodes/lesson.md'] = encoder.encode('# Lesson');

    const manifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: 'bad-checksum',
      version: '1.0.0',
      title: 'Bad',
      checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
    };
    entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));
    const bytes = zipSync(entries);

    const source = makeTestCourseSource(bytes);
    const result = await coordinator.install(source);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CHECKSUM_MISMATCH');
  });

  it('updates to newer version', async () => {
    storedCourses.set('my-course', {
      id: 'my-course',
      version: '1.0.0',
      type: 'course',
      manifest: {},
      nodes: [],
      assets: [],
      downloadedAt: new Date().toISOString(),
    });

    const bytes = await buildTestOep('my-course', '2.0.0', 'My Course');
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.update('my-course', source);

    expect(result.success).toBe(true);
    expect(result.version).toBe('2.0.0');

    const saved = storedCourses.get('my-course');
    expect(saved!.version).toBe('2.0.0');
  });

  it('rejects same version update', async () => {
    storedCourses.set('my-course', {
      id: 'my-course',
      version: '1.0.0',
      type: 'course',
      manifest: {},
      nodes: [],
      assets: [],
      downloadedAt: new Date().toISOString(),
    });

    const bytes = await buildTestOep('my-course', '1.0.0', 'My Course');
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.update('my-course', source);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VERSION_SAME');
  });

  it('rejects downgrade', async () => {
    storedCourses.set('my-course', {
      id: 'my-course',
      version: '2.0.0',
      type: 'course',
      manifest: {},
      nodes: [],
      assets: [],
      downloadedAt: new Date().toISOString(),
    });

    const bytes = await buildTestOep('my-course', '1.0.0', 'My Course');
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.update('my-course', source);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VERSION_DOWNGRADE');
  });

  it('rejects update to non-existent course', async () => {
    const bytes = await buildTestOep('unknown-course', '1.0.0', 'Unknown');
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.update('unknown-course', source);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('rejects update with id mismatch', async () => {
    storedCourses.set('course-a', {
      id: 'course-a',
      version: '1.0.0',
      type: 'course',
      manifest: {},
      nodes: [],
      assets: [],
      downloadedAt: new Date().toISOString(),
    });

    const bytes = await buildTestOep('course-b', '2.0.0', 'Course B');
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.update('course-a', source);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('MANIFEST_MISMATCH');
  });

  it('fails on source read error', async () => {
    const badSource: CourseSource = {
      kind: 'url',
      label: 'bad-url',
      getBytes: () => Promise.reject(new Error('Network failure')),
    };
    const result = await coordinator.install(badSource);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SOURCE_READ_ERROR');
  });
});

describe('InstallCoordinator - bundles', () => {
  let storage: StorageAdapter;
  let coordinator: InstallCoordinator;
  let storedCourses: Map<string, StoredCourseRecord>;

  beforeEach(() => {
    storedCourses = new Map();
    storage = {
      getInstalledCourse: vi.fn(async (id: string) => storedCourses.get(id)),
      saveCourse: vi.fn(async (course: StoredCourseRecord) => { storedCourses.set(course.id, course); }),
      replaceCourse: vi.fn(async (courseId: string, course: StoredCourseRecord) => {
        if (!storedCourses.has(courseId)) throw new Error(`Course "${courseId}" is not installed`);
        storedCourses.set(courseId, course);
      }),
    };
    coordinator = new InstallCoordinator(storage);
  });

  it('installs a bundle and stores module data', async () => {
    const bytes = await buildTestBundleOep('bundle-test', '1.0.0', 'Bundle Test', 2);
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.install(source);

    expect(result.success).toBe(true);
    expect(result.courseId).toBe('bundle-test');

    const saved = storedCourses.get('bundle-test');
    expect(saved).toBeDefined();
    expect(saved!.type).toBe('bundle');
    expect(saved!.bundleManifest).toBeDefined();
    expect(saved!.modules).toHaveLength(2);
    const modules = (saved as unknown as { modules: Array<{ manifest: unknown }> }).modules;
    expect(modules[0]!.manifest).toBeDefined();
  });

  it('installs a bundle with single module', async () => {
    const bytes = await buildTestBundleOep('mini-bundle', '1.0.0', 'Mini', 1);
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.install(source);

    expect(result.success).toBe(true);
    const saved = storedCourses.get('mini-bundle');
    expect(saved!.modules).toHaveLength(1);
  });
});
