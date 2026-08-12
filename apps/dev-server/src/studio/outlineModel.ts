import type { ActivityKind, ActivitySummary } from './types.js';

const COMPLETED_SENTINEL = 'COMPLETED';

export function detectActivityKind(path: string, content: string): ActivityKind {
  if (path.endsWith('.md')) return 'lesson';
  if (path.endsWith('.json')) {
    try {
      const parsed = JSON.parse(content) as { type?: string };
      if (parsed.type === 'quiz') return 'quiz';
      if (parsed.type === 'reflection') return 'reflection';
      if (parsed.type === 'custom' || parsed.type === 'widget' || parsed.type === 'exercise') {
        return 'practice';
      }
    } catch {
      return 'other';
    }
  }
  return 'other';
}

export function titleFromMarkdown(content: string): string {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match?.[1]?.trim() || 'Untitled lesson';
}

export function titleFromQuizJson(content: string): string {
  try {
    const parsed = JSON.parse(content) as { question?: string; title?: string };
    return parsed.title || parsed.question || 'Untitled quiz';
  } catch {
    return 'Untitled quiz';
  }
}

export function titleFromReflectionJson(content: string): string {
  try {
    const parsed = JSON.parse(content) as { title?: string; prompt?: string };
    const prompt = parsed.prompt?.trim();
    const excerpt = prompt ? (prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt) : '';
    return parsed.title?.trim() || excerpt || 'Untitled reflection';
  } catch {
    return 'Untitled reflection';
  }
}

export function buildLinearWorkflow(orderedPaths: string[], entry: string) {
  const routing: Record<string, { onComplete: string }> = {};
  for (let i = 0; i < orderedPaths.length; i++) {
    const path = orderedPaths[i]!;
    routing[path] = { onComplete: orderedPaths[i + 1] ?? COMPLETED_SENTINEL };
  }
  return {
    entry: orderedPaths.includes(entry) ? entry : (orderedPaths[0] ?? entry),
    routing,
  };
}

export function activitiesFromEntryOrder(
  orderedPaths: string[],
  files: Map<string, string>,
): ActivitySummary[] {
  return orderedPaths.map((path) => {
    const content = files.get(path) ?? '';
    const kind = detectActivityKind(path, content);
    const title =
      kind === 'lesson'
        ? titleFromMarkdown(content)
        : kind === 'quiz'
          ? titleFromQuizJson(content)
          : kind === 'reflection'
            ? titleFromReflectionJson(content)
            : path.split('/').pop() || path;
    return { id: path, path, title, kind };
  });
}
