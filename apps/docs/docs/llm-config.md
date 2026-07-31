---
sidebar_position: 10
---

# LLM Config

The `@open-edu/llm-config` package provides a lightweight abstraction over LLM providers, enabling structured output generation with Zod schema validation, streaming via AI SDK v4, and two-tier model routing.

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
├────────────────────┤
│  ModelFactory      │  Two-tier routing (fast/escalation) with AI SDK v4 LanguageModel
├────────────────────┤
│  createModelFactory│  Factory — creates ModelFactory from config or env vars
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

| Variable          | Default       | Description                                     |
| ----------------- | ------------- | ----------------------------------------------- |
| `LLM_PROVIDER`    | `openai`      | Provider name                                   |
| `LLM_MODEL`       | `gpt-4o-mini` | Model name                                      |
| `OPENAI_API_KEY`  | —             | API key                                         |
| `LLM_API_KEY`     | —             | Alternative API key                             |
| `LLM_BASE_URL`    | —             | Custom OpenAI-compatible endpoint (e.g. Ollama) |
| `LLM_MAX_TOKENS`  | `4096`        | Max tokens per call                             |
| `LLM_TEMPERATURE` | `0.3`         | LLM temperature                                 |

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

### OpenAI-compatible endpoints (e.g. Ollama)

Set `LLM_BASE_URL` to any OpenAI-compatible server (e.g. Ollama's `http://localhost:11434/v1`). No API key is required for local endpoints. The `ModelFactory` routes through the Chat Completions API for custom base URLs; the `OpenAIProvider` (pipeline) requires `response_format` support on the endpoint for structured output.

```bash
LLM_PROVIDER=openai
LLM_MODEL=llama3.2
LLM_BASE_URL=http://localhost:11434/v1
```

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

## ModelFactory

The `ModelFactory` provides two-tier model routing for AI SDK v4 streaming. It creates `LanguageModel` instances with automatic tier selection:

```typescript
import { createModelFactory, createModelFactoryFromEnv } from '@open-edu/llm-config';

// From explicit config
const factory = createModelFactory({
  config: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '...',
    maxTokens: 4096,
    temperature: 0.3,
  },
  tier: 'fast',
});

// From environment variables
const factory = createModelFactoryFromEnv();

// Get model for a specific tier
const fastModel = factory.getModel('fast'); // gpt-4o-mini for quick tasks
const escalationModel = factory.getModel('escalation'); // gpt-4o for complex reasoning

// Check capabilities
factory.hasCapability('streaming'); // true
factory.hasCapability('tool-calling'); // true
```

### Tier Routing

| Tier         | Default Model | Use Case                                    |
| ------------ | ------------- | ------------------------------------------- |
| `fast`       | `gpt-4o-mini` | Classification, generation, quick responses |
| `escalation` | `gpt-4o`      | Concept design, blueprinting, review        |

### Provider Capabilities

| Provider     | Streaming | Structured Output | Tool Calling |
| ------------ | --------- | ----------------- | ------------ |
| `openai`     | Yes       | Yes               | Yes          |
| `google`     | Yes       | Yes               | Yes          |
| `openrouter` | Yes       | Yes               | Yes          |
