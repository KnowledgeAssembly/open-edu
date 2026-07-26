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
  replaceCourse(courseId: string, course: StoredCourseRecord): Promise<void>;
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

    return this.installInternal(source, true, signal);
  }

  private async installInternal(
    source: CourseSource,
    isUpdate: boolean,
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
      if (isUpdate) {
        await this.storage.replaceCourse(resolved.inspection.id, courseRecord);
      } else {
        await this.storage.saveCourse(courseRecord);
      }
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
