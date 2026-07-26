import {
  saveCourse,
  getCourse,
  deleteCourse,
  listCourses,
  replaceCourse,
  type StoredCourse,
} from '@open-edu/storage';
import { InstallCoordinator } from '@open-edu/oep-distribution';
import type { CourseSource, InstallResult } from '@open-edu/oep-distribution';

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
    replaceCourse: async (_id, _course) => {
      throw new Error('replaceCourse should not be called during initial install');
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
    replaceCourse: async (id: string, course) => {
      await replaceCourse(id, {
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
