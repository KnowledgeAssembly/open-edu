# .oep Bundle Format Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the `.oep` distribution format to support both single-course packages and multi-module bundles, with schema, reader, writer, CLI, install coordinator, and learner app integration.

**Architecture:** A `type` field (`'course' | 'bundle'`) is added to `DistributionManifestSchema` (defaulting to `'course'` for backward compatibility). For bundle archives, `bundle/bundle.json` holds the `BundleManifest` and modules live under `bundle/modules/<module-id>/`. The `OepExtraction` type is extended with optional bundle fields. Reading a bundle archive validates each module's `package.json` against existing schemas. The CLI gains `oep:build-bundle` to build bundle `.oep` files from a bundle directory. The `InstallCoordinator` detects bundle vs single-course and stores module data accordingly. The learner app install flow and catalog are updated to handle bundles.

**Tech Stack:** TypeScript, Zod, fflate (ZIP), Vitest (testing), Commander (CLI)

---

## File Map

| Action | File                                                        | Responsibility                                                                                |
| ------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Modify | `packages/schemas/src/distribution-manifest.ts`             | Add `type` field to `DistributionManifestSchema`                                              |
| Modify | `packages/schemas/src/index.ts`                             | Export new bundle extraction types if needed                                                  |
| Modify | `packages/oep-distribution/src/types.ts`                    | Extend `OepExtraction` with bundle fields; add `OepExtractedModule`, `BundleInspection` types |
| Modify | `packages/oep-distribution/src/oep-reader.ts`               | Detect `type: 'bundle'`, validate `bundle.json`, extract modules                              |
| Modify | `packages/oep-distribution/src/oep-writer.ts`               | Add `OepWriter.buildBundle()` static method                                                   |
| Create | `packages/oep-distribution/src/oep-writer.test.ts`          | Already exists — extend with bundle tests                                                     |
| Modify | `packages/oep-distribution/src/oep-reader.test.ts`          | Add bundle archive read tests                                                                 |
| Modify | `packages/oep-distribution/src/install-coordinator.ts`      | Support bundle install (modules array in `ResolvedInstallData` and storage)                   |
| Modify | `packages/oep-distribution/src/install-coordinator.test.ts` | Add bundle install tests                                                                      |
| Create | `packages/oep-distribution/src/bundle-test-fixtures.ts`     | Shared helpers for building valid bundle `.oep` archives in tests                             |
| Modify | `packages/oep-distribution/src/index.ts`                    | Export new types and methods                                                                  |
| Modify | `packages/cli/src/commands/oep-build.ts`                    | Add `buildOepBundle()` export alongside existing `buildOep()`                                 |
| Create | `packages/cli/src/commands/oep-build-bundle.ts`             | New command file for `oep:build-bundle`                                                       |
| Modify | `packages/cli/src/cli.ts`                                   | Register the new `oep:build-bundle` command                                                   |
| Modify | `packages/storage/src/db.ts`                                | Add `modules` field to `StoredCourse` interface                                               |
| Modify | `apps/learner/src/courseDownload.ts`                        | Adapt storage adapter for bundle installs                                                     |
| Modify | `apps/learner/src/oepAdapters.ts`                           | Handle bundle-loaded courses                                                                  |
| Modify | `apps/learner/src/InstallCourseDialog.tsx`                  | Show bundle info post-install                                                                 |
| Modify | `packages/schemas/src/distribution-manifest.test.ts`        | Update tests for new `type` field                                                             |
| Create | `examples/level-b-math-bundle/`                             | A packaged `.oep`-ready bundle example for integration testing                                |

---

### Task 1: Add `type` field to `DistributionManifestSchema`

**Files:**

- Modify: `packages/schemas/src/distribution-manifest.ts`
- Test: `packages/schemas/src/distribution-manifest.test.ts`

- [ ] **Step 1: Add `type` to the schema**

Insert after `formatVersion` in `DistributionManifestSchema`:

```typescript
type: z.enum(['course', 'bundle']).default('course'),
```

This is fully backward-compatible — existing manifests without `type` will parse as `'course'`.

- [ ] **Step 2: Add `OEP_BUNDLE_CONTENT_ROOT` constant**

```typescript
export const OEP_BUNDLE_CONTENT_ROOT = 'bundle/' as const;
```

- [ ] **Step 3: Write failing test for bundle-type manifest**

In `packages/schemas/src/distribution-manifest.test.ts`, add:

```typescript
it('accepts type: "bundle" with bundle contentRoot', () => {
  const result = DistributionManifestSchema.safeParse({
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    type: 'bundle',
    id: 'my-bundle',
    version: '1.0.0',
    title: 'My Bundle',
    checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
    contentRoot: 'bundle/',
  });
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.type).toBe('bundle');
});

it('defaults type to "course" when omitted', () => {
  const result = DistributionManifestSchema.safeParse({
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    id: 'c',
    version: '1.0.0',
    title: 'C',
    checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
  });
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.type).toBe('course');
});
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/schemas test`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/distribution-manifest.ts packages/schemas/src/distribution-manifest.test.ts
git commit -m "feat(schemas): add type field to DistributionManifestSchema"
```

---

### Task 2: Extend `OepExtraction` and add bundle types

**Files:**

- Modify: `packages/oep-distribution/src/types.ts`

- [ ] **Step 1: Add `OepExtractedModule` interface**

Add to `types.ts`:

```typescript
export interface OepExtractedModule {
  manifest: Record<string, unknown>;
  nodes: Record<string, string>;
  assets: Record<string, Uint8Array>;
  workflow?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
}
```

- [ ] **Step 2: Extend `OepExtraction` with bundle fields**

Change `courseManifest`, `nodes`, `assets` to be optional, and add bundle fields:

```typescript
export interface OepExtraction {
  manifest: DistributionManifest;
  /** Single course fields (set when manifest.type === 'course' or omitted) */
  courseManifest?: Record<string, unknown>;
  nodes?: Record<string, string>;
  assets?: Record<string, Uint8Array>;
  workflow?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
  /** Bundle fields (set when manifest.type === 'bundle') */
  bundleManifest?: Record<string, unknown>;
  modules?: OepExtractedModule[];
  /** Always present */
  rawEntries: Record<string, Uint8Array>;
}
```

- [ ] **Step 3: Add `BUNDLE_DIR` constant**

```typescript
export const BUNDLE_DIR = 'bundle/';
export const BUNDLE_MODULES_DIR = 'bundle/modules/';
```

- [ ] **Step 4: Add `BundleInspection` interface**

```typescript
export interface BundleInspection {
  id: string;
  version: string;
  title: string;
  type: 'bundle';
  moduleCount: number;
  moduleIds: string[];
  checksum: { algorithm: 'sha256'; value: string };
  signatureStatus: string;
}
```

- [ ] **Step 5: Update error codes (add bundle-specific errors)**

Add to `InstallErrorCode`:

```typescript
| 'MISSING_BUNDLE_MANIFEST'
| 'BUNDLE_VALIDATION_ERROR'
| 'MODULE_VALIDATION_ERROR'
```

- [ ] **Step 6: Commit**

```bash
git add packages/oep-distribution/src/types.ts
git commit -m "feat(oep-distribution): extend OepExtraction for bundle support"
```

---

### Task 3: Update `OepReader` for bundle archives

**Files:**

- Modify: `packages/oep-distribution/src/oep-reader.ts`

- [ ] **Step 1: Add bundle import references**

```typescript
import { BundleManifestSchema } from '@open-edu/schemas';
import { PackageManifestSchema } from '@open-edu/schemas';
import {
  BUNDLE_DIR,
  BUNDLE_MODULES_DIR,
  OEP_CONTENT_ROOT,
  ...
} from './types.js';
```

- [ ] **Step 2: Add `inspectBundle()` method**

After the existing `inspect()` method:

```typescript
async inspectBundle(bytes: Uint8Array): Promise<BundleInspection> {
  const extraction = await this.readInternal(bytes, false);
  if (extraction.manifest.type !== 'bundle') {
    throw new OepReaderError(
      'INVALID_MANIFEST',
      'Archive is not a bundle (manifest.type is not "bundle")',
    );
  }
  return {
    id: extraction.manifest.id,
    version: extraction.manifest.version,
    title: extraction.manifest.title,
    type: 'bundle',
    moduleCount: (extraction.bundleManifest as { modules?: unknown[] })?.modules?.length ?? 0,
    moduleIds: ((extraction.bundleManifest as { modules?: Array<{ id: string }> })?.modules ?? []).map((m) => m.id),
    checksum: extraction.manifest.checksum,
    signatureStatus: extraction.manifest.signature.status,
  };
}
```

- [ ] **Step 3: Refactor `readInternal` to handle both types**

The current `readInternal` method has hardcoded single-course logic. Refactor it:

1. After parsing `manifest.json`, check `manifest.type`.
2. If `type === 'course'` (or absent/default), run existing single-course code path unchanged.
3. If `type === 'bundle'`, run the new bundle code path:

```typescript
if (manifest.type === 'bundle') return this.readBundleInternal(manifest, rawEntries, fullExtract);
```

- [ ] **Step 4: Add `readBundleInternal()` method**

```typescript
private async readBundleInternal(
  manifest: DistributionManifest,
  rawEntries: Record<string, Uint8Array>,
  fullExtract: boolean,
): Promise<OepExtraction> {
  const contentRoot = BUNDLE_DIR;

  // Compute checksum over bundle content paths
  const bundleContentPaths = Object.keys(rawEntries)
    .filter((p) => p.startsWith(contentRoot) && p !== contentRoot && rawEntries[p]!.length > 0)
    .map((p) => p.slice(contentRoot.length))
    .sort();
  const contentHashInput = bundleContentPaths.join('\n');
  const actualChecksum = await computeSha256(new TextEncoder().encode(contentHashInput));
  if (actualChecksum !== manifest.checksum.value) {
    throw new OepReaderError(
      'CHECKSUM_MISMATCH',
      `Expected ${manifest.checksum.value}, got ${actualChecksum}`,
    );
  }

  const bundleJsonRaw = rawEntries[`${contentRoot}bundle.json`];
  if (!bundleJsonRaw) {
    throw new OepReaderError(
      'MISSING_BUNDLE_MANIFEST',
      'bundle/bundle.json not found in archive',
    );
  }

  let bundleManifestJson: unknown;
  try {
    bundleManifestJson = JSON.parse(strFromU8(bundleJsonRaw));
  } catch {
    throw new OepReaderError('BUNDLE_VALIDATION_ERROR', 'bundle/bundle.json is not valid JSON');
  }

  const bundleResult = BundleManifestSchema.safeParse(bundleManifestJson);
  if (!bundleResult.success) {
    throw new OepReaderError(
      'BUNDLE_VALIDATION_ERROR',
      `bundle/bundle.json validation failed: ${bundleResult.error.message}`,
    );
  }

  if (bundleResult.data.id !== manifest.id) {
    throw new OepReaderError(
      'MANIFEST_MISMATCH',
      `Outer manifest id "${manifest.id}" != bundle.json id "${bundleResult.data.id}"`,
    );
  }
  if (bundleResult.data.version !== manifest.version) {
    throw new OepReaderError(
      'MANIFEST_MISMATCH',
      `Outer manifest version "${manifest.version}" != bundle.json version "${bundleResult.data.version}"`,
    );
  }

  const modules: OepExtractedModule[] = [];

  for (const modRef of bundleResult.data.modules) {
    const moduleDir = `${BUNDLE_MODULES_DIR}${modRef.id}/`;
    const modPkgRaw = rawEntries[`${moduleDir}package.json`];
    if (!modPkgRaw) {
      throw new OepReaderError(
        'MODULE_VALIDATION_ERROR',
        `Module "${modRef.id}" missing package.json at ${moduleDir}package.json`,
      );
    }

    let modManifestJson: unknown;
    try {
      modManifestJson = JSON.parse(strFromU8(modPkgRaw));
    } catch {
      throw new OepReaderError(
        'MODULE_VALIDATION_ERROR',
        `Module "${modRef.id}" package.json is not valid JSON`,
      );
    }

    const modResult = PackageManifestSchema.safeParse(modManifestJson);
    if (!modResult.success) {
      throw new OepReaderError(
        'MODULE_VALIDATION_ERROR',
        `Module "${modRef.id}" package.json validation failed: ${modResult.error.message}`,
      );
    }

    if (modResult.data.id !== modRef.id) {
      throw new OepReaderError(
        'MANIFEST_MISMATCH',
        `Module ref id "${modRef.id}" != module package.json id "${modResult.data.id}"`,
      );
    }

    const modNodes: Record<string, string> = {};
    const modAssets: Record<string, Uint8Array> = {};
    let modWorkflow: Record<string, unknown> | undefined;
    let modRewards: Record<string, unknown> | undefined;
    let modCards: Record<string, unknown> | undefined;

    if (fullExtract) {
      const nodesPrefix = `${moduleDir}nodes/`;
      const assetsPrefix = `${moduleDir}assets/`;

      for (const [path, data] of Object.entries(rawEntries)) {
        if (path.startsWith(nodesPrefix) && (path.endsWith('.md') || path.endsWith('.json')) && data.length > 0) {
          modNodes[path] = strFromU8(data);
        } else if (path.startsWith(assetsPrefix) && data.length > 0) {
          modAssets[path] = data;
        }
      }

      const workflowRaw = rawEntries[`${moduleDir}workflow.json`];
      if (workflowRaw && workflowRaw.length > 0) {
        try { modWorkflow = JSON.parse(strFromU8(workflowRaw)); } catch { /* ignore */ }
      }

      const rewardsRaw = rawEntries[`${moduleDir}rewards.json`];
      if (rewardsRaw && rewardsRaw.length > 0) {
        try { modRewards = JSON.parse(strFromU8(rewardsRaw)); } catch { /* ignore */ }
      }

      const cardsRaw = rawEntries[`${moduleDir}cards.json`];
      if (cardsRaw && cardsRaw.length > 0) {
        try { modCards = JSON.parse(strFromU8(cardsRaw)); } catch { /* ignore */ }
      }

      if (Object.keys(modNodes).length === 0) {
        throw new OepReaderError(
          'MODULE_VALIDATION_ERROR',
          `Module "${modRef.id}" has no node files in ${nodesPrefix}`,
        );
      }
    }

    modules.push({
      manifest: modManifestJson as Record<string, unknown>,
      nodes: modNodes,
      assets: modAssets,
      workflow: modWorkflow,
      rewards: modRewards,
      cards: modCards,
    });
  }

  return {
    manifest,
    bundleManifest: bundleManifestJson as Record<string, unknown>,
    modules,
    rawEntries,
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/oep-distribution/src/oep-reader.ts
git commit -m "feat(oep-distribution): add bundle archive reading to OepReader"
```

---

### Task 4: Add bundle build support to `OepWriter`

**Files:**

- Modify: `packages/oep-distribution/src/oep-writer.ts`

- [ ] **Step 1: Add `OepBundleBuildInput` interface**

```typescript
import { BUNDLE_DIR, BUNDLE_MODULES_DIR } from './types.js';
import { BundleManifestSchema } from '@open-edu/schemas';
import type { BundleManifest } from '@open-edu/schemas';

export interface OepBundleBuildInput {
  manifest: DistributionManifest;
  bundleManifest: BundleManifest;
  moduleFiles: Map<string, Map<string, Uint8Array>>; // moduleId -> { relativePath -> content }
}
```

- [ ] **Step 2: Add `buildBundle()` static method**

```typescript
export class OepWriter {
  // ... existing build() ...

  static async buildBundle(input: OepBundleBuildInput): Promise<OepBuildResult> {
    const manifest = { ...input.manifest, type: 'bundle' as const, contentRoot: BUNDLE_DIR };

    // Collect all files for checksum computation
    const allFiles = new Map<string, Uint8Array>();

    // Add bundle.json
    const bundleJsonBytes = strToU8(JSON.stringify(input.bundleManifest, null, 2));
    allFiles.set('bundle.json', bundleJsonBytes);

    // Add each module's files
    for (const [moduleId, files] of input.moduleFiles) {
      for (const [relativePath, content] of files) {
        allFiles.set(`modules/${moduleId}/${relativePath}`, content);
      }
    }

    const checksumValue = await computeContentChecksum(allFiles);
    manifest.checksum = { algorithm: 'sha256', value: checksumValue };

    const zipEntries: Record<string, Uint8Array> = {};
    zipEntries['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
    zipEntries[BUNDLE_DIR] = new Uint8Array(0);

    for (const [relativePath, content] of allFiles) {
      zipEntries[`${BUNDLE_DIR}${relativePath}`] = content;
    }

    const finalBytes = zipSync(zipEntries);
    return { bytes: finalBytes, checksumValue };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/oep-distribution/src/oep-writer.ts
git commit -m "feat(oep-distribution): add buildBundle to OepWriter"
```

---

### Task 5: Update OepReader tests for bundle support

**Files:**

- Modify: `packages/oep-distribution/src/oep-reader.test.ts`
- Create: `packages/oep-distribution/src/bundle-test-fixtures.ts`

- [ ] **Step 1: Create shared bundle test fixture helper**

In `tests/bundle-test-fixtures.ts` (or in test file directly):

```typescript
import { zipSync, strToU8 } from 'fflate';
import { OepWriter } from './oep-writer';
import {
  OEP_FORMAT,
  OEP_FORMAT_VERSION,
  BundleManifestSchema,
  type DistributionManifest,
} from '@open-edu/schemas';

const encoder = new TextEncoder();

export async function buildTestBundleOep(
  overrides: {
    id?: string;
    version?: string;
    title?: string;
    modules?: Array<{
      id: string;
      title: string;
      dependsOn?: string[];
    }>;
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

  const bundleManifest = BundleManifestSchema.parse({
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
  });

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
```

- [ ] **Step 2: Add bundle read tests to `oep-reader.test.ts`**

```typescript
import { buildTestBundleOep } from './bundle-test-fixtures';

describe('OepReader - bundles', () => {
  it('reads a valid bundle .oep and extracts modules', async () => {
    const bytes = await buildTestBundleOep();
    const extraction = await reader.read(bytes);

    expect(extraction.manifest.type).toBe('bundle');
    expect(extraction.manifest.id).toBe('test-bundle');
    expect(extraction.bundleManifest).toBeDefined();
    expect(extraction.modules).toHaveLength(2);
    expect(extraction.courseManifest).toBeUndefined();
  });

  it("extract each module's nodes and assets", async () => {
    const bytes = await buildTestBundleOep();
    const extraction = await reader.read(bytes);

    const modA = extraction.modules![0];
    expect(modA.manifest.id).toBe('mod-a');
    expect(Object.keys(modA.nodes)).toHaveLength(1);
    expect(modA.nodes['bundle/modules/mod-a/nodes/intro.md']).toContain('Module A');
  });

  it('inspectBundle returns metadata without full extraction', async () => {
    const bytes = await buildTestBundleOep();
    const inspection = await reader.inspectBundle(bytes);

    expect(inspection.id).toBe('test-bundle');
    expect(inspection.type).toBe('bundle');
    expect(inspection.moduleCount).toBe(2);
    expect(inspection.moduleIds).toEqual(['mod-a', 'mod-b']);
  });

  it('rejects bundle missing bundle.json', async () => {
    const manifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id: 'b',
      version: '1.0.0',
      title: 'B',
      checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
      contentRoot: 'bundle/',
    };
    const entries: Record<string, Uint8Array> = {};
    entries['manifest.json'] = strToU8(JSON.stringify(manifest));
    const bytes = zipSync(entries);
    await expect(reader.read(bytes)).rejects.toThrow('MISSING_BUNDLE_MANIFEST');
  });

  it('rejects bundle with module missing package.json', async () => {
    // Build valid, then remove a module's package.json
    const valid = await buildTestBundleOep();
    const zip = unzipSync(valid);
    delete zip['bundle/modules/mod-a/package.json'];
    const tampered = zipSync(zip);
    await expect(reader.read(tampered)).rejects.toThrow('MODULE_VALIDATION_ERROR');
  });

  it('rejects bundle with id mismatch between outer and bundle manifest', async () => {
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
      id: 'inner-id',
      title: 'Inner',
      version: '1.0.0',
      author: 'test',
      modules: [{ id: 'm1', title: 'M1', path: './modules/m1', dependsOn: [] }],
    };

    const entries: Record<string, Uint8Array> = {};
    entries['manifest.json'] = strToU8(JSON.stringify(manifest));
    entries['bundle/bundle.json'] = strToU8(JSON.stringify(bundleManifest));
    entries['bundle/modules/m1/package.json'] = strToU8(
      JSON.stringify({ id: 'm1', title: 'M1', version: '1.0.0', author: 't', entry: 'a' }),
    );
    entries['bundle/modules/m1/nodes/a.md'] = strToU8('# A');

    // Compute and set correct checksum
    const { computeSha256 } = await import('./checksum');
    const paths = Object.keys(entries)
      .filter((p) => p.startsWith('bundle/') && p !== 'bundle/' && entries[p]!.length > 0)
      .map((p) => p.slice('bundle/'.length))
      .sort();
    const hash = await computeSha256(new TextEncoder().encode(paths.join('\n')));
    manifest.checksum.value = hash;
    entries['manifest.json'] = strToU8(JSON.stringify(manifest));

    const bytes = zipSync(entries);
    await expect(reader.read(bytes)).rejects.toThrow('MANIFEST_MISMATCH');
  });
});
```

- [ ] **Step 3: Run bundle tests**

Run: `pnpm --filter @open-edu/oep-distribution test`
Expected: All new tests pass alongside existing ones.

- [ ] **Step 4: Commit**

```bash
git add packages/oep-distribution/src/oep-reader.test.ts
git add packages/oep-distribution/src/bundle-test-fixtures.ts
git commit -m "test(oep-distribution): add bundle read tests for OepReader"
```

---

### Task 6: Add OepWriter bundle tests

**Files:**

- Modify: `packages/oep-distribution/src/oep-writer.test.ts`

- [ ] **Step 1: Add bundle build test to `oep-writer.test.ts`**

```typescript
describe('OepWriter - bundle', () => {
  it('builds a valid bundle .oep that can be read back', async () => {
    const bundleManifest = {
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
    expect(checksumValue).toHaveLength(64);

    const reader = new OepReader();
    const extraction = await reader.read(bytes);

    expect(extraction.manifest.type).toBe('bundle');
    expect(extraction.bundleManifest).toBeDefined();
    expect(extraction.modules).toHaveLength(2);
    expect(extraction.modules![0].nodes['bundle/modules/mod-a/nodes/start.md']).toContain(
      'Module A',
    );
    expect(Object.keys(extraction.modules![1].assets)).toHaveLength(1);
  });

  it('produces reproducible bundle output', async () => {
    const bundleManifest = {
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

    const baseManifest: DistributionManifest = {
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

    const a = await OepWriter.buildBundle({ manifest: baseManifest, bundleManifest, moduleFiles });
    const b = await OepWriter.buildBundle({ manifest: baseManifest, bundleManifest, moduleFiles });

    expect(a.checksumValue).toBe(b.checksumValue);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @open-edu/oep-distribution test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/oep-distribution/src/oep-writer.test.ts
git commit -m "test(oep-distribution): add bundle build tests for OepWriter"
```

---

### Task 7: Update InstallCoordinator for bundle support

**Files:**

- Modify: `packages/oep-distribution/src/install-coordinator.ts`
- Modify: `packages/oep-distribution/src/install-coordinator.test.ts`

- [ ] **Step 1: Extend `ResolvedInstallData` for bundles**

```typescript
export interface ResolvedModuleData {
  manifest: Record<string, unknown>;
  nodes: Array<{ relativePath: string; content: string }>;
  assets: Array<{ path: string; data: Uint8Array }>;
  workflow?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
}

export interface ResolvedInstallData {
  inspection: PackageInspection;
  manifest?: Record<string, unknown>; // single course manifest
  nodes?: Array<{ relativePath: string; content: string }>;
  assets?: Array<{ path: string; data: Uint8Array }>;
  sourceKind: string;
  sourceLabel: string;
  checksum: string;
  workflow?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
  // Bundle fields
  type: 'course' | 'bundle';
  bundleManifest?: Record<string, unknown>;
  modules?: ResolvedModuleData[];
}
```

- [ ] **Step 2: Update `installInternal` to branch on type**

In `installInternal`, after `reader.read(bytes)`:

```typescript
const extraction = await this.reader.read(bytes);

let resolved: ResolvedInstallData;

if (extraction.manifest.type === 'bundle') {
  const contentRoot = 'bundle/';
  resolved = {
    inspection: {
      id: extraction.manifest.id,
      version: extraction.manifest.version,
      title: extraction.manifest.title,
      checksum: extraction.manifest.checksum,
      signatureStatus: extraction.manifest.signature.status,
    },
    type: 'bundle',
    bundleManifest: extraction.bundleManifest,
    modules: extraction.modules!.map((mod) => ({
      manifest: mod.manifest,
      nodes: Object.entries(mod.nodes).map(([path, content]) => ({
        relativePath: path.startsWith(contentRoot) ? path.slice(contentRoot.length) : path,
        content,
      })),
      assets: Object.entries(mod.assets).map(([path, data]) => ({
        path: path.startsWith(contentRoot) ? path.slice(contentRoot.length) : path,
        data,
      })),
      workflow: mod.workflow,
      rewards: mod.rewards,
      cards: mod.cards,
    })),
    sourceKind: source.kind,
    sourceLabel: source.label,
    checksum: extraction.manifest.checksum.value,
  };
} else {
  // existing single course logic
  resolved = {
    inspection: { ... },
    type: 'course',
    manifest: extraction.courseManifest,
    nodes: ...,
    assets: ...,
    ...,
  };
}
```

- [ ] **Step 3: Update `courseRecord` construction for bundles**

When storing a bundle, include `modules` in the record:

```typescript
const courseRecord: StoredCourseRecord = {
  id: resolved.inspection.id,
  version: resolved.inspection.version,
  downloadedAt: new Date().toISOString(),
  distributionMeta: { ... },
  type: resolved.type,
  ...(resolved.type === 'bundle'
    ? {
        bundleManifest: resolved.bundleManifest,
        modules: resolved.modules!.map((m) => ({
          manifest: m.manifest,
          nodes: m.nodes,
          assets: m.assets.map((a) => ({ path: a.path, data: a.data.buffer })),
          workflow: m.workflow,
          rewards: m.rewards,
          cards: m.cards,
        })),
      }
    : {
        manifest: resolved.manifest,
        nodes: resolved.nodes!.map((n) => ({ relativePath: n.relativePath, content: n.content })),
        assets: resolved.assets!.map((a) => ({ path: a.path, data: a.data.buffer })),
        workflow: resolved.workflow,
        rewards: resolved.rewards,
        cards: resolved.cards,
      }),
};
```

- [ ] **Step 4: Add bundle install tests to `install-coordinator.test.ts`**

```typescript
describe('InstallCoordinator - bundle', () => {
  it('installs a bundle and stores module data', async () => {
    const storage = new InMemoryStorage();
    const coordinator = new InstallCoordinator(storage);

    const bundleBytes = await buildTestBundleOep({
      id: 'test-bundle',
      modules: [
        { id: 'm1', title: 'M1' },
        { id: 'm2', title: 'M2', dependsOn: ['m1'] },
      ],
    });

    const source: CourseSource = {
      kind: 'file',
      label: 'test-bundle.oep',
      getBytes: async () => bundleBytes,
    };

    const result = await coordinator.install(source);
    expect(result.success).toBe(true);
    expect(result.courseId).toBe('test-bundle');
    expect((result as any).type).toBeUndefined(); // InstallResult shape unchanged

    const stored = await storage.getInstalledCourse('test-bundle');
    expect(stored).toBeDefined();
    expect(stored!.type).toBe('bundle');
    expect((stored as any).modules).toHaveLength(2);
  });

  it('inspect returns bundle metadata', async () => {
    const storage = new InMemoryStorage();
    const coordinator = new InstallCoordinator(storage);

    const bundleBytes = await buildTestBundleOep({ id: 'bundle-inspect' });
    const source: CourseSource = {
      kind: 'file',
      label: 'test.oep',
      getBytes: async () => bundleBytes,
    };

    const inspection = await coordinator.inspect(source);
    // inspect uses reader.inspect(), which returns PackageInspection (no type field)
    expect(inspection.id).toBe('bundle-inspect');
  });
});
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @open-edu/oep-distribution test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/oep-distribution/src/install-coordinator.ts
git add packages/oep-distribution/src/install-coordinator.test.ts
git commit -m "feat(oep-distribution): add bundle install support to InstallCoordinator"
```

---

### Task 8: Add CLI `oep:build-bundle` command

**Files:**

- Create: `packages/cli/src/commands/oep-build-bundle.ts`
- Modify: `packages/cli/src/cli.ts`

- [ ] **Step 1: Create `oep-build-bundle.ts`**

```typescript
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { OepWriter } from '@open-edu/oep-distribution';
import {
  OEP_FORMAT,
  OEP_FORMAT_VERSION,
  BundleManifestSchema,
  type DistributionManifest,
  type BundleManifest,
} from '@open-edu/schemas';
import type { CliResult } from '../utils/json-output.js';
import { formatValidationError, printMessages } from '../utils/format.js';

function collectModuleFiles(moduleDir: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();

  function walk(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (entry === 'dist' || entry === 'node_modules' || entry === '.git' || entry === '.edu')
          continue;
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

export async function buildOepBundle(
  bundleDir: string,
  outputDir?: string,
  options?: { json?: boolean },
): Promise<CliResult> {
  try {
    const outDir = outputDir ?? process.cwd();
    if (!existsSync(outDir)) {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(outDir, { recursive: true });
    }

    const bundleJsonPath = join(bundleDir, 'bundle.json');
    if (!existsSync(bundleJsonPath)) {
      throw new Error(`bundle.json not found in ${bundleDir}`);
    }

    const bundleJsonRaw = readFileSync(bundleJsonPath, 'utf-8');
    const bundleResult = BundleManifestSchema.safeParse(JSON.parse(bundleJsonRaw));
    if (!bundleResult.success) {
      throw new Error(`Invalid bundle.json: ${bundleResult.error.message}`);
    }
    const bundleManifest = bundleResult.data;

    const moduleFiles = new Map<string, Map<string, Uint8Array>>();
    for (const mod of bundleManifest.modules) {
      const modDir = resolve(bundleDir, mod.path);
      if (!existsSync(modDir)) {
        throw new Error(`Module "${mod.id}" directory not found: ${modDir}`);
      }
      moduleFiles.set(mod.id, collectModuleFiles(modDir));
    }

    const distManifest: DistributionManifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      type: 'bundle',
      id: bundleManifest.id,
      version: bundleManifest.version,
      title: bundleManifest.title,
      checksum: { algorithm: 'sha256', value: '' },
      contentRoot: 'bundle/',
      signature: { status: 'unsigned' },
    };

    const result = await OepWriter.buildBundle({
      manifest: distManifest,
      bundleManifest,
      moduleFiles,
    });
    const oepFileName = `${bundleManifest.id}-${bundleManifest.version}.oep`;
    const oepPath = resolve(join(outDir, oepFileName));

    writeFileSync(oepPath, result.bytes);

    if (options?.json) {
      return {
        success: true,
        data: {
          bundleDir,
          oepPath,
          oepFileName,
          checksum: result.checksumValue,
          moduleCount: bundleManifest.modules.length,
        },
      };
    }

    printMessages([
      {
        type: 'success',
        text: `Built bundle ${oepFileName} (${bundleManifest.modules.length} modules)`,
      },
      { type: 'info', text: `  SHA-256: ${result.checksumValue}` },
      { type: 'info', text: `  Size: ${(result.bytes.length / 1024).toFixed(1)} KiB` },
    ]);

    return { success: true, data: {} };
  } catch (error) {
    if (options?.json) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 1,
      };
    }
    const messages = formatValidationError(error);
    printMessages(messages);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 1,
    };
  }
}
```

- [ ] **Step 2: Register the command in `cli.ts`**

Add import:

```typescript
import { buildOepBundle } from './commands/oep-build-bundle.js';
```

Add command (after `oep:build`):

```typescript
program
  .command('oep:build-bundle')
  .description('Build a .oep distribution artifact from a bundle directory')
  .argument('<bundle-dir>', 'Bundle directory (must contain bundle.json)')
  .option('-o, --output <dir>', 'Output directory (default: current dir)')
  .option('--json', 'Output JSON')
  .action(async (bundleDir: string, opts: { output?: string; json?: boolean }) => {
    const result = await buildOepBundle(bundleDir, opts.output, opts);
    if (!result.success) process.exit(result.code ?? 1);
  });
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/oep-build-bundle.ts
git add packages/cli/src/cli.ts
git commit -m "feat(cli): add oep:build-bundle command"
```

---

### Task 9: Update package exports

**Files:**

- Modify: `packages/oep-distribution/src/index.ts`

- [ ] **Step 1: Add new exports**

```typescript
export {
  type OepExtractedModule,
  type BundleInspection,
  BUNDLE_DIR,
  BUNDLE_MODULES_DIR,
} from './types.js';
export { type OepBundleBuildInput, type OepBuildResult } from './oep-writer.js';
export { type ResolvedModuleData } from './install-coordinator.js';
```

Also add `OEP_BUNDLE_CONTENT_ROOT` from schemas if needed.

- [ ] **Step 2: Commit**

```bash
git add packages/oep-distribution/src/index.ts
git commit -m "chore(oep-distribution): update exports for bundle types"
```

---

### Task 10: Update storage schema for bundles

**Files:**

- Modify: `packages/storage/src/db.ts`

- [ ] **Step 1: Add `type` and `modules` fields to `StoredCourse` interface**

```typescript
export interface StoredModuleRecord {
  manifest: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  assets: { path: string; data: ArrayBuffer }[];
  workflow?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
}

export interface StoredCourse {
  id: string;
  version: string;
  type?: 'course' | 'bundle'; // NEW
  manifest?: Record<string, unknown>; // Now optional (undefined for bundles)
  nodes?: Record<string, unknown>[]; // Now optional
  assets?: { path: string; data: ArrayBuffer }[];
  downloadedAt: string;
  distributionMeta?: DistributionMeta;
  workflow?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
  bundleManifest?: Record<string, unknown>; // NEW
  modules?: StoredModuleRecord[]; // NEW
}
```

- [ ] **Step 2: Update DB version and migration**

Bump `DB_VERSION` from 3 to 4 and add a migration in the `upgrade` callback. Since IndexedDB is schema-less (key-value), no actual store change is needed, but the version must be bumped to trigger the upgrade event on existing databases.

```typescript
export const DB_VERSION = 4;
```

- [ ] **Step 3: Commit**

```bash
git add packages/storage/src/db.ts
git commit -m "feat(storage): add bundle fields to StoredCourse"
```

---

### Task 11: Update learner app integration

**Files:**

- Modify: `apps/learner/src/courseDownload.ts`
- Modify: `apps/learner/src/oepAdapters.ts`
- Modify: `apps/learner/src/__tests__/oepAdapters.test.ts`

- [ ] **Step 1: Update `courseDownload.ts` storage adapter**

In both `installFromSource` and `updateFromSource`, the `saveCourse` adapter and `replaceCourse` adapter currently access `course.manifest`, `course.nodes`, `course.assets` directly. Make these conditional on `course.type`.

After receiving `InstallResult`, the coordinator already writes `type`, `modules`, `bundleManifest` into the stored record. The adapter code needs to pass these through to the storage layer.

Minimal change: add `course.type`, `course.bundleManifest`, `course.modules` to the `StoredCourse` passed to `saveCourse`.

```typescript
saveCourse: async (course) => {
  const record: StoredCourse = {
    id: course.id as string,
    version: course.version as string,
    type: course.type as 'course' | 'bundle' | undefined,
    downloadedAt: course.downloadedAt as string,
    distributionMeta: course.distributionMeta as ...,
    ...(course.type === 'bundle'
      ? {
          bundleManifest: course.bundleManifest as Record<string, unknown>,
          modules: (course.modules as any[])?.map((m: any) => ({
            manifest: m.manifest,
            nodes: m.nodes,
            assets: m.assets?.map((a: any) => ({
              path: a.path,
              data: a.data instanceof ArrayBuffer ? a.data : new Uint8Array(a.data as Iterable<number>).buffer,
            })),
            workflow: m.workflow,
            rewards: m.rewards,
            cards: m.cards,
          })),
        }
      : {
          manifest: course.manifest as Record<string, unknown>,
          nodes: course.nodes as Record<string, unknown>[],
          assets: (course.assets as Array<{ path: string; data: ArrayBuffer }>)?.map((a) => ({
            path: a.path,
            data: a.data instanceof ArrayBuffer ? a.data : new Uint8Array(a.data as Iterable<number>).buffer,
          })),
          workflow: course.workflow as Record<string, unknown> | undefined,
          rewards: course.rewards as Record<string, unknown> | undefined,
          cards: course.cards as Record<string, unknown> | undefined,
        }),
  };
  await saveCourse(record);
},
```

Apply the same pattern to `replaceCourse`.

Also apply it to `getInstalledCourse` to read `type`, `bundleManifest`, `modules` from the stored record.

- [ ] **Step 2: Update `oepAdapters.ts`**

Add a `storedBundleToLoadedBundle()` function that converts a stored bundle record into a `LoadedBundle` (from `@open-edu/core`):

```typescript
import type { LoadedBundle, LoadedPackage } from '@open-edu/core';
import { BundleManifestSchema } from '@open-edu/schemas';

export function storedBundleToLoadedBundle(course: StoredCourse): LoadedBundle | null {
  if (course.type !== 'bundle' || !course.bundleManifest || !course.modules) return null;

  let bundleManifest: BundleManifest;
  try {
    bundleManifest = BundleManifestSchema.parse(course.bundleManifest);
  } catch {
    return null;
  }

  const modules: LoadedPackage[] = course.modules.map((mod) => {
    // Reuse storedCourseToLoadedPackage logic per module
    const modAsCourse: StoredCourse = {
      id: (mod.manifest.id as string) ?? course.id,
      version: course.version,
      manifest: mod.manifest,
      nodes: mod.nodes,
      assets: mod.assets,
      downloadedAt: course.downloadedAt,
      workflow: mod.workflow,
      rewards: mod.rewards,
      cards: mod.cards,
    };
    return storedCourseToLoadedPackage(modAsCourse);
  });

  const moduleMap = new Map<string, LoadedPackage>();
  for (const mod of modules) {
    moduleMap.set(mod.manifest.id, mod);
  }

  return {
    rootDir: `${OEP_PREFIX}${course.id}`,
    manifest: bundleManifest,
    modules,
    moduleMap,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/learner/src/courseDownload.ts
git add apps/learner/src/oepAdapters.ts
git commit -m "feat(learner): add bundle install support in download and oep adapters"
```

---

### Task 12: Create a bundle example for end-to-end testing

**Files:**

- Create: `examples/level-b-math-bundle/` (actually reuse `examples/level-b-math/` — it already has the correct structure)

- [ ] **Step 1: Verify existing `level-b-math` example has bundle structure**

The current `examples/level-b-math/` already has:

- `bundle.json` at root
- `modules/addition_basics/package.json`, `modules/addition_basics/nodes/`
- `modules/addition_carry/package.json`, `modules/addition_carry/nodes/`
- `modules/adding_fractions/package.json`, `modules/adding_fractions/nodes/`

No changes needed — this directory is already a valid bundle build input.

- [ ] **Step 2: Build the bundle with CLI and verify**

```bash
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js oep:build-bundle ./examples/level-b-math -o /tmp/oep-test
```

Expected: Creates `/tmp/oep-test/level-b-math-1.0.0.oep`.

- [ ] **Step 3: Verify with reader**

```bash
# Quick verification script using node -e
node -e "
const { OepReader } = require('./packages/oep-distribution/dist/index.js');
const fs = require('fs');
const bytes = fs.readFileSync('/tmp/oep-test/level-b-math-1.0.0.oep');
const reader = new OepReader();
reader.read(bytes).then(e => {
  console.log('Type:', e.manifest.type);
  console.log('Modules:', e.modules?.length);
  console.log('Module IDs:', e.modules?.map(m => m.manifest.id));
}).catch(err => console.error('FAIL:', err.message));
"
```

Expected: `Type: bundle`, `Modules: 3`, `Module IDs: [ 'addition_basics', 'addition_carry', 'adding_fractions' ]`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add bundle E2E verification with level-b-math example"
```

---

## Self-Review

**1. Spec coverage:**

- Schema extended with `type` field → Task 1
- `OepExtraction` extended with bundle fields → Task 2
- `OepReader` reads bundle archives → Task 3
- `OepWriter` builds bundle archives → Task 4
- Reader tests for bundles → Task 5
- Writer tests for bundles → Task 6
- InstallCoordinator handles bundles → Task 7
- CLI command `oep:build-bundle` → Task 8
- Package exports updated → Task 9
- Storage supports bundle fields → Task 10
- Learner app installs bundles → Task 11
- E2E bundle verification → Task 12

**2. Placeholder scan:** No TBD/TODO/FIXME placeholders in code blocks. All code is complete.

**3. Type consistency:**

- `DistributionManifestSchema.type` added as `z.enum(['course', 'bundle']).default('course')` — used in writer and reader consistently
- `OepExtraction` has `courseManifest?` and `nodes?` for backward compat; `bundleManifest` and `modules` for bundles
- `OepBuildInput` → existing, `OepBundleBuildInput` → new, consistent naming
- `ResolvedInstallData.type` → `'course' | 'bundle'`, branching matches extraction type
- `StoredCourse.type` → same enum, stored alongside `modules` for bundles
- `OepBUNDLE_CONTENT_ROOT` → `'bundle/'`, `BUNDLE_DIR` and `BUNDLE_MODULES_DIR` constants

**4. No cross-package import violations:** All imports stay within declared `package.json` dependencies. `oep-distribution` depends on `@open-edu/schemas` (already does). `cli` depends on `@open-edu/oep-distribution` and `@open-edu/schemas` (already does). `storage` has no new deps. `learner` depends on `@open-edu/oep-distribution`, `@open-edu/storage`, `@open-edu/core` (already does).
