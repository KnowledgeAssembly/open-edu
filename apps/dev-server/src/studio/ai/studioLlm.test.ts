import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAiAvailable } from './studioLlm';

const ENV_KEYS = [
  'LLM_API_KEY',
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'ANTHROPIC_API_KEY',
  'LLM_BASE_URL',
];

describe('studioLlm', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  it('reports unavailable when no key or base URL is configured', () => {
    expect(isAiAvailable()).toBe(false);
  });

  it('reports available when an API key is configured', () => {
    process.env.LLM_API_KEY = 'test-key';
    expect(isAiAvailable()).toBe(true);
  });

  it('reports available for local base URL endpoints without a key', () => {
    process.env.LLM_BASE_URL = 'http://localhost:11434/v1';
    expect(isAiAvailable()).toBe(true);
  });
});
