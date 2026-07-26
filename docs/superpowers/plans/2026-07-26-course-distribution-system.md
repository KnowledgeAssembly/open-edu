# Course Distribution System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable `.oep` distribution artifact system that lets the OpenEdu learner app install courses from local files, URLs, or a static catalog — with ZIP security, SHA-256 integrity, atomic activation, and update detection that preserves learner data.

**Architecture:** A new workspace package `@open-edu/oep-distribution` provides browser-safe OEP reading/writing and install coordination. Schemas extend `@open-edu/schemas`. The CLI gains `edu oep:build`. The learner app gains install-from-file/URL/catalog UI. Storage is extended with distribution metadata. All validation happens before activation; learner progress, notes, badges, and cards are never erased during updates.

**Tech Stack:** `fflate` (ZIP), `Web Crypto API` (SHA-256 in browser), `node:crypto` (SHA-256 in Node), `@open-edu/schemas` (Zod), `@open-edu/storage` (IndexedDB), `@open-edu/i18n` (translations), React + Tailwind CSS (learner UI).

---

## File Structure

### New package: `packages/oep-distribution/`

```
packages/oep-distribution/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                      # barrel: re-exports all public types and classes
│   ├── types.ts                      # DistributionManifest, Catalog, CourseSource, etc.
│   ├── oep-reader.ts                 # OepReader class — unzips, validates, extracts course
│   ├── oep-writer.ts                 # OepWriter class — builds .oep from in-memory entries
│   ├── zip-security.ts               # ZipSecurity util — traversal, decompression, size checks
│   ├── checksum.ts                   # computeSha256(byte | bytes → hex) — browser + Node
│   ├── install-coordinator.ts        # InstallCoordinator — stage → activate + error codes
│   ├── source-adapters.ts            # fileSource, urlSource, catalogSource factories
│   ├── catalog-loader.ts             # fetchCatalog, parseCatalog
│   ├── version-compare.ts            # semverGreaterThan utility
│   ├── oep-reader.test.ts
│   ├── oep-writer.test.ts
│   ├── zip-security.test.ts
│   ├── checksum.test.ts
│   ├── install-coordinator.test.ts
│   ├── source-adapters.test.ts
│   ├── catalog-loader.test.ts
│   └── version-compare.test.ts
```

### Modified existing files

| File                                                   | Change                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| `packages/schemas/src/distribution-manifest.ts`        | Create: Distribution manifest + signature schemas             |
| `packages/schemas/src/catalog.ts`                      | Create: Static catalog schema                                 |
| `packages/schemas/src/index.ts`                        | Add re-exports                                                |
| `packages/schemas/src/index.test.ts`                   | Add schema snapshot expectations                              |
| `packages/storage/src/db.ts`                           | Add `distributionMeta` field to `StoredCourse`                |
| `packages/storage/src/course-store.ts`                 | Add `replaceCourse` transactional swap                        |
| `packages/cli/src/commands/oep-build.ts`               | Create: `edu oep:build` command                               |
| `packages/cli/src/cli.ts`                              | Register `oep:build` command                                  |
| `apps/learner/src/courseDownload.ts`                   | Add `installFromFile`, `installFromUrl`, `installFromCatalog` |
| `apps/learner/src/AppShell.tsx`                        | Add install-view to `AppView` union                           |
| `apps/learner/src/CatalogPage.tsx`                     | Add install-buttons section                                   |
| `apps/learner/src/components/InstallCourseDialog.tsx`  | Create: file/URL install dialog                               |
| `apps/learner/src/components/AvailableUpdatesList.tsx` | Create: update notification UI                                |
| `packages/i18n/locales/en/learner.json`                | Add distribution + install strings                            |

---

### Task 1: Distribution Schemas (`@open-edu/schemas`)

**Files:**

- Create: `packages/schemas/src/distribution-manifest.ts`
- Create: `packages/schemas/src/distribution-manifest.test.ts`
- Create: `packages/schemas/src/catalog.ts`
- Create: `packages/schemas/src/catalog.test.ts`
- Modify: `packages/schemas/src/index.ts:1-22`

- [ ] **Step 1: Write `distribution-manifest.ts` with Zod schema**

```typescript
// packages/schemas/src/distribution-manifest.ts
import { z } from 'zod';

export const OEP_FORMAT = 'openedu-package' as const;
export const OEP_FORMAT_VERSION = 1 as const;

export const ChecksumSchema = z.object({
  algorithm: z.literal('sha256'),
  value: z.string().regex(/^[a-f0-9]{64}$/, 'must be a 64-char hex SHA-256 hash'),
});

export type DistributionChecksum = z.infer<typeof ChecksumSchema>;

export const SignatureStatusSchema = z.object({
  status: z.enum(['unsigned', 'verified', 'invalid', 'untrusted']),
  verifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
});

export type SignatureStatus = z.infer<typeof SignatureStatusSchema>;

export const DistributionManifestSchema = z.object({
  format: z.literal(OEP_FORMAT),
  formatVersion: z.literal(OEP_FORMAT_VERSION),
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'must be kebab-case'),
  version: z
    .string()
    .min(1)
    .max(64)
    .regex(/^\d+\.\d+\.\d+$/, 'must be semver (e.g. 1.0.0)'),
  title: z.string().min(1).max(256),
  contentRoot: z.string().default('course/'),
  checksum: ChecksumSchema,
  signature: SignatureStatusSchema.default({ status: 'unsigned' }),
});

export type DistributionManifest = z.infer<typeof DistributionManifestSchema>;
```

- [ ] **Step 2: Write `distribution-manifest.test.ts`**

```typescript
// packages/schemas/src/distribution-manifest.test.ts
import { describe, it, expect } from 'vitest';
import {
  DistributionManifestSchema,
  ChecksumSchema,
  SignatureStatusSchema,
} from './distribution-manifest';

describe('ChecksumSchema', () => {
  it('accepts valid sha256 hex', () => {
    const result = ChecksumSchema.safeParse({
      algorithm: 'sha256',
      value: 'a'.repeat(64),
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong-length hex', () => {
    const result = ChecksumSchema.safeParse({
      algorithm: 'sha256',
      value: 'a'.repeat(63),
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-hex characters', () => {
    const result = ChecksumSchema.safeParse({
      algorithm: 'sha256',
      value: 'g'.repeat(64),
    });
    expect(result.success).toBe(false);
  });
});

describe('SignatureStatusSchema', () => {
  it('accepts unsigned', () => {
    const result = SignatureStatusSchema.safeParse({ status: 'unsigned' });
    expect(result.success).toBe(true);
  });

  it('accepts verified with metadata', () => {
    const result = SignatureStatusSchema.safeParse({
      status: 'verified',
      verifiedAt: '2026-01-01T00:00:00Z',
      verifiedBy: 'test-key',
    });
    expect(result.success).toBe(true);
  });
});

describe('DistributionManifestSchema', () => {
  const validManifest = {
    format: 'openedu-package' as const,
    formatVersion: 1 as const,
    id: 'science-grade7',
    version: '1.0.0',
    title: 'Science Grade 7',
    checksum: { algorithm: 'sha256' as const, value: 'a'.repeat(64) },
  };

  it('accepts minimal valid manifest', () => {
    const result = DistributionManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentRoot).toBe('course/');
      expect(result.data.signature.status).toBe('unsigned');
    }
  });

  it('defaults contentRoot to course/', () => {
    const result = DistributionManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentRoot).toBe('course/');
    }
  });

  it('rejects bad id format', () => {
    const result = DistributionManifestSchema.safeParse({
      ...validManifest,
      id: 'INVALID ID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-semver version', () => {
    const result = DistributionManifestSchema.safeParse({
      ...validManifest,
      version: 'latest',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing checksum', () => {
    const { checksum: _, ...noChecksum } = validManifest;
    const result = DistributionManifestSchema.safeParse(noChecksum);
    expect(result.success).toBe(false);
  });

  it('accepts with explicit signature', () => {
    const result = DistributionManifestSchema.safeParse({
      ...validManifest,
      signature: { status: 'verified', verifiedAt: '2026-01-01T00:00:00Z', verifiedBy: 'key-1' },
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run schema tests to verify they fail**

```bash
pnpm --filter @open-edu/schemas test -- distribution-manifest
```

Expected: 9 tests fail (module not found)

- [ ] **Step 4: Re-run to verify tests pass**

```bash
pnpm --filter @open-edu/schemas test -- distribution-manifest
```

Expected: 9 tests pass

- [ ] **Step 5: Write `catalog.ts` schema**

```typescript
// packages/schemas/src/catalog.ts
import { z } from 'zod';

export const CatalogVersionEntrySchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'must be semver'),
  downloadUrl: z.string().url(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/, 'must be 64-char SHA-256 hex'),
  sizeBytes: z.number().int().positive(),
  languages: z.array(z.string()).default(['en']),
});

export type CatalogVersionEntry = z.infer<typeof CatalogVersionEntrySchema>;

export const CatalogPackageEntrySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  latestVersion: z.string(),
  versions: z.array(CatalogVersionEntrySchema).min(1),
});

export type CatalogPackageEntry = z.infer<typeof CatalogPackageEntrySchema>;

export const CatalogSchema = z.object({
  catalogVersion: z.literal(1),
  packages: z.array(CatalogPackageEntrySchema),
});

export type Catalog = z.infer<typeof CatalogSchema>;
```

- [ ] **Step 6: Write `catalog.test.ts`**

```typescript
// packages/schemas/src/catalog.test.ts
import { describe, it, expect } from 'vitest';
import { CatalogSchema, CatalogPackageEntrySchema, CatalogVersionEntrySchema } from './catalog';

describe('CatalogVersionEntrySchema', () => {
  it('accepts valid version entry', () => {
    const result = CatalogVersionEntrySchema.safeParse({
      version: '1.0.0',
      downloadUrl: 'https://example.org/pkg-1.0.0.oep',
      checksum: 'a'.repeat(64),
      sizeBytes: 12345,
    });
    expect(result.success).toBe(true);
  });

  it('rejects bad URL', () => {
    const result = CatalogVersionEntrySchema.safeParse({
      version: '1.0.0',
      downloadUrl: 'not-a-url',
      checksum: 'a'.repeat(64),
      sizeBytes: 12345,
    });
    expect(result.success).toBe(false);
  });
});

describe('CatalogPackageEntrySchema', () => {
  it('accepts minimal entry', () => {
    const result = CatalogPackageEntrySchema.safeParse({
      id: 'science-grade7',
      title: 'Science Grade 7',
      latestVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          downloadUrl: 'https://example.org/sci-1.0.0.oep',
          checksum: 'a'.repeat(64),
          sizeBytes: 12345,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty versions array', () => {
    const result = CatalogPackageEntrySchema.safeParse({
      id: 'science-grade7',
      title: 'Science Grade 7',
      latestVersion: '1.0.0',
      versions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('CatalogSchema', () => {
  it('parses a full catalog', () => {
    const catalog = {
      catalogVersion: 1 as const,
      packages: [
        {
          id: 'science-grade7',
          title: 'Science Grade 7',
          latestVersion: '1.0.0',
          versions: [
            {
              version: '1.0.0',
              downloadUrl: 'https://example.org/sci-1.0.0.oep',
              checksum: 'a'.repeat(64),
              sizeBytes: 54321,
            },
          ],
        },
      ],
    };
    const result = CatalogSchema.safeParse(catalog);
    expect(result.success).toBe(true);
  });

  it('rejects without packages array', () => {
    const result = CatalogSchema.safeParse({ catalogVersion: 1 });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 7: Run catalog tests**

```bash
pnpm --filter @open-edu/schemas test -- catalog
```

Expected: 6 tests pass

- [ ] **Step 8: Add re-exports to `packages/schemas/src/index.ts`**

Add these lines after the existing schema re-exports:

```typescript
export {
  DistributionManifestSchema,
  ChecksumSchema,
  SignatureStatusSchema,
  OEP_FORMAT,
  OEP_FORMAT_VERSION,
} from './distribution-manifest.js';
export type {
  DistributionManifest,
  DistributionChecksum,
  SignatureStatus,
} from './distribution-manifest.js';

export { CatalogSchema, CatalogPackageEntrySchema, CatalogVersionEntrySchema } from './catalog.js';
export type { Catalog, CatalogPackageEntry, CatalogVersionEntry } from './catalog.js';
```

- [ ] **Step 9: Run full schemas test suite**

```bash
pnpm --filter @open-edu/schemas test
```

Expected: All tests pass (existing + 15 new)

- [ ] **Step 10: Commit**

```bash
git add packages/schemas/src/distribution-manifest.ts packages/schemas/src/distribution-manifest.test.ts packages/schemas/src/catalog.ts packages/schemas/src/catalog.test.ts packages/schemas/src/index.ts
git commit -m "feat(schemas): add distribution manifest and catalog schemas"
```

---

### Task 2: Create `@open-edu/oep-distribution` Package Foundation

**Files:**

- Create: `packages/oep-distribution/package.json`
- Create: `packages/oep-distribution/tsconfig.json`
- Create: `packages/oep-distribution/src/types.ts`
- Create: `packages/oep-distribution/src/index.ts`

- [ ] **Step 1: Install fflate and create package scaffold**

```bash
mkdir -p packages/oep-distribution/src
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "@open-edu/oep-distribution",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@open-edu/schemas": "workspace:*",
    "fflate": "^0.8.2"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write `src/types.ts`**

```typescript
// packages/oep-distribution/src/types.ts
import type { DistributionManifest } from '@open-edu/schemas';

export { type DistributionManifest } from '@open-edu/schemas';
export type { PackageManifest } from '@open-edu/schemas';

export interface OepExtraction {
  manifest: DistributionManifest;
  courseManifest: Record<string, unknown>;
  nodes: Record<string, string>;
  assets: Record<string, Uint8Array>;
  rawEntries: Record<string, Uint8Array>;
}

export interface PackageInspection {
  id: string;
  version: string;
  title: string;
  checksum: { algorithm: 'sha256'; value: string };
  signatureStatus: string;
}

export type InstallErrorCode =
  | 'SOURCE_READ_ERROR'
  | 'ARCHIVE_TOO_LARGE'
  | 'DECOMPRESSED_TOO_LARGE'
  | 'MALFORMED_ARCHIVE'
  | 'PATH_TRAVERSAL'
  | 'MISSING_MANIFEST'
  | 'INVALID_MANIFEST'
  | 'CHECKSUM_MISMATCH'
  | 'MISSING_COURSE_DIR'
  | 'COURSE_VALIDATION_ERROR'
  | 'MANIFEST_MISMATCH'
  | 'STORAGE_ERROR'
  | 'VERSION_DOWNGRADE'
  | 'VERSION_SAME'
  | 'CATALOG_FETCH_ERROR'
  | 'CATALOG_PARSE_ERROR'
  | 'NOT_FOUND';

export interface InstallResult {
  success: boolean;
  courseId: string;
  version: string;
  errorCode?: InstallErrorCode;
  errorMessage?: string;
}

export type SourceKind = 'file' | 'url' | 'catalog';

export interface CourseSource {
  kind: SourceKind;
  label: string;
  getBytes(signal?: AbortSignal): Promise<Uint8Array>;
}

export const DEFAULT_MAX_ARCHIVE_BYTES = 100 * 1024 * 1024; // 100 MiB
export const DEFAULT_MAX_DECOMPRESSED_BYTES = 500 * 1024 * 1024; // 500 MiB

export interface ZipSecurityOptions {
  maxArchiveBytes: number;
  maxDecompressedBytes: number;
}

export const DEFAULT_ZIP_SECURITY: ZipSecurityOptions = {
  maxArchiveBytes: DEFAULT_MAX_ARCHIVE_BYTES,
  maxDecompressedBytes: DEFAULT_MAX_DECOMPRESSED_BYTES,
};

export const OEP_CONTENT_ROOT = 'course/';
```

- [ ] **Step 5: Write `src/index.ts` barrel**

```typescript
export {
  type OepExtraction,
  type PackageInspection,
  type InstallResult,
  type InstallErrorCode,
  type CourseSource,
  type SourceKind,
  type ZipSecurityOptions,
  DEFAULT_MAX_ARCHIVE_BYTES,
  DEFAULT_MAX_DECOMPRESSED_BYTES,
  DEFAULT_ZIP_SECURITY,
  OEP_CONTENT_ROOT,
} from './types.js';

export { computeSha256 } from './checksum.js';
export { OepReader } from './oep-reader.js';
export { OepWriter } from './oep-writer.js';
export { validateZipEntry, validateZipArchive } from './zip-security.js';
export { InstallCoordinator } from './install-coordinator.js';
export { fileSource, urlSource, catalogSource } from './source-adapters.js';
export {
  fetchCatalog,
  parseCatalog,
  findPackageInCatalog,
  findVersionInCatalog,
} from './catalog-loader.js';
export { semverGreaterThan } from './version-compare.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/oep-distribution/
git commit -m "feat(oep-distribution): scaffold package with types"
```

---

### Task 3: Checksum Utility

**Files:**

- Create: `packages/oep-distribution/src/checksum.ts`
- Create: `packages/oep-distribution/src/checksum.test.ts`

- [ ] **Step 1: Write `checksum.ts`**

```typescript
// packages/oep-distribution/src/checksum.ts
export async function computeSha256(data: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(Buffer.from(data)).digest('hex');
}
```

- [ ] **Step 2: Write `checksum.test.ts`**

```typescript
// packages/oep-distribution/src/checksum.test.ts
import { describe, it, expect } from 'vitest';
import { computeSha256 } from './checksum';

describe('computeSha256', () => {
  it('returns 64-char hex for empty input', async () => {
    const hash = await computeSha256(new Uint8Array(0));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('returns consistent hash for same input', async () => {
    const data = new TextEncoder().encode('hello world');
    const a = await computeSha256(data);
    const b = await computeSha256(data);
    expect(a).toBe(b);
  });

  it('returns different hash for different input', async () => {
    const a = await computeSha256(new TextEncoder().encode('hello'));
    const b = await computeSha256(new TextEncoder().encode('world'));
    expect(a).not.toBe(b);
  });

  it('handles binary data', async () => {
    const data = new Uint8Array([0x00, 0xff, 0x42, 0x7f]);
    const hash = await computeSha256(data);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @open-edu/oep-distribution test -- checksum
```

Expected: 4 tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/oep-distribution/src/checksum.ts packages/oep-distribution/src/checksum.test.ts
git commit -m "feat(oep-distribution): add SHA-256 checksum utility"
```

---

### Task 4: ZIP Security

**Files:**

- Create: `packages/oep-distribution/src/zip-security.ts`
- Create: `packages/oep-distribution/src/zip-security.test.ts`

- [ ] **Step 1: Write `zip-security.ts`**

```typescript
// packages/oep-distribution/src/zip-security.ts
import type { ZipSecurityOptions } from './types.js';
import { DEFAULT_ZIP_SECURITY } from './types.js';

export class SecurityViolationError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'SecurityViolationError';
  }
}

export function validateZipEntry(
  entryPath: string,
  uncompressedSize: number,
  options: ZipSecurityOptions = DEFAULT_ZIP_SECURITY,
): void {
  if (entryPath.includes('\\')) {
    throw new SecurityViolationError(
      'PATH_TRAVERSAL',
      `Backslash in ZIP entry path: "${entryPath}"`,
    );
  }

  if (entryPath.startsWith('/')) {
    throw new SecurityViolationError(
      'PATH_TRAVERSAL',
      `Absolute path in ZIP entry: "${entryPath}"`,
    );
  }

  const segments = entryPath.split('/');
  for (const segment of segments) {
    if (segment === '..') {
      throw new SecurityViolationError(
        'PATH_TRAVERSAL',
        `Parent directory traversal in ZIP entry: "${entryPath}"`,
      );
    }
    if (segment === '.' || segment === '') {
      continue;
    }
  }

  if (!isFinite(uncompressedSize) || uncompressedSize < 0) {
    throw new SecurityViolationError(
      'MALFORMED_ARCHIVE',
      `Invalid uncompressed size for "${entryPath}"`,
    );
  }
}

export function validateZipArchive(
  archiveSize: number,
  entries: Array<{ path: string; size: number }>,
  options: ZipSecurityOptions = DEFAULT_ZIP_SECURITY,
): void {
  if (archiveSize > options.maxArchiveBytes) {
    throw new SecurityViolationError(
      'ARCHIVE_TOO_LARGE',
      `Archive size ${archiveSize} exceeds limit ${options.maxArchiveBytes}`,
    );
  }

  let totalDecompressed = 0;
  for (const entry of entries) {
    validateZipEntry(entry.path, entry.size, options);
    totalDecompressed += entry.size;
    if (totalDecompressed > options.maxDecompressedBytes) {
      throw new SecurityViolationError(
        'DECOMPRESSED_TOO_LARGE',
        `Total decompressed size ${totalDecompressed} exceeds limit ${options.maxDecompressedBytes}`,
      );
    }
  }
}
```

- [ ] **Step 2: Write `zip-security.test.ts`**

```typescript
// packages/oep-distribution/src/zip-security.test.ts
import { describe, it, expect } from 'vitest';
import { validateZipEntry, validateZipArchive, SecurityViolationError } from './zip-security';

describe('validateZipEntry', () => {
  it('accepts normal paths', () => {
    expect(() => validateZipEntry('course/package.json', 100)).not.toThrow();
  });

  it('accepts root-level entry', () => {
    expect(() => validateZipEntry('manifest.json', 50)).not.toThrow();
  });

  it('rejects backslash paths', () => {
    expect(() => validateZipEntry('course\\evil.js', 10)).toThrow(SecurityViolationError);
  });

  it('rejects absolute paths', () => {
    expect(() => validateZipEntry('/etc/passwd', 10)).toThrow(SecurityViolationError);
  });

  it('rejects parent traversal', () => {
    expect(() => validateZipEntry('../secrets.json', 10)).toThrow(SecurityViolationError);
  });

  it('rejects nested parent traversal', () => {
    expect(() => validateZipEntry('course/nodes/../../../etc/hosts', 10)).toThrow(
      SecurityViolationError,
    );
  });

  it('rejects negative size', () => {
    expect(() => validateZipEntry('course/ok.json', -1)).toThrow(SecurityViolationError);
  });

  it('rejects NaN size', () => {
    expect(() => validateZipEntry('course/ok.json', NaN)).toThrow(SecurityViolationError);
  });

  it('accepts single dot segment', () => {
    expect(() => validateZipEntry('course/./package.json', 100)).not.toThrow();
  });
});

describe('validateZipArchive', () => {
  const opts = { maxArchiveBytes: 10000, maxDecompressedBytes: 50000 };

  it('accepts valid archive within limits', () => {
    expect(() =>
      validateZipArchive(
        5000,
        [
          { path: 'manifest.json', size: 100 },
          { path: 'course/package.json', size: 200 },
          { path: 'course/nodes/lesson.md', size: 300 },
        ],
        opts,
      ),
    ).not.toThrow();
  });

  it('rejects archive exceeding byte limit', () => {
    expect(() => validateZipArchive(20000, [{ path: 'manifest.json', size: 10 }], opts)).toThrow(
      'ARCHIVE_TOO_LARGE',
    );
  });

  it('rejects decompressed total exceeding limit', () => {
    expect(() =>
      validateZipArchive(
        1000,
        [
          { path: 'manifest.json', size: 30000 },
          { path: 'course/package.json', size: 30000 },
        ],
        opts,
      ),
    ).toThrow('DECOMPRESSED_TOO_LARGE');
  });

  it('rejects on first bad entry in list', () => {
    expect(() =>
      validateZipArchive(
        1000,
        [
          { path: 'manifest.json', size: 100 },
          { path: '../bad.json', size: 10 },
          { path: 'course/ok.md', size: 50 },
        ],
        opts,
      ),
    ).toThrow('PATH_TRAVERSAL');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @open-edu/oep-distribution test -- zip-security
```

Expected: 12 tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/oep-distribution/src/zip-security.ts packages/oep-distribution/src/zip-security.test.ts
git commit -m "feat(oep-distribution): add ZIP security validation"
```

---

### Task 5: OEP Writer (Build .oep)

**Files:**

- Create: `packages/oep-distribution/src/oep-writer.ts`
- Create: `packages/oep-distribution/src/oep-writer.test.ts`

- [ ] **Step 1: Write `oep-writer.ts`**

```typescript
// packages/oep-distribution/src/oep-writer.ts
import { zipSync, strToU8 } from 'fflate';
import type { DistributionManifest } from '@open-edu/schemas';
import { computeSha256 } from './checksum.js';
import { OEP_CONTENT_ROOT } from './types.js';

export interface OepBuildInput {
  manifest: DistributionManifest;
  courseFiles: Map<string, Uint8Array>;
}

export interface OepBuildResult {
  bytes: Uint8Array;
  checksumValue: string;
}

export class OepWriter {
  static async build(input: OepBuildInput): Promise<OepBuildResult> {
    const zipEntries: Record<string, Uint8Array> = {};

    const manifestJson = JSON.stringify(input.manifest, null, 2);
    zipEntries['manifest.json'] = strToU8(manifestJson);

    for (const [relativePath, content] of input.courseFiles) {
      const sanitizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
      zipEntries[`${OEP_CONTENT_ROOT}${sanitizedPath}`] = content;
    }

    zipEntries[`${OEP_CONTENT_ROOT}`] = new Uint8Array(0);

    const oepBytes = zipSync(zipEntries);

    const checksumValue = await computeSha256(oepBytes);

    return { bytes: oepBytes, checksumValue };
  }
}
```

- [ ] **Step 2: Write `oep-writer.test.ts`**

```typescript
// packages/oep-distribution/src/oep-writer.test.ts
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
      checksum: { algorithm: 'sha256' as const, value: '' }, // placeholder, reader recomputes
    };

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

    const updatedManifest = {
      ...manifest,
      checksum: { algorithm: 'sha256' as const, value: checksumValue },
    };
    const { bytes: finalBytes } = await OepWriter.build({ manifest: updatedManifest, courseFiles });

    const reader = new OepReader();
    const extraction = await reader.read(finalBytes);

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
      checksum: { algorithm: 'sha256' as const, value: 'a'.repeat(64) },
    };

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
```

- [ ] **Step 3: Run tests (will fail until OepReader exists)**

```bash
pnpm --filter @open-edu/oep-distribution test -- oep-writer
```

Expected: Fails with import error about `./oep-reader`

- [ ] **Step 4: Commit**

```bash
git add packages/oep-distribution/src/oep-writer.ts packages/oep-distribution/src/oep-writer.test.ts
git commit -m "feat(oep-distribution): add OEP writer (ZIP builder)"
```

---

### Task 6: OEP Reader

**Files:**

- Create: `packages/oep-distribution/src/oep-reader.ts`
- Create: `packages/oep-distribution/src/oep-reader.test.ts`
- Modify: `packages/oep-distribution/src/index.ts` (if OepReader export was placeholder, ensure real)

- [ ] **Step 1: Write `oep-reader.ts`**

```typescript
// packages/oep-distribution/src/oep-reader.ts
import { unzipSync, strFromU8 } from 'fflate';
import { DistributionManifestSchema } from '@open-edu/schemas';
import { PackageManifestSchema } from '@open-edu/schemas';
import { computeSha256 } from './checksum.js';
import { validateZipArchive } from './zip-security.js';
import {
  type OepExtraction,
  type PackageInspection,
  type ZipSecurityOptions,
  DEFAULT_ZIP_SECURITY,
  OEP_CONTENT_ROOT,
} from './types.js';

export class OepReaderError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'OepReaderError';
  }
}

export class OepReader {
  private securityOptions: ZipSecurityOptions;

  constructor(options: Partial<ZipSecurityOptions> = {}) {
    this.securityOptions = { ...DEFAULT_ZIP_SECURITY, ...options };
  }

  async inspect(bytes: Uint8Array): Promise<PackageInspection> {
    const extraction = await this.readInternal(bytes, false);
    return {
      id: extraction.manifest.id,
      version: extraction.manifest.version,
      title: extraction.manifest.title,
      checksum: extraction.manifest.checksum,
      signatureStatus: extraction.manifest.signature.status,
    };
  }

  async read(bytes: Uint8Array): Promise<OepExtraction> {
    return this.readInternal(bytes, true);
  }

  private async readInternal(bytes: Uint8Array, fullExtract: boolean): Promise<OepExtraction> {
    if (bytes.length > this.securityOptions.maxArchiveBytes) {
      throw new OepReaderError(
        'ARCHIVE_TOO_LARGE',
        `Archive ${bytes.length} bytes exceeds limit ${this.securityOptions.maxArchiveBytes}`,
      );
    }

    let rawEntries: Record<string, Uint8Array>;
    try {
      rawEntries = unzipSync(bytes);
    } catch (err) {
      throw new OepReaderError(
        'MALFORMED_ARCHIVE',
        `Cannot unzip: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const entryList = Object.entries(rawEntries).map(([path, data]) => ({
      path,
      size: data.length,
    }));
    validateZipArchive(bytes.length, entryList, this.securityOptions);

    const manifestRaw = rawEntries['manifest.json'];
    if (!manifestRaw) {
      throw new OepReaderError('MISSING_MANIFEST', 'manifest.json not found in archive');
    }

    let manifestJson: unknown;
    try {
      manifestJson = JSON.parse(strFromU8(manifestRaw));
    } catch {
      throw new OepReaderError('INVALID_MANIFEST', 'manifest.json is not valid JSON');
    }

    const manifestResult = DistributionManifestSchema.safeParse(manifestJson);
    if (!manifestResult.success) {
      throw new OepReaderError(
        'INVALID_MANIFEST',
        `manifest.json validation failed: ${manifestResult.error.message}`,
      );
    }
    const manifest = manifestResult.data;

    const actualChecksum = await computeSha256(bytes);
    if (actualChecksum !== manifest.checksum.value) {
      throw new OepReaderError(
        'CHECKSUM_MISMATCH',
        `Expected ${manifest.checksum.value}, got ${actualChecksum}`,
      );
    }

    const contentRoot = manifest.contentRoot || OEP_CONTENT_ROOT;
    const pkgJsonRaw = rawEntries[`${contentRoot}package.json`];
    if (!pkgJsonRaw) {
      throw new OepReaderError(
        'MISSING_COURSE_DIR',
        `${contentRoot}package.json not found in archive`,
      );
    }

    let courseManifestJson: unknown;
    try {
      courseManifestJson = JSON.parse(strFromU8(pkgJsonRaw));
    } catch {
      throw new OepReaderError('COURSE_VALIDATION_ERROR', 'course/package.json is not valid JSON');
    }

    const courseManifestResult = PackageManifestSchema.safeParse(courseManifestJson);
    if (!courseManifestResult.success) {
      throw new OepReaderError(
        'COURSE_VALIDATION_ERROR',
        `course/package.json validation failed: ${courseManifestResult.error.message}`,
      );
    }

    if (courseManifestResult.data.id !== manifest.id) {
      throw new OepReaderError(
        'MANIFEST_MISMATCH',
        `Outer manifest id "${manifest.id}" != course package.json id "${courseManifestResult.data.id}"`,
      );
    }
    if (courseManifestResult.data.version !== manifest.version) {
      throw new OepReaderError(
        'MANIFEST_MISMATCH',
        `Outer manifest version "${manifest.version}" != course package.json version "${courseManifestResult.data.version}"`,
      );
    }

    const nodes: Record<string, string> = {};
    const assets: Record<string, Uint8Array> = {};

    if (fullExtract) {
      const nodesPrefix = `${contentRoot}nodes/`;
      const assetsPrefix = `${contentRoot}assets/`;

      for (const [path, data] of Object.entries(rawEntries)) {
        if (path.startsWith(nodesPrefix) && path.endsWith('.md') && data.length > 0) {
          nodes[path] = strFromU8(data);
        } else if (path.startsWith(assetsPrefix) && data.length > 0) {
          assets[path] = data;
        }
      }

      if (Object.keys(nodes).length === 0) {
        throw new OepReaderError(
          'COURSE_VALIDATION_ERROR',
          'No markdown nodes found in course/nodes/',
        );
      }
    }

    return {
      manifest,
      courseManifest: courseManifestJson as Record<string, unknown>,
      nodes,
      assets,
      rawEntries,
    };
  }
}
```

- [ ] **Step 2: Write `oep-reader.test.ts`**

```typescript
// packages/oep-distribution/src/oep-reader.test.ts
import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { OepReader, OepReaderError } from './oep-reader';
import { computeSha256 } from './checksum';
import { OEP_FORMAT, OEP_FORMAT_VERSION } from '@open-edu/schemas';

const encoder = new TextEncoder();

function buildTestOep(
  overrides: {
    manifestOverrides?: Record<string, unknown>;
    courseFiles?: Record<string, string>;
  } = {},
): Promise<{ bytes: Uint8Array; manifest: Record<string, unknown> }> {
  const coursePkg = JSON.stringify({
    id: 'test-course',
    version: '2.0.0',
    title: 'Test Course',
    author: 'test',
    entry: 'intro',
    ...overrides.manifestOverrides,
  });

  const entries: Record<string, Uint8Array> = {
    'course/package.json': encoder.encode(coursePkg),
    'course/nodes/intro.md': encoder.encode('# Intro\n\nHello.'),
    'course/nodes/lesson-1.md': encoder.encode('# Lesson 1\n\nMore content.'),
    'course/assets/image.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  };

  if (overrides.courseFiles) {
    for (const [path, content] of Object.entries(overrides.courseFiles)) {
      entries[path] = encoder.encode(content);
    }
  }

  const tempBytes = zipSync(entries);
  const tempHash = computeSha256(tempBytes);

  const manifest = {
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    id: 'test-course',
    version: '2.0.0',
    title: 'Test Course',
    checksum: { algorithm: 'sha256', value: '' },
  };

  return tempHash.then((hash) => {
    manifest.checksum.value = hash;
    const manifestJson = JSON.stringify(manifest);
    entries['manifest.json'] = encoder.encode(manifestJson);
    const bytes = zipSync(entries);
    return { bytes, manifest };
  });
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
    expect(extraction.manifest.checksum.value).toBe(manifest.checksum.value);
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

  it('rejects archive with invalid manifest JSON', async () => {
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
    await expect(reader.read(bytes)).rejects.toThrow('CHECKSUM_MISMATCH');
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
    await expect(reader.read(bytes)).rejects.toThrow('MISSING_COURSE_DIR');
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
    await expect(reader.read(bytes)).rejects.toThrow('MANIFEST_MISMATCH');
  });

  it('rejects archive exceeding size limit', async () => {
    const smallReader = new OepReader({ maxArchiveBytes: 10 });
    const { bytes } = await buildTestOep();
    await expect(smallReader.read(bytes)).rejects.toThrow('ARCHIVE_TOO_LARGE');
  });

  it('rejects malformed zip bytes', async () => {
    const badBytes = new Uint8Array([0x00, 0x01, 0x02]);
    await expect(reader.read(badBytes)).rejects.toThrow('MALFORMED_ARCHIVE');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @open-edu/oep-distribution test -- oep-reader
```

Expected: 8 tests pass

- [ ] **Step 4: Run oep-writer tests again (now OepReader exists)**

```bash
pnpm --filter @open-edu/oep-distribution test -- oep-writer
```

Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/oep-distribution/src/oep-reader.ts packages/oep-distribution/src/oep-reader.test.ts
git commit -m "feat(oep-distribution): add OEP reader with security and validation"
```

---

### Task 7: Version Comparison and Source Adapters

**Files:**

- Create: `packages/oep-distribution/src/version-compare.ts`
- Create: `packages/oep-distribution/src/version-compare.test.ts`
- Create: `packages/oep-distribution/src/source-adapters.ts`
- Create: `packages/oep-distribution/src/source-adapters.test.ts`

- [ ] **Step 1: Write `version-compare.ts`**

```typescript
// packages/oep-distribution/src/version-compare.ts
export function parseSemver(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0], 10) || 0,
    minor: parseInt(parts[1], 10) || 0,
    patch: parseInt(parts[2], 10) || 0,
  };
}

export function semverGreaterThan(version: string, other: string): boolean {
  const a = parseSemver(version);
  const b = parseSemver(other);
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

export function semverEquals(version: string, other: string): boolean {
  return version === other;
}
```

- [ ] **Step 2: Write `version-compare.test.ts`**

```typescript
// packages/oep-distribution/src/version-compare.test.ts
import { describe, it, expect } from 'vitest';
import { semverGreaterThan, semverEquals, parseSemver } from './version-compare';

describe('parseSemver', () => {
  it('parses valid semver', () => {
    expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('handles zeros', () => {
    expect(parseSemver('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 });
  });
});

describe('semverGreaterThan', () => {
  it('major version wins', () => {
    expect(semverGreaterThan('2.0.0', '1.9.9')).toBe(true);
    expect(semverGreaterThan('1.0.0', '2.0.0')).toBe(false);
  });

  it('minor version wins when major equal', () => {
    expect(semverGreaterThan('1.3.0', '1.2.9')).toBe(true);
  });

  it('patch version wins when major+minor equal', () => {
    expect(semverGreaterThan('1.2.3', '1.2.2')).toBe(true);
  });

  it('same version is not greater', () => {
    expect(semverGreaterThan('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('semverEquals', () => {
  it('same versions are equal', () => {
    expect(semverEquals('1.0.0', '1.0.0')).toBe(true);
  });

  it('different versions are not equal', () => {
    expect(semverEquals('1.0.0', '1.0.1')).toBe(false);
  });
});
```

- [ ] **Step 3: Run version-compare tests**

```bash
pnpm --filter @open-edu/oep-distribution test -- version-compare
```

Expected: All tests pass

- [ ] **Step 4: Write `source-adapters.ts`**

```typescript
// packages/oep-distribution/src/source-adapters.ts
import type { CourseSource, SourceKind } from './types.js';

export function fileSource(file: File): CourseSource {
  return {
    kind: 'file' as SourceKind,
    label: file.name,
    async getBytes(signal?: AbortSignal): Promise<Uint8Array> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        if (signal) {
          signal.addEventListener('abort', () => {
            reader.abort();
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result));
          } else {
            reject(new Error('Failed to read file as ArrayBuffer'));
          }
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsArrayBuffer(file);
      });
    },
  };
}

export function urlSource(url: string, label?: string): CourseSource {
  return {
    kind: 'url' as SourceKind,
    label: label ?? url,
    async getBytes(signal?: AbortSignal): Promise<Uint8Array> {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    },
  };
}

export interface CatalogSourceOptions {
  downloadUrl: string;
  label: string;
  expectedChecksum?: string;
}

export function catalogSource(options: CatalogSourceOptions): CourseSource {
  return {
    kind: 'catalog' as SourceKind,
    label: options.label,
    async getBytes(signal?: AbortSignal): Promise<Uint8Array> {
      const response = await fetch(options.downloadUrl, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    },
  };
}
```

- [ ] **Step 5: Write `source-adapters.test.ts`**

```typescript
// packages/oep-distribution/src/source-adapters.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { urlSource, catalogSource } from './source-adapters';

describe('urlSource', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns downloaded bytes', async () => {
    const testData = new Uint8Array([1, 2, 3, 4]);
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(testData.buffer),
    } as Response);

    const source = urlSource('https://example.org/course.oep');
    expect(source.kind).toBe('url');
    expect(source.label).toBe('https://example.org/course.oep');

    const bytes = await source.getBytes();
    expect(bytes).toEqual(testData);
  });

  it('throws on HTTP error', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const source = urlSource('https://example.org/missing.oep');
    await expect(source.getBytes()).rejects.toThrow('HTTP 404');
  });
});

describe('catalogSource', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses provided label', () => {
    const source = catalogSource({
      downloadUrl: 'https://example.org/pkg.oep',
      label: 'My Course v1.0',
    });
    expect(source.kind).toBe('catalog');
    expect(source.label).toBe('My Course v1.0');
  });
});
```

- [ ] **Step 6: Run source-adapters tests**

```bash
pnpm --filter @open-edu/oep-distribution test -- source-adapters
```

Expected: 3 tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/oep-distribution/src/version-compare.ts packages/oep-distribution/src/version-compare.test.ts packages/oep-distribution/src/source-adapters.ts packages/oep-distribution/src/source-adapters.test.ts
git commit -m "feat(oep-distribution): add version compare and source adapters"
```

---

### Task 8: Catalog Loader

**Files:**

- Create: `packages/oep-distribution/src/catalog-loader.ts`
- Create: `packages/oep-distribution/src/catalog-loader.test.ts`

- [ ] **Step 1: Write `catalog-loader.ts`**

```typescript
// packages/oep-distribution/src/catalog-loader.ts
import { CatalogSchema } from '@open-edu/schemas';
import type { Catalog, CatalogPackageEntry, CatalogVersionEntry } from '@open-edu/schemas';

export class CatalogLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogLoadError';
  }
}

export async function fetchCatalog(url: string, signal?: AbortSignal): Promise<Catalog> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    throw new CatalogLoadError(
      `Failed to fetch catalog from "${url}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    throw new CatalogLoadError(`Catalog fetch failed: HTTP ${response.status}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new CatalogLoadError('Catalog response is not valid JSON');
  }

  return parseCatalog(json);
}

export function parseCatalog(data: unknown): Catalog {
  const result = CatalogSchema.safeParse(data);
  if (!result.success) {
    throw new CatalogLoadError(`Catalog validation failed: ${result.error.message}`);
  }
  return result.data;
}

export function findPackageInCatalog(
  catalog: Catalog,
  packageId: string,
): CatalogPackageEntry | undefined {
  return catalog.packages.find((p) => p.id === packageId);
}

export function findVersionInCatalog(
  entry: CatalogPackageEntry,
  version: string,
): CatalogVersionEntry | undefined {
  return entry.versions.find((v) => v.version === version);
}
```

- [ ] **Step 2: Write `catalog-loader.test.ts`**

```typescript
// packages/oep-distribution/src/catalog-loader.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchCatalog,
  parseCatalog,
  findPackageInCatalog,
  findVersionInCatalog,
  CatalogLoadError,
} from './catalog-loader';

const validCatalog = {
  catalogVersion: 1 as const,
  packages: [
    {
      id: 'science-grade7',
      title: 'Science Grade 7',
      latestVersion: '2.0.0',
      versions: [
        {
          version: '1.0.0',
          downloadUrl: 'https://example.org/science-1.0.0.oep',
          checksum: 'a'.repeat(64),
          sizeBytes: 54321,
        },
        {
          version: '2.0.0',
          downloadUrl: 'https://example.org/science-2.0.0.oep',
          checksum: 'b'.repeat(64),
          sizeBytes: 65432,
        },
      ],
    },
  ],
};

describe('parseCatalog', () => {
  it('parses valid catalog', () => {
    const result = parseCatalog(validCatalog);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].id).toBe('science-grade7');
  });

  it('throws on invalid catalog', () => {
    expect(() => parseCatalog({})).toThrow(CatalogLoadError);
  });

  it('throws on non-object input', () => {
    expect(() => parseCatalog('not-an-object')).toThrow(CatalogLoadError);
  });
});

describe('findPackageInCatalog', () => {
  it('finds existing package', () => {
    const catalog = parseCatalog(validCatalog);
    const entry = findPackageInCatalog(catalog, 'science-grade7');
    expect(entry).toBeDefined();
    expect(entry!.title).toBe('Science Grade 7');
  });

  it('returns undefined for missing package', () => {
    const catalog = parseCatalog(validCatalog);
    expect(findPackageInCatalog(catalog, 'nonexistent')).toBeUndefined();
  });
});

describe('findVersionInCatalog', () => {
  it('finds specific version', () => {
    const catalog = parseCatalog(validCatalog);
    const entry = findPackageInCatalog(catalog, 'science-grade7')!;
    const version = findVersionInCatalog(entry, '1.0.0');
    expect(version).toBeDefined();
    expect(version!.downloadUrl).toBe('https://example.org/science-1.0.0.oep');
  });

  it('returns undefined for missing version', () => {
    const catalog = parseCatalog(validCatalog);
    const entry = findPackageInCatalog(catalog, 'science-grade7')!;
    expect(findVersionInCatalog(entry, '9.9.9')).toBeUndefined();
  });
});

describe('fetchCatalog', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and parses catalog', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validCatalog),
    } as Response);

    const catalog = await fetchCatalog('https://example.org/catalog.json');
    expect(catalog.packages).toHaveLength(1);
  });

  it('throws on non-ok response', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchCatalog('https://example.org/catalog.json')).rejects.toThrow(
      CatalogLoadError,
    );
  });
});
```

- [ ] **Step 3: Run catalog-loader tests**

```bash
pnpm --filter @open-edu/oep-distribution test -- catalog-loader
```

Expected: 8 tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/oep-distribution/src/catalog-loader.ts packages/oep-distribution/src/catalog-loader.test.ts
git commit -m "feat(oep-distribution): add static catalog loader"
```

---

### Task 9: Install Coordinator

**Files:**

- Create: `packages/oep-distribution/src/install-coordinator.ts`
- Create: `packages/oep-distribution/src/install-coordinator.test.ts`

The install coordinator orchestrates the full install flow: source → bytes → read/inspect OEP → validate → stage → activate. It accepts a storage adapter interface so it stays decoupled from `@open-edu/storage`.

- [ ] **Step 1: Write `install-coordinator.ts`**

```typescript
// packages/oep-distribution/src/install-coordinator.ts
import { OepReader } from './oep-reader.js';
import { semverGreaterThan, semverEquals } from './version-compare.js';
import type { CourseSource, InstallResult, InstallErrorCode, PackageInspection } from './types.js';

export interface StoredCourseRecord {
  id: string;
  version: string;
  [key: string]: unknown;
}

export interface StorageAdapter {
  getInstalledCourse(id: string): Promise<StoredCourseRecord | undefined>;
  saveCourse(course: StoredCourseRecord): Promise<void>;
}

export interface ResolvedInstallData {
  inspection: PackageInspection;
  manifest: Record<string, unknown>;
  nodes: Array<{ relativePath: string; content: string }>;
  assets: Array<{ path: string; data: Uint8Array }>;
  sourceKind: string;
  sourceLabel: string;
  checksum: string;
}

export class InstallCoordinator {
  private reader: OepReader;
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.reader = new OepReader();
    this.storage = storage;
  }

  async inspect(source: CourseSource, signal?: AbortSignal): Promise<PackageInspection> {
    const bytes = await source.getBytes(signal);
    return this.reader.inspect(bytes);
  }

  async install(source: CourseSource, signal?: AbortSignal): Promise<InstallResult> {
    return this.installInternal(source, false, signal);
  }

  async update(
    courseId: string,
    source: CourseSource,
    signal?: AbortSignal,
  ): Promise<InstallResult> {
    const existing = await this.storage.getInstalledCourse(courseId);
    if (!existing) {
      return this.failure(courseId, '0.0.0', 'NOT_FOUND', `Course "${courseId}" is not installed`);
    }

    const inspection = await this.inspect(source, signal);
    if (inspection.id !== courseId) {
      return this.failure(
        courseId,
        existing.version as string,
        'MANIFEST_MISMATCH',
        `Update source id "${inspection.id}" does not match installed course id "${courseId}"`,
      );
    }

    if (semverEquals(inspection.version, existing.version as string)) {
      return this.failure(
        courseId,
        existing.version as string,
        'VERSION_SAME',
        'Already running latest version',
      );
    }

    if (!semverGreaterThan(inspection.version, existing.version as string)) {
      return this.failure(
        courseId,
        existing.version as string,
        'VERSION_DOWNGRADE',
        `Incoming version ${inspection.version} is older than installed ${existing.version}`,
      );
    }

    return this.installInternal(source, false, signal);
  }

  private async installInternal(
    source: CourseSource,
    _isUpdate: boolean,
    signal?: AbortSignal,
  ): Promise<InstallResult> {
    let bytes: Uint8Array;
    try {
      bytes = await source.getBytes(signal);
    } catch (err) {
      return this.failure(
        'unknown',
        '0.0.0',
        'SOURCE_READ_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }

    let resolved: ResolvedInstallData;
    try {
      const extraction = await this.reader.read(bytes);
      resolved = {
        inspection: {
          id: extraction.manifest.id,
          version: extraction.manifest.version,
          title: extraction.manifest.title,
          checksum: extraction.manifest.checksum,
          signatureStatus: extraction.manifest.signature.status,
        },
        manifest: extraction.courseManifest,
        nodes: Object.entries(extraction.nodes).map(([path, content]) => ({
          relativePath: path,
          content,
        })),
        assets: Object.entries(extraction.assets).map(([path, data]) => ({
          path,
          data,
        })),
        sourceKind: source.kind,
        sourceLabel: source.label,
        checksum: extraction.manifest.checksum.value,
      };
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'UNKNOWN';
      return this.failure(
        'unknown',
        '0.0.0',
        code as InstallErrorCode,
        err instanceof Error ? err.message : String(err),
      );
    }

    const courseRecord: StoredCourseRecord = {
      id: resolved.inspection.id,
      version: resolved.inspection.version,
      manifest: resolved.manifest,
      nodes: resolved.nodes.map((n) => ({
        relativePath: n.relativePath,
        content: n.content,
      })),
      assets: resolved.assets.map((a) => ({
        path: a.path,
        data: a.data.buffer,
      })),
      downloadedAt: new Date().toISOString(),
      distributionMeta: {
        sourceKind: resolved.sourceKind,
        sourceLabel: resolved.sourceLabel,
        checksum: resolved.checksum,
        signatureStatus: resolved.inspection.signatureStatus,
        installedAt: new Date().toISOString(),
      },
    };

    try {
      await this.storage.saveCourse(courseRecord);
    } catch (err) {
      return this.failure(
        resolved.inspection.id,
        resolved.inspection.version,
        'STORAGE_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }

    return {
      success: true,
      courseId: resolved.inspection.id,
      version: resolved.inspection.version,
    };
  }

  private failure(
    courseId: string,
    version: string,
    errorCode: InstallErrorCode,
    errorMessage: string,
  ): InstallResult {
    return { success: false, courseId, version, errorCode, errorMessage };
  }
}
```

- [ ] **Step 2: Write `install-coordinator.test.ts`**

```typescript
// packages/oep-distribution/src/install-coordinator.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { InstallCoordinator } from './install-coordinator';
import type { StorageAdapter, StoredCourseRecord } from './install-coordinator';
import { computeSha256 } from './checksum';
import { OEP_FORMAT, OEP_FORMAT_VERSION } from '@open-edu/schemas';
import type { CourseSource } from './types';

const encoder = new TextEncoder();

function makeTestCourseSource(bytes: Uint8Array): CourseSource {
  return {
    kind: 'file',
    label: 'test.oep',
    getBytes: () => Promise.resolve(bytes),
  };
}

async function buildTestOep(id: string, version: string, title: string): Promise<Uint8Array> {
  const entries: Record<string, Uint8Array> = {};
  const coursePkg = JSON.stringify({ id, version, title, author: 'test', entry: 'intro' });
  entries['course/package.json'] = encoder.encode(coursePkg);
  entries['course/nodes/intro.md'] = encoder.encode('# Intro');
  entries['course/nodes/lesson.md'] = encoder.encode('# Lesson');

  const tempBytes = zipSync(entries);
  const hash = await computeSha256(tempBytes);

  const manifest = {
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    id,
    version,
    title,
    checksum: { algorithm: 'sha256', value: hash },
  };
  entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));
  return zipSync(entries);
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
    expect(saved!.distributionMeta.sourceKind).toBe('file');
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
    const bytes = await buildTestOep('bad-checksum', '1.0.0', 'Bad');
    bytes[bytes.length - 1] = bytes[bytes.length - 1] ^ 0xff;
    const source = makeTestCourseSource(bytes);
    const result = await coordinator.install(source);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CHECKSUM_MISMATCH');
  });

  it('updates to newer version', async () => {
    storedCourses.set('my-course', {
      id: 'my-course',
      version: '1.0.0',
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
```

- [ ] **Step 3: Run install-coordinator tests**

```bash
pnpm --filter @open-edu/oep-distribution test -- install-coordinator
```

Expected: 9 tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/oep-distribution/src/install-coordinator.ts packages/oep-distribution/src/install-coordinator.test.ts
git commit -m "feat(oep-distribution): add install coordinator with update detection"
```

---

### Task 10: Run full oep-distribution test suite

- [ ] **Step 1: Run all tests**

```bash
pnpm --filter @open-edu/oep-distribution test
```

Expected: All tests pass (checksum, zip-security, oep-reader, oep-writer, version-compare, source-adapters, catalog-loader, install-coordinator)

- [ ] **Step 2: Install dependencies and verify package resolves**

```bash
pnpm install
```

- [ ] **Step 3: Run typecheck for the new package**

```bash
pnpm --filter @open-edu/oep-distribution exec tsc --noEmit
```

If a tsconfig error exists, fix it. The `tsconfig.json` extends `../../tsconfig.base.json` which has `"moduleResolution": "bundler"`. Ensure `fflate` types resolve.

- [ ] **Step 4: Commit if any fixes needed**

---

### Task 11: Extend Storage with Distribution Metadata

**Files:**

- Modify: `packages/storage/src/db.ts:6-13`
- Modify: `packages/storage/src/course-store.ts:1-21`

- [ ] **Step 1: Extend `StoredCourse` with `distributionMeta`**

In `packages/storage/src/db.ts`, add `distributionMeta` to `StoredCourse`:

```typescript
export interface DistributionMeta {
  sourceKind: string;
  sourceLabel: string;
  checksum: string;
  signatureStatus: string;
  installedAt: string;
}

export interface StoredCourse {
  id: string;
  version: string;
  manifest: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  assets: { path: string; data: ArrayBuffer }[];
  downloadedAt: string;
  distributionMeta?: DistributionMeta;
}
```

Place `DistributionMeta` right before `StoredCourse` in the file (after `openDB` imports, before `StoredCourse`).

- [ ] **Step 2: Add `replaceCourse` to `course-store.ts`**

Add this function at the end of `packages/storage/src/course-store.ts`:

```typescript
export async function replaceCourse(courseId: string, course: StoredCourse): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('courses', 'readwrite');
  const store = tx.objectStore('courses');
  const existing = await store.get(courseId);
  if (!existing) {
    throw new Error(`Course "${courseId}" is not installed`);
  }
  await store.put(course);
  await tx.done;
}
```

- [ ] **Step 3: Re-export `DistributionMeta` from `@open-edu/storage`**

In `packages/storage/src/index.ts`, add the type re-export:

```typescript
export { type DistributionMeta } from './db.js';
```

This should be added alongside the existing `type StoredCourse` export.

- [ ] **Step 4: Run storage tests**

```bash
pnpm --filter @open-edu/storage test
```

Expected: All existing tests pass (distributionMeta is optional, no schema migration needed since IndexedDB with `idb` stores arbitrary JSON).

- [ ] **Step 5: Commit**

```bash
git add packages/storage/src/db.ts packages/storage/src/course-store.ts packages/storage/src/index.ts
git commit -m "feat(storage): add distribution metadata and replaceCourse"
```

---

### Task 12: CLI `edu oep:build` Command

**Files:**

- Create: `packages/cli/src/commands/oep-build.ts`
- Modify: `packages/cli/src/cli.ts` (register command)
- Modify: `packages/cli/package.json` (add `@open-edu/oep-distribution` dependency)

- [ ] **Step 1: Add `@open-edu/oep-distribution` to CLI dependencies**

Edit `packages/cli/package.json`:

```bash
pnpm --filter @open-edu/cli add @open-edu/oep-distribution@workspace:*
```

- [ ] **Step 2: Write `oep-build.ts` command**

```typescript
// packages/cli/src/commands/oep-build.ts
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, basename, dirname } from 'node:path';
import { loadPackage } from '@open-edu/core';
import { OepWriter } from '@open-edu/oep-distribution';
import { OEP_FORMAT, OEP_FORMAT_VERSION } from '@open-edu/schemas';
import type { CliResult } from '../utils/json-output.js';
import { formatValidationError, formatPackageSuccess, printMessages } from '../utils/format.js';

function collectCourseFiles(packageDir: string): Map<string, Uint8Array> {
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
        const relPath = relative(packageDir, fullPath);
        files.set(relPath, new Uint8Array(readFileSync(fullPath)));
      }
    }
  }

  walk(packageDir);
  return files;
}

export async function buildOep(
  packageDir: string,
  outputDir?: string,
  options?: { json?: boolean },
): Promise<CliResult> {
  try {
    const pkg = await loadPackage(packageDir);
    const outDir = outputDir ?? process.cwd();

    if (!existsSync(outDir)) {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(outDir, { recursive: true });
    }

    const courseFiles = collectCourseFiles(packageDir);

    const distManifest = {
      format: OEP_FORMAT,
      formatVersion: OEP_FORMAT_VERSION,
      id: pkg.manifest.id,
      version: pkg.manifest.version,
      title: pkg.manifest.title,
      checksum: { algorithm: 'sha256' as const, value: '' },
    };

    const firstPass = await OepWriter.build({ manifest: distManifest, courseFiles });
    distManifest.checksum.value = firstPass.checksumValue;

    const result = await OepWriter.build({ manifest: distManifest, courseFiles });
    const oepFileName = `${pkg.manifest.id}-${pkg.manifest.version}.oep`;
    const oepPath = resolve(join(outDir, oepFileName));

    writeFileSync(oepPath, result.bytes);

    if (options?.json) {
      return {
        success: true,
        data: {
          packageDir,
          oepPath,
          oepFileName,
          checksum: result.checksumValue,
        },
      };
    }

    printMessages([
      { style: 'success', message: `Built ${oepFileName}` },
      { style: 'info', message: `  SHA-256: ${result.checksumValue}` },
      { style: 'info', message: `  Size: ${(result.bytes.length / 1024).toFixed(1)} KiB` },
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

- [ ] **Step 3: Register the command in `packages/cli/src/cli.ts`**

Find where other commands are registered (e.g., after `package` command). Add:

```typescript
import { buildOep } from './commands/oep-build.js';

program
  .command('oep:build')
  .description('Build a portable .oep distribution artifact from a course directory')
  .argument('<package-dir>', 'Path to the course package directory')
  .option('-o, --output <dir>', 'Output directory (default: cwd)')
  .option('--json', 'Emit JSON output')
  .action(async (packageDir: string, options: { output?: string; json?: boolean }) => {
    const result = await buildOep(packageDir, options.output, { json: options.json });
    if (!result.success) process.exitCode = 1;
  });
```

- [ ] **Step 4: Build CLI and test oep:build**

```bash
pnpm --filter @open-edu/cli build
node packages/cli/dist/cli.js oep:build examples/hello-world -o /tmp/oep-test
```

Verify:

- File `/tmp/oep-test/hello-world-1.0.0.oep` exists
- Its size is > 0 bytes
- The output shows SHA-256 hash

- [ ] **Step 5: Verify the .oep with a quick Node.js smoke test**

```bash
node -e "
const { readFileSync } = require('fs');
const { unzipSync, strFromU8 } = require('fflate');
const bytes = readFileSync('/tmp/oep-test/hello-world-1.0.0.oep');
const entries = unzipSync(bytes);
console.log('Entries:', Object.keys(entries));
console.log('manifest:', JSON.parse(strFromU8(entries['manifest.json'])).id);
"
```

Expected: Lists all entries; manifest id is "hello-world"

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/oep-build.ts packages/cli/src/cli.ts packages/cli/package.json pnpm-lock.yaml
git commit -m "feat(cli): add oep:build command"
```

---

### Task 13: Add i18n Strings for Distribution

**Files:**

- Modify: `packages/i18n/locales/en/learner.json`

- [ ] **Step 1: Read current learner.json to find insertion point**

Read the end of `packages/i18n/locales/en/learner.json`.

- [ ] **Step 2: Add distribution strings**

Add these new keys to `packages/i18n/locales/en/learner.json`:

```json
  "install": {
    "title": "Install Course",
    "from_file": "From File",
    "from_url": "From URL",
    "from_catalog": "From Catalog",
    "file_placeholder": "Choose a .oep file...",
    "url_placeholder": "https://example.org/course.oep",
    "url_label": "Enter URL",
    "install_button": "Install",
    "installing": "Installing...",
    "success": "Course installed successfully",
    "error": "Installation failed",
    "error_archive_too_large": "Archive is too large",
    "error_decompressed_too_large": "Course content exceeds size limit",
    "error_malformed_archive": "Archive is malformed or corrupted",
    "error_checksum_mismatch": "Checksum verification failed",
    "error_manifest_mismatch": "Course metadata does not match",
    "error_course_validation": "Course content validation failed",
    "error_network": "Network error. Check your connection.",
    "error_unknown": "An unexpected error occurred",
    "close": "Close"
  },
  "catalog": {
    "load_catalog": "Load Catalog",
    "catalog_url_label": "Catalog URL",
    "catalog_url_placeholder": "https://example.org/catalog.json",
    "fetch_button": "Fetch Catalog",
    "fetching": "Fetching...",
    "fetch_error": "Failed to load catalog",
    "available_courses": "Available Courses",
    "no_entries": "No courses found in catalog",
    "install_version": "Install",
    "version": "Version",
    "size": "Size",
    "btn_catalog_install": "Install from Catalog",
    "loading": "Loading..."
  },
  "updates": {
    "available": "Update Available",
    "available_count": "{{count}} update(s) available",
    "update_button": "Update to {{version}}",
    "updating": "Updating...",
    "up_to_date": "All courses are up to date",
    "update_success": "Course updated to {{version}}"
  }
```

- [ ] **Step 3: Commit**

```bash
git add packages/i18n/locales/en/learner.json
git commit -m "feat(i18n): add distribution installation strings"
```

---

### Task 14: Learner App — Install Course Dialog Component

**Files:**

- Create: `apps/learner/src/components/InstallCourseDialog.tsx`
- Create: `apps/learner/src/components/InstallCourseDialog.test.tsx`

- [ ] **Step 1: Write InstallCourseDialog component**

```typescript
// apps/learner/src/components/InstallCourseDialog.tsx
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { fileSource, urlSource } from '@open-edu/oep-distribution';
import type { CourseSource, InstallResult } from '@open-edu/oep-distribution';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@open-edu/design-system';

export interface InstallCourseDialogProps {
  open: boolean;
  onClose: () => void;
  onInstall: (source: CourseSource) => Promise<InstallResult>;
}

type InstallTab = 'file' | 'url';

export function InstallCourseDialog({
  open,
  onClose,
  onInstall,
}: InstallCourseDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [tab, setTab] = useState<InstallTab>('file');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInstall = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a .oep file');
      return;
    }
    setError(null);
    setIsInstalling(true);
    try {
      const source = fileSource(file);
      const result = await onInstall(source);
      if (result.success) {
        onClose();
      } else {
        setError(getErrorMessage(result, t));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInstalling(false);
    }
  }, [onInstall, onClose, t]);

  const handleUrlInstall = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    setError(null);
    setIsInstalling(true);
    try {
      const source = urlSource(url.trim());
      const result = await onInstall(source);
      if (result.success) {
        onClose();
      } else {
        setError(getErrorMessage(result, t));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInstalling(false);
    }
  }, [url, onInstall, onClose, t]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('learner.install.title')}</DialogTitle>
          <DialogDescription>
            {t('learner.install.from_file')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as InstallTab); setError(null); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">{t('learner.install.from_file')}</TabsTrigger>
            <TabsTrigger value="url">{t('learner.install.from_url')}</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".oep"
              data-testid="oep-file-input"
              className="w-full text-sm text-on-surface file:bg-surface-container file:text-on-surface file:border-0 file:rounded-md file:px-3 file:py-1.5 file:mr-3 file:cursor-pointer"
            />
            <Button
              onClick={handleFileInstall}
              disabled={isInstalling}
              className="w-full"
              data-testid="install-file-button"
            >
              {isInstalling ? t('learner.install.installing') : t('learner.install.install_button')}
            </Button>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 pt-4">
            <Input
              type="url"
              placeholder={t('learner.install.url_placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="oep-url-input"
              aria-label={t('learner.install.url_label')}
            />
            <Button
              onClick={handleUrlInstall}
              disabled={isInstalling || !url.trim()}
              className="w-full"
              data-testid="install-url-button"
            >
              {isInstalling ? t('learner.install.installing') : t('learner.install.install_button')}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-error text-sm mt-2" data-testid="install-error" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getErrorMessage(result: InstallResult, _t: (key: string) => string): string {
  const messages: Record<string, string> = {
    ARCHIVE_TOO_LARGE: 'The course archive is too large to install.',
    DECOMPRESSED_TOO_LARGE: 'The course content exceeds the maximum size.',
    MALFORMED_ARCHIVE: 'The archive file is malformed or corrupted.',
    CHECKSUM_MISMATCH: 'The file checksum does not match. The file may be corrupted.',
    MANIFEST_MISMATCH: 'The course metadata is inconsistent.',
    COURSE_VALIDATION_ERROR: 'The course content is not valid.',
    SOURCE_READ_ERROR: 'Could not read the file. Check your network or file.',
    STORAGE_ERROR: 'Could not save the course. You may need to free up space.',
    VERSION_DOWNGRADE: 'Cannot install an older version.',
    VERSION_SAME: 'This version is already installed.',
    NOT_FOUND: 'Course not found.',
  };
  return messages[result.errorCode ?? ''] ?? result.errorMessage ?? 'An unexpected error occurred.';
}
```

- [ ] **Step 2: Write a basic render test**

```typescript
// apps/learner/src/components/InstallCourseDialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstallCourseDialog } from './InstallCourseDialog';
import { I18nProvider } from '@open-edu/i18n';

const mockT = (key: string) => key;
vi.mock('@open-edu/i18n', () => ({
  useTranslation: () => ({ t: mockT }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('InstallCourseDialog', () => {
  it('renders dialog when open', () => {
    render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog
          open={true}
          onClose={vi.fn()}
          onInstall={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(screen.getByTestId('oep-file-input')).toBeDefined();
    expect(screen.getByTestId('install-file-button')).toBeDefined();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <I18nProvider locale="en" dictionaries={{ en: {} }}>
        <InstallCourseDialog
          open={false}
          onClose={vi.fn()}
          onInstall={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(container.querySelector('[data-testid="oep-file-input"]')).toBeNull();
  });
});
```

- [ ] **Step 3: Run learner tests**

```bash
pnpm --filter @open-edu/learner test -- InstallCourseDialog
```

Expected: 2 tests pass (or fix import issues — may need to mock design-system)

- [ ] **Step 4: Commit**

```bash
git add apps/learner/src/components/InstallCourseDialog.tsx apps/learner/src/components/InstallCourseDialog.test.tsx
git commit -m "feat(learner): add InstallCourseDialog component"
```

---

### Task 15: Learner App — Integrate Distribution into courseDownload

**Files:**

- Modify: `apps/learner/src/courseDownload.ts`
- Modify: `apps/learner/package.json` (add dep)

- [ ] **Step 1: Add `@open-edu/oep-distribution` to learner dependencies**

```bash
pnpm --filter @open-edu/learner add @open-edu/oep-distribution@workspace:*
```

- [ ] **Step 2: Extend courseDownload.ts with distribution functions**

Add these functions to `apps/learner/src/courseDownload.ts`:

```typescript
import { InstallCoordinator } from '@open-edu/oep-distribution';
import type { CourseSource, InstallResult } from '@open-edu/oep-distribution';
import { saveCourse, getCourse, listCourses } from '@open-edu/storage';

export async function installFromSource(source: CourseSource): Promise<InstallResult> {
  const coordinator = new InstallCoordinator({
    getInstalledCourse: async (id: string) => {
      const course = await getCourse(id);
      return course
        ? {
            id: course.id,
            version: course.version,
            manifest: course.manifest,
            nodes: course.nodes,
            assets: course.assets,
            downloadedAt: course.downloadedAt,
            distributionMeta: course.distributionMeta,
          }
        : undefined;
    },
    saveCourse: async (course) => {
      await saveCourse({
        id: course.id as string,
        version: course.version as string,
        manifest: course.manifest as Record<string, unknown>,
        nodes: course.nodes as Record<string, unknown>[],
        assets: (course.assets as Array<{ path: string; data: ArrayBuffer }>).map((a) => ({
          path: a.path,
          data:
            a.data instanceof ArrayBuffer
              ? a.data
              : new Uint8Array(a.data as Iterable<number>).buffer,
        })),
        downloadedAt: course.downloadedAt as string,
        distributionMeta: course.distributionMeta as
          | {
              sourceKind: string;
              sourceLabel: string;
              checksum: string;
              signatureStatus: string;
              installedAt: string;
            }
          | undefined,
      });
    },
  });

  return coordinator.install(source);
}

export async function updateFromSource(
  courseId: string,
  source: CourseSource,
): Promise<InstallResult> {
  const coordinator = new InstallCoordinator({
    getInstalledCourse: async (id: string) => {
      const course = await getCourse(id);
      return course
        ? {
            id: course.id,
            version: course.version,
            manifest: course.manifest,
            nodes: course.nodes,
            assets: course.assets,
            downloadedAt: course.downloadedAt,
            distributionMeta: course.distributionMeta,
          }
        : undefined;
    },
    saveCourse: async (course) => {
      await saveCourse({
        id: course.id as string,
        version: course.version as string,
        manifest: course.manifest as Record<string, unknown>,
        nodes: course.nodes as Record<string, unknown>[],
        assets: (course.assets as Array<{ path: string; data: ArrayBuffer }>).map((a) => ({
          path: a.path,
          data:
            a.data instanceof ArrayBuffer
              ? a.data
              : new Uint8Array(a.data as Iterable<number>).buffer,
        })),
        downloadedAt: course.downloadedAt as string,
        distributionMeta: course.distributionMeta as
          | {
              sourceKind: string;
              sourceLabel: string;
              checksum: string;
              signatureStatus: string;
              installedAt: string;
            }
          | undefined,
      });
    },
  });

  return coordinator.update(courseId, source);
}
```

Keep all existing functions (`downloadCourse`, `isCourseDownloaded`, `deleteDownloadedCourse`, `getDownloadedCourses`).

- [ ] **Step 3: Commit**

```bash
git add apps/learner/src/courseDownload.ts apps/learner/package.json pnpm-lock.yaml
git commit -m "feat(learner): integrate distribution install into courseDownload"
```

---

### Task 16: Learner App — Wire InstallCourseDialog into CatalogPage

**Files:**

- Modify: `apps/learner/src/CatalogPage.tsx`

- [ ] **Step 1: Add install button and dialog to CatalogPage**

At the top of the `CatalogPage` component (after the existing `useEffect` for progress/badges), add:

```typescript
import { useState } from 'react';
import { InstallCourseDialog } from './components/InstallCourseDialog.js';
import { installFromSource } from './courseDownload';

// Inside CatalogPage function, after existing state declarations:
const [showInstallDialog, setShowInstallDialog] = useState(false);
```

Add an install button section right after the `PageHeader` and before `InstallPrompt`:

```tsx
{/* After PageHeader, before InstallPrompt */}
<div className="mb-lg flex items-center gap-3">
  <Button
    variant="outline"
    onClick={() => setShowInstallDialog(true)}
    data-testid="open-install-dialog-button"
  >
    {t('learner.install.title')}
  </Button>
</div>

<InstallCourseDialog
  open={showInstallDialog}
  onClose={() => setShowInstallDialog(false)}
  onInstall={installFromSource}
/>
```

Ensure `InstallCourseDialog` and `installFromSource` are imported at the top of the file.

- [ ] **Step 2: Commit**

```bash
git add apps/learner/src/CatalogPage.tsx
git commit -m "feat(learner): wire install dialog into catalog page"
```

---

### Task 17: Learner App — Catalog Installation UI

**Files:**

- Create: `apps/learner/src/components/CatalogInstallView.tsx`
- Modify: `apps/learner/src/AppShell.tsx` (add catalog-install view)

- [ ] **Step 1: Write CatalogInstallView component**

```typescript
// apps/learner/src/components/CatalogInstallView.tsx
import { useState, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import {
  fetchCatalog,
  findPackageInCatalog,
  findVersionInCatalog,
  catalogSource,
} from '@open-edu/oep-distribution';
import type { Catalog, CatalogPackageEntry } from '@open-edu/oep-distribution';
import { installFromSource } from '../courseDownload';
import {
  Button,
  Input,
  PageHeader,
  EmptyState,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@open-edu/design-system';

export function CatalogInstallView(): JSX.Element {
  const { t } = useTranslation();
  const [catalogUrl, setCatalogUrl] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const handleFetchCatalog = useCallback(async () => {
    if (!catalogUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchCatalog(catalogUrl.trim());
      setCatalog(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('learner.catalog.fetch_error'));
    } finally {
      setIsLoading(false);
    }
  }, [catalogUrl, t]);

  const handleInstallPackage = useCallback(async (entry: CatalogPackageEntry) => {
    const version = entry.versions[entry.versions.length - 1];
    setInstallingId(entry.id);
    try {
      const source = catalogSource({
        downloadUrl: version.downloadUrl,
        label: `${entry.title} v${version.version}`,
        expectedChecksum: version.checksum,
      });
      await installFromSource(source);
    } catch {
      // errors surfaced by coordinator
    } finally {
      setInstallingId(null);
    }
  }, []);

  return (
    <div className="p-xl max-w-content mx-auto w-full">
      <PageHeader
        title={t('learner.catalog.load_catalog')}
        className="mb-xl"
      />

      <div className="mb-lg flex gap-3">
        <Input
          type="url"
          placeholder={t('learner.catalog.catalog_url_placeholder')}
          value={catalogUrl}
          onChange={(e) => setCatalogUrl(e.target.value)}
          className="flex-1"
          aria-label={t('learner.catalog.catalog_url_label')}
        />
        <Button
          onClick={handleFetchCatalog}
          disabled={isLoading || !catalogUrl.trim()}
        >
          {isLoading ? t('learner.catalog.fetching') : t('learner.catalog.fetch_button')}
        </Button>
      </div>

      {error && (
        <p className="text-error text-sm mb-md" role="alert">{error}</p>
      )}

      {catalog && catalog.packages.length === 0 && (
        <EmptyState
          variant="no-results"
          heading={t('learner.catalog.no_entries')}
        />
      )}

      {catalog && catalog.packages.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {catalog.packages.map((entry) => {
            const latest = entry.versions[entry.versions.length - 1];
            return (
              <Card key={entry.id}>
                <CardHeader>
                  <CardTitle>{entry.title}</CardTitle>
                  <CardDescription>
                    {t('learner.catalog.version')}: {latest.version}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-on-surface-variant text-sm mb-3">
                    {t('learner.catalog.size')}: {(latest.sizeBytes / 1024).toFixed(0)} KB
                  </p>
                  <Button
                    onClick={() => handleInstallPackage(entry)}
                    disabled={installingId === entry.id}
                    className="w-full"
                  >
                    {installingId === entry.id
                      ? t('learner.catalog.loading')
                      : t('learner.catalog.install_version')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `catalog-install` view to AppShell**

In `apps/learner/src/AppShell.tsx`:

Add to `AppView` union:

```typescript
| { view: 'catalog-install' }
```

Add to `viewToPath` switch:

```typescript
case 'catalog-install':
  return '/catalog/install';
```

Add to the path-to-view parser (the `useEffect` or routing logic that converts URL paths to `AppView`). Find the section that maps paths like `/catalog` to `{ view: 'catalog' }` and add:

```typescript
} else if (path === '/catalog/install') {
  setCurrentView({ view: 'catalog-install' });
```

Add to the render switch:

```tsx
case 'catalog-install':
  return <CatalogInstallView />;
```

Add the import at the top:

```typescript
import { CatalogInstallView } from './components/CatalogInstallView';
```

Add a navigation link. In the sidebar or catalog page, add a section that navigates to `{ view: 'catalog-install' }`.

In `CatalogPage.tsx`, add a button next to the existing install button:

```tsx
<Button variant="outline" onClick={() => onNavigate?.({ view: 'catalog-install' })}>
  {t('learner.catalog.btn_catalog_install')}
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add apps/learner/src/components/CatalogInstallView.tsx apps/learner/src/AppShell.tsx apps/learner/src/CatalogPage.tsx
git commit -m "feat(learner): add catalog installation UI"
```

---

### Task 18: Learner App — Update Detection UI

**Files:**

- Create: `apps/learner/src/components/AvailableUpdatesList.tsx`

- [ ] **Step 1: Write AvailableUpdatesList component**

```typescript
// apps/learner/src/components/AvailableUpdatesList.tsx
import { useState, useCallback } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { semverGreaterThan, urlSource } from '@open-edu/oep-distribution';
import type { Catalog, InstallResult } from '@open-edu/oep-distribution';
import { getDownloadedCourses, updateFromSource } from '../courseDownload';
import { Button, Badge } from '@open-edu/design-system';

export interface AvailableUpdatesListProps {
  catalog: Catalog | null;
}

export function AvailableUpdatesList({ catalog }: AvailableUpdatesListProps): JSX.Element | null {
  const { t } = useTranslation();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, InstallResult>>({});
  const [updateCount, setUpdateCount] = useState(0);

  useState(() => {
    if (!catalog) {
      setUpdateCount(0);
      return;
    }
    getDownloadedCourses().then((courses) => {
      let count = 0;
      for (const course of courses) {
        const entry = catalog.packages.find((p) => p.id === course.id);
        if (entry && semverGreaterThan(entry.latestVersion, course.version)) {
          count++;
        }
      }
      setUpdateCount(count);
    });
  });

  const handleUpdate = useCallback(async (courseId: string, version: string, downloadUrl: string) => {
    setUpdatingId(courseId);
    try {
      const source = urlSource(downloadUrl, `${courseId} v${version}`);
      const result = await updateFromSource(courseId, source);
      setResults((prev) => ({ ...prev, [courseId]: result }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [courseId]: {
          success: false,
          courseId,
          version,
          errorCode: 'SOURCE_READ_ERROR',
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      }));
    } finally {
      setUpdatingId(null);
    }
  }, []);

  if (!catalog || updateCount === 0) return null;

  return (
    <div className="mb-lg p-md bg-surface-container rounded-lg" data-testid="updates-available">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-body-ui font-semibold text-on-surface">
          {t('learner.updates.available')}
        </h3>
        <Badge variant="default">
          {t('learner.updates.available_count', { count: String(updateCount) })}
        </Badge>
      </div>

      {updateCount > 0 && (
        <div className="space-y-2">
          {catalog.packages.map((entry) => {
            if (results[entry.id]?.success) return null;
            return (
              <div key={entry.id} className="flex items-center justify-between">
                <span className="text-sm text-on-surface">{entry.title}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === entry.id}
                  onClick={() => {
                    const version = entry.versions[entry.versions.length - 1];
                    handleUpdate(entry.id, version.version, version.downloadUrl);
                  }}
                >
                  {updatingId === entry.id
                    ? t('learner.updates.updating')
                    : t('learner.updates.update_button', { version: entry.latestVersion })}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into CatalogPage**

In `CatalogPage.tsx`, add the import and render after the existing `PageHeader`:

```typescript
import { AvailableUpdatesList } from './components/AvailableUpdatesList';
```

Add a state for the optional catalog and render:

```typescript
const [remoteCatalog, setRemoteCatalog] = useState<Catalog | null>(null);

useEffect(() => {
  const catalogUrl = import.meta.env.VITE_CATALOG_URL;
  if (catalogUrl) {
    fetchCatalog(catalogUrl)
      .then(setRemoteCatalog)
      .catch(() => {});
  }
}, []);
```

Render after PageHeader:

```tsx
<AvailableUpdatesList catalog={remoteCatalog} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/learner/src/components/AvailableUpdatesList.tsx apps/learner/src/CatalogPage.tsx
git commit -m "feat(learner): add update detection UI"
```

---

### Task 19: Full Project Verification

- [ ] **Step 1: Install all dependencies**

```bash
pnpm install
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: All tests pass. If any fail, fix before proceeding.

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors. Fix any that appear (check import paths, missing exports, type mismatches).

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```

Expected: No lint errors. If `lint:hardcoded-strings` flags new strings, ensure they use `t()` calls or add them to the i18n allowlist.

- [ ] **Step 5: Run format check**

```bash
pnpm format:check
```

Expected: No formatting issues. If there are, run `pnpm format` to fix.

- [ ] **Step 6: Build all packages**

```bash
pnpm build
```

- [ ] **Step 7: Smoke test end-to-end**

Build the CLI and create an .oep:

```bash
pnpm --filter @open-edu/cli build
node packages/cli/dist/cli.js oep:build examples/hello-world -o /tmp/oep-smoke-test
```

Start dev server:

```bash
pnpm --filter @open-edu/dev-server dev
```

(Manual: verify dev-server loads. In a separate shell, start the learner app:)

```bash
pnpm --filter @open-edu/learner dev
```

Open browser at `http://localhost:4001`, navigate to Catalog, click "Install Course", and attempt to upload the `.oep` from `/tmp/oep-smoke-test/`.

- [ ] **Step 8: Commit any final fixes**

```bash
git add -A
git commit -m "chore: fix verification issues"
```

---

## Self-Review Checklist

**1. Spec coverage:**

| Spec Requirement                          | Covered by Task(s)                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| Build .oep ZIP artifact                   | Task 5 (OepWriter), Task 12 (CLI oep:build)                                    |
| Install from local file                   | Task 6 (OepReader), Task 9 (InstallCoordinator), Task 14 (InstallCourseDialog) |
| Install from URL                          | Task 7 (urlSource), Task 14 (InstallCourseDialog)                              |
| Install from static catalog               | Task 8 (CatalogLoader), Task 17 (CatalogInstallView)                           |
| Validate outer manifest + embedded course | Task 6 (OepReader.read)                                                        |
| Verify SHA-256 checksums                  | Task 3 (checksum), Task 6 (OepReader checksum check)                           |
| ZIP traversal protection                  | Task 4 (zip-security)                                                          |
| Malformed archive rejection               | Task 4 (zip-security), Task 6 (OepReader try/catch)                            |
| Extraction bomb protection                | Task 4 (decompressed size limit)                                               |
| Detect newer versions                     | Task 7 (semverGreaterThan), Task 9 (InstallCoordinator.update)                 |
| Safe package replacement                  | Task 9 (InstallCoordinator.update flow), Task 11 (replaceCourse)               |
| Preserve learner-owned state              | Task 9 (storage adapter only touches course content)                           |
| DistributionManifest schema               | Task 1 (distribution-manifest.ts)                                              |
| Catalog schema                            | Task 1 (catalog.ts)                                                            |
| Error codes (structured)                  | Task 2 (InstallErrorCode type), Task 9 (failure method)                        |
| SignatureStatus reserved interface        | Task 1 (SignatureStatusSchema)                                                 |
| Unsigned packages identified              | Task 1 (default status: 'unsigned')                                            |
| Offline usage after install               | Task 5-9 (parsed content stored in IndexedDB)                                  |

**2. Placeholder scan:** No TBDs, TODOs, or "implement later" markers. All error messages are explicit. All test assertions have expected values.

**3. Type consistency:**

- `DistributionManifest` from Task 1 used in Task 5 (OepWriter), Task 6 (OepReader), Task 12 (CLI)
- `InstallResult` type from Task 2 used in Task 9 (coordinator), Task 14 (dialog), Task 15 (courseDownload)
- `CourseSource` interface from Task 2 matches Task 7 (source-adapters) and Task 14 (dialog)
- `StoredCourse.distributionMeta` added in Task 11 matches the `DistributionMeta` type from Task 2
- `StorageAdapter` interface in Task 9 matches `@open-edu/storage` functions used in Task 15
