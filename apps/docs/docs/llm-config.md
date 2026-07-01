---
sidebar_position: 10
---

# LLM Config

The `@open-edu/llm-config` package provides a lightweight abstraction over LLM providers, enabling structured output generation with Zod schema validation.

## Architecture

```
┌────────────────────┐
│    LlmProvider     │  Interface — generateStructured<T>(prompt, schema, options)
├────────────────────┤
│  OpenAIProvider    │  Implementation using OpenAI SDK + zodResponseFormat
├────────────────────┤
│ OpenRouterProvider │  Implementation for OpenRouter API with structured output fallback
├────────────────────┤
│  createLlmProvider │  Factory — creates provider from config or env vars
└────────────────────┘
```

## Interface

```typescript
interface LlmProvider {
  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<T>;
}
```

The `generateStructured` method takes:

- A text prompt describing what to generate
- A Zod schema defining the expected output structure
- Optional temperature and max token overrides

Output is validated against the provided Zod schema before being returned.

## Usage

```typescript
import { createLlmProvider, loadConfig } from '@open-edu/llm-config';
import { z } from 'zod';

const config = loadConfig(); // reads env vars
const llm = createLlmProvider(config);

const schema = z.object({
  concepts: z.array(
    z.object({
      conceptId: z.string(),
      learningObjective: z.string(),
    }),
  ),
});

const result = await llm.generateStructured(
  'Identify 3 math concepts from this chapter...',
  schema,
  { temperature: 0.3 },
);
```

## Configuration

Load configuration from environment variables:

| Variable          | Default       | Description         |
| ----------------- | ------------- | ------------------- |
| `LLM_PROVIDER`    | `openai`      | Provider name       |
| `LLM_MODEL`       | `gpt-4o-mini` | Model name          |
| `OPENAI_API_KEY`  | —             | API key             |
| `LLM_API_KEY`     | —             | Alternative API key |
| `LLM_MAX_TOKENS`  | `4096`        | Max tokens per call |
| `LLM_TEMPERATURE` | `0.3`         | LLM temperature     |

```typescript
import { loadConfig, createLlmProvider } from '@open-edu/llm-config';

// Auto-configure from env vars
const provider = createLlmProvider();

// Or pass explicit config
const provider = createLlmProvider({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
  maxTokens: 8192,
  temperature: 0.2,
});
```

## Provider Support

### OpenAI

Uses the OpenAI SDK with `zodResponseFormat` for structured output. Set `LLM_PROVIDER=openai` and provide `OPENAI_API_KEY`.

### OpenRouter

Provides access to models from multiple providers (OpenAI, Anthropic, Google, etc.) through a single API. Set `LLM_PROVIDER=openrouter` and provide `LLM_API_KEY` (your OpenRouter API key).

Supports `JSON mode` with fallback: if the OpenRouter API response format causes a schema validation failure, the provider falls back to prompting with "Respond ONLY with valid JSON" instructions, retrying up to 3 times before failing.

```typescript
const provider = createLlmProvider({
  provider: 'openrouter',
  model: 'openai/gpt-4o',
  apiKey: process.env.LLM_API_KEY!,
});
```
