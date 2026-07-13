import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { WIDGET_ALIAS_MAP, migrateWidgetId } from '@open-edu/widgets';

export interface MigrationChange {
  file: string;
  oldId: string;
  newId: string;
}

export interface MigrationResult {
  migrated: number;
  changes: MigrationChange[];
  dryRun: boolean;
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, extensions));
    } else if (extensions.includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function migratePackage(
  packageDir: string,
  options: { dryRun?: boolean } = {},
): Promise<MigrationResult> {
  const dryRun = options.dryRun ?? false;
  const changes: MigrationChange[] = [];
  const extensions = ['.md', '.json', '.jsonc'];
  const files = getAllFiles(packageDir, extensions);
  const legacyIds = Object.keys(WIDGET_ALIAS_MAP);

  for (const filePath of files) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    let modified = content;
    for (const legacyId of legacyIds) {
      if (!modified.includes(legacyId)) continue;
      const { newId } = migrateWidgetId(legacyId);

      while (modified.includes(legacyId)) {
        modified = modified.replace(legacyId, newId);
        changes.push({ file: filePath, oldId: legacyId, newId });
      }
    }

    if (modified !== content && !dryRun) {
      writeFileSync(filePath, modified, 'utf-8');
    }
  }

  return { migrated: changes.length, changes, dryRun };
}
