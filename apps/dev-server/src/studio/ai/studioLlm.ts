import { generateText } from 'ai';
import { createModelFactoryFromEnv, loadConfig } from '@open-edu/llm-config';

const MAX_COMPLETION_TOKENS = 4_096;

export function isAiAvailable(): boolean {
  const config = loadConfig();
  return Boolean(config.apiKey) || Boolean(config.baseURL);
}

export async function completeWithLlm(prompt: string, signal?: AbortSignal): Promise<string> {
  try {
    const factory = createModelFactoryFromEnv();
    const model = factory.getModel('fast');
    const configuredLimit = Number(process.env.OPEN_EDU_GATEWAY_MAX_OUTPUT_TOKENS);
    const maxOutputTokens = Math.min(
      Number.isFinite(configuredLimit) && configuredLimit > 0
        ? configuredLimit
        : MAX_COMPLETION_TOKENS,
      MAX_COMPLETION_TOKENS,
    );
    const result = await generateText({ model, prompt, maxOutputTokens, abortSignal: signal });
    return result.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AI generation failed: ${message}`);
  }
}
