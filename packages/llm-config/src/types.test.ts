import { describe, it, expect } from 'vitest';
import { loadConfig } from './types.js';

describe('loadConfig', () => {
  it('returns default values when no env vars set', () => {
    const config = loadConfig();
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o-mini');
    expect(config.maxTokens).toBe(4096);
    expect(config.temperature).toBe(0.3);
  });

  it('reads OPENAI_API_KEY when set', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const config = loadConfig();
    expect(config.apiKey).toBe('test-key');
    delete process.env.OPENAI_API_KEY;
  });

  it('baseURL is undefined when LLM_BASE_URL is not set', () => {
    delete process.env.LLM_BASE_URL;
    const config = loadConfig();
    expect(config.baseURL).toBeUndefined();
  });

  it('reads LLM_BASE_URL when set', () => {
    process.env.LLM_BASE_URL = 'http://localhost:11434/v1';
    const config = loadConfig();
    expect(config.baseURL).toBe('http://localhost:11434/v1');
    delete process.env.LLM_BASE_URL;
  });

  it('falls back to OPEN_EDU_STUDIO_LLM_API_KEY when no LLM_*/provider key is set', () => {
    process.env.OPEN_EDU_STUDIO_LLM_API_KEY = 'studio-key';
    const config = loadConfig();
    expect(config.apiKey).toBe('studio-key');
    delete process.env.OPEN_EDU_STUDIO_LLM_API_KEY;
  });

  it('prefers LLM_* over the Studio-prefixed fallback', () => {
    process.env.LLM_API_KEY = 'llm-key';
    process.env.OPEN_EDU_STUDIO_LLM_API_KEY = 'studio-key';
    const config = loadConfig();
    expect(config.apiKey).toBe('llm-key');
    delete process.env.LLM_API_KEY;
    delete process.env.OPEN_EDU_STUDIO_LLM_API_KEY;
  });

  it('reads OPEN_EDU_STUDIO_LLM_PROVIDER / MODEL / BASE_URL fallbacks', () => {
    process.env.OPEN_EDU_STUDIO_LLM_PROVIDER = 'openrouter';
    process.env.OPEN_EDU_STUDIO_LLM_MODEL = 'studio-model';
    process.env.OPEN_EDU_STUDIO_LLM_BASE_URL = 'http://localhost:11434/v1';
    const config = loadConfig();
    expect(config.provider).toBe('openrouter');
    expect(config.model).toBe('studio-model');
    expect(config.baseURL).toBe('http://localhost:11434/v1');
    delete process.env.OPEN_EDU_STUDIO_LLM_PROVIDER;
    delete process.env.OPEN_EDU_STUDIO_LLM_MODEL;
    delete process.env.OPEN_EDU_STUDIO_LLM_BASE_URL;
  });
});
