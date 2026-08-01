# OpenEdu Library Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `openedu-library` repository — a GitHub-native, backend-free course registry (catalog + metadata + GitHub Releases) — at `/Users/sarthakpatnaik/Code/openedu-library`, that produces a `catalog.json` directly consumable by the existing OpenEdu learner app.

**Architecture (revised — single shared library):** All validation/OEP-handling logic lives **once**, in the open-edu monorepo, published to npm as `@open-edu/schemas`, `@open-edu/oep-distribution`, and a new `@open-edu/registry` package. `openedu-library` is a **data + CI repo only**: it stores `metadata.json` files under `courses/<id>/`, docs, and GitHub Actions workflows. CI calls `open-edu-registry` (the published CLI) to validate metadata, validate release assets, regenerate `catalog.json`, and deploy it (plus static assets) to GitHub Pages. No `.oep` logic is recreated in the registry repo.

**Tech Stack:** The library is TypeScript (tsc build, Vitest) inside the monorepo. The registry repo is Node.js 20+ (ESM), consuming `@open-edu/registry` from npm; its only devDependency is that package. GitHub Actions, GitHub Pages, mermaid diagrams in docs.

---

## Part A — Spec Review vs. Current Packaging Framework

The spec (`docs/COURSE_CATALOG_SPEC.md`) is the implementation prompt for the registry. Before building, reconcile it with what the Open-Edu monorepo (`/Users/sarthakpatnaik/Code/open-edu`) already ships.

### A.1 What the framework already provides (consume, don't rebuild)

| Capability                | Where it lives                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.oep` package builder    | `edu oep:build` / `edu oep:build-bundle` in `packages/cli/src/commands/oep-build.ts`; output file is `<id>-<version>.oep`                                                          |
| `.oep` reader + integrity | `OepReader` in `packages/oep-distribution/src/oep-reader.ts` — ZIP security, `DistributionManifestSchema` validation, SHA-256 content checksum, inner/outer id+version cross-check |
| SHA-256 helper            | `computeSha256` in `packages/oep-distribution/src/checksum.ts` (works in browser + Node)                                                                                           |
| Version compare           | `parseSemver` / `semverGreaterThan` / `semverEquals` in `packages/oep-distribution/src/version-compare.ts`                                                                         |
| Install coordinator       | `InstallCoordinator` in `packages/oep-distribution/src/install-coordinator.ts` — install/update, version guards, atomic activation                                                 |
| Source adapters           | `fileSource`, `urlSource`, `catalogSource` in `packages/oep-distribution/src/source-adapters.ts`                                                                                   |
| Catalog loader            | `fetchCatalog`/`parseCatalog` validated against `CatalogSchema` in `packages/oep-distribution/src/catalog-loader.ts`                                                               |
| Learner install UI        | `apps/learner` — `CatalogPage` (fetches `VITE_CATALOG_URL`), `CatalogInstallView`, `InstallCourseDialog`, `AvailableUpdatesList`                                                   |
| Catalog schema            | `CatalogSchema` in `packages/schemas/src/catalog.ts` — **the authoritative catalog contract**                                                                                      |
| Zod → JSON Schema         | `toJsonSchema` (OpenAPI) + new `toJsonSchemaDraft7` in `packages/schemas/src/json-schema.ts`                                                                                       |

The learner app already implements all three spec install methods (file, URL, catalog) and update detection. **The registry does not need to build any of this — and neither does a second script set. The library packages provide it.**

### A.2 Gaps the registry must fill

1. No repo/CI exists to _publish_ courses: no metadata schema, no metadata validation, no release-asset validation, no `catalog.json` generator, no Pages deploy. That is the scope of the new `@open-edu/registry` package + the `openedu-library` repo.
2. `latestVersion`/multi-version grouping, `sizeBytes`, `checksum`, and per-version `downloadUrl` must be derived from GitHub Releases — the generator is the missing link (new code in `@open-edu/registry`).
3. A GitHub API client (releases list/get, asset download, tag/checksum parsing) does not exist in the framework — ~1 new small module in `@open-edu/registry`.

### A.3 Critical conflicts to reconcile (design decisions this plan locks in)

**D1 — catalog format follows the framework, not the spec's sketch.**
The spec's `catalog.json` example uses `{ version: 1, generatedAt, courses: [{ id, name, version, downloadUrl, sha256, size, ... }] }`. But the framework's `CatalogSchema` requires:

```json
{
  "catalogVersion": 1,
  "packages": [
    { "id", "title", "description?", "latestVersion",
      "versions": [ { "version", "downloadUrl", "checksum", "sizeBytes", "languages" } ] }
  ]
}
```

If the registry emits the spec's shape, `parseCatalog` throws `CatalogLoadError` and the learner app shows nothing. **Decision:** `catalog.json` MUST conform to `CatalogSchema`. Field mapping: spec `name` → `title`, spec `sha256` → `checksum`, spec `size` → `sizeBytes`, spec `courses` → `packages`, spec `version` (root) → `catalogVersion`.

**D2 — `versions[]` must be sorted ascending.**
`CatalogInstallView.tsx` picks the latest as `entry.versions[entry.versions.length - 1]`. The generator sorts semver ascending so the last element is newest; `latestVersion` is the max.

**D3 — release/asset naming convention (source of truth).**
Release tag: `<id>-v<major>.<minor>.<patch>` (e.g. `tribal-art-v0.4.0`). Assets: `<id>-<version>.oep` and `checksums.txt`. These match `edu oep:build`'s output filename, so the maintainer uploads the file as-is. Tag → `(id, version)` parsing regex: `^(.+)-v(\d+)\.(\d+)\.(\d+)$`.

**D4 — checksum is authoritative, `checksums.txt` is cross-checked.**
The generator downloads the `.oep` asset and computes its SHA-256 (no trusting publishers). `checksums.txt` is parsed and cross-checked; a mismatch is surfaced as a warning at generation time and as a hard failure in `release-validate.yml`. `sizeBytes` comes from the release asset API (`asset.size`).

**D5 — metadata is per-course, not per-version.**
`courses/<id>/metadata.json` holds display metadata (name, description, author, license, languages, thumbnail, tags). The `version` field is informational only (optional) — the catalog's versions always come from GitHub Releases, so patch-release updates require **zero metadata edits**.

**D6 — packages with no release (or releases with no metadata) are skipped with warnings.**
The catalog schema requires `versions` to be non-empty. `release-validate.yml` fails a release whose metadata is missing, so the missing-metadata case is caught at publish time, not generation time.

**D7 — thumbnail URLs are absolute `raw.githubusercontent.com` URLs.**
`https://raw.githubusercontent.com/<owner>/<repo>/HEAD/courses/<id>/<thumbnail>`. Generated from the GitHub repo (no hardcoded owner). `thumbnail` is optional.

**D8 — the registry repo is dependency-light by construction.**
It has exactly one devDependency: `@open-edu/registry`. All validation logic lives in the published package; the repo holds only data, docs, and workflows.

**D9 — single library, published to npm (the chosen approach).**
All package-creation and validation scripts already exist in the open-edu monorepo (`edu oep:build`, `OepReader`, `computeSha256`, `CatalogSchema`). We do **not** recreate a second set in `openedu-library`. Instead: publish `@open-edu/schemas`, `@open-edu/oep-distribution`, and the new `@open-edu/registry` to npm (changesets), and make the registry repo consume them. The only genuinely new logic anywhere is (a) `RegistryMetadataSchema`, (b) the ~1-module GitHub API client, and (c) the thin `@open-edu/registry` CLI glue.

### A.4 Framework-side follow-ups (now mandatory — Tasks 1–2)

Previously "optional Phase 8", these are now required because the published packages must be complete:

1. **Extend `CatalogSchema`** with optional `generatedAt` (root) and optional `thumbnail`, `author`, `license`, `tags` on `CatalogPackageEntrySchema`, plus optional `createdAt` on version entries — so the registry's richer fields survive `parseCatalog` (Zod currently strips unknown keys).
2. **Add `RegistryMetadataSchema`** to `@open-edu/schemas` — the single source of truth for `courses/<id>/metadata.json`.
3. **Enforce catalog checksum on install**: `catalogSource` carries `expectedChecksum` but `InstallCoordinator` never verifies the downloaded file's SHA-256 against it. Add `expectedChecksum` to `CourseSource` and verify in `installInternal` (spec's Security section).
4. **Document `VITE_CATALOG_URL`** in `apps/learner/.env.example` pointing at the registry's Pages URL.

---

## Part B — Revised Architecture (single shared library)

### B.1 Dependency flow

```
                    open-edu monorepo (npm publish via changesets)
                    ┌────────────────────────────────────────────────────┐
                    │  @open-edu/schemas        (Zod contracts, JSON     │
                    │    RegistryMetadataSchema,  Schema generation)     │
                    │         ▲                                          │
                    │  @open-edu/oep-distribution (OepReader, compute-   │
                    │    Sha256, version-compare, InstallCoordinator)    │
                    │         ▲                                          │
                    │  @open-edu/registry  (NEW — GitHub API client,     │
                    │    buildCatalog, validateRelease, generate-schemas │
                    │    + open-edu-registry CLI bin)                    │
                    └────────────────────────────────────────────────────┘
                                        │ npm publish
                                        ▼
                    openedu-library (data + CI repo)
                    courses/*/metadata.json, docs/,
                    .github/workflows/*, schemas/*.json (generated),
                    catalog.json (generated)
```

### B.2 What lives where

**In the monorepo (the library):** all logic + its Vitest tests.

**In `openedu-library` (the registry):** no logic, no `.oep` files, no tests-to-run (validation _is_ the CI). Files:

```
openedu-library/
├── README.md
├── LICENSE                      # MIT (infra); course content uses per-course license
├── package.json                 # npm, ESM, Node 20+, one devDep: @open-edu/registry
├── .gitignore
├── .nvmrc                       # 22
├── catalog.json                 # GENERATED — never hand-edited
├── courses/
│   ├── tribal-art/
│   │   ├── metadata.json
│   │   ├── README.md
│   │   ├── thumbnail.png        # placeholder, generated by make-placeholder.js
│   │   └── screenshots/.gitkeep
│   └── science-grade7/
│       ├── metadata.json
│       ├── README.md
│       └── thumbnail.png
├── schemas/
│   ├── metadata.schema.json     # GENERATED from RegistryMetadataSchema
│   └── catalog.schema.json      # GENERATED from CatalogSchema
├── scripts/
│   └── make-placeholder.js      # the only repo script: solid-color PNG thumbnail
├── docs/
│   ├── COURSE_REGISTRY.md
│   ├── CATALOG_SPEC.md
│   ├── METADATA_SPEC.md
│   ├── PUBLISHING_GUIDE.md
│   ├── RELEASE_PROCESS.md
│   └── ARCHITECTURE.md
└── .github/
    └── workflows/
        ├── validate.yml
        ├── release-validate.yml
        ├── generate-catalog.yml
        └── deploy-pages.yml
```

---

## Part C — Monorepo Tasks (build + publish the library)

All commands in Part C run in `/Users/sarthakpatnaik/Code/open-edu`.

### Task 1: `@open-edu/schemas` — publishable, enriched Catalog, RegistryMetadataSchema, draft-7 schema generation

**Files (open-edu):**

- Modify: `packages/schemas/package.json` (un-private + publishConfig)
- Create: `packages/schemas/src/registry.ts`
- Modify: `packages/schemas/src/index.ts` (export new schema + helper)
- Modify: `packages/schemas/src/catalog.ts` (enrich)
- Modify: `packages/schemas/src/catalog.test.ts`
- Create: `packages/schemas/src/registry.test.ts`
- Modify: `packages/schemas/src/json-schema.ts` (+ `toJsonSchemaDraft7`)
- Modify: `packages/schemas/src/json-schema.test.ts`
- Modify: `packages/schemas/tsconfig.json` (if it lacks `lib: ["DOM"]` — `catalog.ts` uses `z.string().url()`, no DOM needed; **no change expected**, verify only)

- [ ] **Step 1: Make `@open-edu/schemas` publishable**

In `packages/schemas/package.json`, remove `"private": true` and add:

```json
"publishConfig": {
  "access": "public"
}
```

- [ ] **Step 2: Add `RegistryMetadataSchema`**

Create `packages/schemas/src/registry.ts`:

```typescript
import { z } from 'zod';

/**
 * Author-facing metadata for one course in the OpenEdu registry
 * (openedu-library `courses/<id>/metadata.json`).
 */
export const RegistryMetadataSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9][a-z0-9_-]*$/),
    name: z.string().min(1).max(256),
    description: z.string().max(4096).optional(),
    author: z.string().min(1).max(128),
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .optional()
      .describe('Informational only; catalog versions always come from GitHub Releases'),
    license: z.string().min(1).max(64),
    languages: z.array(z.string().min(1).max(16)).min(1),
    thumbnail: z
      .string()
      .regex(/^[A-Za-z0-9_./-]+\.(webp|png|jpg|jpeg|avif)$/)
      .optional(),
    screenshots: z.array(z.string()).optional(),
    tags: z.array(z.string().min(1).max(64)).optional(),
    type: z.enum(['course', 'bundle']).default('course'),
  })
  .strict();

export type RegistryMetadata = z.infer<typeof RegistryMetadataSchema>;
```

- [ ] **Step 3: Enrich `CatalogSchema`**

In `packages/schemas/src/catalog.ts`:

- On `CatalogVersionEntrySchema` add `createdAt: z.string().optional()`.
- On `CatalogPackageEntrySchema` add `author: z.string().optional()`, `license: z.string().optional()`, `tags: z.array(z.string()).optional()`, `thumbnail: z.string().url().optional()`.
- On `CatalogSchema` add `generatedAt: z.string().optional()`.

(Exact field placement mirrors the existing file; all additions are optional and backward compatible.)

- [ ] **Step 4: Add `toJsonSchemaDraft7`**

In `packages/schemas/src/json-schema.ts`:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';

export function toJsonSchema(schema: ZodType): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'openApi3' });
}

export function toJsonSchemaDraft7(schema: ZodType): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'jsonSchema7' });
}
```

- [ ] **Step 5: Export the new symbols from `packages/schemas/src/index.ts`**

```typescript
export { RegistryMetadataSchema } from './registry.js';
export type { RegistryMetadata } from './registry.js';
export { toJsonSchemaDraft7 } from './json-schema.js';
```

- [ ] **Step 6: Write the failing tests**

`packages/schemas/src/registry.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { RegistryMetadataSchema } from './registry.js';
import { CatalogSchema } from './catalog.js';
import { toJsonSchemaDraft7 } from './json-schema.js';

const valid = {
  id: 'tribal-art',
  name: 'Indian Tribal Art',
  description: 'Explore the traditional art forms of India.',
  author: 'OpenEdu Authors',
  version: '0.4.0',
  license: 'CC-BY-SA-4.0',
  languages: ['en'],
  thumbnail: 'thumbnail.png',
  screenshots: ['screenshots/hero.png'],
  tags: ['art', 'india'],
};

describe('RegistryMetadataSchema', () => {
  it('accepts a valid course', () => {
    expect(RegistryMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = RegistryMetadataSchema.safeParse({ id: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = RegistryMetadataSchema.safeParse({ ...valid, extra: true });
    expect(result.success).toBe(false);
  });

  it('defaults type to course', () => {
    const data = RegistryMetadataSchema.parse({ ...valid, type: undefined });
    expect(data.type).toBe('course');
  });
});

describe('enriched CatalogSchema', () => {
  it('accepts and preserves registry-style fields', () => {
    const catalog = {
      catalogVersion: 1,
      generatedAt: '2026-08-01T00:00:00.000Z',
      packages: [
        {
          id: 'tribal-art',
          title: 'Indian Tribal Art',
          author: 'OpenEdu Authors',
          license: 'CC-BY-SA-4.0',
          tags: ['art'],
          thumbnail: 'https://example.com/thumb.png',
          latestVersion: '0.4.0',
          versions: [
            {
              version: '0.4.0',
              downloadUrl: 'https://example.com/x.oep',
              checksum: 'a'.repeat(64),
              sizeBytes: 12345,
              languages: ['en'],
              createdAt: '2026-08-01T00:00:00.000Z',
            },
          ],
        },
      ],
    };
    const parsed = CatalogSchema.parse(catalog);
    expect(parsed.generatedAt).toBe(catalog.generatedAt);
    expect(parsed.packages[0]?.author).toBe('OpenEdu Authors');
    expect(parsed.packages[0]?.versions[0]?.createdAt).toBe('2026-08-01T00:00:00.000Z');
  });
});

describe('toJsonSchemaDraft7', () => {
  it('emits a draft-07 JSON Schema object', () => {
    const doc = toJsonSchemaDraft7(RegistryMetadataSchema) as {
      $schema?: string;
      type?: string;
    };
    expect(doc.$schema).toContain('draft-07');
    expect(doc.type).toBe('object');
  });

  it('disallows additional properties for strict schemas', () => {
    const doc = toJsonSchemaDraft7(RegistryMetadataSchema) as {
      additionalProperties?: boolean;
    };
    expect(doc.additionalProperties).toBe(false);
  });
});
```

- [ ] **Step 7: Run the tests to verify they fail, then fix the implementation**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm --filter @open-edu/schemas test`
Expected: fail on `RegistryMetadataSchema` / `toJsonSchemaDraft7` / enriched-field imports until Steps 2–5 are applied; then PASS.

- [ ] **Step 8: Typecheck + lint + commit**

```bash
cd /Users/sarthakpatnaik/Code/open-edu && pnpm --filter @open-edu/schemas typecheck && pnpm --filter @open-edu/schemas lint
git add packages/schemas && git commit -m "feat(schemas): add RegistryMetadataSchema, enrich CatalogSchema, add draft-7 schema generation"
```

---

### Task 2: `@open-edu/oep-distribution` — enforce catalog checksum on install + publish config

**Files (open-edu):**

- Modify: `packages/oep-distribution/src/types.ts`
- Modify: `packages/oep-distribution/src/source-adapters.ts`
- Modify: `packages/oep-distribution/src/install-coordinator.ts`
- Modify: `packages/oep-distribution/src/install-coordinator.test.ts`
- Modify: `packages/oep-distribution/package.json` (publishConfig)
- Modify: `apps/learner/.env.example`

- [ ] **Step 1: Add `expectedChecksum` to `CourseSource`**

In `packages/oep-distribution/src/types.ts`:

```typescript
export interface CourseSource {
  kind: SourceKind;
  label: string;
  getBytes(signal?: AbortSignal): Promise<Uint8Array>;
  expectedChecksum?: string;
}
```

- [ ] **Step 2: Pass it through in `catalogSource`**

In `packages/oep-distribution/src/source-adapters.ts`, `catalogSource` currently ignores `options.expectedChecksum`. Change the returned object to:

```typescript
return {
  kind: 'catalog' as SourceKind,
  label: options.label,
  expectedChecksum: options.expectedChecksum,
  async getBytes(signal?: AbortSignal): Promise<Uint8Array> {
    const response = await fetch(options.downloadUrl, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  },
};
```

- [ ] **Step 3: Verify the checksum in `installInternal`**

In `packages/oep-distribution/src/install-coordinator.ts`, immediately after the `try { bytes = await source.getBytes(signal); } catch { ... }` block (line ~117), add:

```typescript
if (source.expectedChecksum) {
  const actual = await computeSha256(bytes);
  if (actual !== source.expectedChecksum) {
    return this.failure(
      'unknown',
      '0.0.0',
      'CHECKSUM_MISMATCH',
      `Downloaded file SHA-256 ${actual} does not match catalog checksum ${source.expectedChecksum}`,
    );
  }
}
```

(`computeSha256` is already imported in this file — verify; otherwise add `import { computeSha256 } from './checksum.js';`.)

- [ ] **Step 4: Add a test in `install-coordinator.test.ts`**

A `catalogSource({ downloadUrl, label, expectedChecksum })` with a wrong `expectedChecksum` produces an `InstallResult` with `error?.code === 'CHECKSUM_MISMATCH'`; a matching one succeeds. (Use the existing in-memory `StorageAdapter` test helper and a real `OepWriter`-built package.)

- [ ] **Step 5: Add publishConfig**

In `packages/oep-distribution/package.json` add:

```json
"publishConfig": {
  "access": "public"
}
```

- [ ] **Step 6: Document `VITE_CATALOG_URL`**

Append to `apps/learner/.env.example`:

```env
# OpenEdu Library course registry
# https://github.com/<owner>/openedu-library
# VITE_CATALOG_URL=https://<owner>.github.io/openedu-library/catalog.json
```

- [ ] **Step 7: Test + typecheck + commit**

```bash
cd /Users/sarthakpatnaik/Code/open-edu && pnpm --filter @open-edu/oep-distribution test && pnpm --filter @open-edu/oep-distribution typecheck
git add packages/oep-distribution apps/learner/.env.example && git commit -m "feat(distribution): enforce catalog checksum on install"
```

---

### Task 3: Create `@open-edu/registry` package (the single library)

The package depends only on `@open-edu/oep-distribution` and `@open-edu/schemas` — it reuses `OepReader`, `computeSha256`, `parseSemver`/`semverGreaterThan`, `CatalogSchema`, `RegistryMetadataSchema`, and `toJsonSchemaDraft7`. The only net-new logic is the GitHub API client and the thin CLI.

**Files (open-edu):**

- Create: `packages/registry/package.json`
- Create: `packages/registry/tsconfig.json`
- Create: `packages/registry/src/github.ts`
- Create: `packages/registry/src/metadata.ts`
- Create: `packages/registry/src/catalog-builder.ts`
- Create: `packages/registry/src/validate-release.ts`
- Create: `packages/registry/src/schemas.ts`
- Create: `packages/registry/src/cli.ts`
- Create: `packages/registry/src/index.ts`
- Create: `packages/registry/src/github.test.ts`
- Create: `packages/registry/src/metadata.test.ts`
- Create: `packages/registry/src/catalog-builder.test.ts`
- Create: `packages/registry/src/validate-release.test.ts`
- Create: `packages/registry/test/fixtures/releases.json`
- Create: `packages/registry/test/fixtures/courses/tribal-art/metadata.json`
- Create: `packages/registry/test/fixtures/courses/science-grade7/metadata.json`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@open-edu/registry",
  "version": "0.1.0",
  "description": "GitHub-native course registry tooling for OpenEdu (catalog builder + release validation)",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "bin": {
    "open-edu-registry": "./dist/cli.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@open-edu/oep-distribution": "workspace:*",
    "@open-edu/schemas": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=18"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: `tsconfig.json`** (mirror `packages/oep-distribution`, with Node types for the CLI)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM"],
    "types": ["vitest/globals", "node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: `src/github.ts`** (the only net-new infra)

```typescript
export interface GithubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface GithubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: GithubReleaseAsset[];
}

const API = 'https://api.github.com';
const TAG_RE = /^(.+)-v(\d+)\.(\d+)\.(\d+)$/;

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function listReleases(repo: string, token?: string): Promise<GithubRelease[]> {
  const res = await fetch(`${API}/repos/${repo}/releases?per_page=100`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} listing releases: ${await res.text()}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data))
    throw new Error('GitHub API returned an unexpected payload for releases');
  return data as GithubRelease[];
}

export async function getReleaseByTag(
  repo: string,
  tag: string,
  token?: string,
): Promise<GithubRelease> {
  const res = await fetch(`${API}/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: headers(token),
  });
  if (!res.ok)
    throw new Error(`GitHub API ${res.status} for release "${tag}": ${await res.text()}`);
  return (await res.json()) as GithubRelease;
}

export async function fetchAssetBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Accept: 'application/octet-stream' } });
  if (!res.ok) throw new Error(`Asset fetch ${res.status}: ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function parseReleaseTag(tag: string): { id: string; version: string } | null {
  const m = TAG_RE.exec(tag);
  if (!m) return null;
  return { id: m[1]!, version: `${m[2]}.${m[3]}.${m[4]}` };
}

export function parseChecksums(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && /^[a-f0-9]{64}$/.test(parts[0]!)) {
      map.set(parts[parts.length - 1]!.replace(/^[*]/, ''), parts[0]!);
    }
  }
  return map;
}
```

- [ ] **Step 4: `src/metadata.ts`**

```typescript
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RegistryMetadataSchema } from '@open-edu/schemas';
import type { RegistryMetadata } from '@open-edu/schemas';

export interface LoadedMetadata {
  dir: string;
  data: RegistryMetadata;
}

export function loadCourseDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function loadMetadataMap(dir: string): Map<string, LoadedMetadata> {
  const map = new Map<string, LoadedMetadata>();
  for (const courseId of loadCourseDirs(dir)) {
    const file = join(dir, courseId, 'metadata.json');
    if (!existsSync(file)) continue;
    const data: unknown = JSON.parse(readFileSync(file, 'utf8'));
    const parsed = RegistryMetadataSchema.safeParse(data);
    if (!parsed.success) {
      console.warn(`warn: skipping courses/${courseId}/metadata.json (invalid schema)`);
      continue;
    }
    map.set(parsed.data.id, { dir: courseId, data: parsed.data });
  }
  return map;
}

export function validateMetadataDir(dir: string): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const courseId of loadCourseDirs(dir)) {
    const file = join(dir, courseId, 'metadata.json');
    if (!existsSync(file)) {
      errors.push(`courses/${courseId}/metadata.json is missing`);
      continue;
    }
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      errors.push(
        `courses/${courseId}/metadata.json is not valid JSON: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      continue;
    }
    const parsed = RegistryMetadataSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(
          `courses/${courseId}/metadata.json: ${issue.path.join('.') || '/'} ${issue.message}`,
        );
      }
      continue;
    }
    if (ids.has(parsed.data.id)) {
      errors.push(`duplicate course id "${parsed.data.id}" in courses/${courseId}/metadata.json`);
    } else {
      ids.add(parsed.data.id);
    }
  }
  return errors;
}
```

- [ ] **Step 5: `src/catalog-builder.ts`** (reuses `computeSha256`, `parseSemver`, `semverGreaterThan`, `CatalogSchema`)

```typescript
import { CatalogSchema } from '@open-edu/schemas';
import { computeSha256, parseSemver, semverGreaterThan } from '@open-edu/oep-distribution';
import { parseReleaseTag, parseChecksums, fetchAssetBytes, type GithubRelease } from './github.js';
import type { LoadedMetadata } from './metadata.js';

const RELEASE_BASE = 'https://github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

export function compareVersions(a: string, b: string): number {
  if (semverGreaterThan(a, b)) return 1;
  if (semverGreaterThan(b, a)) return -1;
  return 0;
}

export interface BuildCatalogOptions {
  metadataMap: Map<string, LoadedMetadata>;
  releases: GithubRelease[];
  repo: string;
  includePrerelease?: boolean;
  fetchAsset?: (url: string) => Promise<Uint8Array>;
}

export async function buildCatalog({
  metadataMap,
  releases,
  repo,
  includePrerelease = false,
  fetchAsset = fetchAssetBytes,
}: BuildCatalogOptions): Promise<{ catalog: Record<string, unknown>; warnings: string[] }> {
  const rawBaseUrl = `${RAW_BASE}/${repo}/HEAD`;
  const byId = new Map<
    string,
    {
      versions: Array<{
        version: string;
        downloadUrl: string;
        checksum: string;
        sizeBytes: number;
      }>;
    }
  >();
  const warnings: string[] = [];

  for (const release of releases) {
    if (release.draft) continue;
    if (release.prerelease && !includePrerelease) continue;

    const parsed = parseReleaseTag(release.tag_name ?? '');
    if (!parsed) {
      warnings.push(`release "${release.tag_name}" does not match <id>-v<semver>; skipped`);
      continue;
    }
    const { id, version } = parsed;
    const oepName = `${id}-${version}.oep`;
    const oepAsset = (release.assets ?? []).find((a) => a.name === oepName);
    if (!oepAsset) {
      warnings.push(`release "${release.tag_name}" has no asset "${oepName}"; skipped`);
      continue;
    }

    let checksum: string;
    try {
      checksum = await computeSha256(await fetchAsset(oepAsset.browser_download_url));
    } catch (err) {
      warnings.push(
        `release "${release.tag_name}": could not download .oep asset (${
          err instanceof Error ? err.message : String(err)
        }); skipped`,
      );
      continue;
    }

    const checksumsAsset = (release.assets ?? []).find((a) => a.name === 'checksums.txt');
    if (checksumsAsset) {
      try {
        const text = new TextDecoder().decode(
          await fetchAsset(checksumsAsset.browser_download_url),
        );
        const declared = parseChecksums(text).get(oepName);
        if (declared && declared !== checksum) {
          warnings.push(
            `release "${release.tag_name}": checksums.txt mismatch for "${oepName}" (declared ${declared}, computed ${checksum})`,
          );
        }
      } catch {
        // checksums.txt cross-check is best-effort at generation time
      }
    }

    const entry = byId.get(id) ?? { versions: [] };
    entry.versions.push({
      version,
      downloadUrl: `${RELEASE_BASE}/${repo}/releases/download/${release.tag_name}/${oepName}`,
      checksum,
      sizeBytes: oepAsset.size,
    });
    byId.set(id, entry);
  }

  const packages: Array<Record<string, unknown>> = [];
  for (const { id, versions } of [...byId.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v)) {
    const meta = metadataMap.get(id);
    if (!meta) {
      warnings.push(`package "${id}" has releases but no courses/${id}/metadata.json; skipped`);
      continue;
    }

    versions.sort((a, b) => compareVersions(a.version, b.version));
    const latest = versions[versions.length - 1]!;

    packages.push({
      id,
      title: meta.data.name,
      ...(meta.data.description !== undefined ? { description: meta.data.description } : {}),
      ...(meta.data.author !== undefined ? { author: meta.data.author } : {}),
      ...(meta.data.license !== undefined ? { license: meta.data.license } : {}),
      ...(meta.data.tags?.length ? { tags: meta.data.tags } : {}),
      ...(meta.data.thumbnail
        ? { thumbnail: `${rawBaseUrl}/courses/${meta.dir}/${meta.data.thumbnail}` }
        : {}),
      latestVersion: latest.version,
      versions: versions.map((v) => ({ ...v, languages: meta.data.languages ?? ['en'] })),
    });
  }

  return {
    catalog: {
      catalogVersion: 1,
      generatedAt: new Date().toISOString(),
      packages,
    },
    warnings,
  };
}

export async function validateCatalogData(data: unknown): Promise<string[]> {
  const parsed = CatalogSchema.safeParse(data);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join('.') || '/'} ${i.message}`);
  }
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const pkg of parsed.data.packages) {
    if (ids.has(pkg.id)) errors.push(`duplicate package id "${pkg.id}"`);
    ids.add(pkg.id);

    const isAscending = pkg.versions.every(
      (v, i) => i === 0 || compareVersions(v.version, pkg.versions[i - 1]!.version) > 0,
    );
    if (!isAscending) errors.push(`versions for "${pkg.id}" are not ascending`);

    let latest = '';
    for (const v of pkg.versions) {
      if (compareVersions(v.version, latest) > 0) latest = v.version;
    }
    if (latest && pkg.latestVersion !== latest) {
      errors.push(`latestVersion for "${pkg.id}" is "${pkg.latestVersion}", expected "${latest}"`);
    }
  }
  return errors;
}
```

- [ ] **Step 6: `src/validate-release.ts`** (reuses `OepReader`, `computeSha256`; injectable deps for offline tests)

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RegistryMetadataSchema } from '@open-edu/schemas';
import { computeSha256, OepReader } from '@open-edu/oep-distribution';
import {
  getReleaseByTag,
  fetchAssetBytes,
  parseReleaseTag,
  parseChecksums,
  type GithubRelease,
} from './github.js';

const reader = new OepReader();

export interface ValidateReleaseOptions {
  repo: string;
  tag: string;
  token?: string;
  coursesDir?: string;
  getRelease?: (repo: string, tag: string, token?: string) => Promise<GithubRelease>;
  fetchAsset?: (url: string) => Promise<Uint8Array>;
}

export interface ReleaseValidationResult {
  id: string;
  version: string;
  oepName: string;
  sizeBytes: number;
  checksum: string;
}

export async function validateRelease({
  repo,
  tag,
  token,
  coursesDir = 'courses',
  getRelease = getReleaseByTag,
  fetchAsset = fetchAssetBytes,
}: ValidateReleaseOptions): Promise<ReleaseValidationResult> {
  const parsed = parseReleaseTag(tag);
  if (!parsed) {
    throw new Error(`release tag "${tag}" must match <id>-v<major>.<minor>.<patch>`);
  }
  const { id, version } = parsed;

  const metadataPath = join(coursesDir, id, 'metadata.json');
  if (!existsSync(metadataPath)) {
    throw new Error(
      `courses/${id}/metadata.json does not exist; add metadata before publishing a release`,
    );
  }
  const metadata: unknown = JSON.parse(readFileSync(metadataPath, 'utf8'));
  if (!RegistryMetadataSchema.safeParse(metadata).success) {
    throw new Error(`courses/${id}/metadata.json is invalid`);
  }

  const release = await getRelease(repo, tag, token);
  const assets = release.assets ?? [];
  const oepName = `${id}-${version}.oep`;

  const oepAsset = assets.find((a) => a.name === oepName);
  if (!oepAsset) throw new Error(`release "${tag}" is missing asset "${oepName}"`);

  const checksumsAsset = assets.find((a) => a.name === 'checksums.txt');
  if (!checksumsAsset) throw new Error('release is missing the "checksums.txt" asset');

  const oepBytes = await fetchAsset(oepAsset.browser_download_url);
  const computed = await computeSha256(oepBytes);

  const checksumsText = new TextDecoder().decode(
    await fetchAsset(checksumsAsset.browser_download_url),
  );
  const declared = parseChecksums(checksumsText).get(oepName);
  if (!declared) throw new Error(`checksums.txt does not contain an entry for "${oepName}"`);
  if (declared !== computed) {
    throw new Error(`checksums.txt says ${declared} but the asset hashes to ${computed}`);
  }

  const inspection = await reader.inspect(oepBytes);
  if (inspection.id !== id) {
    throw new Error(`.oep manifest id "${inspection.id}" does not match release id "${id}"`);
  }
  if (inspection.version !== version) {
    throw new Error(
      `.oep manifest version "${inspection.version}" does not match release version "${version}"`,
    );
  }

  return { id, version, oepName, sizeBytes: oepBytes.length, checksum: computed };
}
```

- [ ] **Step 7: `src/schemas.ts`** (generate the committed JSON Schema files)

```typescript
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CatalogSchema, RegistryMetadataSchema, toJsonSchemaDraft7 } from '@open-edu/schemas';

export function generateSchemas(outDir: string): string[] {
  mkdirSync(outDir, { recursive: true });
  const files = [
    { name: 'metadata.schema.json', schema: RegistryMetadataSchema },
    { name: 'catalog.schema.json', schema: CatalogSchema },
  ];
  for (const { name, schema } of files) {
    const doc = toJsonSchemaDraft7(schema) as Record<string, unknown>;
    doc['$id'] = `https://openedu.dev/schemas/${name}`;
    writeFileSync(join(outDir, name), JSON.stringify(doc, null, 2) + '\n');
  }
  return files.map((f) => f.name);
}
```

- [ ] **Step 8: `src/cli.ts`** (the `open-edu-registry` bin)

```typescript
#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { buildCatalog, validateCatalogData } from './catalog-builder.js';
import { listReleases } from './github.js';
import { loadCourseDirs, loadMetadataMap, validateMetadataDir } from './metadata.js';
import { validateRelease } from './validate-release.js';
import { generateSchemas } from './schemas.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const [, , command] = process.argv;
  const repo = arg('repo') ?? process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  switch (command) {
    case 'validate-metadata': {
      const dir = arg('dir') ?? 'courses';
      const errors = validateMetadataDir(dir);
      if (errors.length > 0) {
        for (const e of errors) console.error(`error: ${e}`);
        process.exit(1);
      }
      console.log(`validated ${loadCourseDirs(dir).length} course(s) in ${dir}`);
      break;
    }
    case 'validate-catalog': {
      const path = arg('path') ?? 'catalog.json';
      if (!existsSync(path)) {
        console.error(`error: ${path} not found`);
        process.exit(1);
      }
      let data: unknown;
      try {
        data = JSON.parse(readFileSync(path, 'utf8'));
      } catch (err) {
        console.error(
          `error: ${path} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
      const errors = await validateCatalogData(data);
      if (errors.length > 0) {
        for (const e of errors) console.error(`error: ${e}`);
        process.exit(1);
      }
      const packages = (data as { packages?: unknown[] }).packages ?? [];
      console.log(`${path} is valid (${packages.length} package(s))`);
      break;
    }
    case 'generate-catalog': {
      if (!repo) {
        console.error('error: missing --repo (or GITHUB_REPOSITORY)');
        process.exit(1);
      }
      const out = arg('out') ?? 'catalog.json';
      const releasesFile = arg('releases');
      const includePrerelease = hasFlag('include-prerelease');
      const strict = hasFlag('strict');

      const metadataMap = loadMetadataMap(arg('dir') ?? 'courses');
      const releases = releasesFile
        ? (JSON.parse(readFileSync(releasesFile, 'utf8')) as Awaited<
            ReturnType<typeof listReleases>
          >)
        : await listReleases(repo, token);

      const { catalog, warnings } = await buildCatalog({
        metadataMap,
        releases,
        repo,
        includePrerelease,
      });
      for (const w of warnings) console.warn(`warn: ${w}`);

      const catalogErrors = await validateCatalogData(catalog);
      if (catalogErrors.length > 0) {
        for (const e of catalogErrors) console.error(`error: ${e}`);
        process.exit(1);
      }
      if (strict && warnings.length > 0) {
        console.error(`error: ${warnings.length} warning(s) with --strict`);
        process.exit(1);
      }

      const versionCount = (catalog.packages as unknown[]).reduce(
        (n, p) => n + ((p as { versions?: unknown[] }).versions?.length ?? 0),
        0,
      );
      if (!hasFlag('dry-run')) {
        writeFileSync(out, JSON.stringify(catalog, null, 2) + '\n');
        console.log(
          `wrote ${out} with ${(catalog.packages as unknown[]).length} package(s), ${versionCount} version(s)`,
        );
      } else {
        console.log(
          `dry-run: ${(catalog.packages as unknown[]).length} package(s), ${versionCount} version(s) would be written to ${out}`,
        );
      }
      break;
    }
    case 'validate-release': {
      if (!repo) {
        console.error('error: missing --repo (or GITHUB_REPOSITORY)');
        process.exit(1);
      }
      const tag = arg('tag') ?? process.env.GITHUB_REF_NAME;
      if (!tag) {
        console.error('error: missing --tag (or GITHUB_REF_NAME)');
        process.exit(1);
      }
      const result = await validateRelease({ repo, tag, token });
      console.log(
        `release ${tag}: OK (${result.oepName}, ${result.sizeBytes} bytes, sha256 ${result.checksum})`,
      );
      break;
    }
    case 'generate-schemas': {
      const out = arg('out') ?? 'schemas';
      const files = generateSchemas(out);
      console.log(`wrote ${files.join(', ')} to ${out}`);
      break;
    }
    default: {
      console.error(`unknown command "${command ?? ''}"`);
      console.error(
        'usage: open-edu-registry <validate-metadata|validate-catalog|generate-catalog|validate-release|generate-schemas>',
      );
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
```

- [ ] **Step 9: `src/index.ts`**

```typescript
export {
  listReleases,
  getReleaseByTag,
  fetchAssetBytes,
  parseReleaseTag,
  parseChecksums,
} from './github.js';
export type { GithubRelease, GithubReleaseAsset } from './github.js';
export { loadCourseDirs, loadMetadataMap, validateMetadataDir } from './metadata.js';
export type { LoadedMetadata } from './metadata.js';
export { buildCatalog, validateCatalogData, compareVersions } from './catalog-builder.js';
export type { BuildCatalogOptions } from './catalog-builder.js';
export { validateRelease } from './validate-release.js';
export type { ValidateReleaseOptions, ReleaseValidationResult } from './validate-release.js';
export { generateSchemas } from './schemas.js';
```

- [ ] **Step 10: Fixtures**

`packages/registry/test/fixtures/releases.json`:

```json
[
  {
    "tag_name": "tribal-art-v0.4.0",
    "draft": false,
    "prerelease": false,
    "assets": [
      {
        "name": "tribal-art-0.4.0.oep",
        "size": 20480,
        "browser_download_url": "https://example.com/tribal-art-0.4.0.oep"
      },
      {
        "name": "checksums.txt",
        "size": 200,
        "browser_download_url": "https://example.com/checksums.txt"
      }
    ]
  },
  {
    "tag_name": "tribal-art-v0.2.0",
    "draft": false,
    "prerelease": false,
    "assets": [
      {
        "name": "tribal-art-0.2.0.oep",
        "size": 10240,
        "browser_download_url": "https://example.com/tribal-art-0.2.0.oep"
      },
      {
        "name": "checksums.txt",
        "size": 200,
        "browser_download_url": "https://example.com/checksums.txt"
      }
    ]
  },
  {
    "tag_name": "science-grade7-v1.0.0",
    "draft": false,
    "prerelease": false,
    "assets": [
      {
        "name": "science-grade7-1.0.0.oep",
        "size": 4096,
        "browser_download_url": "https://example.com/science-grade7-1.0.0.oep"
      }
    ]
  },
  {
    "tag_name": "ghost-course-v0.1.0",
    "draft": false,
    "prerelease": false,
    "assets": [
      {
        "name": "ghost-course-0.1.0.oep",
        "size": 4096,
        "browser_download_url": "https://example.com/ghost-course-0.1.0.oep"
      }
    ]
  },
  {
    "tag_name": "tribal-art-v0.4.0-rc1",
    "draft": false,
    "prerelease": true,
    "assets": []
  }
]
```

`packages/registry/test/fixtures/courses/tribal-art/metadata.json`:

```json
{
  "id": "tribal-art",
  "name": "Indian Tribal Art",
  "description": "Explore the traditional art forms of India.",
  "author": "OpenEdu Authors",
  "license": "CC-BY-SA-4.0",
  "languages": ["en"],
  "thumbnail": "thumbnail.png",
  "tags": ["art", "india"]
}
```

`packages/registry/test/fixtures/courses/science-grade7/metadata.json`:

```json
{
  "id": "science-grade7",
  "name": "Science Grade 7",
  "description": "Seventh-grade science curriculum.",
  "author": "OpenEdu Authors",
  "license": "CC-BY-SA-4.0",
  "languages": ["en"],
  "thumbnail": "thumbnail.png",
  "tags": ["science"]
}
```

- [ ] **Step 11: Tests (Vitest)**

`src/github.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { parseReleaseTag, parseChecksums } from './github.js';

describe('parseReleaseTag', () => {
  it('extracts id and version', () => {
    expect(parseReleaseTag('tribal-art-v0.4.0')).toEqual({ id: 'tribal-art', version: '0.4.0' });
    expect(parseReleaseTag('level-b-math-v1.10.2')).toEqual({
      id: 'level-b-math',
      version: '1.10.2',
    });
  });

  it('rejects non-conforming tags', () => {
    expect(parseReleaseTag('tribal-art-0.4.0')).toBeNull();
    expect(parseReleaseTag('tribal-art-v0.4')).toBeNull();
    expect(parseReleaseTag('')).toBeNull();
  });
});

describe('parseChecksums', () => {
  it('maps filename to sha256', () => {
    const sha = 'a'.repeat(64);
    const map = parseChecksums(
      `${sha}  tribal-art-0.4.0.oep\n${'b'.repeat(64)} *other.oep\njunk line\n`,
    );
    expect(map.get('tribal-art-0.4.0.oep')).toBe(sha);
    expect(map.get('other.oep')).toBe('b'.repeat(64));
    expect(map.size).toBe(2);
  });
});
```

`src/metadata.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateMetadataDir } from './metadata.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures');

describe('validateMetadataDir', () => {
  it('accepts the good fixture course', () => {
    expect(validateMetadataDir(join(fixtures, 'courses'))).toEqual([]);
  });

  it('reports schema violations', () => {
    const errors = validateMetadataDir(join(fixtures, 'courses-broken'));
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

> Note: add a `test/fixtures/courses-broken/broken/metadata.json` fixture `{ "id": "Broken_Id", "name": "", "license": "MIT" }` and a `courses-dup` fixture pair (`alpha`, `beta`, both `id: "dup-course"`) for the duplicate-id test if desired; the plan's happy-path fixture is the two real courses above.

`src/catalog-builder.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCatalog, validateCatalogData } from './catalog-builder.js';
import { loadMetadataMap } from './metadata.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'test', 'fixtures');
const metadataMap = loadMetadataMap(join(fixtures, 'courses'));

const MOCK_BYTES = new TextEncoder().encode('mock-oep-content');

async function makeFakeFetch({ mismatch = false } = {}) {
  const { computeSha256 } = await import('@open-edu/oep-distribution');
  const sha = await computeSha256(MOCK_BYTES);
  return async (url: string) => {
    if (url.includes('checksums.txt')) {
      const declared = mismatch ? 'e'.repeat(64) : sha;
      return new TextEncoder().encode(`${declared}  tribal-art-0.4.0.oep\n`);
    }
    return MOCK_BYTES;
  };
}

const releases = JSON.parse(readFileSync(join(fixtures, 'releases.json'), 'utf8')) as Parameters<
  typeof buildCatalog
>[0]['releases'];

describe('buildCatalog', () => {
  it('builds a catalog from releases and metadata', async () => {
    const { catalog, warnings } = await buildCatalog({
      metadataMap,
      releases,
      repo: 'acme/openedu-library',
      fetchAsset: await makeFakeFetch(),
    });

    expect(warnings).toEqual([]);
    expect(catalog.catalogVersion).toBe(1);
    expect(catalog.generatedAt).toBeTruthy();
    expect(catalog.packages.length).toBe(1);

    const pkg = (catalog.packages as Array<Record<string, unknown>>)[0]!;
    expect(pkg.id).toBe('tribal-art');
    expect(pkg.title).toBe('Indian Tribal Art');
    expect(pkg.latestVersion).toBe('0.4.0');
    expect((pkg.versions as Array<{ version: string }>).map((v) => v.version)).toEqual([
      '0.2.0',
      '0.4.0',
    ]);
    expect(pkg.thumbnail).toBe(
      'https://raw.githubusercontent.com/acme/openedu-library/HEAD/courses/tribal-art/thumbnail.png',
    );
  });

  it('skips releases without metadata and warns', async () => {
    const { catalog, warnings } = await buildCatalog({
      metadataMap,
      releases: [
        {
          tag_name: 'ghost-course-v0.1.0',
          draft: false,
          prerelease: false,
          assets: [
            { name: 'ghost-course-0.1.0.oep', size: 1, browser_download_url: 'https://x/g.oep' },
          ],
        },
      ],
      repo: 'acme/openedu-library',
      fetchAsset: await makeFakeFetch(),
    });
    expect(catalog.packages.length).toBe(0);
    expect(warnings.some((w) => w.includes('ghost-course'))).toBe(true);
  });

  it('skips drafts and prereleases unless included', async () => {
    const draftReleases = [
      { tag_name: 'tribal-art-v0.4.0', draft: true, prerelease: false, assets: [] },
      { tag_name: 'tribal-art-v0.4.0-rc1', draft: false, prerelease: true, assets: [] },
    ];
    const { catalog } = await buildCatalog({
      metadataMap,
      releases: draftReleases,
      repo: 'acme/openedu-library',
      fetchAsset: await makeFakeFetch(),
    });
    expect(catalog.packages.length).toBe(0);

    const withPre = await buildCatalog({
      metadataMap,
      releases: draftReleases,
      repo: 'acme/openedu-library',
      includePrerelease: true,
      fetchAsset: await makeFakeFetch(),
    });
    expect(withPre.catalog.packages.length).toBe(1);
  });

  it('warns when checksums.txt disagrees with the computed hash', async () => {
    const { warnings } = await buildCatalog({
      metadataMap,
      releases,
      repo: 'acme/openedu-library',
      fetchAsset: await makeFakeFetch({ mismatch: true }),
    });
    expect(warnings.some((w) => w.includes('checksums.txt mismatch'))).toBe(true);
  });
});

describe('validateCatalogData', () => {
  it('accepts a valid catalog', async () => {
    expect(await validateCatalogData({ catalogVersion: 1, packages: [] })).toEqual([]);
  });

  it('rejects duplicate package ids', async () => {
    const entry = (v: string) => ({
      version: v,
      downloadUrl: 'https://example.com/x.oep',
      checksum: 'a'.repeat(64),
      sizeBytes: 1,
      languages: ['en'],
    });
    const data = {
      catalogVersion: 1,
      packages: [
        { id: 'x', title: 'X', latestVersion: '1.0.0', versions: [entry('1.0.0')] },
        { id: 'x', title: 'X2', latestVersion: '1.0.0', versions: [entry('1.0.0')] },
      ],
    };
    const errors = await validateCatalogData(data);
    expect(errors.some((e) => e.includes('duplicate package id "x"'))).toBe(true);
  });
});
```

`src/validate-release.test.ts` (uses the real `OepWriter` to build a valid `.oep`, and temp course dirs):

```typescript
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OepWriter } from '@open-edu/oep-distribution';
import type { GithubRelease } from './github.js';
import { validateRelease } from './validate-release.js';

let tmp: string;
let oepBytes: Uint8Array;
let oepSha: string;

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'open-edu-registry-'));
  mkdirSync(join(tmp, 'courses', 'tribal-art'), { recursive: true });
  writeFileSync(
    join(tmp, 'courses', 'tribal-art', 'metadata.json'),
    JSON.stringify({
      id: 'tribal-art',
      name: 'Indian Tribal Art',
      author: 'OpenEdu Authors',
      license: 'CC-BY-SA-4.0',
      languages: ['en'],
    }),
  );

  const { bytes } = await OepWriter.build({
    manifest: {
      id: 'tribal-art',
      version: '0.4.0',
      title: 'Indian Tribal Art',
      author: 'OpenEdu Authors',
      entry: 'nodes/welcome.md',
      contentRoot: 'course/',
    } as never,
    courseFiles: new Map([
      [
        'course/package.json',
        new TextEncoder().encode(
          JSON.stringify({
            id: 'tribal-art',
            title: 'Indian Tribal Art',
            version: '0.4.0',
            author: 'X',
            entry: 'nodes/welcome.md',
          }),
        ),
      ],
      ['course/nodes/welcome.md', new TextEncoder().encode('# Welcome\n')],
    ]),
  });
  oepBytes = bytes;
  const { computeSha256 } = await import('@open-edu/oep-distribution');
  oepSha = await computeSha256(bytes);
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function fakeRelease(overrides: Partial<GithubRelease> = {}): GithubRelease {
  return {
    tag_name: 'tribal-art-v0.4.0',
    draft: false,
    prerelease: false,
    assets: [
      {
        name: 'tribal-art-0.4.0.oep',
        size: oepBytes.length,
        browser_download_url: 'https://example.com/tribal-art-0.4.0.oep',
      },
      {
        name: 'checksums.txt',
        size: 100,
        browser_download_url: 'https://example.com/checksums.txt',
      },
    ],
    ...overrides,
  };
}

describe('validateRelease', () => {
  it('rejects a non-conforming tag', async () => {
    await expect(
      validateRelease({
        repo: 'acme/openedu-library',
        tag: 'bad-tag',
        coursesDir: join(tmp, 'courses'),
      }),
    ).rejects.toThrow(/must match <id>-v<major>\.<minor>\.<patch>/);
  });

  it('rejects a release whose metadata is missing', async () => {
    await expect(
      validateRelease({
        repo: 'acme/openedu-library',
        tag: 'ghost-course-v0.1.0',
        coursesDir: join(tmp, 'courses'),
        getRelease: async () => fakeRelease({ tag_name: 'ghost-course-v0.1.0' }),
      }),
    ).rejects.toThrow(/metadata.json does not exist/);
  });

  it('accepts a valid release', async () => {
    const result = await validateRelease({
      repo: 'acme/openedu-library',
      tag: 'tribal-art-v0.4.0',
      coursesDir: join(tmp, 'courses'),
      getRelease: async () => fakeRelease(),
      fetchAsset: async (url: string) => {
        if (url.endsWith('checksums.txt')) {
          return new TextEncoder().encode(`${oepSha}  tribal-art-0.4.0.oep\n`);
        }
        return oepBytes;
      },
    });
    expect(result.id).toBe('tribal-art');
    expect(result.version).toBe('0.4.0');
    expect(result.checksum).toBe(oepSha);
  });

  it('fails when checksums.txt disagrees', async () => {
    await expect(
      validateRelease({
        repo: 'acme/openedu-library',
        tag: 'tribal-art-v0.4.0',
        coursesDir: join(tmp, 'courses'),
        getRelease: async () => fakeRelease(),
        fetchAsset: async (url: string) => {
          if (url.endsWith('checksums.txt')) {
            return new TextEncoder().encode(`${'e'.repeat(64)}  tribal-art-0.4.0.oep\n`);
          }
          return oepBytes;
        },
      }),
    ).rejects.toThrow(/checksums.txt says/);
  });
});
```

> The happy-path test is offline: `OepWriter` builds a real `.oep`, `OepReader.inspect` validates it — the exact same code path the learner uses.

- [ ] **Step 12: Run the tests**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm --filter @open-edu/registry test`
Expected: all PASS.

- [ ] **Step 13: Build + typecheck + lint + smoke-test the CLI**

```bash
cd /Users/sarthakpatnaik/Code/open-edu && pnpm --filter @open-edu/registry build && pnpm --filter @open-edu/registry typecheck && pnpm --filter @open-edu/registry lint
node packages/registry/dist/cli.js generate-catalog --repo acme/openedu-library --releases packages/registry/test/fixtures/releases.json --dry-run
node packages/registry/dist/cli.js generate-schemas --out /tmp/oe-schemas && cat /tmp/oe-schemas/catalog.schema.json
```

Expected: the dry-run prints `dry-run: 0 package(s), 0 version(s) ...` — the fixture `.oep` assets use placeholder `example.com` URLs, so downloads 404 and the releases are skipped with warnings. The happy path (1 package, 2 versions, sorted ascending with `latestVersion`) is exercised by the `buildCatalog` Vitest tests with a mocked `fetchAsset`. The schemas output is valid draft-07 JSON.

- [ ] **Step 14: Commit**

```bash
cd /Users/sarthakpatnaik/Code/open-edu && git add packages/registry && git commit -m "feat(registry): add @open-edu/registry catalog builder and release validation library"
```

---

### Task 4: Publish the three packages via changesets

**Files (open-edu):**

- Create: `.changeset/config.json`
- Create: `.changeset/README.md`
- Modify: `package.json` (root scripts)
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Init changesets**

```bash
cd /Users/sarthakpatnaik/Code/open-edu && pnpm exec changeset init
```

(This creates `.changeset/config.json` and `.changeset/README.md`; `@changesets/cli` is already a root devDependency.)

- [ ] **Step 2: Edit `.changeset/config.json`** (public access, no private publish noise)

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 3: Add root scripts to `package.json`**

```json
"changeset:version": "changeset version",
"release": "pnpm --filter @open-edu/schemas --filter @open-edu/oep-distribution --filter @open-edu/registry build && changeset publish"
```

- [ ] **Step 4: Write `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  id-token: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Create release PR or publish
        uses: changesets/action@v1
        with:
          version: pnpm run changeset:version
          publish: pnpm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 5: Create the initial changeset for the three packages**

```bash
cd /Users/sarthakpatnaik/Code/open-edu && pnpm exec changeset
```

Add a `.changeset/*.md` that bumps `@open-edu/schemas`, `@open-edu/oep-distribution`, `@open-edu/registry` as `minor` (0.1.0 → 0.2.0 is fine; or `patch`). Merge it on the next release PR so the first publish includes all three.

- [ ] **Step 6: Commit**

```bash
cd /Users/sarthakpatnaik/Code/open-edu && git add .changeset package.json .github/workflows/release.yml && git commit -m "chore(release): add changesets publish workflow"
```

> **First publish:** requires an `NPM_TOKEN` repo secret (owner scope). On merge to `main`, the Release workflow publishes all three packages (the first `changeset publish` publishes any package not already on npm). Verify: `npm view @open-edu/registry` lists the version. For a manual first publish: `pnpm --filter @open-edu/schemas --filter @open-edu/oep-distribution --filter @open-edu/registry build && pnpm exec changeset publish`.

---

## Part D — Registry Repo Tasks (data + CI only)

All commands in Part D run in `/Users/sarthakpatnaik/Code/openedu-library`.

### Task 5: Bootstrap the repository

**Files:**

- Create: `.gitignore`, `.nvmrc`, `LICENSE`, `package.json`, `README.md` (skeleton), `scripts/make-placeholder.js`

- [ ] **Step 1: `git init` and write the base files**

```bash
cd /Users/sarthakpatnaik/Code/openedu-library && git init -b main
```

`.gitignore`:

```gitignore
node_modules/
dist/
*.oep
*.log
.DS_Store
```

`.nvmrc`:

```
22
```

`LICENSE` (MIT, copyright line for the registry infrastructure):

```text
MIT License

Copyright (c) 2026 OpenEdu Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`package.json` — the only devDependency is the shared library:

```json
{
  "name": "openedu-library",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "validate:metadata": "open-edu-registry validate-metadata",
    "validate:catalog": "open-edu-registry validate-catalog catalog.json",
    "generate:catalog": "open-edu-registry generate-catalog --repo \"$GITHUB_REPOSITORY\" --out catalog.json",
    "validate:release": "open-edu-registry validate-release --repo \"$GITHUB_REPOSITORY\" --tag \"$GITHUB_REF_NAME\"",
    "generate:schemas": "open-edu-registry generate-schemas --out schemas"
  },
  "devDependencies": {
    "@open-edu/registry": "^0.1.0"
  }
}
```

`README.md` (skeleton — full content lands in Task 7):

```markdown
# OpenEdu Library

Official course registry for OpenEdu — a GitHub-native, backend-free package registry.

- Browse courses: <https://<owner>.github.io/openedu-library/catalog.json>
- Read the docs: [Course Registry](docs/COURSE_REGISTRY.md), [Publishing Guide](docs/PUBLISHING_GUIDE.md)

This repository stores metadata only. `.oep` packages live in [GitHub Releases](https://github.com/<owner>/openedu-library/releases).
```

- [ ] **Step 2: Write `scripts/make-placeholder.js`** (the only repo script; solid-color PNG via `node:zlib`, no deps)

```javascript
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

export function makePng({ width = 480, height = 320, r = 90, g = 140, b = 200 } = {}) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const off = row + 1 + x * 3;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const course = process.argv[2];
  if (!course) {
    console.error('usage: node scripts/make-placeholder.js <course-id>');
    process.exit(1);
  }
  const dir = join('courses', course);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, 'thumbnail.png');
  writeFileSync(out, makePng());
  console.log(`wrote ${out}`);
}
```

- [ ] **Step 3: Install + generate schemas + commit**

```bash
cd /Users/sarthakpatnaik/Code/openedu-library && npm install && npm run generate:schemas
git add .gitignore .nvmrc LICENSE package.json README.md scripts schemas package-lock.json && git commit -m "chore: bootstrap openedu-library registry repo"
```

Expected: `npm install` pulls `@open-edu/registry` (+ its transitive deps) with no build step; `npm run generate:schemas` writes `schemas/metadata.schema.json` and `schemas/catalog.schema.json` from the published Zod schemas.

---

### Task 6: Example courses + thumbnails

**Files:**

- Create: `courses/tribal-art/metadata.json`, `courses/tribal-art/README.md`, `courses/tribal-art/screenshots/.gitkeep`
- Create: `courses/science-grade7/metadata.json`, `courses/science-grade7/README.md`

- [ ] **Step 1: Write the metadata + READMEs**

`courses/tribal-art/metadata.json`:

```json
{
  "id": "tribal-art",
  "name": "Indian Tribal Art",
  "description": "Explore the traditional art forms of India.",
  "author": "OpenEdu Authors",
  "license": "CC-BY-SA-4.0",
  "languages": ["en"],
  "thumbnail": "thumbnail.png",
  "tags": ["art", "india"]
}
```

`courses/science-grade7/metadata.json`:

```json
{
  "id": "science-grade7",
  "name": "Science Grade 7",
  "description": "Seventh-grade science curriculum.",
  "author": "OpenEdu Authors",
  "license": "CC-BY-SA-4.0",
  "languages": ["en"],
  "thumbnail": "thumbnail.png",
  "tags": ["science"]
}
```

`courses/tribal-art/README.md`:

```markdown
# Indian Tribal Art

This is an example registry entry. Replace this README with real course
details and put screenshots in `screenshots/`.

To publish: see the [Publishing Guide](../docs/PUBLISHING_GUIDE.md).
```

`courses/science-grade7/README.md`:

```markdown
# Science Grade 7

This is an example registry entry. Replace this README with real course
details.

To publish: see the [Publishing Guide](../docs/PUBLISHING_GUIDE.md).
```

`courses/tribal-art/screenshots/.gitkeep`: empty file.

- [ ] **Step 2: Generate placeholder thumbnails and validate**

```bash
cd /Users/sarthakpatnaik/Code/openedu-library && node scripts/make-placeholder.js tribal-art && node scripts/make-placeholder.js science-grade7
npm run validate:metadata
```

Expected: `wrote courses/tribal-art/thumbnail.png` (and science-grade7), then `validated 2 course(s) in courses`.

- [ ] **Step 3: Commit**

```bash
cd /Users/sarthakpatnaik/Code/openedu-library && git add courses && git commit -m "feat(courses): add example courses with placeholder thumbnails"
```

---

### Task 7: Documentation (spec-required six docs)

**Files:**

- Create: `docs/COURSE_REGISTRY.md`, `docs/CATALOG_SPEC.md`, `docs/METADATA_SPEC.md`, `docs/PUBLISHING_GUIDE.md`, `docs/RELEASE_PROCESS.md`, `docs/ARCHITECTURE.md`
- Modify: `README.md` (full content)

Write the six docs with the same content as the previous plan revision, **updated to use the shared library**:

- `COURSE_REGISTRY.md` — overview; table of what lives here (metadata authored, `catalog.json`/`schemas/*.json` generated, `.oep` in Releases); catalog URL `https://<owner>.github.io/openedu-library/catalog.json`; `VITE_CATALOG_URL` note.
- `CATALOG_SPEC.md` — the contract below; note "generated from `@open-edu/schemas` `CatalogSchema`; never hand-edit; validate with `npm run validate:catalog`".
- `METADATA_SPEC.md` — field table (`id`, `name`, `author`, `license`, `languages` required; `description`, `version` (informational), `thumbnail`, `screenshots`, `tags`, `type` optional); directory ↔ tag id rule; validate with `npm run validate:metadata`.
- `PUBLISHING_GUIDE.md` — three steps: (1) add `courses/<id>/metadata.json` via PR (validated by `validate.yml`); (2) build `.oep` with `edu oep:build` in the monorepo; (3) `gh release create <id>-v<semver>` with the `.oep` + `checksums.txt`. Include the mermaid flowchart. Emphasize: tag `<id>-v<semver>`, asset `<id>-<semver>.oep`, never edit `catalog.json`.
- `RELEASE_PROCESS.md` — naming table, required assets, mermaid decision diagram of what CI enforces, versioning policy, deprecation note.
- `ARCHITECTURE.md` — repo tree; publishing sequence diagram (author → `edu oep:build` → GitHub Releases → `release-validate.yml` → `generate-catalog.yml` → Pages → learner app); install flow; update flow; tooling table naming `@open-edu/registry` commands (`open-edu-registry validate-metadata | validate-catalog | generate-catalog | validate-release | generate-schemas`) and noting the logic lives in the published package, not the repo; security model; extensibility.

`README.md` (final):

````markdown
# OpenEdu Library

Official course registry for OpenEdu — a GitHub-native, backend-free package registry.

- **Browse the catalog:** <https://<owner>.github.io/openedu-library/catalog.json>
- **Docs:** [Course Registry](docs/COURSE_REGISTRY.md) · [Catalog Spec](docs/CATALOG_SPEC.md) · [Metadata Spec](docs/METADATA_SPEC.md) · [Publishing Guide](docs/PUBLISHING_GUIDE.md) · [Release Process](docs/RELEASE_PROCESS.md) · [Architecture](docs/ARCHITECTURE.md)

This repository stores **metadata only**. All registry logic (validation, catalog
generation, release checks) lives in the published `@open-edu/registry` package.
`.oep` packages live in [GitHub Releases](https://github.com/<owner>/openedu-library/releases).

## Quick start (maintainer)

```bash
npm install
npm run validate:metadata
npm run validate:catalog
npm run generate:schemas     # regenerate schemas/*.json from the library
npx --no-install open-edu-registry generate-catalog --repo <owner>/openedu-library --dry-run
```
````

## Quick start (learner)

Point the OpenEdu learner app at the catalog:

```
VITE_CATALOG_URL=https://<owner>.github.io/openedu-library/catalog.json
```

````

- [ ] **Step 1: Write the six docs + final README** (content per above; mermaid diagrams copied from the previous plan revision).
- [ ] **Step 2: Commit**

```bash
cd /Users/sarthakpatnaik/Code/openedu-library && git add README.md docs && git commit -m "docs: add registry, spec, and architecture documentation"
````

---

### Task 8: GitHub Actions workflows

**Files:**

- Create: `.github/workflows/validate.yml`
- Create: `.github/workflows/release-validate.yml`
- Create: `.github/workflows/generate-catalog.yml`
- Create: `.github/workflows/deploy-pages.yml`

All four call the published CLI via the installed `@open-edu/registry` bin (`npx --no-install open-edu-registry ...`).

- [ ] **Step 1: `validate.yml`** (schema validity, required fields, unique IDs)

```yaml
name: Validate

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run validate:metadata
      - run: npm run validate:catalog
```

- [ ] **Step 2: `release-validate.yml`** (.oep exists, checksums.txt exists + matches, package is a valid OEP)

```yaml
name: Validate Release

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      tag:
        description: 'Release tag to validate (e.g. tribal-art-v0.4.0)'
        required: true

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Validate release assets
        env:
          REPO: ${{ github.repository }}
          TAG: ${{ github.event.release.tag_name || inputs.tag }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx --no-install open-edu-registry validate-release --repo "$REPO" --tag "$TAG"
```

- [ ] **Step 3: `generate-catalog.yml`** (regenerate + commit + no manual edits)

```yaml
name: Generate Catalog

on:
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: catalog-generation
  cancel-in-progress: false

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Regenerate catalog.json
        env:
          REPO: ${{ github.repository }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx --no-install open-edu-registry generate-catalog --repo "$REPO" --out catalog.json --strict
      - name: Commit regenerated catalog
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add catalog.json
          git diff --cached --quiet || git commit -m "chore(catalog): regenerate catalog.json"
          git push
```

- [ ] **Step 4: `deploy-pages.yml`** (publish catalog.json + static assets)

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Verify YAML parses**

Run: `cd /Users/sarthakpatnaik/Code/openedu-library && npx --yes yaml-lint .github/workflows/*.yml`
Expected: no parse errors. If `yaml-lint` is unavailable, a manual read-through is acceptable; correctness is confirmed on the first CI run after push.

- [ ] **Step 6: Commit**

```bash
cd /Users/sarthakpatnaik/Code/openedu-library && git add .github && git commit -m "ci: add validate, release-validate, generate-catalog, and deploy-pages workflows"
```

---

### Task 9: Seed catalog + end-to-end verification

- [ ] **Step 1: Full local validation pass**

Run (in `/Users/sarthakpatnaik/Code/openedu-library`):

```bash
npm run validate:metadata && npm run validate:catalog && npm run generate:schemas
```

Expected: `validated 2 course(s) in courses`; `catalog.json is valid (0 package(s))`; schemas regenerate (no diff).

- [ ] **Step 2: Generate the seed catalog**

Run: `cd /Users/sarthakpatnaik/Code/openedu-library && npx --no-install open-edu-registry generate-catalog --repo <owner>/openedu-library`
Expected: `wrote catalog.json with 0 package(s), 0 version(s)` (no releases exist yet — the committed `catalog.json` is a valid empty seed; CI regenerates it from live releases on every release). Commit:

```bash
git add catalog.json && git commit -m "chore(catalog): seed empty catalog"
```

- [ ] **Step 3: Verify a real `.oep` end-to-end (offline)**

In the open-edu repo, build a real package with the framework's own builder, then validate it with the framework's own `OepReader` (the exact reader the registry's `validate-release` uses):

```bash
cd /Users/sarthakpatnaik/Code/open-edu && pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js oep:build examples/hello-world -o /tmp/oep && ls /tmp/oep
cd /Users/sarthakpatnaik/Code/open-edu && node -e "
import('@open-edu/oep-distribution').then(async ({ OepReader }) => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const file = readdirSync('/tmp/oep')[0];
  const inspection = await new OepReader().inspect(new Uint8Array(readFileSync('/tmp/oep/' + file)));
  console.log('OK', inspection.id, inspection.version);
});"
```

Expected: prints `OK hello-world 1.0.0` (or the example's actual id/version). This confirms `edu oep:build` output passes the library's validation before anything is published.

Then confirm the published package loads in the registry repo (the only library it depends on):

```bash
cd /Users/sarthakpatnaik/Code/openedu-library && node -e "import('@open-edu/registry').then(() => console.log('@open-edu/registry loaded OK'))"
```

Expected: `@open-edu/registry loaded OK`. The full release-validation path (metadata → assets → checksums → `OepReader.inspect`) is exercised offline by the `validate-release` Vitest test in the monorepo (Task 3, Step 11) and end-to-end by `release-validate.yml`.

- [ ] **Step 4: Manual GitHub E2E checklist (after first push)**

1. Push `openedu-library` to GitHub, enable **Settings → Pages → Source: GitHub Actions**.
2. Merge a metadata PR for a real course → `validate.yml` green.
3. Build a real `.oep`; create a release `<id>-v<version>` with the `.oep` + `checksums.txt`.
4. Confirm `release-validate.yml` and `generate-catalog.yml` run green and `catalog.json` updates on `main`.
5. Open `https://<owner>.github.io/openedu-library/catalog.json` — course present.
6. In the learner app, set `VITE_CATALOG_URL` to that URL; the course appears in the catalog and installs/updates (checksum enforced by the Task 2 change).

- [ ] **Step 5: Commit any remaining changes**

```bash
cd /Users/sarthakpatnaik/Code/openedu-library && git status && git add -A && git commit -m "chore: finalize openedu-library registry"
```

---

## Part E — Documentation Updates (open-edu monorepo)

> These edits live in `/Users/sarthakpatnaik/Code/open-edu`. Do them after Task 4 (the packages exist) and before/with the first publish. OpenWiki pages in `openwiki/` are the in-repo source for the generated wiki — update them here, not on the wiki.

### Task 10: Update open-edu documentation (README, OpenWiki, Docusaurus, AGENTS)

**Files (open-edu):**

- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `openwiki/quickstart.md`
- Modify: `openwiki/architecture/overview.md`
- Modify: `openwiki/operations/testing-and-changes.md`
- Modify: `apps/docs/docs/oep-distribution.md`
- Modify: `apps/docs/docs/schemas.md`
- Create: `apps/docs/docs/registry.md`
- Modify: `apps/docs/sidebars.ts`
- Modify: `docs/RELEASE.md`

- [ ] **Step 1: Root `README.md`**

1. **Packages table** — add a row after `@open-edu/oep-distribution`:

   | `@open-edu/registry` | GitHub-native course registry tooling — GitHub Releases API client, catalog builder (metadata + releases → `catalog.json`), release-asset validation (reuses `OepReader`), JSON Schema generation, `open-edu-registry` CLI. Powers the [`openedu-library`](https://github.com/<owner>/openedu-library) course registry. | Done |

2. **Package Dependency Graph** — under the `oep-distribution` node add:

   ```
   ├──► oep-distribution ──► registry (course registry tooling, published to npm)
   │                      ──► learner (install/catalog/update UI)
   │                      ──► cli (oep:build command)
   ```

   and add a trailing note: `registry ──► openedu-library (external registry repo consumes the published package)`.

3. **Project Structure** — add under `packages/`:

   ```
   │   ├── registry/            # GitHub-native course registry tooling (catalog builder, release validation)
   ```

4. **Release Process** section — add a sentence: `@open-edu/schemas`, `@open-edu/oep-distribution`, and `@open-edu/registry` are published to npm by the changesets Release workflow (needs the `NPM_TOKEN` secret). The `openedu-library` registry repo consumes `@open-edu/registry` and points learners at its catalog via `VITE_CATALOG_URL`.

- [ ] **Step 2: `AGENTS.md`**

1. **Monorepo Structure** tree — add under `packages/`:

   ```
   │   ├── registry/             # Course registry tooling (catalog builder, release validation, open-edu-registry CLI)
   ```

2. **Package Naming** list — add `- @open-edu/registry`.
3. **Essential Commands** — add:

   ```bash
   pnpm --filter @open-edu/registry test  # Run registry package tests
   ```

4. **Dependency Graph** — add a node under Epic 300: `└─► @open-edu/registry (registry tooling) ──► openedu-library (course registry repo)`.

- [ ] **Step 3: `openwiki/quickstart.md`**

1. **Package list** — add a bullet after the `@open-edu/oep-distribution` entry:
   `- \`packages/registry\` — GitHub-native course registry tooling: GitHub Releases API client, catalog builder (metadata + releases → \`catalog.json\`), release-asset validation via \`OepReader\`, JSON Schema generation, and the \`open-edu-registry\` CLI. Consumed by the \`openedu-library\` registry repo.`
2. **"Where to start" map** — add: `- Change course registry tooling (catalog generation, release validation): start in \`packages/registry\` and the \`openedu-library\` repo.`

- [ ] **Step 4: `openwiki/architecture/overview.md`**

Add a `### @open-edu/registry` section after the `@open-edu/oep-distribution` section:

```markdown
### `@open-edu/registry`

Node-only course registry tooling for GitHub-native distribution, published to npm:

- **GitHub API client** — list/get releases, download assets, parse `<id>-v<semver>` tags and `checksums.txt`
- **Catalog builder** — `buildCatalog()` merges `courses/*/metadata.json` + GitHub Releases into a `catalog.json` conforming to `CatalogSchema` (reuses `computeSha256`, `parseSemver`)
- **Release validation** — `validateRelease()` checks metadata presence, `.oep` asset + `checksums.txt`, SHA-256 cross-check, and validates the package with `OepReader`
- **JSON Schema generation** — emits `metadata.schema.json` / `catalog.schema.json` from the Zod schemas via `toJsonSchemaDraft7`
- **CLI** — `open-edu-registry validate-metadata | validate-catalog | generate-catalog | validate-release | generate-schemas`

Consumed by the `openedu-library` course registry repo (GitHub Actions call the CLI via `npx --no-install`).
```

Also add to the source-map list: `- course registry (catalog build, release validation, schema generation): \`packages/registry\` + the \`openedu-library\` repo`.

- [ ] **Step 5: `openwiki/operations/testing-and-changes.md`**

1. **Core commands** — add `pnpm --filter @open-edu/registry test` with a short description.
2. **"Where to start" mapping** — add `- course registry tooling: \`packages/registry\``.

- [ ] **Step 6: Docusaurus (`apps/docs`)**

1. **Create `apps/docs/docs/registry.md`** (frontmatter `sidebar_position: 21`):

   ```markdown
   ---
   sidebar_position: 21
   ---

   # Course Registry (`@open-edu/registry`)

   `@open-edu/registry` is the published Node tooling behind the OpenEdu course
   registry. It provides the `open-edu-registry` CLI used by GitHub Actions to
   validate course metadata, validate release assets, and regenerate `catalog.json`.

   The [openedu-library](https://github.com/<owner>/openedu-library) repository is the
   actual registry: `courses/*/metadata.json` files are authored by maintainers,
   `.oep` packages live in GitHub Releases, and CI publishes the generated catalog
   to GitHub Pages. The learner app consumes it via `VITE_CATALOG_URL`.

   See the registry repo's docs (`docs/COURSE_REGISTRY.md`, `docs/PUBLISHING_GUIDE.md`)
   for the authoring and publishing workflow. `@open-edu/registry` itself reuses
   `OepReader`, `computeSha256`, and the `CatalogSchema` from `@open-edu/oep-distribution`.
   ```

2. **`sidebars.ts`** — add `'registry'` to the sidebar list, adjacent to `'oep-distribution'`.
3. **`apps/docs/docs/oep-distribution.md`** — add a note: install now enforces the catalog checksum (`catalogSource`'s `expectedChecksum` is verified in `installInternal` → `CHECKSUM_MISMATCH`), and the package is published to npm.
4. **`apps/docs/docs/schemas.md`** — mention `RegistryMetadataSchema` and `toJsonSchemaDraft7` (draft-07 JSON Schema generation) alongside the existing `toJsonSchema` example.

- [ ] **Step 7: `docs/RELEASE.md`**

Update the release checklist to reflect that `@open-edu/schemas`, `@open-edu/oep-distribution`, and `@open-edu/registry` are published to npm by the `.github/workflows/release.yml` changesets workflow. Document: the `NPM_TOKEN` repo secret, that the first publish happens automatically for packages not yet on npm, and that publishing these three is a prerequisite for `openedu-library` CI (`npm ci` installs `@open-edu/registry`).

- [ ] **Step 8: Verify + commit**

```bash
cd /Users/sarthakpatnaik/Code/open-edu && pnpm --filter @open-edu/docs build
cd /Users/sarthakpatnaik/Code/open-edu && pnpm exec prettier --write README.md AGENTS.md docs/RELEASE.md openwiki apps/docs/docs/registry.md apps/docs/sidebars.ts
git add README.md AGENTS.md docs/RELEASE.md openwiki apps/docs && git commit -m "docs: document @open-edu/registry and the openedu-library course registry"
```

Expected: the Docusaurus site builds (validates the new page + sidebar entry); prettier reformats cleanly.

---

## Part F — Spec Coverage Map (self-review)

| Spec requirement                                                                                                | Where it is implemented                                                                                        |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Single repo `openedu-library`                                                                                   | Task 5                                                                                                         |
| Repo stores no `.oep` files                                                                                     | D3/D6; `.gitignore` `*.oep`; docs                                                                              |
| Releases: tag + `.oep` + `checksums.txt`, future `.sig`                                                         | `@open-edu/registry` `validate-release` + `docs/RELEASE_PROCESS.md`                                            |
| Metadata with no release URL (URLs generated)                                                                   | `@open-edu/registry` `catalog-builder`; D4                                                                     |
| `catalog.json` generated, never hand-edited                                                                     | `@open-edu/registry` `generate-catalog` + `generate-catalog.yml`                                               |
| Publishing workflow (author → build → release → action → generate → commit → deploy)                            | `generate-catalog.yml` + `deploy-pages.yml`                                                                    |
| Validate metadata (schema, required, unique IDs)                                                                | `@open-edu/registry` `validate-metadata` + `validate.yml`                                                      |
| Validate release assets (`.oep` exists, checksum matches, valid OEP)                                            | `@open-edu/registry` `validate-release` (via `OepReader`) + `release-validate.yml`                             |
| Generate catalog from metadata + releases                                                                       | `@open-edu/registry` `buildCatalog`                                                                            |
| Deploy GitHub Pages (catalog + static assets)                                                                   | `deploy-pages.yml`                                                                                             |
| Install from catalog / URL / import                                                                             | Already in learner app (A.1); no registry work needed                                                          |
| Update detection (installed vs latest)                                                                          | Already in learner app; `latestVersion` produced by `buildCatalog`                                             |
| Security: SHA-256, metadata schema, manifest, duplicate IDs                                                     | `@open-edu/registry` (reuses `computeSha256`, `OepReader`, Zod schemas); checksum enforced on install (Task 2) |
| Do not implement package creation                                                                               | Out of scope; guide points at `edu oep:build`                                                                  |
| Single library — no duplicated scripts                                                                          | D9; `openedu-library` devDep is only `@open-edu/registry`                                                      |
| Docs updated for the library (README, OpenWiki, Docusaurus, AGENTS, RELEASE)                                    | Task 10                                                                                                        |
| Extensibility (multiple registries, signatures, deltas, CDN…)                                                   | `docs/ARCHITECTURE.md`, additive schema fields                                                                 |
| DX: add metadata → upload release → merge PR                                                                    | `docs/PUBLISHING_GUIDE.md`                                                                                     |
| Docs: `COURSE_REGISTRY`, `CATALOG_SPEC`, `METADATA_SPEC`, `PUBLISHING_GUIDE`, `RELEASE_PROCESS`, `ARCHITECTURE` | Task 7                                                                                                         |
| Diagrams (repo structure, publishing, install, update, migration)                                               | Task 7 mermaid diagrams                                                                                        |
| App depends only on Catalog API contract                                                                        | D1 — catalog conforms to `CatalogSchema`                                                                       |

### Open risks / decisions to confirm with the user

1. **Catalog format** — this plan intentionally deviates from the spec's sketchy catalog shape to match the framework's `CatalogSchema` (D1). If you prefer the spec's literal shape, we must also update `@open-edu/schemas` + learner parsing (bigger change).
2. **GitHub owner** for Pages/raw URLs and the `--repo` flag (placeholder `<owner>`).
3. **First npm publish** requires an `NPM_TOKEN` secret and the `@open-edu/schemas` package being un-private (Task 1 Step 1). Until the first publish succeeds, `openedu-library`'s `npm install` of `@open-edu/registry` will fail.
4. **`thumbnail`** uses `.png` placeholders in examples (the spec shows `.webp`); the schema allows both.
5. **Pre-releases** are excluded from the catalog by default (`--include-prerelease` to opt in).
6. **Private packages** in the monorepo (apps, other packages) are not published by changesets but will still get version bumps in `.changeset/*.md` files; acceptable noise, or add them to `ignore` in `.changeset/config.json` if it becomes annoying.
