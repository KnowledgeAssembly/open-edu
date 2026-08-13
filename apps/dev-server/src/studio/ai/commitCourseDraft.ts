import { existsSync, readdirSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPackage } from '@open-edu/core';
import { getDraftEntry, deleteDraft } from './generateCourse.js';

export interface CommitCourseDraftOptions {
  draftId: string;
  packageDir: string;
  force?: boolean;
}

export interface CommitCourseDraftResult {
  success: boolean;
  title?: string;
  error?: string;
  code?: 'draft-not-found' | 'draft-expired' | 'has-content' | 'write';
}

function hasNodes(packageDir: string): boolean {
  const nodesDir = join(packageDir, 'nodes');
  return existsSync(nodesDir) && readdirSync(nodesDir).length > 0;
}

export async function commitCourseDraft(
  options: CommitCourseDraftOptions,
): Promise<CommitCourseDraftResult> {
  const { draftId, packageDir, force = false } = options;

  const entry = getDraftEntry(draftId);
  if (!entry) {
    return {
      success: false,
      error: 'Draft not found or expired',
      code: 'draft-not-found',
    };
  }

  if (!force && hasNodes(packageDir)) {
    return {
      success: false,
      error: 'Package already has content',
      code: 'has-content',
    };
  }

  try {
    await cp(entry.outputDir, packageDir, { recursive: true });
  } catch (error) {
    return {
      success: false,
      error: `Could not save draft: ${error instanceof Error ? error.message : String(error)}`,
      code: 'write',
    };
  }

  deleteDraft(draftId);

  let title: string | undefined;
  try {
    const pkg = await loadPackage(packageDir);
    title = pkg.manifest.title;
  } catch {
    // loadPackage may fail if the draft is incomplete; title remains undefined
  }

  return { success: true, title };
}