import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { OepWriter } from './oep-writer';
import { OepReader } from './oep-reader';
import { InstallCoordinator } from './install-coordinator';
import { OEP_FORMAT, OEP_FORMAT_VERSION, BundleManifestSchema } from '@open-edu/schemas';
import type { DistributionManifest } from '@open-edu/schemas';
import { BUNDLE_DIR } from './types';

const LEVEL_B_MATH_DIR = resolve(__dirname, '../../../examples/level-b-math');

function collectModuleFiles(moduleDir: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  function walk(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === 'dist' || entry === 'node_modules' || entry === '.git' || entry === '.edu') {
          continue;
        }
        walk(fullPath);
      } else if (stat.isFile()) {
        const relPath = relative(moduleDir, fullPath);
        files.set(relPath, new Uint8Array(readFileSync(fullPath)));
      }
    }
  }
  walk(moduleDir);
  return files;
}

function collectBundleRootFiles(bundleDir: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const name of ['rewards.json', 'cards.json']) {
    const p = join(bundleDir, name);
    if (existsSync(p)) {
      files.set(`bundle/${name}`, new Uint8Array(readFileSync(p)));
    }
  }
  return files;
}

async function buildLevelBMathOep(): Promise<Uint8Array> {
  const bundleJsonPath = join(LEVEL_B_MATH_DIR, 'bundle.json');
  const bundleJsonRaw = readFileSync(bundleJsonPath, 'utf-8');
  const bundleJson = JSON.parse(bundleJsonRaw);
  const bundleManifest = BundleManifestSchema.parse(bundleJson);

  const moduleFiles = new Map<string, Map<string, Uint8Array>>();
  for (const mod of bundleManifest.modules) {
    const moduleDir = resolve(LEVEL_B_MATH_DIR, mod.path);
    const files = collectModuleFiles(moduleDir);
    moduleFiles.set(mod.id, files);
  }

  const distManifest: DistributionManifest = {
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    type: 'bundle',
    id: bundleManifest.id,
    version: bundleManifest.version,
    title: bundleManifest.title,
    contentRoot: BUNDLE_DIR,
    checksum: { algorithm: 'sha256', value: '' },
    signature: { status: 'unsigned' },
  };

  const { bytes } = await OepWriter.buildBundle({
    manifest: distManifest,
    bundleManifest,
    moduleFiles,
    bundleFiles: collectBundleRootFiles(LEVEL_B_MATH_DIR),
  });
  return bytes;
}

describe('level-b-math OEP bundle E2E', () => {
  it('builds level-b-math as .oep and reads it back', async () => {
    const bytes = await buildLevelBMathOep();

    const reader = new OepReader();
    const extraction = await reader.read(bytes);

    expect(extraction.manifest.type).toBe('bundle');
    expect(extraction.manifest.id).toBe('level-b-math');
    expect(extraction.bundleManifest).toBeDefined();
    expect(extraction.modules).toHaveLength(3);
    expect(extraction.courseManifest).toBeUndefined();
    expect(extraction.rewards).toBeDefined();
    expect(extraction.cards).toBeDefined();

    const modIds = extraction.modules!.map((m) => m.manifest.id);
    expect(modIds).toContain('addition_basics');
    expect(modIds).toContain('addition_carry');
    expect(modIds).toContain('adding_fractions');

    const basics = extraction.modules!.find((m) => m.manifest.id === 'addition_basics')!;
    expect(Object.keys(basics.nodes).length).toBeGreaterThan(0);
    expect(Object.keys(basics.assets).length).toBe(0);
    expect(basics.workflow).toBeDefined();
    expect(basics.rewards).toBeUndefined();
    expect(basics.cards).toBeUndefined();
  });

  it('installs level-b-math bundle via InstallCoordinator', async () => {
    const bytes = await buildLevelBMathOep();

    const stored: Record<string, unknown> = {};
    const coordinator = new InstallCoordinator({
      getInstalledCourse: async () => undefined,
      saveCourse: async (course) => {
        stored.id = course.id as string;
        stored.type = course.type;
        stored.bundleManifest = course.bundleManifest;
        stored.modules = course.modules;
        stored.rewards = (course as unknown as { rewards?: unknown }).rewards ?? null;
        stored.cards = (course as unknown as { cards?: unknown }).cards ?? null;
      },
      replaceCourse: async () => {
        throw new Error('not expected');
      },
    });

    const result = await coordinator.install({
      kind: 'file',
      label: 'level-b-math.oep',
      getBytes: () => Promise.resolve(bytes),
    });

    expect(result.success).toBe(true);
    expect(result.courseId).toBe('level-b-math');
    expect(stored.id).toBe('level-b-math');
    expect(stored.type).toBe('bundle');
    expect(stored.modules as Array<unknown>).toHaveLength(3);
    expect(stored.rewards).toBeDefined();
    expect(stored.cards).toBeDefined();
  });
});
