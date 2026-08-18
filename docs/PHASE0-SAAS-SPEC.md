# Phase 0: Local-First SaaS Deployment Spec

Version: 0.1.0
Status: Draft
Parent: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 1. Goal

Deploy OpenEdu Course Creator Studio as a **zero-infrastructure, browser-only SPA** on Vercel. Users create, edit, import, and export courses entirely in the browser. No cloud database, no file storage backend. The only serverless function is an LLM proxy for AI features.

**Success criteria:**

- A user visits a Vercel URL, creates a course from a template, edits it, and downloads the `.oep` — with zero server-side storage
- The existing `edu dev` local experience continues working unchanged
- AI features work when an LLM API key is configured; graceful degradation without one

---

## 2. Architecture

```text
┌──────────────────────────────────────────────────────┐
│  Vercel CDN (Static SPA)                             │
│                                                      │
│  React App                                           │
│    ├── StudioApp ──► createStudioApi()               │
│    │                  (unchanged — fetch-based)       │
│    │                                                 │
│    ├── BrowserStudioApi (new)                        │
│    │     ├──► IndexedDB (course files + metadata)    │
│    │     ├──► Blob URLs (asset serving)              │
│    │     └──► fetch('/api/ai/*') (LLM proxy only)   │
│    │                                                 │
│    └──► OepWriter.build() (in-browser via fflate)    │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Vercel Serverless Function                          │
│    api/ai/[...route].ts                              │
│    ──► @open-edu/llm-config (OpenAI/OpenRouter)      │
│    ──► No filesystem, no state, pure request→response│
└──────────────────────────────────────────────────────┘
```

### 2.1 Design Principles

1. **StudioApi is the only contract.** The UI never changes — only the `createStudioApi()` factory is swapped at build time.
2. **Reuse `@open-edu/storage`.** The learner app already has a mature IndexedDB layer (`open-edu` database, `courses` store) with `saveCourse`/`getCourse`/`listCourses`/`deleteCourse`/`replaceCourse`. The Studio wraps these with a thin adapter that converts between the `StoredCourse` shape and the flat file map the authoring UI needs. **Same database, same data shape, same course works in both apps.**
3. **OepWriter is already browser-compatible.** Uses `fflate` (pure JS zip) + Web Crypto — no changes needed.
4. **AI degrades gracefully.** Without an API key, the Studio works for manual course creation. With one, AI generation, item add/edit, and chat streaming work via the serverless proxy.
5. **No cross-device sync.** Data lives per-browser. Phase 1 adds cloud persistence.

---

## 3. File Plan

```
apps/dev-server/
├── src/
│   ├── studio/
│   │   ├── studioStorageAdapter.ts    # NEW — thin wrapper over @open-edu/storage for Studio use
│   │   ├── storedCourseConverter.ts   # NEW — StoredCourse ↔ flat file map conversion
│   │   ├── browserStudioApi.ts        # NEW — StudioApi impl over studioStorageAdapter
│   │   ├── studioApi.ts               # MODIFY — export StudioApi type only (extract impl)
│   │   └── serverStudioApi.ts         # NEW — extracted from studioApi.ts (current fetch-based impl)
│   ├── DevApp.tsx                     # MODIFY — conditional api factory based on build mode
│   └── main.tsx                       # MODIFY — no changes expected (I18nProvider wrapping)
├── api/
│   └── ai/
│       └── [...route].ts              # NEW — Vercel serverless function (AI proxy)
├── vercel.json                        # NEW — Vercel deployment config
├── vite.config.ts                     # MODIFY — add browser mode build define
└── package.json                       # MODIFY — add @open-edu/storage dep, build:browser script
```

**Key:** No new IndexedDB database. No new schema. The Studio uses the existing `open-edu` database from `@open-edu/storage` (version 4, 9 object stores). Courses created in the Studio are directly readable by the learner app and vice versa.

---

## 4. Detailed Implementation

### 4.1 `src/studio/studioStorageAdapter.ts` — Storage Adapter

**Purpose:** Thin wrapper over `@open-edu/storage` that adds Studio-specific operations (file-level CRUD within a course) while reusing the existing `open-edu` IndexedDB database.

The adapter does **not** own the database schema. It delegates to `saveCourse`/`getCourse`/`listCourses`/`deleteCourse`/`replaceCourse` from `@open-edu/storage` and handles the shape conversion between `StoredCourse` (storage format) and the flat file map the Studio UI needs.

#### Why Not a Custom Database?

The learner app (`apps/learner`) already stores courses in the `open-edu` IndexedDB database using `@open-edu/storage`. A course created in the Studio should be immediately openable in the learner without export/import. By reusing the same database and `StoredCourse` shape:

- A Studio-created course appears in the learner's course list
- A learner-downloaded `.oep` can be edited in the Studio
- No migration code needed — both apps read/write the same records

#### Interface

```ts
// studioStorageAdapter.ts

import {
  saveCourse,
  getCourse,
  listCourses,
  deleteCourse,
  replaceCourse,
  type StoredCourse,
} from '@open-edu/storage';
import {
  storedCourseToFiles,
  filesToStoredCourse,
  storedCourseToSummary,
  type CourseFileMap,
  type CourseSummary,
} from './storedCourseConverter.js';

/**
 * Studio-specific storage operations.
 * All course data flows through @open-edu/storage's `courses` object store
 * in the `open-edu` IndexedDB database (version 4).
 */
export interface StudioStorageAdapter {
  // Course-level operations
  listCourses(): Promise<CourseSummary[]>;
  getCourseFiles(id: string): Promise<CourseFileMap | null>;
  createCourse(
    id: string,
    title: string,
    files: Record<string, string>,
    assets?: Record<string, Uint8Array>,
  ): Promise<void>;
  updateCourseFiles(id: string, files: Record<string, string>): Promise<void>;
  deleteCourse(id: string): Promise<void>;
  duplicateCourse(sourceId: string, newId: string, newTitle: string): Promise<void>;

  // File-level operations (convenience wrappers)
  readFile(courseId: string, path: string): Promise<string | null>;
  writeFile(courseId: string, path: string, content: string): Promise<void>;
  deleteFile(courseId: string, path: string): Promise<void>;
  listFiles(courseId: string): Promise<string[]>;

  // Asset operations
  readAsset(courseId: string, path: string): Promise<Uint8Array | null>;
  writeAsset(courseId: string, path: string, data: Uint8Array): Promise<void>;
  deleteAsset(courseId: string, path: string): Promise<void>;
  listAssets(courseId: string): Promise<string[]>;

  // OEP import (reads .oep bytes, stores as StoredCourse)
  importOep(bytes: Uint8Array): Promise<CourseSummary>;
}

export interface CourseFileMap {
  id: string;
  title: string;
  files: Record<string, string>; // relative path → text content
  assets: Record<string, Uint8Array>; // relative path → binary data
  version: string;
}
```

#### Implementation

```ts
export function createStudioStorageAdapter(): StudioStorageAdapter {
  return {
    async listCourses() {
      const courses = await listCourses();
      return courses.map(storedCourseToSummary);
    },

    async getCourseFiles(id: string) {
      const course = await getCourse(id);
      if (!course) return null;
      return storedCourseToFiles(course);
    },

    async createCourse(id, title, files, assets = new Map()) {
      const stored = filesToStoredCourse(id, title, '1.0.0', files, assets);
      await saveCourse(stored);
    },

    async updateCourseFiles(id, files) {
      const existing = await getCourse(id);
      if (!existing) throw new Error(`Course "${id}" not found`);
      // Merge: keep existing assets, replace text files
      const merged = filesToStoredCourse(
        id,
        String(existing.manifest.title ?? id),
        existing.version,
        files,
        new Map(existing.assets.map((a) => [a.path, a.data])),
      );
      await replaceCourse(id, merged);
    },

    async deleteCourse(id) {
      await deleteCourse(id);
    },

    async duplicateCourse(sourceId, newId, newTitle) {
      const source = await getCourse(sourceId);
      if (!source) throw new Error(`Course "${sourceId}" not found`);
      const files = storedCourseToFiles(source);
      const duplicated = filesToStoredCourse(
        newId,
        newTitle,
        source.version,
        files.files,
        new Map(files.assets.entries()),
      );
      await saveCourse(duplicated);
    },

    async readFile(courseId, path) {
      const course = await getCourse(courseId);
      if (!course) return null;
      const files = storedCourseToFiles(course);
      return files.files[path] ?? null;
    },

    async writeFile(courseId, path, content) {
      const course = await getCourse(courseId);
      if (!course) throw new Error(`Course "${courseId}" not found`);
      const files = storedCourseToFiles(course);
      files.files[path] = content;
      const updated = filesToStoredCourse(
        courseId,
        String(course.manifest.title ?? courseId),
        course.version,
        files.files,
        new Map(course.assets.map((a) => [a.path, a.data])),
      );
      await replaceCourse(courseId, updated);
    },

    async deleteFile(courseId, path) {
      const course = await getCourse(courseId);
      if (!course) throw new Error(`Course "${courseId}" not found`);
      const files = storedCourseToFiles(course);
      delete files.files[path];
      const updated = filesToStoredCourse(
        courseId,
        String(course.manifest.title ?? courseId),
        course.version,
        files.files,
        new Map(course.assets.map((a) => [a.path, a.data])),
      );
      await replaceCourse(courseId, updated);
    },

    async listFiles(courseId) {
      const course = await getCourse(courseId);
      if (!course) return [];
      const files = storedCourseToFiles(course);
      return Object.keys(files.files);
    },

    async readAsset(courseId, path) {
      const course = await getCourse(courseId);
      if (!course) return null;
      const asset = course.assets.find((a) => a.path === path || a.path === `assets/${path}`);
      return asset ? new Uint8Array(asset.data) : null;
    },

    async writeAsset(courseId, path, data) {
      const course = await getCourse(courseId);
      if (!course) throw new Error(`Course "${courseId}" not found`);
      const normalized = path.startsWith('assets/') ? path : `assets/${path}`;
      const assets = course.assets.filter((a) => a.path !== normalized);
      assets.push({ path: normalized, data: data.buffer.slice(0) });
      const files = storedCourseToFiles(course);
      const updated = filesToStoredCourse(
        courseId,
        String(course.manifest.title ?? courseId),
        course.version,
        files.files,
        new Map(assets.map((a) => [a.path, new Uint8Array(a.data)])),
      );
      await replaceCourse(courseId, updated);
    },

    async deleteAsset(courseId, path) {
      const course = await getCourse(courseId);
      if (!course) throw new Error(`Course "${courseId}" not found`);
      const normalized = path.startsWith('assets/') ? path : `assets/${path}`;
      const assets = course.assets.filter((a) => a.path !== normalized);
      const files = storedCourseToFiles(course);
      const updated = filesToStoredCourse(
        courseId,
        String(course.manifest.title ?? courseId),
        course.version,
        files.files,
        new Map(assets.map((a) => [a.path, new Uint8Array(a.data)])),
      );
      await replaceCourse(courseId, updated);
    },

    async listAssets(courseId) {
      const course = await getCourse(courseId);
      if (!course) return [];
      return course.assets.map((a) => a.path.replace(/^assets\//, ''));
    },

    async importOep(bytes) {
      const { OepReader } = await import('@open-edu/oep-distribution');
      const reader = new OepReader();
      const extraction = await reader.read(bytes);

      const files: Record<string, string> = {};
      const assets = new Map<string, Uint8Array>();

      for (const [path, content] of extraction.files) {
        if (isTextFile(path)) {
          files[path] = new TextDecoder().decode(content);
        } else {
          assets.set(path, content);
        }
      }

      const manifest = files['package.json'] ? JSON.parse(files['package.json']) : {};
      const id = manifest.id ?? `imported-${Date.now()}`;
      const title = manifest.title ?? 'Imported Course';
      const version = manifest.version ?? '1.0.0';

      await this.createCourse(id, title, files, assets);
      return { id, title, version };
    },
  };
}

function isTextFile(path: string): boolean {
  const textExts = new Set(['.md', '.json', '.txt', '.yaml', '.yml']);
  const ext = path.substring(path.lastIndexOf('.'));
  return textExts.has(ext);
}
```

---

### 4.2 `src/studio/storedCourseConverter.ts` — Shape Conversion

**Purpose:** Convert between `StoredCourse` (the `@open-edu/storage` format) and the flat file map the Studio authoring UI needs.

#### The Two Shapes

**`StoredCourse`** (what IndexedDB stores):

```ts
{
  id: string;
  version: string;
  manifest: Record<string, unknown>;  // e.g. { id, title, version, entry, ... }
  nodes: Record<string, unknown>[];   // [{ relativePath: "nodes/lesson.md", content: "# Hello" }]
  assets: { path: string; data: ArrayBuffer }[];
  downloadedAt: string;
  workflow?: Record<string, unknown>; // { entry, routing: { "nodes/lesson.md": { onComplete: "COMPLETED" } } }
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
}
```

**`CourseFileMap`** (what the Studio UI uses):

```ts
{
  id: string;
  title: string;
  files: Record<string, string>; // { "package.json": "...", "nodes/lesson.md": "# Hello", "workflow.json": "..." }
  assets: Record<string, Uint8Array>; // { "assets/logo.png": Uint8Array }
  version: string;
}
```

#### Conversion Functions

```ts
// storedCourseConverter.ts

import type { StoredCourse } from '@open-edu/storage';
import type { CourseFileMap, CourseSummary } from './studioStorageAdapter.js';

/**
 * Convert StoredCourse → flat file map.
 *
 * The Studio UI reads/writes files by relative path (e.g. "nodes/lesson.md").
 * StoredCourse stores nodes as an array and sidecars as separate fields.
 * This function reassembles them into a flat map.
 */
export function storedCourseToFiles(course: StoredCourse): CourseFileMap {
  const files: Record<string, string> = {};

  // 1. Reconstruct package.json from manifest
  files['package.json'] = JSON.stringify(course.manifest, null, 2);

  // 2. Reconstruct node files from nodes array
  for (const node of course.nodes) {
    const relativePath = (node as Record<string, unknown>).relativePath as string;
    const content = (node as Record<string, unknown>).content as string;
    files[relativePath] = content;
  }

  // 3. Reconstruct sidecar files from top-level fields
  if (course.workflow) {
    files['workflow.json'] = JSON.stringify(course.workflow, null, 2);
  }
  if (course.rewards) {
    files['rewards.json'] = JSON.stringify(course.rewards, null, 2);
  }
  if (course.cards) {
    files['cards.json'] = JSON.stringify(course.cards, null, 2);
  }

  // 4. Assets stay as binary (not in files map)
  const assets: Record<string, Uint8Array> = {};
  for (const asset of course.assets) {
    const normalized = asset.path.replace(/^assets\//, '');
    assets[normalized] = new Uint8Array(asset.data);
  }

  return {
    id: course.id,
    title: String(course.manifest.title ?? course.id),
    files,
    assets,
    version: course.version,
  };
}

/**
 * Convert flat file map → StoredCourse.
 *
 * The Studio UI writes files by relative path.
 * This function decomposes them back into the StoredCourse shape:
 * - package.json → manifest
 * - nodes/*.md, nodes/*.json → nodes array
 * - workflow.json → workflow field
 * - rewards.json → rewards field
 * - cards.json → cards field
 * - everything else → stays in files (ignored by storage, but preserved)
 */
export function filesToStoredCourse(
  id: string,
  title: string,
  version: string,
  files: Record<string, string>,
  assets: Map<string, Uint8Array> = new Map(),
): StoredCourse {
  // Extract manifest
  let manifest: Record<string, unknown> = { id, title, version };
  if (files['package.json']) {
    try {
      manifest = JSON.parse(files['package.json']);
    } catch {
      /* keep default */
    }
  }

  // Extract nodes (files under nodes/ directory)
  const nodes: Record<string, unknown>[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith('nodes/') && path !== 'nodes/') {
      nodes.push({ relativePath: path, content });
    }
  }

  // Extract sidecars
  let workflow: Record<string, unknown> | undefined;
  if (files['workflow.json']) {
    try {
      workflow = JSON.parse(files['workflow.json']);
    } catch {
      /* skip */
    }
  }

  let rewards: Record<string, unknown> | undefined;
  if (files['rewards.json']) {
    try {
      rewards = JSON.parse(files['rewards.json']);
    } catch {
      /* skip */
    }
  }

  let cards: Record<string, unknown> | undefined;
  if (files['cards.json']) {
    try {
      cards = JSON.parse(files['cards.json']);
    } catch {
      /* skip */
    }
  }

  // Convert assets map to array
  const assetsArray = Array.from(assets.entries()).map(([path, data]) => ({
    path: path.startsWith('assets/') ? path : `assets/${path}`,
    data: data.buffer.slice(0) as ArrayBuffer,
  }));

  return {
    id,
    version,
    manifest,
    nodes,
    assets: assetsArray,
    downloadedAt: new Date().toISOString(),
    workflow,
    rewards,
    cards,
  };
}

/**
 * Convert StoredCourse → summary for library listing.
 */
export function storedCourseToSummary(course: StoredCourse): CourseSummary {
  return {
    id: course.id,
    title: String(course.manifest.title ?? course.id),
    version: course.version,
    updatedAt: new Date(course.downloadedAt).getTime() || Date.now(),
  };
}
```

---

### 4.3 `src/studio/browserStudioApi.ts` — Browser StudioApi

**Purpose:** Implements the exact `StudioApi` interface (from `studioApi.ts`) using `StudioStorageAdapter` instead of HTTP fetch.

#### Key Design Decision: Interface Extraction

The current `studioApi.ts` defines `createStudioApi()` which returns an object with the `StudioApi` type. We refactor this into:

1. **`studioApi.ts`** — exports the `StudioApi` type only (the interface contract)
2. **`serverStudioApi.ts`** — the current fetch-based implementation (renamed)
3. **`browserStudioApi.ts`** — the new `@open-edu/storage`-backed implementation

```ts
// studioApi.ts (MODIFY — keep only the type)

export interface StudioApi {
  getPackageDir(): Promise<string>;
  validate(): Promise<{ valid: boolean; errors: Array<{ path: string; error: string }> }>;
  getOutline(): Promise<{ activities: ActivitySummary[]; title: string }>;
  saveOutlineOrder(orderedPaths: string[]): Promise<{ success: boolean }>;
  applyTemplate(templateId: string): Promise<{ success: boolean }>;
  exportOep(): Promise<{ blob: Blob; fileName: string }>;
  readFile(path: string): Promise<{ path: string; content: string }>;
  writeFile(path: string, content: string): Promise<{ success: boolean }>;
  deleteFile(path: string): Promise<{ success: boolean; path: string }>;
  getAiStatus(): Promise<{ available: boolean; reason?: string }>;
  generateFromNotes(notes: string, force?: boolean): Promise<CourseDraftResult>;
  uploadSpec(spec: string, specExt: '.json' | '.md', force?: boolean): Promise<CourseDraftResult>;
  generateCourseDraft(notes: string): Promise<CourseDraftResult>;
  uploadSpecDraft(spec: string, specExt: '.json' | '.md'): Promise<CourseDraftResult>;
  commitCourseDraft(
    draftId: string,
    force?: boolean,
  ): Promise<{ success: boolean; title?: string; error?: string }>;
  discardCourseDraft(draftId: string): Promise<{ success: boolean }>;
  generateItemAdd(
    kind: 'lesson' | 'quiz' | 'practice',
    description: string,
  ): Promise<AiItemAddResult>;
  generateItemEdit(
    kind: 'lesson' | 'quiz' | 'practice',
    intent: ItemIntent,
    currentContent: string,
    params?: ItemIntentParams,
  ): Promise<AiItemEditResult>;
  getLibrary(): Promise<{ workspace: string; entries: LibraryEntry[] }>;
  openLibraryCourse(relativePath: string): Promise<{ success: boolean; packageDir: string }>;
  duplicateCourse(
    relativePath: string,
    newId: string,
    newTitle: string,
  ): Promise<{ success: boolean; entry: LibraryEntry }>;
  renameCourse(
    relativePath: string,
    newTitle: string,
  ): Promise<{ success: boolean; entry: LibraryEntry }>;
  archiveCourse(relativePath: string): Promise<{ success: boolean; archivedPath: string }>;
  importCourseFolder(sourcePath: string): Promise<{ success: boolean; entry: LibraryEntry }>;
  createUnit(
    title: string,
    courseRelativePaths: string[],
  ): Promise<{ success: boolean; entry: LibraryEntry }>;
  exportUnitOep(relativePath: string): Promise<{ blob: Blob; fileName: string }>;
}
```

```ts
// serverStudioApi.ts (NEW — extracted from current studioApi.ts)

export function createServerStudioApi(): StudioApi {
  // ... exact current createStudioApi() code, unchanged
}
```

#### Browser Implementation

```ts
// browserStudioApi.ts (NEW)

import type { StudioApi } from './studioApi.js';
import type { StudioStorageAdapter, CourseFileMap } from './studioStorageAdapter.js';
import type { LibraryEntry } from './library/types.js';
import type { ActivitySummary } from './types.js';
import type {
  CourseDraftResult,
  AiItemAddResult,
  AiItemEditResult,
  ItemIntent,
  ItemIntentParams,
} from './ai/types.js';
import {
  detectActivityKind,
  titleFromMarkdown,
  titleFromQuizJson,
  buildLinearWorkflow,
} from './outlineModel.js';
import { OepWriter } from '@open-edu/oep-distribution';
import { strToU8 } from 'fflate';

let activeCourseId: string | null = null;

export function setActiveCourseId(id: string | null): void {
  activeCourseId = id;
}

export function getActiveCourseId(): string | null {
  return activeCourseId;
}

function assertActive(): string {
  if (!activeCourseId) throw new Error('No course is open. Create or open a course first.');
  return activeCourseId;
}

function buildOutline(files: Record<string, string>): {
  activities: ActivitySummary[];
  title: string;
} {
  const manifest = files['package.json'] ? JSON.parse(files['package.json']) : {};
  const workflow = files['workflow.json'] ? JSON.parse(files['workflow.json']) : {};
  const orderedPaths = Object.keys(workflow.routing ?? {});
  const activities: ActivitySummary[] = orderedPaths.map((path) => {
    const content = files[path] ?? '';
    const kind = detectActivityKind(path, content);
    const title =
      kind === 'lesson'
        ? titleFromMarkdown(content)
        : kind === 'quiz'
          ? titleFromQuizJson(content)
          : (path.split('/').pop() ?? path);
    return { id: path, path, title, kind };
  });
  return { activities, title: manifest.title ?? 'Untitled Course' };
}

export function createBrowserStudioApi(adapter: StudioStorageAdapter): StudioApi {
  return {
    async getPackageDir() {
      return `browser://${assertActive()}`;
    },

    async validate() {
      const courseId = assertActive();
      const courseMap = await adapter.getCourseFiles(courseId);
      if (!courseMap) return { valid: false, errors: [{ path: '', error: 'Course not found' }] };

      const errors: Array<{ path: string; error: string }> = [];
      if (!courseMap.files['package.json']) {
        errors.push({ path: 'package.json', error: 'Missing package.json' });
      } else {
        try {
          const manifest = JSON.parse(courseMap.files['package.json']);
          if (!manifest.id) errors.push({ path: 'package.json', error: 'Missing "id" field' });
          if (!manifest.title)
            errors.push({ path: 'package.json', error: 'Missing "title" field' });
        } catch {
          errors.push({ path: 'package.json', error: 'Invalid JSON' });
        }
      }
      if (!courseMap.files['workflow.json']) {
        errors.push({ path: 'workflow.json', error: 'Missing workflow.json' });
      } else {
        try {
          JSON.parse(courseMap.files['workflow.json']);
        } catch {
          errors.push({ path: 'workflow.json', error: 'Invalid JSON' });
        }
      }
      for (const [path, content] of Object.entries(courseMap.files)) {
        if (!path.startsWith('nodes/')) continue;
        if (path.endsWith('.json')) {
          try {
            JSON.parse(content);
          } catch {
            errors.push({ path, error: 'Invalid JSON' });
          }
        }
      }
      return { valid: errors.length === 0, errors };
    },

    async getOutline() {
      const courseId = assertActive();
      const courseMap = await adapter.getCourseFiles(courseId);
      if (!courseMap) return { activities: [], title: '' };
      return buildOutline(courseMap.files);
    },

    async saveOutlineOrder(orderedPaths: string[]) {
      const courseId = assertActive();
      const courseMap = await adapter.getCourseFiles(courseId);
      if (!courseMap) throw new Error('Course not found');
      const entry = courseMap.files['package.json']
        ? JSON.parse(courseMap.files['package.json']).entry
        : orderedPaths[0];
      const { entry: newEntry, routing } = buildLinearWorkflow(orderedPaths, entry);
      const newManifest = { ...JSON.parse(courseMap.files['package.json']), entry: newEntry };
      courseMap.files['package.json'] = JSON.stringify(newManifest, null, 2);
      courseMap.files['workflow.json'] = JSON.stringify({ entry: newEntry, routing }, null, 2);
      await adapter.updateCourseFiles(courseId, courseMap.files);
      return { success: true };
    },

    async applyTemplate(templateId: string) {
      const { getTemplateById } = await import('./templates/catalog.js');
      const template = getTemplateById(templateId);
      if (!template) throw new Error(`Template "${templateId}" not found`);
      const courseId = `${templateId}-${Date.now()}`;
      const title = JSON.parse(template.files['package.json']).title ?? templateId;
      await adapter.createCourse(courseId, title, { ...template.files });
      activeCourseId = courseId;
      return { success: true };
    },

    async exportOep() {
      const courseId = assertActive();
      const courseMap = await adapter.getCourseFiles(courseId);
      if (!courseMap) throw new Error('Course not found');

      const courseFiles = new Map<string, Uint8Array>();
      for (const [path, content] of Object.entries(courseMap.files)) {
        courseFiles.set(path, strToU8(content));
      }
      for (const [path, data] of Object.entries(courseMap.assets)) {
        courseFiles.set(path, data);
      }

      const manifest = JSON.parse(courseMap.files['package.json'] ?? '{}');
      const result = await OepWriter.build({
        manifest: {
          id: manifest.id ?? courseId,
          version: manifest.version ?? '1.0.0',
          title: manifest.title ?? 'Untitled',
          type: 'course',
          contentRoot: '',
        },
        courseFiles,
      });

      const blob = new Blob([result.bytes], { type: 'application/zip' });
      const fileName = `${manifest.id ?? courseId}-${manifest.version ?? '1.0.0'}.oep`;
      return { blob, fileName };
    },

    async readFile(path: string) {
      const courseId = assertActive();
      const content = await adapter.readFile(courseId, path);
      if (content === null) throw new Error(`File not found: ${path}`);
      return { path, content };
    },

    async writeFile(path: string, content: string) {
      const courseId = assertActive();
      await adapter.writeFile(courseId, path, content);
      return { success: true };
    },

    async deleteFile(path: string) {
      const courseId = assertActive();
      await adapter.deleteFile(courseId, path);
      return { success: true, path };
    },

    // AI methods — proxied to serverless function
    async getAiStatus() {
      try {
        const res = await fetch('/api/ai/status');
        return res.json();
      } catch {
        return { available: false, reason: 'unreachable' };
      }
    },

    async generateFromNotes(notes: string, force?: boolean) {
      const courseId = assertActive();
      const res = await fetch('/api/ai/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, force, courseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'AI generation failed');
      }
      return res.json();
    },

    async uploadSpec(spec: string, specExt: '.json' | '.md', force?: boolean) {
      const courseId = assertActive();
      const res = await fetch('/api/ai/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, specExt, force, courseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Spec compilation failed');
      }
      return res.json();
    },

    async generateCourseDraft(notes: string) {
      return this.generateFromNotes(notes);
    },

    async uploadSpecDraft(spec: string, specExt: '.json' | '.md') {
      return this.uploadSpec(spec, specExt);
    },

    async commitCourseDraft(draftId: string, force?: boolean) {
      const courseId = assertActive();
      const res = await fetch('/api/ai/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, courseId, force }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Commit failed');
      }
      const result = await res.json();
      // Server returns compiled files — merge into existing course in IndexedDB
      if (result.files) {
        const courseMap = await adapter.getCourseFiles(courseId);
        const merged = { ...(courseMap?.files ?? {}), ...result.files };
        if (courseMap) {
          await adapter.updateCourseFiles(courseId, merged);
        } else {
          await adapter.createCourse(courseId, result.title ?? 'Untitled', merged);
        }
      }
      return result;
    },

    async discardCourseDraft(draftId: string) {
      const res = await fetch('/api/ai/discard-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      return res.json();
    },

    async generateItemAdd(kind: 'lesson' | 'quiz' | 'practice', description: string) {
      const courseId = assertActive();
      const res = await fetch('/api/ai/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', kind, description, courseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Item generation failed');
      }
      return res.json();
    },

    async generateItemEdit(
      kind: 'lesson' | 'quiz' | 'practice',
      intent: ItemIntent,
      currentContent: string,
      params?: ItemIntentParams,
    ) {
      const courseId = assertActive();
      const res = await fetch('/api/ai/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', kind, intent, currentContent, params, courseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Item edit failed');
      }
      return res.json();
    },

    // Library methods — all backed by @open-edu/storage
    async getLibrary() {
      const summaries = await adapter.listCourses();
      const entries: LibraryEntry[] = summaries.map((c) => ({
        id: c.id,
        title: c.title,
        kind: 'course' as const,
        version: c.version,
        updatedAt: c.updatedAt,
        relativePath: c.id,
      }));
      return { workspace: 'browser', entries };
    },

    async openLibraryCourse(relativePath: string) {
      const courseMap = await adapter.getCourseFiles(relativePath);
      if (!courseMap) throw new Error(`Course not found: ${relativePath}`);
      activeCourseId = relativePath;
      return { success: true, packageDir: `browser://${relativePath}` };
    },

    async duplicateCourse(relativePath: string, newId: string, newTitle: string) {
      await adapter.duplicateCourse(relativePath, newId, newTitle);
      return {
        success: true,
        entry: {
          id: newId,
          title: newTitle,
          kind: 'course' as const,
          version: '1.0.0',
          updatedAt: Date.now(),
          relativePath: newId,
        },
      };
    },

    async renameCourse(relativePath: string, newTitle: string) {
      const courseMap = await adapter.getCourseFiles(relativePath);
      if (!courseMap) throw new Error('Course not found');
      const manifest = JSON.parse(courseMap.files['package.json'] ?? '{}');
      manifest.title = newTitle;
      courseMap.files['package.json'] = JSON.stringify(manifest, null, 2);
      await adapter.updateCourseFiles(relativePath, courseMap.files);
      return {
        success: true,
        entry: {
          id: relativePath,
          title: newTitle,
          kind: 'course' as const,
          version: courseMap.version,
          updatedAt: Date.now(),
          relativePath,
        },
      };
    },

    async archiveCourse(relativePath: string) {
      await adapter.deleteCourse(relativePath);
      return { success: true, archivedPath: `archived://${relativePath}` };
    },

    async importCourseFolder(sourcePath: string) {
      throw new Error('Use importOep() for browser mode');
    },

    async createUnit(title: string, courseRelativePaths: string[]) {
      throw new Error('Bundle/unit support coming in Phase 1');
    },

    async exportUnitOep(relativePath: string) {
      throw new Error('Bundle/unit support coming in Phase 1');
    },
  };
}
```

#### OEP Import (Browser-Specific)

OEP import is handled by `StudioStorageAdapter.importOep()` (defined in section 4.1). It uses `OepReader` from `@open-edu/oep-distribution` to parse the `.oep` ZIP, splits files into text (`StoredCourse.nodes`) and binary (`StoredCourse.assets`), and calls `saveCourse()` from `@open-edu/storage`. The imported course is immediately available in both the Studio and the learner app.

---

### 4.4 `api/ai/[...route].ts` — AI Serverless Function

**Purpose:** Single Vercel serverless function that proxies AI requests to the LLM. No filesystem access. No state. Pure request→response.

#### Structure

```ts
// api/ai/[...route].ts

import type { IncomingMessage, ServerResponse } from 'http';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import { generateText, streamText } from 'ai';
import { compile as compileCourse } from '@open-edu/course-compiler';
import { strToU8 } from 'fflate';
import { mkdtemp, rm, writeFile, readdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Rate limiting (in-memory, per-invocation — acceptable for serverless)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const existing = rateLimits.get(key);
  if (!existing || now >= existing.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  existing.count++;
  return existing.count > limit;
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length > 2_000_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

function isAiConfigured(): boolean {
  const key = process.env.OPEN_EDU_STUDIO_LLM_API_KEY || process.env.LLM_API_KEY;
  return Boolean(key);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Extract route from URL
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const route = url.pathname.replace('/api/ai/', '');

  // Status endpoint (GET)
  if (route === 'status' && req.method === 'GET') {
    writeJson(res, 200, { available: isAiConfigured() });
    return;
  }

  // All other endpoints require POST
  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!isAiConfigured()) {
    writeJson(res, 503, {
      error: 'AI not configured. Set OPEN_EDU_STUDIO_LLM_API_KEY.',
      available: false,
    });
    return;
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for'] ?? 'anonymous';
  if (checkRateLimit(String(ip))) {
    writeJson(res, 429, { error: 'Rate limit exceeded' });
    return;
  }

  try {
    switch (route) {
      case 'generate-draft':
        return await handleGenerateDraft(req, res);
      case 'commit':
        return await handleCommit(req, res);
      case 'discard-draft':
        return handleDiscard(req, res);
      case 'item':
        return await handleItem(req, res);
      case 'chat':
        return await handleChat(req, res);
      default:
        writeJson(res, 404, { error: 'Unknown AI endpoint' });
    }
  } catch (err) {
    console.error('[ai-proxy] error:', err);
    writeJson(res, 500, { error: 'Internal server error' });
  }
}

// --- Route handlers (see below) ---

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleRequest(req, res);
}
```

#### Route: `generate-draft`

```ts
async function handleGenerateDraft(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as {
    notes?: string;
    spec?: string;
    specExt?: '.json' | '.md';
    courseId?: string;
  };

  if (body.notes && body.notes.length < 40) {
    writeJson(res, 400, {
      error: 'Notes too short (minimum 40 characters)',
      code: 'notes-too-short',
    });
    return;
  }

  // Compile the spec (or generate from notes via LLM)
  let specText: string;
  if (body.spec) {
    specText = body.spec;
  } else if (body.notes) {
    const factory = createModelFactoryFromEnv();
    const model = factory.getModel('fast');
    const prompt = buildCourseSpecPrompt(body.notes);
    const result = await generateText({ model, prompt });
    const parsed = extractJsonObject(result.text);
    specText = JSON.stringify(parsed, null, 2);
  } else {
    writeJson(res, 400, { error: 'Either notes or spec required' });
    return;
  }

  // Compile to temp dir
  const tempDir = await mkdtemp(join(tmpdir(), 'openedu-ai-'));
  const specPath = join(tempDir, 'course-spec.json');
  await writeFile(specPath, specText, 'utf-8');
  const outputDir = join(tempDir, 'out');

  try {
    const result = await compileCourse(specPath, { output: outputDir, validate: true });

    // Read all compiled files into memory
    const files: Record<string, string> = {};
    const allFiles = await readdirRecursive(outputDir);
    for (const relPath of allFiles) {
      const absPath = join(outputDir, relPath);
      files[relPath] = await readFile(absPath, 'utf-8');
    }

    // Return files + metadata (client stores them in IndexedDB on commit)
    const manifest = files['package.json'] ? JSON.parse(files['package.json']) : {};
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Store draft temporarily in the function instance (short-lived)
    draftRegistry.set(draftId, { files, createdAt: Date.now() });

    writeJson(res, 200, {
      success: result.success,
      draftId,
      title: manifest.title,
      outlinePreview: buildOutlinePreview(files),
      quality: mapDiagnostics(result.diagnostics),
      error: result.success
        ? undefined
        : result.diagnostics.find((d) => d.severity === 'error')?.message,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
```

#### Route: `commit`

```ts
// In-memory draft registry (per function instance, short-lived)
const draftRegistry = new Map<string, { files: Record<string, string>; createdAt: number }>();
const DRAFT_TTL_MS = 30 * 60 * 1000;

async function handleCommit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as { draftId: string; courseId?: string; force?: boolean };
  const draft = draftRegistry.get(body.draftId);

  if (!draft || Date.now() - draft.createdAt > DRAFT_TTL_MS) {
    draftRegistry.delete(body.draftId);
    writeJson(res, 404, { error: 'Draft not found or expired', code: 'draft-not-found' });
    return;
  }

  // Return the files to the client — client stores in IndexedDB
  writeJson(res, 200, {
    success: true,
    files: draft.files,
    title: JSON.parse(draft.files['package.json'] ?? '{}').title,
  });

  draftRegistry.delete(body.draftId);
}
```

#### Route: `item` (add/edit)

```ts
async function handleItem(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as {
    action: 'add' | 'edit';
    kind: 'lesson' | 'quiz' | 'practice';
    description?: string;
    currentContent?: string;
    intent?: string;
    params?: Record<string, unknown>;
    courseId?: string;
  };

  const factory = createModelFactoryFromEnv();
  const model = factory.getModel('fast');

  if (body.action === 'add') {
    const prompt = buildItemAddPrompt(body.kind, body.description ?? '');
    const result = await generateText({ model, prompt });
    const parsed = extractJsonObject(result.text);
    writeJson(res, 200, {
      ok: true,
      item: {
        kind: body.kind,
        title: parsed.title ?? body.kind,
        content: JSON.stringify(parsed, null, 2),
      },
    });
    return;
  }

  if (body.action === 'edit') {
    const prompt = buildItemEditPrompt(
      body.kind,
      body.intent ?? 'rewrite',
      body.currentContent ?? '',
      body.params,
    );
    const result = await generateText({ model, prompt });
    const parsed = extractJsonObject(result.text);
    writeJson(res, 200, {
      ok: true,
      items: [
        {
          kind: body.kind,
          title: parsed.title ?? body.kind,
          content: JSON.stringify(parsed, null, 2),
        },
      ],
    });
    return;
  }

  writeJson(res, 400, { error: 'Invalid action' });
}
```

#### Route: `chat` (SSE streaming)

```ts
import { createUIMessageStream, pipeUIMessageStreamToResponse, toUIMessageStream } from 'ai';

async function handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readBody(req)) as {
    messages: Array<{ role: string; content: string }>;
    context: Record<string, unknown>;
  };

  const factory = createModelFactoryFromEnv();
  const model = factory.getModel('fast');

  const systemPrompt = `You are an AI assistant for OpenEdu Course Creator Studio.
Help teachers create and edit educational content.
Be concise, supportive, and education-focused.`;

  const result = streamText({
    model,
    system: systemPrompt,
    messages: body.messages as never,
  });

  const uiStream = toUIMessageStream({ stream: result.stream });
  await pipeUIMessageStreamToResponse({ response: res, status: 200, stream: uiStream });
}
```

#### Helper Functions

```ts
async function readdirRecursive(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...(await readdirRecursive(join(dir, entry.name), relPath)));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

// Import prompts from existing studio AI prompts
function buildCourseSpecPrompt(notes: string): string {
  return `Create a course specification JSON from these notes:\n\n${notes}\n\nReturn valid JSON with "modules" array.`;
}

function buildItemAddPrompt(kind: string, description: string): string {
  return `Create a ${kind} for an educational course.\nDescription: ${description}\nReturn valid JSON.`;
}

function buildItemEditPrompt(
  kind: string,
  intent: string,
  currentContent: string,
  params?: Record<string, unknown>,
): string {
  return `Edit this ${kind} with intent "${intent}":\n\n${currentContent}\n\nReturn valid JSON.`;
}

function extractJsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

function buildOutlinePreview(
  files: Record<string, string>,
): Array<{ title: string; kind: string }> {
  const workflow = files['workflow.json'] ? JSON.parse(files['workflow.json']) : {};
  return Object.keys(workflow.routing ?? {}).map((path) => {
    const content = files[path] ?? '';
    const kind = path.endsWith('.md') ? 'lesson' : 'quiz';
    const title =
      kind === 'lesson'
        ? (content.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? 'Untitled')
        : (JSON.parse(content).title ?? 'Untitled quiz');
    return { title, kind };
  });
}

function mapDiagnostics(diagnostics: Array<{ severity: string; message: string; path?: string }>) {
  return diagnostics.map((d, i) => ({
    id: `diag-${i}`,
    labelKey: d.severity === 'error' ? 'studio.quality.error' : 'studio.quality.warning',
    passed: d.severity !== 'error',
    detail: d.message,
  }));
}
```

---

### 4.5 `DevApp.tsx` — Conditional API Factory

**Purpose:** At build time, choose between server API (local dev) and browser API (Vercel deploy).

```tsx
// DevApp.tsx — key changes

const isBrowserMode = import.meta.env.VITE_BROWSER_MODE === 'true';

// Lazy-load the appropriate API factory
function useStudioApiFactory() {
  if (isBrowserMode) {
    // Browser mode: @open-edu/storage + AI proxy
    const { createBrowserStudioApi, setActiveCourseId } = require('./studio/browserStudioApi.js');
    const { createStudioStorageAdapter } = require('./studio/studioStorageAdapter.js');
    const adapter = createStudioStorageAdapter();
    return { api: createBrowserStudioApi(adapter), setActiveCourseId };
  }
  // Server mode: fetch-based (current behavior)
  const { createServerStudioApi } = require('./studio/serverStudioApi.js');
  return { api: createServerStudioApi(), setActiveCourseId: null };
}
```

More precisely, the `DevApp` component changes:

```tsx
// In DevApp.tsx, replace the module-level constants:

import {
  packageData as rawPackageData,
  bundleData as rawBundleData,
} from 'virtual:open-edu-package';

const loadedPkg = rawPackageData as LoadedPackage | null;
const loadedBundle = rawBundleData ? { ...rawBundleData, moduleMap: new Map(...) } : null;

// With:

const isBrowserMode = import.meta.env.VITE_BROWSER_MODE === 'true';

// In browser mode, loadedPkg/loadedBundle are always null at module init.
// The StudioApp loads from IndexedDB async on mount.
```

The `StudioApp` component gets a new optional prop:

```tsx
// StudioApp.tsx — add optional browser-mode props

export function StudioApp({
  mode,
  onModeChange,
  loadedPackage,
  bundleUnsupported = false,
  _assistantEnabled,
  themeId,
  onThemeChange,
  storageAdapter,        // NEW — only in browser mode
  onBrowserCourseOpen,   // NEW — callback when a course is loaded from IndexedDB
}: {
  // ... existing props
  storageAdapter?: StudioStorageAdapter;
  onBrowserCourseOpen?: (course: CourseFileMap) => void;
}) {
  const api = useMemo(() => {
    if (storageAdapter) {
      const { createBrowserStudioApi } = require('./browserStudioApi.js');
      return createBrowserStudioApi(storageAdapter);
    }
    return createStudioApi(); // existing server API
  }, [storageAdapter]);
```

---

### 4.6 `vite.config.ts` — Browser Mode Build

Add a build-time define for browser mode:

```ts
// In the default defineConfig, add:

export default defineConfig(({ mode }) => ({
  // ... existing config
  define: {
    'import.meta.env.VITE_BROWSER_MODE': JSON.stringify(mode === 'browser'),
    // ... existing defines
  },
  // ... existing server config
}));
```

Add a new build script in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:browser": "vite --mode browser",
    "build": "tsc",
    "build:browser": "vite build --mode browser",
    "preview:browser": "vite preview --mode browser"
  }
}
```

The `--mode browser` flag sets `import.meta.env.MODE` to `"browser"`, which we use to define `VITE_BROWSER_MODE`.

---

### 4.7 `vercel.json` — Deployment Config

```json
{
  "buildCommand": "pnpm -r build && pnpm --filter @open-edu/dev-server build:browser",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "framework": "vite",
  "functions": {
    "api/ai/[...route].ts": {
      "memory": 512,
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" }
      ]
    }
  ]
}
```

---

### 4.8 `package.json` — Dependencies

Add `@open-edu/storage` as a runtime dependency:

```json
{
  "dependencies": {
    "@open-edu/storage": "workspace:*"
    // ... existing deps
  }
}
```

No other new runtime dependencies needed. The browser mode uses:

- `@open-edu/storage` (NEW — IndexedDB layer, already in monorepo)
- `fflate` (already a dependency of `@open-edu/oep-distribution`)
- `@open-edu/oep-distribution` (already a workspace dependency)
- `@open-edu/schemas` (already a workspace dependency — for validation)

**Dev dependency to add:**

```json
{
  "devDependencies": {
    "fake-indexeddb": "^6.2.5"
  }
}
```

This is already in the dev-server's devDependencies for testing.

---

## 5. Data Flow Diagrams

### 5.1 Create Course from Template (Browser Mode)

```text
User clicks "Reading Lesson" template
        │
        ▼
HomeTemplateGallery → api.applyTemplate('reading-lesson')
        │
        ▼
browserStudioApi.applyTemplate()
        │
        ├── getTemplateById('reading-lesson') → { files: { 'package.json': '...', 'nodes/lesson.md': '...', 'workflow.json': '...' } }
        │
        ├── adapter.createCourse(courseId, title, files)
        │       │
        │       ▼
        │   filesToStoredCourse() → StoredCourse { manifest, nodes: [{relativePath, content}], workflow, ... }
        │       │
        │       ▼
        │   saveCourse(stored) → @open-edu/storage → IndexedDB `courses` store
        │
        └── activeCourseId = courseId
        │
        ▼
StudioApp navigates to 'outline' view
        │
        ▼
OutlineView → api.getOutline()
        │
        ▼
browserStudioApi.getOutline()
        │
        ├── adapter.getCourseFiles(courseId)
        │       │
        │       ▼
        │   getCourse(id) → @open-edu/storage → StoredCourse from IndexedDB
        │       │
        │       ▼
        │   storedCourseToFiles(stored) → CourseFileMap { files: { 'package.json': '...', 'nodes/lesson.md': '...', ... } }
        │
        └── buildOutline(files) → { activities: [...], title: 'Reading Lesson' }
```

### 5.2 AI Course Generation (Browser Mode)

```text
User enters notes in AiStartPanel → api.generateFromNotes(notes)
        │
        ▼
browserStudioApi.generateFromNotes()
        │
        └── fetch('/api/ai/generate-draft', { notes, courseId })
                │
                ▼
        Vercel Serverless Function
                │
                ├── createModelFactoryFromEnv() → LLM model
                ├── generateText({ model, prompt }) → course spec JSON
                ├── compile(specPath, { output }) → compiled package files
                └── Return { draftId, files, title, outlinePreview, quality }
                │
                ▼
        Browser receives draft result
        │
        ▼
User reviews in Author Assistant → clicks "Commit"
        │
        ▼
api.commitCourseDraft(draftId)
        │
        ▼
browserStudioApi.commitCourseDraft()
        │
        └── fetch('/api/ai/commit', { draftId, courseId })
                │
                ▼
        Serverless returns { files: { 'package.json': '...', 'nodes/lesson.md': '...', ... } }
                │
                ▼
        adapter.updateCourseFiles(courseId, mergedFiles)
                │
                ▼
        filesToStoredCourse() → StoredCourse
                │
                ▼
        replaceCourse(id, updated) → @open-edu/storage → IndexedDB
                │
                ▼
        StudioApp re-renders with new outline
```

### 5.3 Export OEP (Browser Mode)

```text
User clicks "Download .oep" in ShareView → api.exportOep()
        │
        ▼
browserStudioApi.exportOep()
        │
        ├── adapter.getCourseFiles(activeCourseId) → CourseFileMap { files, assets }
        │
        ├── Convert files to Map<string, Uint8Array> (strToU8 for text, raw for assets)
        │
        ├── OepWriter.build({ manifest, courseFiles }) → { bytes: Uint8Array }
        │
        └── new Blob([bytes], { type: 'application/zip' })
        │
        ▼
ShareView creates download link → browser downloads .oep file
```

### 5.4 Import OEP (Browser Mode)

```text
User drops .oep file on import area
        │
        ▼
FileReader.readAsArrayBuffer() → Uint8Array
        │
        ▼
adapter.importOep(bytes)
        │
        ├── OepReader.read(bytes) → { files: Map<string, Uint8Array>, manifest }
        ├── Split into text files (→ nodes array) and binary (→ assets array)
        ├── filesToStoredCourse() → StoredCourse
        └── saveCourse(stored) → @open-edu/storage → IndexedDB `courses` store
        │
        ▼
StudioApp navigates to 'outline' view
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**New test files:**

| File                                       | Tests                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `src/studio/studioStorageAdapter.test.ts`  | CRUD operations, StoredCourse ↔ file map conversion, import/export round-trip       |
| `src/studio/storedCourseConverter.test.ts` | Conversion correctness: nodes array ↔ files map, sidecar extraction, asset handling |
| `src/studio/browserStudioApi.test.ts`      | All 25+ StudioApi methods against mocked adapter                                    |
| `api/ai/[...route].test.ts`                | Serverless function handlers with mocked LLM                                        |

**Test setup:**

```ts
// studioStorageAdapter.test.ts
import 'fake-indexeddb/auto'; // Polyfills IndexedDB for jsdom/node
import { createStudioStorageAdapter } from './studioStorageAdapter.js';

describe('StudioStorageAdapter', () => {
  let adapter: ReturnType<typeof createStudioStorageAdapter>;

  beforeEach(async () => {
    adapter = createStudioStorageAdapter();
  });

  test('createCourse and getCourseFiles round-trip', async () => {
    const files = {
      'package.json': JSON.stringify({ id: 'test-1', title: 'Test', version: '1.0.0' }),
      'nodes/lesson.md': '# Hello',
      'workflow.json': JSON.stringify({
        routing: { 'nodes/lesson.md': { onComplete: 'COMPLETED' } },
      }),
    };
    await adapter.createCourse('test-1', 'Test', files);
    const result = await adapter.getCourseFiles('test-1');
    expect(result).not.toBeNull();
    expect(result!.files['nodes/lesson.md']).toBe('# Hello');
    expect(result!.files['package.json']).toContain('"Test"');
  });

  test('updateCourseFiles preserves assets', async () => {
    await adapter.createCourse('test-2', 'Test', { 'package.json': '{}' });
    await adapter.writeAsset('test-2', 'logo.png', new Uint8Array([1, 2, 3]));
    await adapter.updateCourseFiles('test-2', { 'package.json': '{"title":"Updated"}' });
    const asset = await adapter.readAsset('test-2', 'logo.png');
    expect(asset).toEqual(new Uint8Array([1, 2, 3]));
  });

  test('importOep creates StoredCourse compatible with learner', async () => {
    // ... create .oep bytes, import, verify stored course has correct nodes/assets shape
  });
});
```

### 6.2 Cross-App Compatibility Tests

**Critical:** A course created in the Studio must be openable in the learner without conversion.

```ts
import { saveCourse, getCourse } from '@open-edu/storage';
import { storedCourseToLoadedPackage } from '../learner/src/oepAdapters.js';

test('Studio-created course is readable by learner adapter', async () => {
  const adapter = createStudioStorageAdapter();
  await adapter.createCourse('cross-test', 'Cross Test', {
    'package.json': JSON.stringify({
      id: 'cross-test',
      title: 'Cross Test',
      version: '1.0.0',
      entry: 'nodes/lesson.md',
    }),
    'nodes/lesson.md': '# Lesson',
    'workflow.json': JSON.stringify({
      routing: { 'nodes/lesson.md': { onComplete: 'COMPLETED' } },
    }),
  });

  // Read back via @open-edu/storage directly (simulating learner app)
  const stored = await getCourse('cross-test');
  expect(stored).toBeDefined();

  // Convert to LoadedPackage using learner's adapter
  const loaded = storedCourseToLoadedPackage(stored!);
  expect(loaded.manifest.id).toBe('cross-test');
  expect(loaded.nodes).toHaveLength(1);
  expect(loaded.nodes[0].relativePath).toBe('nodes/lesson.md');
  expect(loaded.workflow).toBeDefined();
});
```

### 6.3 Integration Tests

- **E2E browser test** (Playwright): Visit Vercel preview URL → create course from template → edit activity → export OEP → verify ZIP contents
- **AI proxy test**: Call `/api/ai/generate-draft` with mock LLM → verify response shape
- **Import round-trip**: Export from browser mode → re-import → verify files match

### 6.4 Existing Tests

All existing tests in `apps/dev-server/src/` continue to pass because:

- `serverStudioApi.ts` is the exact current code (no behavioral change)
- The virtual module still returns data in local dev mode
- No existing files are deleted, only new files added

---

## 7. Implementation Order

| Step | Task                                                         | Files                                                       | Depends On |
| ---- | ------------------------------------------------------------ | ----------------------------------------------------------- | ---------- |
| 1    | Extract `StudioApi` type from `createStudioApi`              | `studioApi.ts`, `serverStudioApi.ts`                        | —          |
| 2    | Implement `storedCourseConverter` (StoredCourse ↔ file map)  | `storedCourseConverter.ts`, `storedCourseConverter.test.ts` | —          |
| 3    | Implement `studioStorageAdapter` (wraps `@open-edu/storage`) | `studioStorageAdapter.ts`, `studioStorageAdapter.test.ts`   | 2          |
| 4    | Implement `browserStudioApi`                                 | `browserStudioApi.ts`, `browserStudioApi.test.ts`           | 1, 3       |
| 5    | Cross-app compatibility test (Studio → learner)              | test file                                                   | 3          |
| 6    | Build AI serverless function                                 | `api/ai/[...route].ts`                                      | —          |
| 7    | Modify `DevApp.tsx` for conditional API                      | `DevApp.tsx`, `StudioApp.tsx`                               | 1, 4       |
| 8    | Add browser mode build config                                | `vite.config.ts`, `package.json`                            | —          |
| 9    | Add `vercel.json`                                            | `vercel.json`                                               | 8          |
| 10   | Integration testing                                          | Playwright specs                                            | 1–9        |
| 11   | Deploy to Vercel preview                                     | vercel.json                                                 | 10         |

---

## 8. Risks and Mitigations

| Risk                                          | Impact                                            | Mitigation                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `@open-edu/storage` DB version mismatch       | Studio writes v4, learner expects different shape | Both apps use the same `StoredCourse` shape — no version conflict. If `@open-edu/storage` upgrades, both apps upgrade together |
| `StoredCourse.nodes` serialization round-trip | Data loss on write→read cycle                     | `filesToStoredCourse` / `storedCourseToFiles` are inverses; tested with round-trip assertions                                  |
| Vercel serverless cold start on AI            | Slow first AI request                             | Set `maxDuration: 30`; add loading spinner; consider cron warm-up                                                              |
| Draft loss on serverless instance recycle     | AI draft disappears                               | Return files to client immediately on commit; client stores in IndexedDB                                                       |
| No cross-device sync                          | Data stays on one browser                         | Prominent "Download .oep" CTA; Phase 1 adds cloud sync                                                                         |
| fflate/OepWriter bundle size                  | Large initial load                                | Tree-shake; fflate is ~8KB gzipped; OepWriter is ~2KB                                                                          |
| CORS issues with AI proxy                     | AI requests blocked                               | Explicit CORS headers in serverless function                                                                                   |
| Browser compatibility                         | IndexedDB unavailable                             | Fallback to localStorage with size warning (rare edge case)                                                                    |

---

## 9. What Phase 0 Enables

- **Zero infrastructure cost** — Vercel free tier (100GB bandwidth, 100K serverless invocations)
- **Instant deploy** — `git push` → live URL
- **Demo-able** — share a link, anyone can create a course in their browser
- **Validates the Studio UX** before investing in cloud storage
- **Shared storage format** — courses created in the Studio are directly openable in the learner app (and vice versa) via the same `@open-edu/storage` IndexedDB database
- **Direct path to Phase 1** — add `CloudStudioApi` implementing the same `StudioApi` interface, swap via env var
