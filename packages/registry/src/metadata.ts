import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RegistryMetadataSchema } from '@open-edu/schemas';
import type { RegistryMetadata } from '@open-edu/schemas';

export interface LoadedMetadata {
  dir: string;
  data: RegistryMetadata;
}

export function loadCourseDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function loadMetadataMap(dir: string): Map<string, LoadedMetadata> {
  const map = new Map<string, LoadedMetadata>();
  for (const courseId of loadCourseDirs(dir)) {
    const file = join(dir, courseId, 'metadata.json');
    if (!existsSync(file)) continue;
    const data: unknown = JSON.parse(readFileSync(file, 'utf8'));
    const parsed = RegistryMetadataSchema.safeParse(data);
    if (!parsed.success) {
      console.warn(`warn: skipping courses/${courseId}/metadata.json (invalid schema)`);
      continue;
    }
    map.set(parsed.data.id, { dir: courseId, data: parsed.data });
  }
  return map;
}

export function validateMetadataDir(dir: string): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const courseId of loadCourseDirs(dir)) {
    const file = join(dir, courseId, 'metadata.json');
    if (!existsSync(file)) {
      errors.push(`courses/${courseId}/metadata.json is missing`);
      continue;
    }
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      errors.push(
        `courses/${courseId}/metadata.json is not valid JSON: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      continue;
    }
    const parsed = RegistryMetadataSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(
          `courses/${courseId}/metadata.json: ${issue.path.join('.') || '/'} ${issue.message}`,
        );
      }
      continue;
    }
    if (ids.has(parsed.data.id)) {
      errors.push(`duplicate course id "${parsed.data.id}" in courses/${courseId}/metadata.json`);
    } else {
      ids.add(parsed.data.id);
    }
  }
  return errors;
}
