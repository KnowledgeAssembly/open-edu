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
