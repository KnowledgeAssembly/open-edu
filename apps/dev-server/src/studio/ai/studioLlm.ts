import { generateText } from 'ai';
import { createModelFactoryFromEnv, loadConfig } from '@open-edu/llm-config';

export function isAiAvailable(): boolean {
  const config = loadConfig();
  return Boolean(config.apiKey) || Boolean(config.baseURL);
}

export async function completeWithLlm(prompt: string): Promise<string> {
  try {
    const factory = createModelFactoryFromEnv();
    const model = factory.getModel('fast');
    const result = await generateText({ model, prompt });
    return result.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AI generation failed: ${message}`);
  }
}
