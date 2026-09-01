import { createUIMessageStream, pipeUIMessageStreamToResponse, type UIMessageChunk } from 'ai';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { completeWithLlm } from '../studioLlm';
import { AiSdkAgentRuntime } from '../runtime/AiSdkAgentRuntime';
import { runAgentLoop } from '../agentLoop';
import { InMemoryToolRegistry } from '../toolRegistry';
import { defaultPermissionPolicy } from '../permissionPolicy';
import { DEFAULT_PERMISSIONS } from '../CompanionClient';
import { companionEventsToUIMessageChunks } from '../companionToUIMessage';
import {
  StudioChatRequestSchema,
  MAX_MESSAGES,
  MAX_CONTEXT_CHARS,
  MAX_REQUEST_SIZE_BYTES,
} from '@open-edu/companion/chat';
import { buildSystemPrompt, extractSuggestedNextSteps } from './policy';
import { createChatMetadata, type StudioChatMetadata } from './metadata';
import { studioChatMessage } from './messages';
import { checkRateLimit } from './rateLimit';
import type { StudioContextSnapshot } from '../context';
import type {
  CourseDraftResult,
  DraftItem,
  CompanionEvent,
  AgentRuntimeMessage,
} from '@open-edu/companion';
import { parseIntentFromMessage } from './intent.js';
import { routeIntent } from './route.js';

const AGENT_LOOP_MAX_STEPS = 6;
const AGENT_LOOP_TIMEOUT_MS = 120_000;

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Abort the LLM stream when the client disconnects / Stop is pressed.
 *
 * Listens on `res`, not `req`: since Node 16.6.0 an IncomingMessage emits
 * 'close' as soon as its body has been fully read, so a `req.on('close')`
 * guard aborts every explain stream before the first token. ServerResponse
 * 'close' fires only when the response finishes or the connection is
 * terminated prematurely (client disconnect), which is the signal we want.
 */
function createRequestAbortSignal(res: ServerResponse): AbortSignal {
  const controller = new AbortController();
  res.once('close', () => {
    if (!res.writableEnded && !controller.signal.aborted) {
      controller.abort();
    }
  });
  return controller.signal;
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

/** Reconstruct the `StudioChatMetadata` shape from a `draft.created` payload. */
function messageMetadataFor(
  info: { draft?: CourseDraftResult | DraftItem[] },
  ctx: {
    view: StudioContextSnapshot['view'];
    locale: string;
  },
): StudioChatMetadata {
  const draft = info.draft;
  if (draft && 'draftId' in (draft as CourseDraftResult)) {
    return createChatMetadata('course_draft', {
      courseDraft: draft as CourseDraftResult,
      suggestedNextSteps: extractSuggestedNextSteps({
        mode: 'course_draft',
        view: ctx.view,
        hasCourseDraft: true,
        locale: ctx.locale,
      }),
    });
  }
  if (Array.isArray(draft)) {
    return createChatMetadata('draft', {
      drafts: draft as DraftItem[],
      suggestedNextSteps: extractSuggestedNextSteps({
        mode: 'draft',
        view: ctx.view,
        hasCourseDraft: false,
        locale: ctx.locale,
      }),
    });
  }
  return createChatMetadata('explain', {
    suggestedNextSteps: extractSuggestedNextSteps({
      mode: 'explain',
      view: ctx.view,
      hasCourseDraft: false,
      locale: ctx.locale,
    }),
  });
}

/** Build a static tool emission (content + metadata) from collected loop events. */
function buildStaticEmission(
  events: CompanionEvent[],
  ctx: { view: StudioContextSnapshot['view']; locale: string },
): ToolEmission {
  const content = events
    .filter((event) => event.type === 'message.delta')
    .map((event) => (event as { text: string }).text)
    .join('');
  const draftEvent = [...events].reverse().find((event) => event.type === 'draft.created');
  const metadata = messageMetadataFor(
    { draft: (draftEvent as { draft?: CourseDraftResult | DraftItem[] } | undefined)?.draft },
    ctx,
  );
  return { content, metadata };
}

/** Prime the loop through `task.started` + the first step's `task.progress`
 *  (which is when the model is invoked). A synchronous provider failure surfaces
 *  on the second pull, before any SSE header is written; the model stream itself
 *  is left for the UI mapper to iterate. */
async function primeLoop(
  events: AsyncGenerator<CompanionEvent>,
): Promise<{ iterator: AsyncIterator<CompanionEvent>; buffered: CompanionEvent[] }> {
  const iterator = events[Symbol.asyncIterator]();
  const buffered: CompanionEvent[] = [];
  for (let i = 0; i < 2; i++) {
    const result = await iterator.next();
    if (result.done) break;
    buffered.push(result.value);
  }
  return { iterator, buffered };
}

/**
 * Vite-middleware-compatible chat endpoint. Writes an SSE UI message stream to
 * `res` (mirrors `createPipiliHandler`). Every request runs through the
 * `AgentLoop`: deterministic intents execute the generation tools single-step
 * (same messageMetadata as before); everything else is a bounded, model-driven
 * loop streamed via `companionEventsToUIMessageChunks`.
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
  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    writeJson(res, 400, { error: msg('assistant.chat.invalidBody') });
    return;
  }

  const route = routeIntent(parseIntentFromMessage(lastUser.content), context);

  const loopGenerator = runAgentLoop(
    {
      message: lastUser.content,
      context,
      conversationId: body.conversationId ?? '',
      permissions: DEFAULT_PERMISSIONS,
    },
    {
      runtime: new AiSdkAgentRuntime(),
      tools: new InMemoryToolRegistry(),
      policy: defaultPermissionPolicy,
      systemPrompt,
      // Preserve the full conversation history so the model retains multi-turn
      // context on subsequent turns (the explain path streams from the loop).
      messages: body.messages as AgentRuntimeMessage[],
      maxSteps: AGENT_LOOP_MAX_STEPS,
      timeoutMs: AGENT_LOOP_TIMEOUT_MS,
      signal: createRequestAbortSignal(res),
      packageDir,
      completeText: completeWithLlm,
    },
  );

  try {
    // Deterministic single-step path: run the loop to completion, then pipe one
    // static message whose messageMetadata drives the draft / quality cards.
    if (route.tool !== 'explain') {
      const events: CompanionEvent[] = [];
      for await (const event of loopGenerator) {
        events.push(event);
      }
      const emission = buildStaticEmission(events, { view: context.view, locale });
      const toolEvent = [...events].reverse().find((event) => event.type === 'tool.completed');
      if (toolEvent) {
        console.log('[studio-assistant] loop tool finished', {
          ok: (toolEvent as { result: { ok?: boolean } }).result?.ok,
        });
      }
      await pipeStaticMessage(res, emission);
      return;
    }

    // Model-driven loop: prime the first model call so a synchronous provider
    // failure surfaces as a 500, then stream the remaining events.
    const { iterator, buffered } = await primeLoop(loopGenerator);
    const rest = async function* rest(): AsyncGenerator<CompanionEvent> {
      for (const event of buffered) {
        yield event;
      }
      let result: IteratorResult<CompanionEvent>;
      while (true) {
        result = await iterator.next();
        if (result.done) break;
        yield result.value;
      }
    };

    const uiStream: ReadableStream<UIMessageChunk> = companionEventsToUIMessageChunks(rest(), {
      messageMetadata: ({ draft }) => messageMetadataFor({ draft }, { view: context.view, locale }),
      onComplete: () => {
        console.log('[studio-assistant] chat response finished', {
          view: context.view,
          locale: context.locale,
        });
      },
      errorFallback: (message) => {
        console.error('[studio-assistant] chat stream error:', message);
        return msg('assistant.chat.serverError');
      },
    });
    await pipeUIMessageStreamToResponse({ response: res, status: 200, stream: uiStream });
  } catch (err) {
    console.error('[studio-assistant] chat handler error:', err);
    writeJson(res, 500, { error: msg('assistant.chat.serverError') });
  }
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
    onError: () => studioChatMessage('assistant.chat.serverError'),
  });

  await pipeUIMessageStreamToResponse({ response: res, status: 200, stream });
}
