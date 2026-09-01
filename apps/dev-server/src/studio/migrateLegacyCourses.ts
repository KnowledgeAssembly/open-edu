import { listStudioCourses, type CourseRepository } from '@open-edu/storage';
import { assertSafeCoursePath } from './courseFiles.js';

/**
 * One-time development migration (SPEC §44): read legacy whole-course
 * IndexedDB records and write individual files into an OPFS workspace via a
 * `CourseRepository`. Guarded behind an explicit call — never automatic on
 * startup. After migration, canonical content lives in the workspace.
 */
export interface MigrateLegacyCoursesOptions {
  repository: CourseRepository;
}

export interface LegacyCourseMigrationResult {
  migrated: string[];
  skipped: string[];
  failed: Array<{ id: string; error: string }>;
}

export async function migrateLegacyCourses(
  options: MigrateLegacyCoursesOptions,
): Promise<LegacyCourseMigrationResult> {
  const result: LegacyCourseMigrationResult = { migrated: [], skipped: [], failed: [] };
  const records = await listStudioCourses();

  for (const record of records) {
    if (!record.files || record.files.length === 0) {
      result.skipped.push(record.id);
      continue;
    }
    try {
      if (await options.repository.exists(record.id)) {
        result.skipped.push(record.id);
        continue;
      }
      const workspace = await options.repository.create(record.id);
      for (const file of record.files) {
        const safe = assertSafeCoursePath(file.path);
        await workspace.write(safe, new Uint8Array(file.data));
      }
      result.migrated.push(record.id);
    } catch (err) {
      result.failed.push({
        id: record.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
