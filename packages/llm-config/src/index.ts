export type { LlmConfig, LlmProvider } from './types.js';
export { loadConfig } from './types.js';
export { OpenAIProvider } from './providers/openai-provider.js';
export { OpenRouterProvider } from './providers/openrouter-provider.js';

import type { LlmConfig } from './types.js';
import { loadConfig } from './types.js';
import { OpenAIProvider } from './providers/openai-provider.js';
import { OpenRouterProvider } from './providers/openrouter-provider.js';

export function createLlmProvider(config?: LlmConfig): OpenAIProvider | OpenRouterProvider {
  const cfg = config ?? loadConfig();

  switch (cfg.provider) {
    case 'openai':
      return new OpenAIProvider(cfg);
    case 'openrouter':
      return new OpenRouterProvider(cfg);
    default:
      throw new Error(`Unknown LLM provider: ${cfg.provider}. Supported: openai, openrouter`);
  }
}
