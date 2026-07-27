---
sidebar_position: 14
---

# Storage

The **storage** package (`@open-edu/storage`) provides IndexedDB-based persistence for the learner app. It replaces all `localStorage` usage with structured, typed, quota-aware storage.

## Quick Start

```ts
import { openDatabase, saveCourse, getCourse, saveProgress, getProgress } from '@open-edu/storage';

const db = await openDatabase();
await saveCourse({
  id: 'hello-world',
  version: '1.0.0',
  manifest: {},
  nodes: [],
  assets: [],
  downloadedAt: new Date().toISOString(),
});
const course = await getCourse('hello-world');
```

## Database

- **Name:** `open-edu`
- **Version:** 2
- **Engine:** IndexedDB via [`idb`](https://github.com/jakearchibald/idb) (Promise-based wrapper)

## Object Stores

| Store            | Key Path                   | Description                                                 |
| ---------------- | -------------------------- | ----------------------------------------------------------- |
| `courses`        | `id`                       | Downloaded course packages with manifest, nodes, and assets |
| `progress`       | `['courseId', 'lessonId']` | Per-node learning progress (completed, score, timestamp)    |
| `search-indexes` | `locale`                   | Persisted MiniSearch indexes per locale                     |
| `preferences`    | `locale`                   | User preferences (locale, theme, font size)                 |
| `badges`         | `courseId`                 | Earned badge records per course                             |
| `cards`          | `cardId`                   | Knowledge Card level and unlock timestamp                   |

## Store APIs

### Course Store

```ts
saveCourse(course: StoredCourse): Promise<void>
getCourse(id: string): Promise<StoredCourse | undefined>
listCourses(): Promise<StoredCourse[]>
deleteCourse(id: string): Promise<void>
replaceCourse(course: StoredCourse): Promise<void>
```

The `replaceCourse` function performs a transactional swap — it replaces an existing course record in a single transaction, ensuring atomicity for version upgrades.

### Progress Store

```ts
saveProgress(progress: LearningProgress): Promise<void>
getProgress(courseId: string, lessonId: string): Promise<LearningProgress | undefined>
getCourseProgress(courseId: string): Promise<LearningProgress[]>
getAllCourseProgress(): Promise<LearningProgress[]>
deleteCourseProgress(courseId: string): Promise<void>
```

### Badge Store

```ts
saveBadge(badge: BadgeData): Promise<void>
getBadges(courseId: string): Promise<BadgeData | undefined>
getAllBadges(): Promise<BadgeData[]>
deleteAllBadges(): Promise<void>
```

### Card Store

```ts
saveCard(card: CardProgressData): Promise<void>
getCard(cardId: string): Promise<CardProgressData | undefined>
getAllCards(): Promise<CardProgressData[]>
deleteAllCards(): Promise<void>
```

### Search Store

```ts
saveSearchIndex(index: SearchIndex): Promise<void>
getSearchIndex(locale: string): Promise<SearchIndex | undefined>
deleteSearchIndex(locale: string): Promise<void>
```

### Preferences Store

```ts
savePreferences(prefs: UserPreferences): Promise<void>
getPreferences(locale: string): Promise<UserPreferences | undefined>
deletePreferences(locale: string): Promise<void>
```

## Data Types

```ts
interface StoredCourse {
  id: string;
  version: string;
  manifest: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  assets: { path: string; data: ArrayBuffer }[];
  downloadedAt: string;
  distribution?: DistributionMeta;
}

interface DistributionMeta {
  source: 'file' | 'url' | 'catalog';
  sourceUrl?: string;
  installedVersion: string;
  checksum?: string;
  installedAt: string;
}

interface LearningProgress {
  courseId: string;
  lessonId: string;
  completed: boolean;
  score?: number;
  updatedAt: string;
  data?: Record<string, unknown>;
}

interface BadgeData {
  courseId: string;
  badgeNames: string[];
}

interface CardProgressData {
  cardId: string;
  level: number;
  unlockedAt: string;
}

interface SearchIndex {
  locale: string;
  indexData: Record<string, unknown>;
}

interface UserPreferences {
  locale: string;
  theme: string;
  fontSize: string;
}
```

## Migration from localStorage

All learner app persistence was migrated from `localStorage` to IndexedDB:

| Before (localStorage key)        | After (IndexedDB store)                                 |
| -------------------------------- | ------------------------------------------------------- |
| `open-edu-progress`              | `progress` store                                        |
| `open-edu-bundle-progress`       | `progress` store (with `__bundle__` sentinel in `data`) |
| `open-edu-badges`                | `badges` store                                          |
| `open-edu-cards`                 | `cards` store                                           |
| `open-edu-search-index-{locale}` | `search-indexes` store                                  |
| `open-edu-theme-preference`      | `preferences` store                                     |

## Dependencies

- `idb` ^8.0 — Promise-based IndexedDB wrapper

## Tests

```bash
pnpm --filter @open-edu/storage test
```
