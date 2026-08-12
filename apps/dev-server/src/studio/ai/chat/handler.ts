import { generateText } from 'ai';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import { StudioChatRequestSchema, MAX_MESSAGES, MAX_CONTEXT_CHARS } from './config';
import { buildSystemPrompt } from './policy';

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

    const factory = createModelFactoryFromEnv();
    const model = factory.getModel('fast');

    const messages = [{ role: 'system' as const, content: systemPrompt }, ...body.messages];

    const { text } = await generateText({ model, messages: messages as never });

    return {
      status: 200,
      body: {
        role: 'assistant',
        content: text,
        metadata: { mode: 'explain' },
      },
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return { status: 400, body: { error: 'Invalid request body' } };
    }
    console.error('[studio-assistant] chat handler error:', err); // eslint-disable-line no-console
    return { status: 500, body: { error: 'An error occurred' } };
  }
}
