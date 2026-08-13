import type { StudioApi } from '../studioApi';
import type { DraftItem } from './types';

export type ApplyMode = 'file' | 'buffer';

export interface ApplyDraftOptions {
  mode: ApplyMode;
  path?: string;
  applyToEditor?: (d: DraftItem) => void;
  openInEditor?: boolean;
}

export async function applyDraft(
  api: StudioApi,
  draft: DraftItem,
  options: ApplyDraftOptions,
): Promise<{ path?: string }> {
  if (options.mode === 'file') {
    return applyDraftToFile(api, draft, options);
  }
  return applyDraftToBuffer(draft, options);
}

export async function applyDraftBatch(
  api: StudioApi,
  drafts: DraftItem[],
): Promise<string[]> {
  const stamp = Date.now();
  const written: string[] = [];

  for (let i = 0; i < drafts.length; i++) {
    const item = drafts[i]!;
    const ext = item.kind === 'lesson' ? '.md' : '.json';
    const path = `nodes/${item.kind}-${stamp + i}${ext}`;
    try {
      await api.writeFile(path, item.content);
      written.push(path);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`${message} (${written.length} of ${drafts.length} saved)`);
    }
  }

  try {
    const outline = await api.getOutline();
    await api.saveOutlineOrder([
      ...outline.activities.map((a) => a.path),
      ...written,
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Saved files but failed to update outline: ${message}`);
  }

  return written;
}

async function applyDraftToFile(
  api: StudioApi,
  draft: DraftItem,
  options: ApplyDraftOptions,
): Promise<{ path?: string }> {
  const stamp = Date.now();
  const ext = draft.kind === 'lesson' ? '.md' : '.json';
  const path = options.path || `nodes/${draft.kind}-${stamp}${ext}`;

  await api.writeFile(path, draft.content);

  const outline = await api.getOutline();
  const exists = outline.activities.some((a) => a.path === path);
  if (!exists) {
    await api.saveOutlineOrder([
      ...outline.activities.map((a) => a.path),
      path,
    ]);
  }

  return { path };
}

async function applyDraftToBuffer(
  draft: DraftItem,
  options: ApplyDraftOptions,
): Promise<{ path?: string }> {
  if (options.applyToEditor) {
    options.applyToEditor(draft);
  }
  return {};
}