export interface RecentCourse {
  id: string;
  title: string;
  updatedAt: number;
  /** 'local' courses live on the filesystem; 'browser' courses live in IndexedDB. */
  location: 'local' | 'browser';
  /** Filesystem package directory (local courses only). Never a fake path. */
  packageDir?: string;
}

const RECENT_KEY = 'openedu.studio.recent';
const MAX_RECENT = 10;

function readRecent(): RecentCourse[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentCourse =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as RecentCourse).id === 'string' &&
          typeof (item as RecentCourse).title === 'string' &&
          ((item as RecentCourse).location === 'local' ||
            (item as RecentCourse).location === 'browser' ||
            typeof (item as { packageDir?: unknown }).packageDir === 'string'),
      )
      .map((item) => {
        const hasLocation = item.location === 'local' || item.location === 'browser';
        const packageDir = typeof item.packageDir === 'string' ? item.packageDir : undefined;
        return {
          id: item.id,
          title: item.title,
          // Legacy entries predate the `location` field; treat any entry that
          // carried a packageDir as a local filesystem course.
          location: hasLocation ? item.location : packageDir ? 'local' : 'browser',
          updatedAt: Number(item.updatedAt) || Date.now(),
          packageDir,
        } as RecentCourse;
      });
  } catch {
    return [];
  }
}

export function listRecentCourses(): RecentCourse[] {
  return readRecent();
}

export function recordRecentCourse(course: RecentCourse): void {
  const entries = readRecent().filter((entry) => entry.id !== course.id);
  const next: RecentCourse = {
    location: course.location,
    id: course.id,
    title: course.title,
    updatedAt: Date.now(),
    packageDir: course.location === 'local' ? course.packageDir : undefined,
  };
  entries.unshift(next);
  const pruned = entries.slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(pruned));
  } catch {
    // storage unavailable (private mode, quota)
  }
}
