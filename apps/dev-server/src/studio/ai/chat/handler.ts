import { generateText } from 'ai';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import { StudioChatRequestSchema, MAX_MESSAGES, MAX_CONTEXT_CHARS } from './config';
import { buildSystemPrompt } from './policy';
import { draftActivity } from './tools';
import { createChatMetadata } from './metadata';
import type { ItemIntent, ItemIntentParams } from '../types';

function parseIntentFromMessage(content: string): {
  type: 'draft_new' | 'edit_existing' | 'explain';
  kind?: 'lesson' | 'quiz' | 'practice';
  description?: string;
  intent?: ItemIntent;
  params?: ItemIntentParams;
} | null {
  const low = content.toLowerCase();

  if (low.includes('add questions') || low.includes('more questions')) {
    return { type: 'edit_existing', intent: 'add-questions' };
  }

  const createMatch = low.match(/(?:create|add|draft|generate|make new)\s+(?:a\s+)?(lesson|quiz|practice)/);
  if (createMatch) {
    return { type: 'draft_new', kind: createMatch[1] as 'lesson' | 'quiz' | 'practice', description: content };
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

  if (low.includes('edit') || low.includes('change') || low.includes('improve') || low.includes('rewrite')) {
    for (const pattern of editPatterns) {
      if (pattern.match.test(low)) {
        return { type: 'edit_existing', intent: pattern.intent, params: pattern.params };
      }
    }
    return { type: 'edit_existing', intent: 'rewrite' };
  }

  return null;
}

export async function createStudioAssistantHandler(req: unknown) {
  try {
    const body = StudioChatRequestSchema.parse(req);

    if (body.messages.length > MAX_MESSAGES) {
      return { status: 400, body: { error: `Too many messages. Maximum is ${MAX_MESSAGES}.` } };
    }

    const systemPrompt = buildSystemPrompt(body.context);
    if (systemPrompt.length > MAX_CONTEXT_CHARS) {
      return { status: 400, body: { error: 'Context too large.' } };
    }

    const lastUserMessage = [...body.messages].reverse().find((m) => m.role === 'user');
    const intent = lastUserMessage ? parseIntentFromMessage(lastUserMessage.content) : null;

    if (intent && intent.type !== 'explain' && body.context.course) {
      if (intent.type === 'draft_new' && intent.kind) {
        const result = await draftActivity({
          type: 'draft_new',
          kind: intent.kind,
          description: intent.description || `Create a ${intent.kind}`,
          packageDir: '',
        });

        if (result.ok) {
          return {
            status: 200,
            body: {
              role: 'assistant',
              content: `Here's a draft ${intent.kind} I created for you. You can preview it below and choose to use it or discard it.`,
              metadata: createChatMetadata('draft'),
              drafts: result.items,
            },
          };
        }

        return {
          status: 200,
          body: {
            role: 'assistant',
            content: `I tried to create a draft but ran into an issue: ${result.error}. Could you rephrase your request?`,
            metadata: createChatMetadata('explain'),
          },
        };
      }

      if (intent.type === 'edit_existing' && body.context.activity) {
        const contentExcerpt = body.context.activity.contentExcerpt || '';
        const kind = body.context.activity.kind === 'other' ? 'lesson' : body.context.activity.kind as 'lesson' | 'quiz' | 'practice';

        const result = await draftActivity({
          type: 'edit_existing',
          kind,
          currentContent: contentExcerpt,
          intent: intent.intent || 'rewrite',
          params: intent.params,
          packageDir: '',
        });

        if (result.ok) {
          return {
            status: 200,
            body: {
              role: 'assistant',
              content: `Here's the updated version. Take a look and use it or discard it.`,
              metadata: createChatMetadata('draft'),
              drafts: result.items,
            },
          };
        }

        return {
          status: 200,
          body: {
            role: 'assistant',
            content: `I tried to edit this activity but ran into an issue: ${result.error}. Could you try a different approach?`,
            metadata: createChatMetadata('explain'),
          },
        };
      }
    }

    const factory = createModelFactoryFromEnv();
    const model = factory.getModel('fast');

    const messages = [{ role: 'system' as const, content: systemPrompt }, ...body.messages];

    const { text } = await generateText({ model, messages: messages as never });

    return {
      status: 200,
      body: {
        role: 'assistant',
        content: text,
        metadata: createChatMetadata('explain'),
      },
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return { status: 400, body: { error: 'Invalid request body' } };
    }
    console.error('[studio-assistant] chat handler error:', err);
    return { status: 500, body: { error: 'An error occurred' } };
  }
}