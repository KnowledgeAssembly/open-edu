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
│  createLlmProvider │  Factory — creates provider from config or env vars
└────────────────────┘
```

## Interface

```typescript
interface LlmProvider {
  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<T>;
}
```

The `generateStructured` method takes:
- A text prompt describing what to generate
- A Zod schema defining the expected output structure
- Optional temperature and max token overrides

The LLM is instructed with a system message to act as an expert curriculum designer, and output is validated against the provided Zod schema before being returned.

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
    })
  ),
});

const result = await llm.generateStructured(
  'Identify 3 math concepts from this chapter...',
  schema,
  { temperature: 0.3 }
);
```

## Configuration

Load configuration from environment variables:

| Variable             | Default        | Description          |
| -------------------- | -------------- | -------------------- |
| `LLM_PROVIDER`       | `openai`       | Provider name        |
| `LLM_MODEL`          | `gpt-4o-mini`  | Model name           |
| `OPENAI_API_KEY`     | —              | API key              |
| `LLM_API_KEY`        | —              | Alternative API key  |
| `LLM_MAX_TOKENS`     | `4096`         | Max tokens per call  |
| `LLM_TEMPERATURE`    | `0.3`          | LLM temperature      |

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

Currently bundled:
- **OpenAI** — Uses `openai/beta/chat/completions` with `zodResponseFormat` for structured output

The `LlmProvider` interface is designed to be implemented for additional providers (Anthropic, Google, local models, etc.).
