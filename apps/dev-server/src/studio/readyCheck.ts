import type { ReadyCheckItem } from './types.js';
import { detectActivityKind } from './outlineModel.js';

export interface ReadyCheckInput {
  title: string;
  files: Map<string, string>; // path -> content for nodes + manifest
  validationErrors: Array<{ path: string; error: string }>;
}

export function buildReadyCheck(input: ReadyCheckInput): ReadyCheckItem[] {
  const nodePaths = [...input.files.keys()].filter((p) => p.startsWith('nodes/'));
  const items: ReadyCheckItem[] = [
    {
      id: 'hasTitle',
      labelKey: 'studio.ready.hasTitle',
      passed: Boolean(input.title.trim()),
    },
    {
      id: 'hasActivity',
      labelKey: 'studio.ready.hasActivity',
      passed: nodePaths.length > 0,
    },
  ];

  let quizzesOk = true;
  let lessonsOk = true;
  for (const path of nodePaths) {
    const content = input.files.get(path) ?? '';
    const kind = detectActivityKind(path, content);
    if (kind === 'quiz') {
      try {
        const parsed = JSON.parse(content) as {
          options?: Array<{ correct?: boolean }>;
        };
        if (!parsed.options?.some((o) => o.correct)) quizzesOk = false;
      } catch {
        quizzesOk = false;
      }
    }
    if (kind === 'lesson' && !/^#{1,6}\s/m.test(content)) lessonsOk = false;
  }

  items.push({
    id: 'quizHasCorrect',
    labelKey: 'studio.ready.quizHasCorrect',
    passed: quizzesOk,
  });
  items.push({
    id: 'markdownHasHeading',
    labelKey: 'studio.ready.markdownHasHeading',
    passed: lessonsOk,
  });
  items.push({
    id: 'packageValid',
    labelKey: 'studio.ready.packageValid',
    passed: input.validationErrors.length === 0,
    detail: input.validationErrors[0]?.error,
  });

  return items;
}

export function isReadyToExport(items: ReadyCheckItem[]): boolean {
  return items.every((i) => i.passed);
}
