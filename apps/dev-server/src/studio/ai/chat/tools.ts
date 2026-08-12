import { completeWithLlm } from '../studioLlm';
import { extractJsonObject } from '../prompts/index.js';
import {
  buildLessonAddPrompt,
  buildQuizAddPrompt,
  buildPracticeAddPrompt,
  buildLessonEditPrompt,
  buildQuizEditPrompt,
  buildPracticeEditPrompt,
  renderCourseContext,
} from '../prompts/index.js';
import { readCourseContext, mapToDraftItem, validateItemDraft, ItemRequestError } from '../itemGenerate';
import type { DraftItem, ItemIntent, ItemIntentParams } from '../types';

export interface ToolCallRequest {
  type: 'draft_new' | 'edit_existing';
  kind: 'lesson' | 'quiz' | 'practice';
  description?: string;
  currentContent?: string;
  intent?: ItemIntent;
  params?: ItemIntentParams;
  packageDir: string;
}

export type ToolCallResult =
  | { ok: true; items: DraftItem[] }
  | { ok: false; error: string };

export async function draftActivity(request: ToolCallRequest): Promise<ToolCallResult> {
  const context = renderCourseContext(readCourseContext(request.packageDir));
  const expectedOptionCount = request.kind === 'quiz' ? 4 : 1;

  try {
    if (request.type === 'draft_new') {
      const description = request.description || 'Create a new activity';
      const buildPrompt = () => {
        switch (request.kind) {
          case 'lesson':
            return buildLessonAddPrompt(description, context);
          case 'quiz':
            return buildQuizAddPrompt(description, context);
          case 'practice':
            return buildPracticeAddPrompt(description, context);
        }
      };

      let prompt = buildPrompt();
      let lastError = 'AI draft failed validation after retry';
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const raw = await completeWithLlm(prompt);
          const parsed = extractJsonObject(raw);
          const item = mapToDraftItem(request.kind, parsed);
          const validationError = validateItemDraft(item, { expectedOptionCount });
          if (!validationError) {
            return { ok: true, items: [item] };
          }
          lastError = validationError;
          prompt = [
            buildPrompt(),
            '',
            `The previous draft was invalid: ${validationError}`,
            'Please fix it and output ONLY the corrected JSON object.',
          ].join('\n');
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }
      return { ok: false, error: lastError };
    }

    const currentContent = request.currentContent;
    if (!currentContent) {
      return { ok: false, error: 'currentContent is required for edit' };
    }

    if (request.kind === 'quiz' && request.intent === 'add-questions') {
      return editActivityAddQuestions(request.kind, currentContent, context);
    }

    const sourceOptionCount = request.kind === 'quiz' ? countQuizOptions(currentContent) : 1;
    const editExpectedOptionCount = request.kind === 'quiz' ? sourceOptionCount : 1;

    const buildEditPrompt = () => {
      switch (request.kind) {
        case 'lesson':
          return buildLessonEditPrompt(request.intent || 'rewrite', currentContent, context, request.params);
        case 'quiz':
          return buildQuizEditPrompt(request.intent || 'rewrite', currentContent, sourceOptionCount, context, request.params);
        case 'practice':
          return buildPracticeEditPrompt(request.intent || 'improve-prompt', currentContent, context, request.params);
      }
    };

    let prompt = buildEditPrompt();
    let lastError = 'AI draft failed validation after retry';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await completeWithLlm(prompt);
        const parsed = extractJsonObject(raw);
        const item = mapToDraftItem(request.kind, parsed);
        const editError = validateItemDraft(item, { expectedOptionCount: editExpectedOptionCount });
        if (!editError) {
          return { ok: true, items: [item] };
        }
        lastError = editError;
        prompt = [
          buildEditPrompt(),
          '',
          `The previous draft was invalid: ${editError}`,
          'Please fix it and output ONLY the corrected JSON object.',
        ].join('\n');
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    return { ok: false, error: lastError };
  } catch (err) {
    if (err instanceof ItemRequestError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function editActivityAddQuestions(
  _kind: 'lesson' | 'quiz' | 'practice',
  currentContent: string,
  context: string,
): Promise<ToolCallResult> {
  const buildPrompt = () =>
    buildQuizEditPrompt('add-questions', currentContent, 4, context, undefined);

  let prompt = buildPrompt();
  let lastError = 'AI draft failed validation after retry';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await completeWithLlm(prompt);
      const parsed = extractJsonObject(raw);
      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
      if (rawQuestions.length === 0) {
        throw new Error('No quiz questions were generated');
      }
      const items = rawQuestions
        .filter((question): question is Record<string, unknown> =>
          Boolean(question && typeof question === 'object'),
        )
        .map((question) => mapToDraftItem('quiz', question));
      const errors = items
        .map((item) => validateItemDraft(item, { expectedOptionCount: 4 }))
        .filter((error): error is string => Boolean(error));
      if (errors.length === 0) {
        return { ok: true, items };
      }
      lastError = errors.join('; ');
      prompt = [
        buildPrompt(),
        '',
        `The previous draft was invalid: ${lastError}`,
        'Please fix it and output ONLY the corrected JSON object.',
      ].join('\n');
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { ok: false, error: lastError };
}

function countQuizOptions(currentContent: string): number {
  try {
    const parsed = JSON.parse(currentContent) as { options?: Array<unknown> };
    if (Array.isArray(parsed.options)) return parsed.options.length;
  } catch {
    // ignore parse errors
  }
  return 0;
}