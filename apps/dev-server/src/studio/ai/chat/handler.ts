import {
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
  type UIMessageChunk,
} from 'ai';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { completeWithLlm } from '../studioLlm';
import {
  StudioChatRequestSchema,
  MAX_MESSAGES,
  MAX_CONTEXT_CHARS,
  MAX_REQUEST_SIZE_BYTES,
} from './config';
import { buildSystemPrompt, extractSuggestedNextSteps } from './policy';
import { draftActivity, generateCourseDraftTool } from './tools';
import { createChatMetadata, type StudioChatMetadata } from './metadata';
import { studioChatMessage } from './messages';
import { checkRateLimit } from './rateLimit';
import type { StudioContextSnapshot } from '../context';
import type { ItemIntent, ItemIntentParams } from '../types';

function parseIntentFromMessage(content: string): {
  type: 'draft_new' | 'edit_existing' | 'generate_course' | 'explain';
  kind?: 'lesson' | 'quiz' | 'practice';
  description?: string;
  intent?: ItemIntent;
  params?: ItemIntentParams;
} | null {
  const low = content.toLowerCase();

  if (low.includes('add questions') || low.includes('more questions')) {
    return { type: 'edit_existing', intent: 'add-questions' };
  }

  // Check for course generation before individual activity creation
  const coursePatterns = [
    /create\s+(?:a\s+)?(?:full\s+)?course\b/i,
    /generate\s+(?:a\s+)?course\b/i,
    /build\s+(?:a\s+)?course\b/i,
    /make\s+(?:a\s+)?course\b/i,
    /\b(?:course|curriculum|unit)\s+(?:from|based on|covering)\s+/i,
    /^.*notes?.*course.*$/i,
    /^.*course.*notes?.*$/i,
  ];
  const isCourseRequest = coursePatterns.some((p) => p.test(low));

  // Only trigger course generation if the message is long enough (has actual notes/content)
  const hasSubstantialNotes = content.length > 100;

  if (isCourseRequest && hasSubstantialNotes) {
    return { type: 'generate_course', description: content };
  }

  // Also trigger course generation for very long messages that look like notes
  if (
    content.length > 300 &&
    !low.includes('create') &&
    !low.includes('add') &&
    !low.includes('edit')
  ) {
    return { type: 'generate_course', description: content };
  }

  const createMatch = low.match(
    /(?:create|add|draft|generate|make new)\s+(?:a\s+)?(lesson|quiz|practice)/,
  );
  if (createMatch) {
    return {
      type: 'draft_new',
      kind: createMatch[1] as 'lesson' | 'quiz' | 'practice',
      description: content,
    };
  }

  const editPatterns: Array<{ match: RegExp; intent: ItemIntent; params?: ItemIntentParams }> = [
    { match: /rewrite|rephrase/i, intent: 'rewrite' },
    { match: /expand|elaborate/i, intent: 'expand' },
    { match: /fix.*quality/i, intent: 'fix-quality' },
    { match: /easier|simplify/i, intent: 'difficulty', params: { direction: 'easier' } },
    { match: /harder|more.*challenging/i, intent: 'difficulty', params: { direction: 'harder' } },
    { match: /translate/i, intent: 'translate', params: { targetLocale: 'en' } },
    { match: /improve.*prompt/i, intent: 'improve-prompt' },
  ];

  if (
    low.includes('edit') ||
    low.includes('change') ||
    low.includes('improve') ||
    low.includes('rewrite')
  ) {
    for (const pattern of editPatterns) {
      if (pattern.match.test(low)) {
        return { type: 'edit_existing', intent: pattern.intent, params: pattern.params };
      }
    }
    return { type: 'edit_existing', intent: 'rewrite' };
  }

  return null;
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length > MAX_REQUEST_SIZE_BYTES) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

interface ToolEmission {
  content: string;
  metadata: StudioChatMetadata;
}

/**
 * Vite-middleware-compatible chat endpoint. Writes an SSE UI message stream
 * to `res` (mirrors `createPipiliHandler`): the explain path streams tokens
 * from the LLM; tool paths emit a single static message whose drafts /
 * courseDraft / next steps are attached as message metadata on finish.
 */
export async function createStudioAssistantHandler(
  req: IncomingMessage,
  res: ServerResponse,
  options: { packageDir?: string } = {},
): Promise<void> {
  let raw: unknown;
  try {
    raw = await readJsonBody(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'INVALID_JSON';
    writeJson(res, message === 'Request body too large' ? 413 : 400, {
      error: message === 'Request body too large' ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON',
    });
    return;
  }

  let body: {
    conversationId?: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    context: StudioContextSnapshot;
  };
  try {
    body = StudioChatRequestSchema.parse(raw);
  } catch {
    writeJson(res, 400, { error: studioChatMessage('assistant.chat.invalidBody') });
    return;
  }

  const packageDir = options.packageDir || '';
  const locale = body.context.locale || 'en';
  const msg = (key: string, params?: Record<string, string>) =>
    studioChatMessage(key, locale, params);

  if (body.messages.length > MAX_MESSAGES) {
    writeJson(res, 400, {
      error: msg('assistant.chat.tooManyMessages', { max: String(MAX_MESSAGES) }),
    });
    return;
  }

  if (checkRateLimit(body.conversationId)) {
    writeJson(res, 429, { error: msg('assistant.chat.rateLimited') });
    return;
  }

  const systemPrompt = buildSystemPrompt(body.context);
  if (systemPrompt.length > MAX_CONTEXT_CHARS) {
    writeJson(res, 400, { error: msg('assistant.chat.contextTooLarge') });
    return;
  }

  const context = body.context;
  const lastUserMessage = [...body.messages].reverse().find((m) => m.role === 'user');
  const intent = lastUserMessage ? parseIntentFromMessage(lastUserMessage.content) : null;

  try {
    const toolEmission = await runToolIntent(intent, {
      body,
      context,
      packageDir,
      msg,
    });

    if (toolEmission) {
      await pipeStaticMessage(res, toolEmission);
      return;
    }

    await streamExplain(res, { context, systemPrompt, messages: body.messages });
  } catch (err) {
    console.error('[studio-assistant] chat handler error:', err);
    writeJson(res, 500, { error: msg('assistant.chat.serverError') });
  }
}

/** Runs the deterministic tool path (draft / course gen). Null → explain. */
async function runToolIntent(
  intent: ReturnType<typeof parseIntentFromMessage>,
  opts: {
    body: { context: StudioContextSnapshot };
    context: StudioContextSnapshot;
    packageDir: string;
    msg: (key: string, params?: Record<string, string>) => string;
  },
): Promise<ToolEmission | null> {
  const { context, packageDir, msg } = opts;

  if (!intent || intent.type === 'explain' || !context.course) {
    return null;
  }

  const nextSteps = (mode: 'explain' | 'draft' | 'course_draft', hasCourseDraft = false) =>
    extractSuggestedNextSteps({
      mode,
      view: context.view,
      hasCourseDraft,
      locale: context.locale || 'en',
    });

  if (intent.type === 'generate_course') {
    if (!packageDir) {
      return {
        content: msg('assistant.chat.needPackageDraft'),
        metadata: createChatMetadata('explain', { suggestedNextSteps: nextSteps('explain') }),
      };
    }

    const result = await generateCourseDraftTool({
      notes: intent.description,
      packageDir,
      completeText: completeWithLlm,
    });

    console.log('[studio-assistant] course draft tool', {
      ok: result.ok,
      draftId: result.ok ? result.courseDraft.draftId : undefined,
    });

    if (result.ok) {
      return {
        content: msg('assistant.chat.courseDraftReady'),
        metadata: createChatMetadata('course_draft', {
          courseDraft: result.courseDraft,
          suggestedNextSteps: nextSteps('course_draft', true),
        }),
      };
    }

    return {
      content: msg('assistant.chat.courseDraftFailed', { error: result.error }),
      metadata: createChatMetadata('explain', { suggestedNextSteps: nextSteps('explain') }),
    };
  }

  if (intent.type === 'draft_new' && intent.kind) {
    if (!packageDir) {
      return {
        content: msg('assistant.chat.needPackageDraft'),
        metadata: createChatMetadata('explain', { suggestedNextSteps: nextSteps('explain') }),
      };
    }

    const result = await draftActivity({
      type: 'draft_new',
      kind: intent.kind,
      description: intent.description || `Create a ${intent.kind}`,
      packageDir,
    });

    console.log('[studio-assistant] item draft tool', {
      ok: result.ok,
      kind: intent.kind,
    });

    if (result.ok) {
      return {
        content: msg('assistant.chat.draftReady', { kind: intent.kind }),
        metadata: createChatMetadata('draft', {
          drafts: result.items,
          suggestedNextSteps: nextSteps('draft'),
        }),
      };
    }

    return {
      content: msg('assistant.chat.draftFailed', { error: result.error }),
      metadata: createChatMetadata('explain', { suggestedNextSteps: nextSteps('explain') }),
    };
  }

  if (intent.type === 'edit_existing' && context.activity) {
    if (!packageDir) {
      return {
        content: msg('assistant.chat.needPackageEdit'),
        metadata: createChatMetadata('explain', { suggestedNextSteps: nextSteps('explain') }),
      };
    }

    const contentExcerpt = context.activity.contentExcerpt || '';
    const kind =
      context.activity.kind === 'other'
        ? 'lesson'
        : (context.activity.kind as 'lesson' | 'quiz' | 'practice');

    const result = await draftActivity({
      type: 'edit_existing',
      kind,
      currentContent: contentExcerpt,
      intent: intent.intent || 'rewrite',
      params: intent.params,
      packageDir,
    });

    console.log('[studio-assistant] item edit tool', {
      ok: result.ok,
      kind,
      intent: intent.intent,
    });

    if (result.ok) {
      return {
        content: msg('assistant.chat.editReady'),
        metadata: createChatMetadata('draft', {
          drafts: result.items,
          suggestedNextSteps: nextSteps('draft'),
        }),
      };
    }

    return {
      content: msg('assistant.chat.editFailed', { error: result.error }),
      metadata: createChatMetadata('explain', { suggestedNextSteps: nextSteps('explain') }),
    };
  }

  return null;
}

/** Emit a single static assistant message (tool path) as a UI message stream. */
async function pipeStaticMessage(res: ServerResponse, emission: ToolEmission): Promise<void> {
  const textId = `${Date.now()}-text`;

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'start' });
      writer.write({ type: 'text-start', id: textId });
      writer.write({ type: 'text-delta', id: textId, delta: emission.content });
      writer.write({ type: 'text-end', id: textId });
      writer.write({
        type: 'finish',
        finishReason: 'stop',
        messageMetadata: emission.metadata,
      } as UIMessageChunk);
    },
    onError: () => 'An error occurred.',
  });

  await pipeUIMessageStreamToResponse({ response: res, status: 200, stream });
}

/** Real token streaming for the explain path. */
async function streamExplain(
  res: ServerResponse,
  opts: {
    context: StudioContextSnapshot;
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  },
): Promise<void> {
  const { context, systemPrompt, messages } = opts;
  const factory = createModelFactoryFromEnv();
  const model = factory.getModel('fast');

  const modelMessages = [{ role: 'system' as const, content: systemPrompt }, ...messages];

  const result = streamText({
    model,
    messages: modelMessages as never,
    onFinish: () => {
      console.log('[studio-assistant] chat response finished', {
        view: context.view,
        locale: context.locale,
      });
    },
  });

  const uiStream = toUIMessageStream({
    stream: result.stream,
    messageMetadata: ({ part }) => {
      if (part.type === 'finish') {
        return createChatMetadata('explain', {
          suggestedNextSteps: extractSuggestedNextSteps({
            mode: 'explain',
            view: context.view,
            hasCourseDraft: false,
            locale: context.locale || 'en',
          }),
        });
      }
      return undefined;
    },
    onError: () => 'An error occurred.',
  });

  await pipeUIMessageStreamToResponse({ response: res, status: 200, stream: uiStream });
}
