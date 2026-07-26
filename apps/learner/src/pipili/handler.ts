import { convertToCoreMessages, streamText, pipeDataStreamToResponse } from 'ai';
import { createModelFactory, loadConfig, type ModelFactory } from '@open-edu/llm-config';
import { boundContext, pipiliResponseMetadataSchema } from '@open-edu/ai-companion';
import type { PipiliContextSnapshot } from '@open-edu/ai-companion';
import { PIPILI_CONFIG, pipiliContextSchema, pipiliRequestSchema } from './config.js';
import { buildSystemPrompt, isAssessmentActive, extractMetadata } from './policy.js';
import { createToolRegistry } from './tools.js';
import type { IncomingMessage, ServerResponse } from 'http';

export interface PipiliHandlerOptions {}

let modelFactory: ModelFactory | null = null;
function getModelFactory(): ModelFactory {
  if (!modelFactory) modelFactory = createModelFactory(loadConfig());
  return modelFactory;
}

export function createPipiliHandler(_options?: PipiliHandlerOptions) {
  return async function pipiliHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
      return;
    }

    let raw: unknown;
    try {
      raw = await readRequestBody(req);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'PAYLOAD_ERROR';
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message }));
      return;
    }

    let conversationId: string;
    let messages: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string }>;
    let context: PipiliContextSnapshot;
    try {
      const parsed = pipiliRequestSchema.parse(raw);
      conversationId = parsed.conversationId;
      messages = parsed.messages;
      context = pipiliContextSchema.parse(parsed.context) as PipiliContextSnapshot;

      if (contextStrLen(parsed.context) > PIPILI_CONFIG.MAX_REQUEST_SIZE_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'CONTEXT_TOO_LARGE' }));
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'VALIDATION_ERROR';
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'VALIDATION_ERROR', message }));
      return;
    }

    const assessmentActive = isAssessmentActive(context);

    const learnerLanguage = context.learner?.language ?? 'en';
    const readingLevel = context.learner?.readingLevel ?? 'secondary';
    const accessibilityProfile = context.learner?.accessibilityProfile;

    const boundedCtx = boundContext(context);

    const instructions = buildSystemPrompt({
      boundedContext: boundedCtx,
      assessmentActive,
      learnerLanguage,
      readingLevel,
      accessibilityProfile,
    });

    const factory = getModelFactory();
    const isComplex = checkComplexity(messages);
    const model = factory.getModel(isComplex ? 'escalation' : 'fast');

    const tools = createToolRegistry(() => ({
      courseId: context.course?.id,
      lessonId: context.lesson?.id,
    }));

    const cfg = loadConfig();

    try {
      let capturedText = '';
      let capturedToolCalls: Array<{ toolName: string }> = [];

      const result = streamText({
        model,
        system: instructions,
        messages: await convertToCoreMessages(messages),
        tools,
        maxSteps: 3,
        maxTokens: PIPILI_CONFIG.MAX_CONTEXT_SIZE,
        temperature: cfg.temperature,
        onFinish: (event) => {
          capturedText = event.text;
          capturedToolCalls = (event.toolCalls ?? []) as Array<{ toolName: string }>;
          console.log('Pipili response finished', {
            conversationId,
            assessmentActive,
            isComplex,
            tokensUsed: event.usage,
            toolCallCount: capturedToolCalls.length,
          });
        },
      });

      pipeDataStreamToResponse(res, {
        status: 200,
        async execute(dataStream) {
          result.mergeIntoDataStream(dataStream);
          await result.consumeStream();

          const meta = extractMetadata({
            text: capturedText,
            boundedContext: boundedCtx,
            assessmentActive,
            toolCalls: capturedToolCalls,
          });
          const safe = pipiliResponseMetadataSchema.safeParse(meta);
          if (safe.success) {
            dataStream.writeMessageAnnotation(safe.data);
          }
        },
        onError: (error) => {
          if (error == null) return 'unknown error';
          if (typeof error === 'string') return error;
          if (error instanceof Error) return error.message;
          return 'internal error';
        },
      });
    } catch (err: unknown) {
      console.error('Pipili orchestration error:', err);
      const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';

      let errorCode = 'INTERNAL_ERROR';
      if (message.includes('401') || message.includes('Unauthorized')) {
        errorCode = 'PROVIDER_AUTH_ERROR';
      } else if (message.includes('429') || message.includes('rate')) {
        errorCode = 'PROVIDER_RATE_LIMITED';
      } else if (message.includes('timeout') || message.includes('abort')) {
        errorCode = 'TIMEOUT';
      } else if (message.includes('Unknown provider')) {
        errorCode = 'PROVIDER_CONFIG_ERROR';
      }

      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorCode, message }));
      }
    }
  };
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length > PIPILI_CONFIG.MAX_REQUEST_SIZE_BYTES) {
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

function contextStrLen(context: unknown): number {
  try {
    return JSON.stringify(context).length;
  } catch {
    return 0;
  }
}

function checkComplexity(messages: Array<{ role: string; content: string }>): boolean {
  const last = messages[messages.length - 1];
  if (!last) return false;
  const text = last.content.toLowerCase();

  if (text.length > 400) return true;

  const complexityIndicators = [
    'explain in detail',
    'step by step',
    'step-by-step',
    'compare and contrast',
    'walk me through',
    'in depth analysis',
    'comprehensive explanation',
  ];
  return complexityIndicators.some((ind) => text.includes(ind));
}
