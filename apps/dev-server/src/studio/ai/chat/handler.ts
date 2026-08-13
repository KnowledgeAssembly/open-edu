import { generateText } from 'ai';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import { completeWithLlm } from '../studioLlm';
import { StudioChatRequestSchema, MAX_MESSAGES, MAX_CONTEXT_CHARS } from './config';
import { buildSystemPrompt } from './policy';
import { draftActivity, generateCourseDraftTool } from './tools';
import { createChatMetadata } from './metadata';
import { studioChatMessage } from './messages';
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
  if (content.length > 300 && !low.includes('create') && !low.includes('add') && !low.includes('edit')) {
    return { type: 'generate_course', description: content };
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

export async function createStudioAssistantHandler(
  req: unknown,
  options: { packageDir?: string } = {},
) {
  try {
    const body = StudioChatRequestSchema.parse(req);
    const packageDir = options.packageDir || '';
    const locale = body.context.locale || 'en';
    const msg = (key: string, params?: Record<string, string>) =>
      studioChatMessage(key, locale, params);

    if (body.messages.length > MAX_MESSAGES) {
      return {
        status: 400,
        body: { error: msg('assistant.chat.tooManyMessages', { max: String(MAX_MESSAGES) }) },
      };
    }

    const systemPrompt = buildSystemPrompt(body.context);
    if (systemPrompt.length > MAX_CONTEXT_CHARS) {
      return { status: 400, body: { error: msg('assistant.chat.contextTooLarge') } };
    }

    const lastUserMessage = [...body.messages].reverse().find((m) => m.role === 'user');
    const intent = lastUserMessage ? parseIntentFromMessage(lastUserMessage.content) : null;

    if (intent && intent.type !== 'explain' && body.context.course) {
      if (intent.type === 'generate_course') {
        if (!packageDir) {
          return {
            status: 200,
            body: {
              role: 'assistant',
              content: msg('assistant.chat.needPackageDraft'),
              metadata: createChatMetadata('explain'),
            },
          };
        }

        const result = await generateCourseDraftTool({
          notes: intent.description,
          packageDir,
          completeText: completeWithLlm,
        });

        if (result.ok) {
          const metadata = createChatMetadata('course_draft');
          metadata.courseDraft = result.courseDraft;
          return {
            status: 200,
            body: {
              role: 'assistant',
              content: msg('assistant.chat.courseDraftReady'),
              metadata,
              courseDraft: result.courseDraft,
            },
          };
        }

        return {
          status: 200,
          body: {
            role: 'assistant',
            content: msg('assistant.chat.courseDraftFailed', { error: result.error }),
            metadata: createChatMetadata('explain'),
          },
        };
      }

      if (intent.type === 'draft_new' && intent.kind) {
        if (!packageDir) {
          return {
            status: 200,
            body: {
              role: 'assistant',
              content: msg('assistant.chat.needPackageDraft'),
              metadata: createChatMetadata('explain'),
            },
          };
        }

        const result = await draftActivity({
          type: 'draft_new',
          kind: intent.kind,
          description: intent.description || `Create a ${intent.kind}`,
          packageDir,
        });

        if (result.ok) {
          return {
            status: 200,
            body: {
              role: 'assistant',
              content: msg('assistant.chat.draftReady', { kind: intent.kind }),
              metadata: createChatMetadata('draft'),
              drafts: result.items,
              applyMode: 'file' as const,
            },
          };
        }

        return {
          status: 200,
          body: {
            role: 'assistant',
            content: msg('assistant.chat.draftFailed', { error: result.error }),
            metadata: createChatMetadata('explain'),
          },
        };
      }

      if (intent.type === 'edit_existing' && body.context.activity) {
        if (!packageDir) {
          return {
            status: 200,
            body: {
              role: 'assistant',
              content: msg('assistant.chat.needPackageEdit'),
              metadata: createChatMetadata('explain'),
            },
          };
        }

        const contentExcerpt = body.context.activity.contentExcerpt || '';
        const kind =
          body.context.activity.kind === 'other'
            ? 'lesson'
            : (body.context.activity.kind as 'lesson' | 'quiz' | 'practice');

        const result = await draftActivity({
          type: 'edit_existing',
          kind,
          currentContent: contentExcerpt,
          intent: intent.intent || 'rewrite',
          params: intent.params,
          packageDir,
        });

        if (result.ok) {
          const applyMode = result.items.length > 1 ? 'file' : 'buffer';
          return {
            status: 200,
            body: {
              role: 'assistant',
              content: msg('assistant.chat.editReady'),
              metadata: createChatMetadata('draft'),
              drafts: result.items,
              applyMode,
            },
          };
        }

        return {
          status: 200,
          body: {
            role: 'assistant',
            content: msg('assistant.chat.editFailed', { error: result.error }),
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
      return { status: 400, body: { error: studioChatMessage('assistant.chat.invalidBody') } };
    }
    console.error('[studio-assistant] chat handler error:', err);
    return { status: 500, body: { error: studioChatMessage('assistant.chat.serverError') } };
  }
}
