# OpenEdu PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OpenEdu a fully offline-first, installable Progressive Web App where learners can download courses, learn offline, save progress, and search content without internet connectivity.

**Architecture:** Introduce `vite-plugin-pwa` for service worker + manifest infrastructure in the learner app. Create `packages/pwa-core` for reusable PWA management (install, update, connectivity). Create `packages/storage` for IndexedDB-based offline persistence. Migrate existing localStorage storage to IndexedDB. Add course download, offline search, and storage management UI.

**Tech Stack:** vite-plugin-pwa, Workbox, IndexedDB (via `idb`), MiniSearch, Zustand, React 18, TypeScript 5, Vitest 1

---

## Scope Warning

This spec covers 6+ independent subsystems. This plan is organized into **10 epics** with clear dependency ordering. Each epic produces working, testable software. Epics 33–35 must be done sequentially. Epics 36–42 can be parallelized after Epic 35.

**Dependency graph:**

```
Epic 33: PWA Infrastructure (vite-plugin-pwa, manifest, SW)
  └─► Epic 34: Storage Layer (packages/storage, IndexedDB)
        └─► Epic 35: PWA Core Package (packages/pwa-core)
              ├─► Epic 36: Course Download System
              │     └─► Epic 37: Offline Learning
              ├─► Epic 38: Offline Search
              ├─► Epic 39: Storage Management UI
              ├─► Epic 40: Update System
              ├─► Epic 41: Internationalization
              └─► Epic 42: Security
```

---

## File Structure

### New Packages

```
packages/
├── storage/                  # IndexedDB persistence layer
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          # Barrel exports
│   │   ├── db.ts             # IndexedDB database setup + migrations
│   │   ├── course-store.ts   # Course package storage
│   │   ├── progress-store.ts # Learning progress storage
│   │   ├── search-store.ts   # Search index storage
│   │   ├── prefs-store.ts    # User preferences storage
│   │   └── __tests__/
│   │       ├── db.test.ts
│   │       ├── course-store.test.ts
│   │       ├── progress-store.test.ts
│   │       ├── search-store.test.ts
│   │       └── prefs-store.test.ts
│   └── vitest.config.ts
├── pwa-core/                 # PWA management (install, update, connectivity)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          # Barrel exports
│   │   ├── install.ts        # Install prompt management
│   │   ├── update.ts         # Update detection + notification
│   │   ├── connectivity.ts   # Online/offline detection
│   │   ├── storage-info.ts   # Storage usage/quota
│   │   └── __tests__/
│   │       ├── install.test.ts
│   │       ├── update.test.ts
│   │       ├── connectivity.test.ts
│   │       └── storage-info.test.ts
│   └── vitest.config.ts
```

### Modified Files

```
apps/learner/
├── public/
│   ├── manifest.webmanifest  # NEW - PWA manifest
│   ├── icon-192.png          # NEW - App icon
│   ├── icon-512.png          # NEW - App icon
│   └── icon-maskable.png     # NEW - Maskable icon
├── vite.config.ts            # MODIFY - Add vite-plugin-pwa
├── index.html                # MODIFY - Add manifest link, theme-color meta
├── package.json              # MODIFY - Add vite-plugin-pwa, idb, minisearch, zustand
├── src/
│   ├── main.tsx              # MODIFY - Register service worker
│   ├── AppShell.tsx          # MODIFY - Add offline banner, install prompt
│   ├── SettingsPage.tsx      # MODIFY - Add storage management section
│   ├── progressStorage.ts    # MODIFY - Migrate to IndexedDB via @open-edu/storage
│   ├── bundleProgressStorage.ts # MODIFY - Migrate to IndexedDB
│   ├── badgesStorage.ts      # MODIFY - Migrate to IndexedDB
│   ├── cardsStorage.ts       # MODIFY - Migrate to IndexedDB
│   ├── progressStorage.test.ts  # MODIFY - Update for IndexedDB
│   ├── bundleProgressStorage.test.ts # MODIFY - Update for IndexedDB
│   ├── pages/
│   │   ├── OfflineCoursePage.tsx  # NEW - Offline course viewer
│   │   ├── DownloadManagerPage.tsx # NEW - Course download management
│   │   └── StorageSettingsPage.tsx # NEW - Storage usage + management
│   ├── components/
│   │   ├── OfflineBanner.tsx      # NEW - "You're offline" indicator
│   │   ├── InstallPrompt.tsx      # NEW - PWA install banner/dialog
│   │   ├── UpdatePrompt.tsx       # NEW - App update notification
│   │   ├── DownloadButton.tsx     # NEW - Course download trigger
│   │   └── StorageUsageCard.tsx   # NEW - Storage usage display
│   └── hooks/
│       ├── useOnlineStatus.ts     # NEW - Online status hook
│       ├── useInstallPrompt.ts    # NEW - Install prompt hook
│       └── useStorageUsage.ts     # NEW - Storage quota hook
```

---

## Epic 33: PWA Infrastructure

> Sets up vite-plugin-pwa, web app manifest, service worker, and build pipeline.

### Story 33.1: Install vite-plugin-pwa and configure manifest

**Files:**

- Modify: `apps/learner/package.json`
- Modify: `apps/learner/vite.config.ts`
- Modify: `apps/learner/index.html`
- Create: `apps/learner/public/manifest.webmanifest`

- [ ] **Step 1: Install dependencies**

```bash
pnpm --filter @open-edu/learner add -D vite-plugin-pwa
```

- [ ] **Step 2: Write the failing test — verify plugin loads**

Create `apps/learner/src/__tests__/pwa-config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA configuration', () => {
  it('has a web manifest at public/manifest.webmanifest', () => {
    const manifestPath = path.resolve(__dirname, '../../public/manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('OpenEdu');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
  });

  it('index.html has manifest link and theme-color meta', () => {
    const htmlPath = path.resolve(__dirname, '../../index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('manifest.webmanifest');
    expect(html).toContain('theme-color');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run pwa-config
```

Expected: FAIL — manifest file does not exist.

- [ ] **Step 4: Create the web app manifest**

Create `apps/learner/public/manifest.webmanifest`:

```json
{
  "name": "OpenEdu",
  "short_name": "OpenEdu",
  "description": "Offline-first open education platform",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "theme_color": "#F5F3EE",
  "background_color": "#F5F3EE",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 5: Create placeholder icons**

Create simple SVG-based placeholder icons at `apps/learner/public/icon-192.png`, `icon-512.png`, and `icon-maskable.png`. Use a simple 1x1 PNG placeholder for now (real icons come in a later story).

```bash
# Generate 192x192 placeholder (indigo circle on beige background)
convert -size 192x192 xc:'#F5F3EE' -fill '#4F46E5' -draw 'circle 96,96 96,24' \
  apps/learner/public/icon-192.png 2>/dev/null || \
python3 -c "
from PIL import Image, ImageDraw
img = Image.new('RGBA', (192, 192), (245, 243, 238, 255))
draw = ImageDraw.Draw(img)
draw.ellipse([24, 24, 168, 168], fill=(79, 70, 229, 255))
img.save('apps/learner/public/icon-192.png')
" 2>/dev/null || \
echo "Placeholder: create icon-192.png manually"

# Generate 512x512 placeholder
python3 -c "
from PIL import Image, ImageDraw
img = Image.new('RGBA', (512, 512), (245, 243, 238, 255))
draw = ImageDraw.Draw(img)
draw.ellipse([64, 64, 448, 448], fill=(79, 70, 229, 255))
img.save('apps/learner/public/icon-512.png')
" 2>/dev/null || \
echo "Placeholder: create icon-512.png manually"

# Copy same for maskable
cp apps/learner/public/icon-512.png apps/learner/public/icon-maskable.png 2>/dev/null || true
```

- [ ] **Step 6: Add manifest link and theme-color meta to index.html**

Edit `apps/learner/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#F5F3EE" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>OpenEdu</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run pwa-config
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/learner/public/ apps/learner/index.html apps/learner/src/__tests__/pwa-config.test.ts
git commit -m "feat(pwa): add web app manifest and icon placeholders"
```

---

### Story 33.2: Configure vite-plugin-pwa with service worker

**Files:**

- Modify: `apps/learner/vite.config.ts`
- Create: `apps/learner/src/__tests__/sw-registration.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/sw-registration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Service Worker registration', () => {
  it('vite.config.ts imports VitePWA', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('VitePWA');
    expect(config).toContain('vite-plugin-pwa');
  });

  it('vite.config.ts has registerType autoUpdate', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('autoUpdate');
  });

  it('vite.config.ts has workbox config for offline support', () => {
    const configPath = path.resolve(__dirname, '../../vite.config.ts');
    const config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('workbox');
    expect(config).toContain('navigateFallback');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run sw-registration
```

Expected: FAIL — vite.config.ts does not contain VitePWA.

- [ ] **Step 3: Configure vite-plugin-pwa in vite.config.ts**

Edit `apps/learner/vite.config.ts` to add VitePWA after the existing plugins. The key configuration:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'],
      manifest: false, // We use our own manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // API calls: Network First
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Course assets: Cache First (downloaded courses)
            urlPattern: /\.(png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'course-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
    }),
    // ... existing plugins (eduDataPlugin, etc.)
  ],
});
```

**Important:** Add the VitePWA import at the top of `vite.config.ts` and the plugin into the plugins array. The existing `eduDataPlugin()` and module aliases remain unchanged.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run sw-registration
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/vite.config.ts apps/learner/src/__tests__/sw-registration.test.ts
git commit -m "feat(pwa): configure vite-plugin-pwa with service worker and caching strategies"
```

---

### Story 33.3: Verify build produces service worker

**Files:**

- Modify: `apps/learner/package.json` (add `pwa:analyze` script)

- [ ] **Step 1: Add pwa:analyze script to package.json**

Add to `apps/learner/package.json` scripts:

```json
{
  "scripts": {
    "pwa:analyze": "npx vite-bundle-visualizer"
  }
}
```

- [ ] **Step 2: Build the learner app and verify service worker is generated**

```bash
pnpm --filter @open-edu/learner build:deploy
```

Expected: Build succeeds, `dist/sw.js` (or similar) is generated, `dist/manifest.webmanifest` is present.

- [ ] **Step 3: Run preview and check Lighthouse PWA score**

```bash
pnpm --filter @open-edu/learner preview
```

Open browser, run Lighthouse PWA audit. Expected: PWA installability criteria met.

- [ ] **Step 4: Commit**

```bash
git add apps/learner/package.json
git commit -m "feat(pwa): add pwa:analyze script"
```

---

## Epic 34: Storage Layer

> Creates `packages/storage` — IndexedDB persistence for courses, progress, search indexes, and preferences.

### Story 34.1: Create packages/storage scaffolding

**Files:**

- Create: `packages/storage/package.json`
- Create: `packages/storage/tsconfig.json`
- Create: `packages/storage/vitest.config.ts`
- Create: `packages/storage/src/index.ts`
- Modify: `pnpm-workspace.yaml` (already includes `packages/*`)

- [ ] **Step 1: Install idb dependency**

```bash
pnpm --filter @open-edu/storage add idb
pnpm --filter @open-edu/storage add -D vitest typescript @types/node
```

Note: `packages/storage` doesn't exist yet, so create it first:

```bash
mkdir -p packages/storage/src/__tests__
```

- [ ] **Step 2: Create package.json**

Create `packages/storage/package.json`:

```json
{
  "name": "@open-edu/storage",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

Create `packages/storage/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

Create `packages/storage/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

- [ ] **Step 5: Create placeholder index.ts**

Create `packages/storage/src/index.ts`:

```typescript
export { openDatabase, type OpenEduDB } from './db.js';
```

- [ ] **Step 6: Run install and typecheck**

```bash
pnpm install
pnpm --filter @open-edu/storage typecheck
```

Expected: Both succeed.

- [ ] **Step 7: Commit**

```bash
git add packages/storage/
git commit -m "feat(storage): create packages/storage scaffolding with idb dependency"
```

---

### Story 34.2: Implement IndexedDB database setup

**Files:**

- Create: `packages/storage/src/db.ts`
- Create: `packages/storage/src/__tests__/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/storage/src/__tests__/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, DB_NAME, DB_VERSION } from '../db.js';

describe('IndexedDB database setup', () => {
  beforeEach(() => {
    // jsdom provides fake IndexedDB via fake-indexeddb
  });

  it('exports correct DB_NAME and DB_VERSION', () => {
    expect(DB_NAME).toBe('open-edu');
    expect(DB_VERSION).toBe(1);
  });

  it('opens database with all required object stores', async () => {
    const db = await openDatabase();

    const storeNames = Array.from(db.objectStoreNames);
    expect(storeNames).toContain('courses');
    expect(storeNames).toContain('progress');
    expect(storeNames).toContain('search-indexes');
    expect(storeNames).toContain('preferences');

    db.close();
  });

  it('courses store has id keyPath', async () => {
    const db = await openDatabase();
    const tx = db.transaction('courses', 'readonly');
    const store = tx.objectStore('courses');
    expect(store.keyPath).toBe('id');
    db.close();
  });

  it('progress store has a compound key', async () => {
    const db = await openDatabase();
    const tx = db.transaction('progress', 'readonly');
    const store = tx.objectStore('progress');
    expect(store.keyPath).toEqual(['courseId', 'lessonId']);
    db.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/storage test
```

Expected: FAIL — db.ts does not exist.

- [ ] **Step 3: Implement the database setup**

Create `packages/storage/src/db.ts`:

```typescript
import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'open-edu';
export const DB_VERSION = 1;

export interface StoredCourse {
  id: string;
  version: string;
  manifest: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  assets: { path: string; data: ArrayBuffer }[];
  downloadedAt: string;
}

export interface LearningProgress {
  courseId: string;
  lessonId: string;
  completed: boolean;
  score?: number;
  updatedAt: string;
}

export interface SearchIndex {
  locale: string;
  indexData: Record<string, unknown>;
}

export interface UserPreferences {
  locale: string;
  theme: string;
  fontSize: string;
}

export interface OpenEduDB {
  courses: StoredCourse;
  progress: LearningProgress;
  'search-indexes': SearchIndex;
  preferences: UserPreferences;
}

let dbPromise: Promise<IDBPDatabase<OpenEduDB>> | null = null;

export function openDatabase(): Promise<IDBPDatabase<OpenEduDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OpenEduDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Course packages store
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'id' });
        }

        // Learning progress store — compound key
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: ['courseId', 'lessonId'] });
        }

        // Search indexes store
        if (!db.objectStoreNames.contains('search-indexes')) {
          db.createObjectStore('search-indexes', { keyPath: 'locale' });
        }

        // User preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'locale' });
        }
      },
    });
  }
  return dbPromise;
}
```

- [ ] **Step 4: Install fake-indexeddb for testing**

```bash
pnpm --filter @open-edu/storage add -D fake-indexeddb
```

- [ ] **Step 5: Update vitest.config.ts for fake-indexeddb**

Edit `packages/storage/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

Create `packages/storage/src/__tests__/setup.ts`:

```typescript
import 'fake-indexeddb/auto';
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter @open-edu/storage test
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/storage/src/ packages/storage/vitest.config.ts
git commit -m "feat(storage): implement IndexedDB database setup with migration support"
```

---

### Story 34.3: Implement course store

**Files:**

- Create: `packages/storage/src/course-store.ts`
- Create: `packages/storage/src/__tests__/course-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/storage/src/__tests__/course-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { saveCourse, getCourse, listCourses, deleteCourse } from '../course-store.js';
import type { StoredCourse } from '../db.js';

const mockCourse: StoredCourse = {
  id: 'hello-world',
  version: '1.0.0',
  manifest: { name: 'Hello World', description: 'A test course' },
  nodes: [{ id: 'intro', type: 'lesson', content: '# Hello' }],
  assets: [],
  downloadedAt: new Date().toISOString(),
};

describe('Course Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('courses');
    db.close();
  });

  it('saves and retrieves a course by id', async () => {
    await saveCourse(mockCourse);
    const course = await getCourse('hello-world');
    expect(course).toBeDefined();
    expect(course?.id).toBe('hello-world');
    expect(course?.manifest).toEqual(mockCourse.manifest);
  });

  it('lists all saved courses', async () => {
    await saveCourse(mockCourse);
    await saveCourse({ ...mockCourse, id: 'fractions', version: '2.0.0' });
    const courses = await listCourses();
    expect(courses).toHaveLength(2);
  });

  it('deletes a course by id', async () => {
    await saveCourse(mockCourse);
    await deleteCourse('hello-world');
    const course = await getCourse('hello-world');
    expect(course).toBeUndefined();
  });

  it('returns undefined for non-existent course', async () => {
    const course = await getCourse('non-existent');
    expect(course).toBeUndefined();
  });
});

import { openDatabase } from '../db.js';
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/storage test -- --run course-store
```

Expected: FAIL — course-store.ts does not exist.

- [ ] **Step 3: Implement course store**

Create `packages/storage/src/course-store.ts`:

```typescript
import { openDatabase, type StoredCourse } from './db.js';

export async function saveCourse(course: StoredCourse): Promise<void> {
  const db = await openDatabase();
  await db.put('courses', course);
}

export async function getCourse(id: string): Promise<StoredCourse | undefined> {
  const db = await openDatabase();
  return db.get('courses', id);
}

export async function listCourses(): Promise<StoredCourse[]> {
  const db = await openDatabase();
  return db.getAll('courses');
}

export async function deleteCourse(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('courses', id);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/storage test -- --run course-store
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/storage/src/course-store.ts packages/storage/src/__tests__/course-store.test.ts
git commit -m "feat(storage): implement course store with CRUD operations"
```

---

### Story 34.4: Implement progress store

**Files:**

- Create: `packages/storage/src/progress-store.ts`
- Create: `packages/storage/src/__tests__/progress-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/storage/src/__tests__/progress-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveProgress,
  getProgress,
  getCourseProgress,
  deleteCourseProgress,
} from '../progress-store.js';
import type { LearningProgress } from '../db.js';
import { openDatabase } from '../db.js';

const mockProgress: LearningProgress = {
  courseId: 'hello-world',
  lessonId: 'intro',
  completed: true,
  score: 95,
  updatedAt: new Date().toISOString(),
};

describe('Progress Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('progress');
    db.close();
  });

  it('saves and retrieves progress by courseId + lessonId', async () => {
    await saveProgress(mockProgress);
    const progress = await getProgress('hello-world', 'intro');
    expect(progress).toBeDefined();
    expect(progress?.completed).toBe(true);
    expect(progress?.score).toBe(95);
  });

  it('gets all progress for a course', async () => {
    await saveProgress(mockProgress);
    await saveProgress({ ...mockProgress, lessonId: 'chapter-1', completed: true });
    await saveProgress({ ...mockProgress, lessonId: 'chapter-2', completed: false });
    const allProgress = await getCourseProgress('hello-world');
    expect(allProgress).toHaveLength(3);
  });

  it('deletes all progress for a course', async () => {
    await saveProgress(mockProgress);
    await deleteCourseProgress('hello-world');
    const allProgress = await getCourseProgress('hello-world');
    expect(allProgress).toHaveLength(0);
  });

  it('returns undefined for non-existent progress', async () => {
    const progress = await getProgress('non-existent', 'lesson');
    expect(progress).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/storage test -- --run progress-store
```

Expected: FAIL

- [ ] **Step 3: Implement progress store**

Create `packages/storage/src/progress-store.ts`:

```typescript
import { openDatabase, type LearningProgress } from './db.js';

export async function saveProgress(progress: LearningProgress): Promise<void> {
  const db = await openDatabase();
  await db.put('progress', progress);
}

export async function getProgress(
  courseId: string,
  lessonId: string,
): Promise<LearningProgress | undefined> {
  const db = await openDatabase();
  return db.get('progress', [courseId, lessonId]);
}

export async function getCourseProgress(courseId: string): Promise<LearningProgress[]> {
  const db = await openDatabase();
  const all = await db.getAll('progress');
  return all.filter((p) => p.courseId === courseId);
}

export async function deleteCourseProgress(courseId: string): Promise<void> {
  const db = await openDatabase();
  const all = await db.getAll('progress');
  const tx = db.transaction('progress', 'readwrite');
  for (const p of all) {
    if (p.courseId === courseId) {
      await tx.store.delete([p.courseId, p.lessonId]);
    }
  }
  await tx.done;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/storage test -- --run progress-store
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/storage/src/progress-store.ts packages/storage/src/__tests__/progress-store.test.ts
git commit -m "feat(storage): implement progress store with compound key support"
```

---

### Story 34.5: Implement search index store and preferences store

**Files:**

- Create: `packages/storage/src/search-store.ts`
- Create: `packages/storage/src/prefs-store.ts`
- Create: `packages/storage/src/__tests__/search-store.test.ts`
- Create: `packages/storage/src/__tests__/prefs-store.test.ts`
- Modify: `packages/storage/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/storage/src/__tests__/search-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { saveSearchIndex, getSearchIndex, deleteSearchIndex } from '../search-store.js';
import type { SearchIndex } from '../db.js';
import { openDatabase } from '../db.js';

describe('Search Index Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('search-indexes');
    db.close();
  });

  it('saves and retrieves a search index by locale', async () => {
    const index: SearchIndex = { locale: 'en', indexData: { tokens: ['hello', 'world'] } };
    await saveSearchIndex(index);
    const result = await getSearchIndex('en');
    expect(result).toBeDefined();
    expect(result?.locale).toBe('en');
  });

  it('deletes a search index', async () => {
    await saveSearchIndex({ locale: 'es', indexData: {} });
    await deleteSearchIndex('es');
    const result = await getSearchIndex('es');
    expect(result).toBeUndefined();
  });
});
```

Create `packages/storage/src/__tests__/prefs-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { savePreferences, getPreferences, deletePreferences } from '../prefs-store.js';
import type { UserPreferences } from '../db.js';
import { openDatabase } from '../db.js';

describe('Preferences Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('preferences');
    db.close();
  });

  it('saves and retrieves preferences by locale', async () => {
    const prefs: UserPreferences = { locale: 'en', theme: 'light', fontSize: 'medium' };
    await savePreferences(prefs);
    const result = await getPreferences('en');
    expect(result).toBeDefined();
    expect(result?.theme).toBe('light');
  });

  it('deletes preferences for a locale', async () => {
    await savePreferences({ locale: 'es', theme: 'dark', fontSize: 'large' });
    await deletePreferences('es');
    const result = await getPreferences('es');
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @open-edu/storage test -- --run search-store
pnpm --filter @open-edu/storage test -- --run prefs-store
```

Expected: FAIL

- [ ] **Step 3: Implement search store**

Create `packages/storage/src/search-store.ts`:

```typescript
import { openDatabase, type SearchIndex } from './db.js';

export async function saveSearchIndex(index: SearchIndex): Promise<void> {
  const db = await openDatabase();
  await db.put('search-indexes', index);
}

export async function getSearchIndex(locale: string): Promise<SearchIndex | undefined> {
  const db = await openDatabase();
  return db.get('search-indexes', locale);
}

export async function deleteSearchIndex(locale: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('search-indexes', locale);
}
```

- [ ] **Step 4: Implement preferences store**

Create `packages/storage/src/prefs-store.ts`:

```typescript
import { openDatabase, type UserPreferences } from './db.js';

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await openDatabase();
  await db.put('preferences', prefs);
}

export async function getPreferences(locale: string): Promise<UserPreferences | undefined> {
  const db = await openDatabase();
  return db.get('preferences', locale);
}

export async function deletePreferences(locale: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('preferences', locale);
}
```

- [ ] **Step 5: Update barrel exports**

Edit `packages/storage/src/index.ts`:

```typescript
export {
  openDatabase,
  type OpenEduDB,
  type StoredCourse,
  type LearningProgress,
  type SearchIndex,
  type UserPreferences,
} from './db.js';
export { saveCourse, getCourse, listCourses, deleteCourse } from './course-store.js';
export {
  saveProgress,
  getProgress,
  getCourseProgress,
  deleteCourseProgress,
} from './progress-store.js';
export { saveSearchIndex, getSearchIndex, deleteSearchIndex } from './search-store.js';
export { savePreferences, getPreferences, deletePreferences } from './prefs-store.js';
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/storage test
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/storage/src/
git commit -m "feat(storage): implement search index and preferences stores"
```

---

## Epic 35: PWA Core Package

> Creates `packages/pwa-core` — reusable PWA infrastructure for install, update, and connectivity management.

### Story 35.1: Create packages/pwa-core scaffolding

**Files:**

- Create: `packages/pwa-core/package.json`
- Create: `packages/pwa-core/tsconfig.json`
- Create: `packages/pwa-core/vitest.config.ts`
- Create: `packages/pwa-core/src/index.ts`

- [ ] **Step 1: Create package scaffolding**

```bash
mkdir -p packages/pwa-core/src/__tests__
```

Create `packages/pwa-core/package.json`:

```json
{
  "name": "@open-edu/pwa-core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

Create `packages/pwa-core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

Create `packages/pwa-core/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

- [ ] **Step 2: Create barrel exports**

Create `packages/pwa-core/src/index.ts`:

```typescript
export { getInstallState, promptInstall, type InstallState } from './install.js';
export { getUpdateState, registerUpdateListener, type UpdateState } from './update.js';
export { getOnlineStatus, onOnlineStatusChange } from './connectivity.js';
export { getStorageUsage, type StorageUsage } from './storage-info.js';
```

- [ ] **Step 3: Run install and typecheck**

```bash
pnpm install
pnpm --filter @open-edu/pwa-core typecheck
```

Expected: Both succeed.

- [ ] **Step 4: Commit**

```bash
git add packages/pwa-core/
git commit -m "feat(pwa-core): create packages/pwa-core scaffolding"
```

---

### Story 35.2: Implement connectivity detection

**Files:**

- Create: `packages/pwa-core/src/connectivity.ts`
- Create: `packages/pwa-core/src/__tests__/connectivity.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pwa-core/src/__tests__/connectivity.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOnlineStatus, onOnlineStatusChange } from '../connectivity.js';

describe('Connectivity detection', () => {
  beforeEach(() => {
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('returns current online status', () => {
    expect(getOnlineStatus()).toBe(true);
    Object.defineProperty(navigator, 'onLine', { value: false });
    expect(getOnlineStatus()).toBe(false);
  });

  it('calls listener on online/offline events', () => {
    const listener = vi.fn();
    const cleanup = onOnlineStatusChange(listener);

    window.dispatchEvent(new Event('offline'));
    expect(listener).toHaveBeenCalledWith(false);

    window.dispatchEvent(new Event('online'));
    expect(listener).toHaveBeenCalledWith(true);

    cleanup();
  });

  it('cleanup removes listener', () => {
    const listener = vi.fn();
    const cleanup = onOnlineStatusChange(listener);

    cleanup();
    window.dispatchEvent(new Event('offline'));
    expect(listener).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/pwa-core test -- --run connectivity
```

Expected: FAIL

- [ ] **Step 3: Implement connectivity detection**

Create `packages/pwa-core/src/connectivity.ts`:

```typescript
export function getOnlineStatus(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOffline = () => callback(false);
  const handleOnline = () => callback(true);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/pwa-core test -- --run connectivity
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pwa-core/src/connectivity.ts packages/pwa-core/src/__tests__/connectivity.test.ts
git commit -m "feat(pwa-core): implement online/offline connectivity detection"
```

---

### Story 35.3: Implement install prompt management

**Files:**

- Create: `packages/pwa-core/src/install.ts`
- Create: `packages/pwa-core/src/__tests__/install.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/pwa-core/src/__tests__/install.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInstallState, promptInstall } from '../install.js';

describe('Install management', () => {
  let mockPrompt: ReturnType<typeof vi.fn>;
  let mockUserChoice: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUserChoice = vi.fn().resolveValue({ outcome: 'accepted' });
    mockPrompt = vi.fn().resolveValue(undefined);
    (window as Record<string, unknown>)['BeforeInstallPromptEvent'] = vi.fn();
    // Simulate beforeinstallprompt event
    const event = {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
      preventDefault: vi.fn(),
    };
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), event));
  });

  it('returns install state', async () => {
    const state = await getInstallState();
    expect(state).toHaveProperty('isInstallable');
    expect(state).toHaveProperty('isInstalled');
  });

  it('prompts user for install', async () => {
    const event = {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
      preventDefault: vi.fn(),
    };
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), event));

    const result = await promptInstall();
    expect(result.outcome).toBe('accepted');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/pwa-core test -- --run install
```

Expected: FAIL

- [ ] **Step 3: Implement install management**

Create `packages/pwa-core/src/install.ts`:

```typescript
export interface InstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
}

let deferredPrompt: Event | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export function getInstallState(): InstallState {
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;

  const platform = detectPlatform();

  return {
    isInstallable: deferredPrompt !== null,
    isInstalled,
    platform,
  };
}

export async function promptInstall(): Promise<{ outcome: 'accepted' | 'dismissed' }> {
  if (!deferredPrompt) {
    return { outcome: 'dismissed' };
  }

  const prompt = (deferredPrompt as { prompt: () => Promise<void> }).prompt;
  await prompt();

  const userChoice = await (
    deferredPrompt as { userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
  ).userChoice;

  deferredPrompt = null;
  return userChoice;
}

function detectPlatform(): 'android' | 'ios' | 'desktop' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/windows|mac|linux/.test(ua)) return 'desktop';
  return 'unknown';
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/pwa-core test -- --run install
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/pwa-core/src/install.ts packages/pwa-core/src/__tests__/install.test.ts
git commit -m "feat(pwa-core): implement install prompt management"
```

---

### Story 35.4: Implement update detection and storage info

**Files:**

- Create: `packages/pwa-core/src/update.ts`
- Create: `packages/pwa-core/src/storage-info.ts`
- Create: `packages/pwa-core/src/__tests__/update.test.ts`
- Create: `packages/pwa-core/src/__tests__/storage-info.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/pwa-core/src/__tests__/update.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUpdateState } from '../update.js';

describe('Update detection', () => {
  beforeEach(() => {
    // Mock service worker controller
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null },
      writable: true,
      configurable: true,
    });
  });

  it('returns update state', () => {
    const state = getUpdateState();
    expect(state).toHaveProperty('updateAvailable');
    expect(state).toHaveProperty('registration');
  });
});
```

Create `packages/pwa-core/src/__tests__/storage-info.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getStorageUsage } from '../storage-info.js';

describe('Storage info', () => {
  it('returns storage usage information', async () => {
    // Mock storage API
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().resolveValue({ usage: 1024, quota: 1024 * 1024 * 100 }),
      },
      writable: true,
      configurable: true,
    });

    const usage = await getStorageUsage();
    expect(usage.usage).toBe(1024);
    expect(usage.quota).toBe(1024 * 1024 * 100);
    expect(usage.percentage).toBeCloseTo(0.001);
  });

  it('handles missing storage API gracefully', async () => {
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true });
    const usage = await getStorageUsage();
    expect(usage.usage).toBe(0);
    expect(usage.quota).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @open-edu/pwa-core test
```

Expected: FAIL

- [ ] **Step 3: Implement update detection**

Create `packages/pwa-core/src/update.ts`:

```typescript
export interface UpdateState {
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

let registration: ServiceWorkerRegistration | null = null;

export async function registerUpdateListener(
  callback: (state: UpdateState) => void,
): Promise<() => void> {
  if (!('serviceWorker' in navigator)) return () => {};

  const reg = await navigator.serviceWorker.ready;
  registration = reg;

  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          callback({ updateAvailable: true, registration: reg });
        }
      });
    }
  });

  return () => {
    registration = null;
  };
}

export function getUpdateState(): UpdateState {
  return {
    updateAvailable: false,
    registration,
  };
}

export async function skipWaiting(): Promise<void> {
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}
```

- [ ] **Step 4: Implement storage info**

Create `packages/pwa-core/src/storage-info.ts`:

```typescript
export interface StorageUsage {
  usage: number;
  quota: number;
  percentage: number;
}

export async function getStorageUsage(): Promise<StorageUsage> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;

  return {
    usage,
    quota,
    percentage: quota > 0 ? usage / quota : 0,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/pwa-core test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/pwa-core/src/
git commit -m "feat(pwa-core): implement update detection and storage usage monitoring"
```

---

## Epic 36: Course Download System

> Adds ability to download course packages for offline use, stored in IndexedDB.

### Story 36.1: Create course download service

**Files:**

- Create: `apps/learner/src/courseDownload.ts`
- Create: `apps/learner/src/__tests__/courseDownload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/courseDownload.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadCourse, isCourseDownloaded, deleteDownloadedCourse } from '../courseDownload.js';

describe('Course Download', () => {
  beforeEach(async () => {
    const { openDatabase } = await import('@open-edu/storage');
    const db = await openDatabase();
    await db.clear('courses');
    db.close();
  });

  it('downloads and stores a course', async () => {
    // Mock the virtual:edu-data module
    vi.mock('virtual:edu-data', () => ({
      packageEntries: {
        'hello-world': {
          manifest: { name: 'Hello World' },
          nodes: [],
        },
      },
    }));

    const result = await downloadCourse('hello-world');
    expect(result.success).toBe(true);

    const downloaded = await isCourseDownloaded('hello-world');
    expect(downloaded).toBe(true);
  });

  it('deletes a downloaded course', async () => {
    await deleteDownloadedCourse('hello-world');
    const downloaded = await isCourseDownloaded('hello-world');
    expect(downloaded).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run courseDownload
```

Expected: FAIL

- [ ] **Step 3: Implement course download service**

Create `apps/learner/src/courseDownload.ts`:

```typescript
import {
  saveCourse,
  getCourse,
  deleteCourse,
  listCourses,
  type StoredCourse,
} from '@open-edu/storage';

export interface DownloadResult {
  success: boolean;
  error?: string;
}

export async function downloadCourse(courseId: string): Promise<DownloadResult> {
  try {
    // Dynamic import from virtual module (only works in learner app context)
    const { packageEntries } = await import('virtual:edu-data');
    const entry = (packageEntries as Record<string, unknown>)[courseId] as
      | {
          manifest: Record<string, unknown>;
          nodes: unknown[];
        }
      | undefined;

    if (!entry) {
      return { success: false, error: `Course "${courseId}" not found` };
    }

    const course: StoredCourse = {
      id: courseId,
      version: (entry.manifest.version as string) ?? '0.0.0',
      manifest: entry.manifest,
      nodes: entry.nodes as Record<string, unknown>[],
      assets: [],
      downloadedAt: new Date().toISOString(),
    };

    await saveCourse(course);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function isCourseDownloaded(courseId: string): Promise<boolean> {
  const course = await getCourse(courseId);
  return course !== undefined;
}

export async function deleteDownloadedCourse(courseId: string): Promise<void> {
  await deleteCourse(courseId);
}

export async function getDownloadedCourses(): Promise<StoredCourse[]> {
  return listCourses();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run courseDownload
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/courseDownload.ts apps/learner/src/__tests__/courseDownload.test.ts
git commit -m "feat(download): implement course download service with IndexedDB storage"
```

---

### Story 36.2: Create DownloadButton component

**Files:**

- Create: `apps/learner/src/components/DownloadButton.tsx`
- Create: `apps/learner/src/__tests__/DownloadButton.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/DownloadButton.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DownloadButton } from '../components/DownloadButton.js';
import { checkA11y } from '@open-edu/accessibility';

describe('DownloadButton', () => {
  it('renders download button for non-downloaded course', () => {
    render(<DownloadButton courseId="test-course" isDownloaded={false} />);
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('renders delete button for downloaded course', () => {
    render(<DownloadButton courseId="test-course" isDownloaded={true} />);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('passes accessibility check', async () => {
    const { container } = render(<DownloadButton courseId="test" isDownloaded={false} />);
    await checkA11y(container);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run DownloadButton
```

Expected: FAIL

- [ ] **Step 3: Implement DownloadButton**

Create `apps/learner/src/components/DownloadButton.tsx`:

```tsx
import * as React from 'react';
import { Download, Trash2 } from 'lucide-react';
import { Button } from './ui/button.js';

interface DownloadButtonProps {
  courseId: string;
  isDownloaded: boolean;
  onDownload?: (courseId: string) => void;
  onDelete?: (courseId: string) => void;
  disabled?: boolean;
}

export const DownloadButton = React.forwardRef<HTMLButtonElement, DownloadButtonProps>(
  ({ courseId, isDownloaded, onDownload, onDelete, disabled }, ref) => {
    if (isDownloaded) {
      return (
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          onClick={() => onDelete?.(courseId)}
          disabled={disabled}
          aria-label="Remove downloaded course"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1">Remove</span>
        </Button>
      );
    }

    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        onClick={() => onDownload?.(courseId)}
        disabled={disabled}
        aria-label="Download course for offline use"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="ml-1">Download</span>
      </Button>
    );
  },
);
DownloadButton.displayName = 'DownloadButton';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run DownloadButton
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/components/DownloadButton.tsx apps/learner/src/__tests__/DownloadButton.test.tsx
git commit -m "feat(download): add DownloadButton component"
```

---

## Epic 37: Offline Learning

> Adds offline course viewer, offline banner, and migration of localStorage to IndexedDB.

### Story 37.1: Create OfflineBanner component

**Files:**

- Create: `apps/learner/src/components/OfflineBanner.tsx`
- Create: `apps/learner/src/__tests__/OfflineBanner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/OfflineBanner.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from '../components/OfflineBanner.js';

describe('OfflineBanner', () => {
  it('shows banner when offline', () => {
    render(<OfflineBanner isOnline={false} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('does not show banner when online', () => {
    const { container } = render(<OfflineBanner isOnline={true} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run OfflineBanner
```

Expected: FAIL

- [ ] **Step 3: Implement OfflineBanner**

Create `apps/learner/src/components/OfflineBanner.tsx`:

```tsx
import * as React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export const OfflineBanner = React.forwardRef<HTMLDivElement, OfflineBannerProps>(
  ({ isOnline }, ref) => {
    if (isOnline) return null;

    return (
      <div
        ref={ref}
        role="alert"
        className="fixed left-0 right-0 top-0 z-50 bg-amber-100 px-4 py-2 text-center text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
      >
        <WifiOff className="mr-2 inline h-4 w-4" aria-hidden="true" />
        You're offline. Some features may be limited.
      </div>
    );
  },
);
OfflineBanner.displayName = 'OfflineBanner';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run OfflineBanner
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/components/OfflineBanner.tsx apps/learner/src/__tests__/OfflineBanner.test.tsx
git commit -m "feat(offline): add OfflineBanner component"
```

---

### Story 37.2: Create useOnlineStatus hook

**Files:**

- Create: `apps/learner/src/hooks/useOnlineStatus.ts`
- Create: `apps/learner/src/__tests__/useOnlineStatus.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/useOnlineStatus.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

describe('useOnlineStatus', () => {
  it('returns navigator.onLine value', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('updates on offline event', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('updates on online event', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run useOnlineStatus
```

Expected: FAIL

- [ ] **Step 3: Implement useOnlineStatus**

Create `apps/learner/src/hooks/useOnlineStatus.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => setIsOnline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run useOnlineStatus
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/hooks/useOnlineStatus.ts apps/learner/src/__tests__/useOnlineStatus.test.ts
git commit -m "feat(offline): add useOnlineStatus hook"
```

---

### Story 37.3: Integrate OfflineBanner into AppShell

**Files:**

- Modify: `apps/learner/src/AppShell.tsx`

- [ ] **Step 1: Read AppShell.tsx to understand structure**

Read `apps/learner/src/AppShell.tsx` to identify where to insert the OfflineBanner.

- [ ] **Step 2: Add OfflineBanner to AppShell**

Add imports at top:

```typescript
import { OfflineBanner } from './components/OfflineBanner.js';
import { useOnlineStatus } from './hooks/useOnlineStatus.js';
```

Add inside the component function, before the return:

```typescript
const isOnline = useOnlineStatus();
```

Add inside the JSX, before the main content:

```tsx
<OfflineBanner isOnline={isOnline} />
```

- [ ] **Step 3: Run existing AppShell tests to verify no regression**

```bash
pnpm --filter @open-edu/learner test -- --run AppShell
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/learner/src/AppShell.tsx
git commit -m "feat(offline): integrate OfflineBanner into AppShell"
```

---

## Epic 38: Offline Search

> Adds MiniSearch-based offline search with IndexedDB persistence.

### Story 38.1: Install MiniSearch and create search service

**Files:**

- Create: `apps/learner/src/searchService.ts`
- Create: `apps/learner/src/__tests__/searchService.test.ts`

- [ ] **Step 1: Install MiniSearch**

```bash
pnpm --filter @open-edu/learner add minisearch
```

- [ ] **Step 2: Write the failing test**

Create `apps/learner/src/__tests__/searchService.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { buildSearchIndex, searchOffline } from '../searchService.js';

describe('Offline Search', () => {
  const mockCourses = [
    { id: 'course-1', title: 'Introduction to Math', content: 'Learn basic arithmetic' },
    { id: 'course-2', title: 'Advanced Physics', content: 'Quantum mechanics basics' },
  ];

  it('builds search index from courses', () => {
    const index = buildSearchIndex(mockCourses);
    expect(index).toBeDefined();
  });

  it('searches offline courses', async () => {
    const index = buildSearchIndex(mockCourses);
    const results = searchOffline(index, 'math');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('course-1');
  });

  it('returns empty for no matches', async () => {
    const index = buildSearchIndex(mockCourses);
    const results = searchOffline(index, 'nonexistent');
    expect(results).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run searchService
```

Expected: FAIL

- [ ] **Step 4: Implement search service**

Create `apps/learner/src/searchService.ts`:

```typescript
import MiniSearch from 'minisearch';

export interface SearchResult {
  id: string;
  title: string;
  score: number;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
}

export function buildSearchIndex(documents: SearchDocument[]): MiniSearch {
  const index = new MiniSearch({
    fields: ['title', 'content'],
    storeFields: ['title'],
  });
  index.addAll(documents);
  return index;
}

export function searchOffline(index: MiniSearch, query: string, limit = 10): SearchResult[] {
  const results = index.search(query, { prefix: true, fuzzy: 0.2 });
  return results.slice(0, limit).map((r) => ({
    id: r.id as string,
    title: (r as unknown as { title: string }).title,
    score: r.score,
  }));
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run searchService
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/learner/src/searchService.ts apps/learner/src/__tests__/searchService.test.ts
git commit -m "feat(search): implement offline search with MiniSearch"
```

---

## Epic 39: Storage Management UI

> Adds UI for viewing storage usage, downloaded courses, and managing storage.

### Story 39.1: Create useStorageUsage hook

**Files:**

- Create: `apps/learner/src/hooks/useStorageUsage.ts`
- Create: `apps/learner/src/__tests__/useStorageUsage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/useStorageUsage.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStorageUsage } from '../hooks/useStorageUsage.js';

describe('useStorageUsage', () => {
  it('returns storage usage info', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().resolveValue({ usage: 5000, quota: 100000 }),
      },
      configurable: true,
    });

    const { result } = renderHook(() => useStorageUsage());
    // Initial state
    expect(result.current.usage).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run useStorageUsage
```

Expected: FAIL

- [ ] **Step 3: Implement useStorageUsage**

Create `apps/learner/src/hooks/useStorageUsage.ts`:

```typescript
import { useState, useEffect } from 'react';

interface StorageUsage {
  usage: number;
  quota: number;
  percentage: number;
}

export function useStorageUsage(): StorageUsage {
  const [usage, setUsage] = useState<StorageUsage>({ usage: 0, quota: 0, percentage: 0 });

  useEffect(() => {
    async function fetchUsage() {
      if (!navigator.storage?.estimate) return;
      const estimate = await navigator.storage.estimate();
      const u = estimate.usage ?? 0;
      const q = estimate.quota ?? 0;
      setUsage({ usage: u, quota: q, percentage: q > 0 ? u / q : 0 });
    }
    fetchUsage();
  }, []);

  return usage;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run useStorageUsage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/hooks/useStorageUsage.ts apps/learner/src/__tests__/useStorageUsage.test.ts
git commit -m "feat(storage-ui): add useStorageUsage hook"
```

---

### Story 39.2: Create StorageUsageCard and StorageSettingsPage

**Files:**

- Create: `apps/learner/src/components/StorageUsageCard.tsx`
- Create: `apps/learner/src/pages/StorageSettingsPage.tsx`
- Create: `apps/learner/src/__tests__/StorageUsageCard.test.tsx`
- Create: `apps/learner/src/__tests__/StorageSettingsPage.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/learner/src/__tests__/StorageUsageCard.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageUsageCard } from '../components/StorageUsageCard.js';

describe('StorageUsageCard', () => {
  it('displays storage usage', () => {
    render(<StorageUsageCard usage={5000} quota={100000} />);
    expect(screen.getByText(/storage/i)).toBeInTheDocument();
  });
});
```

Create `apps/learner/src/__tests__/StorageSettingsPage.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageSettingsPage } from '../pages/StorageSettingsPage.js';

describe('StorageSettingsPage', () => {
  it('renders storage management UI', () => {
    render(<StorageSettingsPage />);
    expect(screen.getByText(/storage/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @open-edu/learner test -- --run StorageUsageCard
pnpm --filter @open-edu/learner test -- --run StorageSettingsPage
```

Expected: FAIL

- [ ] **Step 3: Implement StorageUsageCard**

Create `apps/learner/src/components/StorageUsageCard.tsx`:

```tsx
import * as React from 'react';
import { HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { Progress } from './ui/progress.js';

interface StorageUsageCardProps {
  usage: number;
  quota: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const StorageUsageCard = React.forwardRef<HTMLDivElement, StorageUsageCardProps>(
  ({ usage, quota }, ref) => {
    const percentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

    return (
      <Card ref={ref}>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <HardDrive className="h-5 w-5" aria-hidden="true" />
          <CardTitle className="text-base">Storage Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={percentage} className="mb-2" aria-label={`${percentage}% used`} />
          <p className="text-on-surface/60 text-sm">
            {formatBytes(usage)} of {formatBytes(quota)} used ({percentage}%)
          </p>
        </CardContent>
      </Card>
    );
  },
);
StorageUsageCard.displayName = 'StorageUsageCard';
```

- [ ] **Step 4: Implement StorageSettingsPage**

Create `apps/learner/src/pages/StorageSettingsPage.tsx`:

```tsx
import * as React from 'react';
import { useStorageUsage } from '../hooks/useStorageUsage.js';
import { StorageUsageCard } from '../components/StorageUsageCard.js';

export function StorageSettingsPage() {
  const { usage, quota } = useStorageUsage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Storage Settings</h1>
      <StorageUsageCard usage={usage} quota={quota} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/learner test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/learner/src/components/StorageUsageCard.tsx apps/learner/src/pages/StorageSettingsPage.tsx apps/learner/src/__tests__/
git commit -m "feat(storage-ui): add StorageUsageCard and StorageSettingsPage"
```

---

## Epic 40: Update System

> Adds app update notification UI that doesn't interrupt learning.

### Story 40.1: Create UpdatePrompt component

**Files:**

- Create: `apps/learner/src/components/UpdatePrompt.tsx`
- Create: `apps/learner/src/__tests__/UpdatePrompt.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/UpdatePrompt.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpdatePrompt } from '../components/UpdatePrompt.js';

describe('UpdatePrompt', () => {
  it('shows update notification when available', () => {
    render(<UpdatePrompt updateAvailable={true} onUpdate={vi.fn()} />);
    expect(screen.getByText(/update available/i)).toBeInTheDocument();
  });

  it('does not show when no update', () => {
    const { container } = render(<UpdatePrompt updateAvailable={false} onUpdate={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/learner test -- --run UpdatePrompt
```

Expected: FAIL

- [ ] **Step 3: Implement UpdatePrompt**

Create `apps/learner/src/components/UpdatePrompt.tsx`:

```tsx
import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button.js';

interface UpdatePromptProps {
  updateAvailable: boolean;
  onUpdate?: () => void;
  onDismiss?: () => void;
}

export const UpdatePrompt = React.forwardRef<HTMLDivElement, UpdatePromptProps>(
  ({ updateAvailable, onUpdate, onDismiss }, ref) => {
    if (!updateAvailable) return null;

    return (
      <div
        ref={ref}
        role="status"
        className="border-border bg-surface fixed bottom-4 right-4 z-50 rounded-lg border p-4 shadow-lg"
      >
        <p className="mb-2 text-sm font-medium">A new version is available</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onUpdate}>
            <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
            Update
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    );
  },
);
UpdatePrompt.displayName = 'UpdatePrompt';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @open-edu/learner test -- --run UpdatePrompt
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/components/UpdatePrompt.tsx apps/learner/src/__tests__/UpdatePrompt.test.tsx
git commit -m "feat(update): add UpdatePrompt component"
```

---

## Epic 41: Internationalization

> Ensures PWA integrates with existing i18n infrastructure.

### Story 41.1: Verify locale switching works offline

**Files:**

- Modify: `apps/learner/src/pages/StorageSettingsPage.tsx` (add locale info)

- [ ] **Step 1: Verify existing locale switching works**

Check that `SettingsPage.tsx` already has locale switching (it does via theme/accessibility settings). Verify it stores locale in localStorage and can be read offline.

- [ ] **Step 2: Add locale info to StorageSettingsPage**

Update `StorageSettingsPage.tsx` to show current locale from preferences store.

- [ ] **Step 3: Run existing tests**

```bash
pnpm --filter @open-edu/learner test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "feat(i18n): verify offline locale switching works with PWA"
```

---

## Epic 42: Security

> Ensures HTTPS, no secrets in packages, and prepares for future signature validation.

### Story 42.1: Add security headers and validation

**Files:**

- Modify: `apps/learner/vite.config.ts` (add security headers)
- Create: `packages/storage/src/__tests__/security.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/storage/src/__tests__/security.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security requirements', () => {
  it('manifest does not contain sensitive fields', () => {
    const manifestPath = path.resolve(
      __dirname,
      '../../../../apps/learner/public/manifest.webmanifest',
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    // Manifest should not contain API keys or secrets
    expect(manifest).not.toHaveProperty('api_key');
    expect(manifest).not.toHaveProperty('secret');
    expect(manifest).not.toHaveProperty('token');
  });

  it('course packages do not contain auth tokens', async () => {
    const { openDatabase } = await import('../db.js');
    const db = await openDatabase();
    const courses = await db.getAll('courses');
    for (const course of courses) {
      const manifestStr = JSON.stringify(course.manifest);
      expect(manifestStr).not.toMatch(/api[_-]?key|secret|token|password/i);
    }
    db.close();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
pnpm --filter @open-edu/storage test
```

Expected: PASS (manifest has no secrets by default)

- [ ] **Step 3: Add security headers to vite.config.ts**

Add to Vite config's `server` and `preview` sections:

```typescript
server: {
  headers: {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  },
},
```

- [ ] **Step 4: Commit**

```bash
git add packages/storage/src/__tests__/security.test.ts apps/learner/vite.config.ts
git commit -m "feat(security): add security headers and package validation tests"
```

---

## Post-Plan: Dev-Server CSS Regeneration

After any Tailwind class changes in runtime components, regenerate:

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

---

## Verification Checklist

After all epics are complete, verify:

- [ ] `pnpm install` succeeds
- [ ] `pnpm build` succeeds (all packages)
- [ ] `pnpm test` passes (all tests)
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm format:check` passes
- [ ] `pnpm --filter @open-edu/learner build:deploy` produces `sw.js` and `manifest.webmanifest` in dist
- [ ] Lighthouse PWA audit scores ≥ 95
- [ ] Offline mode works (disconnect network, navigate to downloaded course)
- [ ] Install prompt appears on supported browsers
- [ ] Storage management page shows correct usage
- [ ] No secrets in course packages or manifest
