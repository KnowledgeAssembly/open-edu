export type { LlmConfig, LlmProvider } from './types.js';
export { loadConfig } from './types.js';
export { OpenAIProvider } from './providers/openai-provider.js';

import type { LlmConfig } from './types.js';
import { loadConfig } from './types.js';
import { OpenAIProvider } from './providers/openai-provider.js';

export function createLlmProvider(config?: LlmConfig): OpenAIProvider {
  const cfg = config ?? loadConfig();

  if (cfg.provider === 'openai') {
    return new OpenAIProvider(cfg);
  }
  throw new Error(`Unknown LLM provider: ${cfg.provider}. Supported: openai`);
}
