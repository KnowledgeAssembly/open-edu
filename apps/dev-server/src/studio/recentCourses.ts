export interface RecentCourse {
  id: string;
  title: string;
  packageDir: string;
  updatedAt: number;
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
          typeof (item as RecentCourse).packageDir === 'string',
      )
      .map((item) => ({ ...item, updatedAt: Number(item.updatedAt) || Date.now() }));
  } catch {
    return [];
  }
}

export function listRecentCourses(): RecentCourse[] {
  return readRecent();
}

export function recordRecentCourse(course: RecentCourse): void {
  const entries = readRecent().filter((entry) => entry.id !== course.id);
  entries.unshift({ ...course, updatedAt: Date.now() });
  const next = entries.slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode, quota)
  }
}
