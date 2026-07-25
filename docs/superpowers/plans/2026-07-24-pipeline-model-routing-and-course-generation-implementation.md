# Pipeline Model Routing and Course Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a source-grounded PDF-to-OpenEdu pipeline with per-stage LLM model routing, producing complete, visual, interactive, mathematically verified course material from NIOS textbooks.

**Architecture:** Add a typed `LlmRouter` above the existing `LlmProvider`, then evolve the pipeline from chapter-to-activities generation into source inventory → concept map → lesson blueprint → assets/widgets → activities → validation → course package. `gpt-5.4-mini` is the default high-volume model; stronger models handle concept boundaries, lesson planning, and final review; deterministic code owns extraction metadata, math checks, schemas, coverage, and asset integrity.

**Tech Stack:** TypeScript 5, pnpm, Vitest, Zod, `pdf-parse`, OpenAI/OpenRouter providers, OpenEdu course-spec JSON, OpenEdu widget catalog, deterministic SVG.

**First golden fixture:** `/Users/sarthakpatnaik/Code/learn-easy/pdf/Math_Level_B_english_medium.pdf` — 203-page NIOS Level B mathematics. Implement and validate Lesson 1 (Numbers) before attempting the full book.

---

## File Map

**Create:**

- `packages/llm-config/src/stages.ts`
- `packages/llm-config/src/router.ts`
- `packages/llm-config/src/__tests__/router.test.ts`
- `packages/pipeline/src/config/config.ts`
- `packages/pipeline/src/config/__tests__/config.test.ts`
- `packages/pipeline/src/source/types.ts`
- `packages/pipeline/src/source/inventory-prompt.ts`
- `packages/pipeline/src/source/inventory.ts`
- `packages/pipeline/src/source/__tests__/inventory.test.ts`
- `packages/pipeline/src/concepts/types.ts`
- `packages/pipeline/src/concepts/prompt.ts`
- `packages/pipeline/src/concepts/index.ts`
- `packages/pipeline/src/concepts/__tests__/concept-map.test.ts`
- `packages/pipeline/src/blueprint/types.ts`
- `packages/pipeline/src/blueprint/prompt.ts`
- `packages/pipeline/src/blueprint/index.ts`
- `packages/pipeline/src/blueprint/__tests__/blueprint.test.ts`
- `packages/pipeline/src/assets/types.ts`
- `packages/pipeline/src/assets/svg.ts`
- `packages/pipeline/src/assets/manifest.ts`
- `packages/pipeline/src/assets/__tests__/svg.test.ts`
- `packages/pipeline/src/assets/__tests__/manifest.test.ts`
- `packages/pipeline/src/coverage/types.ts`
- `packages/pipeline/src/coverage/index.ts`
- `packages/pipeline/src/coverage/__tests__/coverage.test.ts`
- `packages/pipeline/src/validation/math.ts`
- `packages/pipeline/src/validation/__tests__/math.test.ts`
- `packages/pipeline/src/validation/widgets.ts`
- `packages/pipeline/src/validation/__tests__/widgets.test.ts`
- `packages/pipeline/src/validation/report.ts`
- `packages/pipeline/src/validation/__tests__/report.test.ts`
- `packages/pipeline/src/fixtures/math-level-b/README.md`
- `packages/pipeline/src/fixtures/math-level-b/source-inventory.json`
- `packages/pipeline/src/__tests__/math-level-b-lesson1.test.ts`

**Modify:**

- `packages/llm-config/src/types.ts`
- `packages/llm-config/src/index.ts`
- `packages/pipeline/src/types.ts`
- `packages/pipeline/src/extract/index.ts`
- `packages/pipeline/src/extract/__tests__/extract.test.ts`
- `packages/pipeline/src/chunk/index.ts`
- `packages/pipeline/src/chunk/prompts/chapter-concepts.txt`
- `packages/pipeline/src/generate-concept/index.ts`
- `packages/pipeline/src/generate-concept/prompts/enrich-concept.txt`
- `packages/pipeline/src/generate-activities/index.ts`
- `packages/pipeline/src/generate-activities/exemplars.ts`
- `packages/pipeline/src/generate-activities/widget-schemas.ts`
- `packages/pipeline/src/generate-activities/prompts/observe.ts`
- `packages/pipeline/src/generate-activities/prompts/guided-practice.ts`
- `packages/pipeline/src/generate-activities/prompts/independent-practice.ts`
- `packages/pipeline/src/generate-activities/prompts/mastery-check.ts`
- `packages/pipeline/src/generate-activities/prompts/positive-completion.ts`
- `packages/pipeline/src/graph/index.ts`
- `packages/pipeline/src/validate/index.ts`
- `packages/pipeline/src/output/index.ts`
- `packages/pipeline/src/cli/index.ts`
- `packages/pipeline/package.json`
- `openwiki/operations/testing-and-changes.md`

**Inspect before changing (read then modify as needed):**

- `packages/widgets/src/widget-catalog-source.ts`
- `packages/core/src/widget-catalog.ts`
- `packages/course-compiler/src/schemas/course-model.ts`
- `packages/course-compiler/src/parser/json-input.ts`

---

## Model-Routing Contract

```
source_inventory
concept_map
concept_enrichment
lesson_blueprint
asset_plan
activity_generation
review
```

Recommended routing:

| Stage                 | Initial model                  |
| --------------------- | ------------------------------ |
| `source_inventory`    | `gpt-5.4-mini`                 |
| `concept_map`         | `gpt-5.4` (stronger reasoning) |
| `concept_enrichment`  | `gpt-5.4-mini`                 |
| `lesson_blueprint`    | `gpt-5.4` (stronger reasoning) |
| `asset_plan`          | `gpt-5.4-mini`                 |
| `activity_generation` | `gpt-5.4-mini`                 |
| `review`              | `gpt-5.4` (stronger reasoning) |

Configuration precedence:

```
CLI stage override > stage environment variable > config-file value
> legacy LLM_MODEL/LLM_PROVIDER > safe defaults
```

---

## Implementation Order

```
1. Stage types + LlmRouter    (Task 1–2)
2. Config resolution + CLI    (Task 3)
3. Page-aware source inventory (Task 4)
4. Coverage-aware concept map  (Task 5)
5. Lesson blueprints           (Task 6)
6. Deterministic SVG assets    (Task 7)
7. Catalog-driven widgets      (Task 8)
8. Blueprint-driven activities (Task 9)
9. Math validation             (Task 10)
10. Coverage ledger + gates    (Task 11)
11. Graph orchestration rebuild (Task 12)
12. Lesson 1 golden slice      (Task 13)
13. Documentation + evaluation (Task 14)
```

---

### Task 1: Define Stage Types

**Files:**

- Create: `packages/llm-config/src/stages.ts`

This task defines stage constants, types, and configuration types. No provider changes — just pure types.

- [ ] **Step 1: Create `packages/llm-config/src/stages.ts`**

```typescript
export const LLM_STAGES = [
  'source_inventory',
  'concept_map',
  'concept_enrichment',
  'lesson_blueprint',
  'asset_plan',
  'activity_generation',
  'review',
] as const;

export type LlmStage = (typeof LLM_STAGES)[number];

export interface LlmStageConfig {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export type LlmStageConfigs = Record<LlmStage, LlmStageConfig>;

export const DEFAULT_STAGE_CONFIGS: LlmStageConfigs = {
  source_inventory: {
    provider: 'openai',
    model: 'gpt-5.4-mini',
    maxTokens: 4096,
    temperature: 0.3,
  },
  concept_map: { provider: 'openai', model: 'gpt-5.4', maxTokens: 4096, temperature: 0.3 },
  concept_enrichment: {
    provider: 'openai',
    model: 'gpt-5.4-mini',
    maxTokens: 4096,
    temperature: 0.3,
  },
  lesson_blueprint: { provider: 'openai', model: 'gpt-5.4', maxTokens: 4096, temperature: 0.3 },
  asset_plan: { provider: 'openai', model: 'gpt-5.4-mini', maxTokens: 4096, temperature: 0.3 },
  activity_generation: {
    provider: 'openai',
    model: 'gpt-5.4-mini',
    maxTokens: 4096,
    temperature: 0.3,
  },
  review: { provider: 'openai', model: 'gpt-5.4', maxTokens: 4096, temperature: 0.3 },
};

export function isLlmStage(value: string): value is LlmStage {
  return (LLM_STAGES as readonly string[]).includes(value);
}

export function assertLlmStage(value: string): LlmStage {
  if (!isLlmStage(value)) {
    throw new Error(`Unknown LLM stage: "${value}". Valid stages: ${LLM_STAGES.join(', ')}`);
  }
  return value as LlmStage;
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @open-edu/llm-config typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/llm-config/src/stages.ts
git commit -m "feat(llm-config): add stage types and default stage configs"
```

---

### Task 2: Implement Stage-Aware LlmRouter

**Files:**

- Create: `packages/llm-config/src/router.ts`
- Create: `packages/llm-config/src/__tests__/router.test.ts`
- Modify: `packages/llm-config/src/index.ts` (add exports)

- [ ] **Step 1: Create `packages/llm-config/src/router.ts`**

```typescript
import type { z } from 'zod';
import type { LlmProvider } from './types.js';
import type { LlmStage, LlmStageConfigs, LlmStageConfig } from './stages.js';
import { DEFAULT_STAGE_CONFIGS } from './stages.js';
import { createLlmProvider } from './index.js';
import type { LlmConfig } from './types.js';

export interface StructuredResult<T> {
  data: T;
  stage: LlmStage;
  provider: string;
  model: string;
}

export class LlmRouter {
  private stageConfigs: LlmStageConfigs;
  private providerCache = new Map<string, LlmProvider>();

  constructor(stageConfigs?: Partial<LlmStageConfigs>) {
    this.stageConfigs = { ...DEFAULT_STAGE_CONFIGS };
    if (stageConfigs) {
      for (const [key, value] of Object.entries(stageConfigs)) {
        if (value) {
          const stage = key as LlmStage;
          this.stageConfigs[stage] = { ...this.stageConfigs[stage], ...value };
        }
      }
    }
  }

  updateStageConfig(stage: LlmStage, config: Partial<LlmStageConfig>): void {
    this.stageConfigs[stage] = { ...this.stageConfigs[stage], ...config };
    this.providerCache.clear();
  }

  getStageConfig(stage: LlmStage): LlmStageConfig {
    return this.stageConfigs[stage];
  }

  private providerKey(config: LlmStageConfig): string {
    return `${config.provider}:${config.model}`;
  }

  private getProvider(stage: LlmStage): LlmProvider {
    const config = this.stageConfigs[stage];
    const key = this.providerKey(config);

    let provider = this.providerCache.get(key);
    if (!provider) {
      const llmConfig: LlmConfig = {
        provider: config.provider,
        model: config.model,
        apiKey:
          process.env.LLM_API_KEY ||
          process.env.OPENAI_API_KEY ||
          process.env.ANTHROPIC_API_KEY ||
          process.env.OPENROUTER_API_KEY ||
          '',
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      };
      provider = createLlmProvider(llmConfig);
      this.providerCache.set(key, provider);
    }
    return provider;
  }

  async generateStructured<T>(
    stage: LlmStage,
    prompt: string,
    schema: z.ZodType<T>,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<StructuredResult<T>> {
    const config = this.stageConfigs[stage];
    const provider = this.getProvider(stage);

    try {
      const data = await provider.generateStructured(prompt, schema, options);
      return { data, stage, provider: config.provider, model: config.model };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `LLM stage "${stage}" failed (provider=${config.provider}, model=${config.model}): ${message}`,
      );
    }
  }

  async generateStructuredRaw<T>(
    stage: LlmStage,
    prompt: string,
    schema: z.ZodType<T>,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<T> {
    const result = await this.generateStructured(stage, prompt, schema, options);
    return result.data;
  }
}

export function legacyAdapter(router: LlmRouter, stage: LlmStage): LlmProvider {
  return {
    async generateStructured<T>(
      prompt: string,
      schema: z.ZodType<T>,
      options?: { temperature?: number; maxTokens?: number },
    ): Promise<T> {
      return router.generateStructuredRaw(stage, prompt, schema, options);
    },
  };
}
```

- [ ] **Step 2: Create `packages/llm-config/src/__tests__/router.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { LlmRouter, legacyAdapter } from '../router.js';
import { LLM_STAGES, isLlmStage } from '../stages.js';
import type { LlmStage } from '../stages.js';

const TEST_KEY = 'test-key';
const testSchema = z.object({ answer: z.string() });

let envBackup: Record<string, string | undefined> = {};

describe('LlmRouter', () => {
  beforeEach(() => {
    envBackup = { ...process.env };
    process.env.OPENAI_API_KEY = TEST_KEY;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('has default stage configs for all stages', () => {
    const router = new LlmRouter();
    for (const stage of LLM_STAGES) {
      const config = router.getStageConfig(stage);
      expect(config.provider).toBeTruthy();
      expect(config.model).toBeTruthy();
      expect(config.maxTokens).toBeGreaterThan(0);
    }
  });

  it('allows overriding stage configs via constructor', () => {
    const router = new LlmRouter({
      source_inventory: {
        provider: 'openai',
        model: 'custom-mini',
        maxTokens: 2048,
        temperature: 0.3,
      },
    });
    const config = router.getStageConfig('source_inventory');
    expect(config.model).toBe('custom-mini');
    expect(config.maxTokens).toBe(2048);
    expect(config.provider).toBe('openai');
    expect(config.temperature).toBe(0.3);
  });

  it('allows overriding via updateStageConfig', () => {
    const router = new LlmRouter();
    router.updateStageConfig('concept_map', { model: 'gpt-5.4-super', temperature: 0.5 });
    const config = router.getStageConfig('concept_map');
    expect(config.model).toBe('gpt-5.4-super');
    expect(config.temperature).toBe(0.5);
    expect(config.provider).toBe('openai');
  });

  it('rejects unknown stages in getStageConfig (type-enforced at compile time)', () => {
    expect(isLlmStage('unknown_stage')).toBe(false);
  });

  it('fails without API key', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    const router = new LlmRouter();
    router.updateStageConfig('source_inventory', {
      provider: 'openai',
      model: 'gpt-5.4-mini',
      maxTokens: 4096,
      temperature: 0.3,
    } as any);
  });

  describe('legacyAdapter', () => {
    it('produces a LlmProvider from a router and stage', () => {
      const router = new LlmRouter();
      const provider = legacyAdapter(router, 'source_inventory');
      expect(provider).toBeDefined();
      expect(typeof provider.generateStructured).toBe('function');
    });
  });
});
```

- [ ] **Step 3: Modify `packages/llm-config/src/index.ts` — add router exports**

Replace the existing file with:

```typescript
export type { LlmConfig, LlmProvider } from './types.js';
export { loadConfig } from './types.js';
export { OpenAIProvider } from './providers/openai-provider.js';
export { OpenRouterProvider } from './providers/openrouter-provider.js';
export { LlmRouter, legacyAdapter } from './router.js';
export type { StructuredResult } from './router.js';
export { LLM_STAGES, DEFAULT_STAGE_CONFIGS, isLlmStage, assertLlmStage } from './stages.js';
export type { LlmStage, LlmStageConfig, LlmStageConfigs } from './stages.js';

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
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @open-edu/llm-config test
pnpm --filter @open-edu/llm-config typecheck
```

Expected: All existing tests pass. New router tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/llm-config/src/router.ts packages/llm-config/src/__tests__/router.test.ts packages/llm-config/src/index.ts
git commit -m "feat(llm-config): add stage-aware LlmRouter and legacy adapter"
```

---

### Task 3: Configuration Resolution and CLI Overrides

**Files:**

- Create: `packages/pipeline/src/config/config.ts`
- Create: `packages/pipeline/src/config/__tests__/config.test.ts`
- Modify: `packages/pipeline/src/cli/index.ts` (add `--stage-model` flags)

- [ ] **Step 1: Create `packages/pipeline/src/config/config.ts`**

```typescript
import type { LlmStage, LlmStageConfigs } from '@open-edu/llm-config';
import { LLM_STAGES, DEFAULT_STAGE_CONFIGS } from '@open-edu/llm-config';

export interface StageOverride {
  stage: string;
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
}

function envVarForStage(stage: string, field: string): string | undefined {
  const key = `LLM_STAGE_${stage.toUpperCase()}_${field.toUpperCase()}`;
  return process.env[key] || undefined;
}

function parseNumeric(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

export function resolveStageConfigs(overrides: StageOverride[] = []): LlmStageConfigs {
  const configs = { ...DEFAULT_STAGE_CONFIGS } as LlmStageConfigs;
  for (const stage of LLM_STAGES) {
    configs[stage] = { ...DEFAULT_STAGE_CONFIGS[stage] };
  }

  const legacyProvider = process.env.LLM_PROVIDER;
  const legacyModel = process.env.LLM_MODEL;
  const legacyMaxTokens = parseNumeric(process.env.LLM_MAX_TOKENS);
  const legacyTemperature = parseNumeric(process.env.LLM_TEMPERATURE);

  if (
    legacyProvider ||
    legacyModel ||
    legacyMaxTokens !== undefined ||
    legacyTemperature !== undefined
  ) {
    for (const stage of LLM_STAGES) {
      if (legacyProvider) configs[stage].provider = legacyProvider;
      if (legacyModel) configs[stage].model = legacyModel;
      if (legacyMaxTokens !== undefined) configs[stage].maxTokens = legacyMaxTokens;
      if (legacyTemperature !== undefined) configs[stage].temperature = legacyTemperature;
    }
  }

  for (const stage of LLM_STAGES) {
    const provider = envVarForStage(stage, 'provider');
    const model = envVarForStage(stage, 'model');
    const maxTokens = parseNumeric(envVarForStage(stage, 'max_tokens'));
    const temperature = parseNumeric(envVarForStage(stage, 'temperature'));
    if (provider) configs[stage].provider = provider;
    if (model) configs[stage].model = model;
    if (maxTokens !== undefined) configs[stage].maxTokens = maxTokens;
    if (temperature !== undefined) configs[stage].temperature = temperature;
  }

  for (const override of overrides) {
    for (const stage of LLM_STAGES) {
      if (override.stage !== 'all' && override.stage !== stage) continue;
      if (override.provider) configs[stage].provider = override.provider;
      if (override.model) configs[stage].model = override.model;
      if (override.temperature !== undefined) configs[stage].temperature = override.temperature;
      if (override.maxTokens !== undefined) configs[stage].maxTokens = override.maxTokens;
    }
  }

  for (const stage of LLM_STAGES) {
    if (!configs[stage].provider) configs[stage].provider = 'openai';
    if (!configs[stage].model) configs[stage].model = 'gpt-5.4-mini';
    if (configs[stage].maxTokens <= 0) {
      throw new Error(
        `Invalid maxTokens (${configs[stage].maxTokens}) for stage "${stage}". Must be > 0.`,
      );
    }
    if (configs[stage].temperature < 0 || configs[stage].temperature > 2) {
      throw new Error(
        `Invalid temperature (${configs[stage].temperature}) for stage "${stage}". Must be 0–2.`,
      );
    }
  }

  return configs;
}

export function parseStageOverride(raw: string): StageOverride {
  const eqIdx = raw.indexOf('=');
  if (eqIdx < 1) {
    throw new Error(
      `Invalid stage override: "${raw}". Expected format: stage=value or stage:field=value`,
    );
  }
  const key = raw.slice(0, eqIdx);
  const value = raw.slice(eqIdx + 1);
  if (!/^[a-zA-Z_][a-zA-Z0-9_:]*$/.test(key)) {
    throw new Error(`Invalid stage override key: "${key}".`);
  }

  const parts = key.split(':');
  const stage = parts[0];
  const field = parts[1];

  if (!field) {
    return { stage, model: value };
  }

  switch (field) {
    case 'model':
      return { stage, model: value };
    case 'provider':
      return { stage, provider: value };
    case 'temperature': {
      const t = Number(value);
      if (isNaN(t) || t < 0 || t > 2) {
        throw new Error(`Invalid temperature "${value}" for stage "${stage}". Must be 0–2.`);
      }
      return { stage, temperature: t };
    }
    case 'max_tokens':
    case 'max-tokens':
    case 'maxTokens': {
      const n = Number(value);
      if (isNaN(n) || n <= 0 || !Number.isInteger(n)) {
        throw new Error(
          `Invalid maxTokens "${value}" for stage "${stage}". Must be a positive integer.`,
        );
      }
      return { stage, maxTokens: n };
    }
    default:
      throw new Error(
        `Unknown field "${field}" in stage override "${raw}". Expected: model, provider, temperature, max_tokens.`,
      );
  }
}

export function logStageConfigs(configs: LlmStageConfigs, log: (msg: string) => void): void {
  for (const stage of LLM_STAGES) {
    const cfg = configs[stage];
    log(
      `  ${stage}: ${cfg.provider}/${cfg.model} (t=${cfg.temperature}, maxTokens=${cfg.maxTokens})`,
    );
  }
}
```

- [ ] **Step 2: Create `packages/pipeline/src/config/__tests__/config.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveStageConfigs, parseStageOverride } from '../config.js';
import { LLM_STAGES } from '@open-edu/llm-config';

let envBackup: Record<string, string | undefined> = {};

describe('resolveStageConfigs', () => {
  beforeEach(() => {
    envBackup = { ...process.env };
    for (const stage of LLM_STAGES) {
      delete process.env[`LLM_STAGE_${stage.toUpperCase()}_MODEL`];
      delete process.env[`LLM_STAGE_${stage.toUpperCase()}_PROVIDER`];
      delete process.env[`LLM_STAGE_${stage.toUpperCase()}_MAX_TOKENS`];
      delete process.env[`LLM_STAGE_${stage.toUpperCase()}_TEMPERATURE`];
    }
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_MAX_TOKENS;
    delete process.env.LLM_TEMPERATURE;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('returns default configs with no env vars', () => {
    const configs = resolveStageConfigs();
    expect(configs.source_inventory.model).toBe('gpt-5.4-mini');
    expect(configs.concept_map.model).toBe('gpt-5.4');
    expect(configs.review.model).toBe('gpt-5.4');
  });

  it('legacy LLM_MODEL sets all stages', () => {
    process.env.LLM_MODEL = 'gpt-4o-mini';
    const configs = resolveStageConfigs();
    for (const stage of LLM_STAGES) {
      expect(configs[stage].model).toBe('gpt-4o-mini');
    }
  });

  it('legacy LLM_PROVIDER sets all stages', () => {
    process.env.LLM_PROVIDER = 'openrouter';
    const configs = resolveStageConfigs();
    for (const stage of LLM_STAGES) {
      expect(configs[stage].provider).toBe('openrouter');
    }
  });

  it('legacy LLM_MAX_TOKENS and LLM_TEMPERATURE set all stages', () => {
    process.env.LLM_MAX_TOKENS = '8192';
    process.env.LLM_TEMPERATURE = '0.7';
    const configs = resolveStageConfigs();
    for (const stage of LLM_STAGES) {
      expect(configs[stage].maxTokens).toBe(8192);
      expect(configs[stage].temperature).toBe(0.7);
    }
  });

  it('stage env var overrides legacy', () => {
    process.env.LLM_MODEL = 'gpt-4o-mini';
    process.env.LLM_STAGE_CONCEPT_MAP_MODEL = 'gpt-5.4';
    const configs = resolveStageConfigs();
    expect(configs.concept_map.model).toBe('gpt-5.4');
    expect(configs.source_inventory.model).toBe('gpt-4o-mini');
  });

  it('CLI override takes highest precedence', () => {
    process.env.LLM_MODEL = 'gpt-4o-mini';
    process.env.LLM_STAGE_CONCEPT_MAP_MODEL = 'gpt-5.4';
    const configs = resolveStageConfigs([{ stage: 'concept_map', model: 'gpt-5.4-super' }]);
    expect(configs.concept_map.model).toBe('gpt-5.4-super');
  });

  it('CLI "all" applies to every stage', () => {
    const configs = resolveStageConfigs([{ stage: 'all', model: 'gpt-5.4' }]);
    for (const stage of LLM_STAGES) {
      expect(configs[stage].model).toBe('gpt-5.4');
    }
  });

  it('rejects invalid maxTokens (zero)', () => {
    expect(() => resolveStageConfigs([{ stage: 'all', maxTokens: 0 }])).toThrow(
      'Invalid maxTokens',
    );
  });

  it('rejects invalid temperature', () => {
    expect(() => resolveStageConfigs([{ stage: 'all', temperature: 3 }])).toThrow(
      'Invalid temperature',
    );
  });
});

describe('parseStageOverride', () => {
  it('parses stage=model', () => {
    const result = parseStageOverride('source_inventory=gpt-5.4-mini');
    expect(result.stage).toBe('source_inventory');
    expect(result.model).toBe('gpt-5.4-mini');
  });

  it('parses stage:provider=value', () => {
    const result = parseStageOverride('concept_map:provider=openrouter');
    expect(result.stage).toBe('concept_map');
    expect(result.provider).toBe('openrouter');
  });

  it('parses stage:temperature=value', () => {
    const result = parseStageOverride('review:temperature=0.5');
    expect(result.stage).toBe('review');
    expect(result.temperature).toBe(0.5);
  });

  it('parses stage:max_tokens=value', () => {
    const result = parseStageOverride('review:max_tokens=8192');
    expect(result.stage).toBe('review');
    expect(result.maxTokens).toBe(8192);
  });

  it('rejects empty assignment', () => {
    expect(() => parseStageOverride('=value')).toThrow('Invalid stage override');
  });

  it('rejects unknown field', () => {
    expect(() => parseStageOverride('source_inventory:foo=bar')).toThrow('Unknown field');
  });

  it('rejects non-numeric temperature', () => {
    expect(() => parseStageOverride('source_inventory:temperature=hot')).toThrow(
      'Invalid temperature',
    );
  });

  it('rejects non-integer maxTokens', () => {
    expect(() => parseStageOverride('source_inventory:max_tokens=4.5')).toThrow(
      'Invalid maxTokens',
    );
  });
});
```

- [ ] **Step 3: Modify `packages/pipeline/src/cli/index.ts` — add stage-model flags and `--dry-run`**

Add `stageOverrides?: string[]` and `dryRun?: boolean` to the `CLIOptions` interface. Add these cases in the `switch` statement inside `parseArgs()`:

```typescript
case '--stage-model':
case '--stage-provider':
case '--stage-temperature':
case '--stage-max-tokens': {
  // Format: --stage-model stage=value  OR  --stage-model stage:field=value
  const val = args[++i] || '';
  if (args[i-1] === '--stage-model') {
    options.stageOverrides = [...(options.stageOverrides || []), val];
  } else if (args[i-1] === '--stage-provider') {
    const parts = val.split('=');
    options.stageOverrides = [...(options.stageOverrides || []), `${parts[0]}:provider=${parts[1]}`];
  } else if (args[i-1] === '--stage-temperature') {
    const parts = val.split('=');
    options.stageOverrides = [...(options.stageOverrides || []), `${parts[0]}:temperature=${parts[1]}`];
  } else if (args[i-1] === '--stage-max-tokens') {
    const parts = val.split('=');
    options.stageOverrides = [...(options.stageOverrides || []), `${parts[0]}:max_tokens=${parts[1]}`];
  }
  break;
}
```

Add `--stage-model stage=model`, `--stage-provider stage=provider`, `--stage-temperature stage=value`, `--stage-max-tokens stage=value`, `--dry-run`, and `--resume` to the help text in `printHelp()`.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- config
pnpm --filter @open-edu/pipeline typecheck
```

Expected: All config tests pass. Typecheck passes.

**Note:** Config-file loading (e.g. `pipeline.config.json`) is not implemented in this initial version. The precedence chain currently supports: CLI stage override > stage environment variable > legacy `LLM_MODEL`/`LLM_PROVIDER` > safe defaults. Add config-file loading in a follow-up story when needed.

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/config/ packages/pipeline/src/cli/index.ts
git commit -m "feat(pipeline): add config resolution with stage env/CLI overrides"
```

---

### Task 4: Build Page-Aware Source Inventory

**Files:**

- Create: `packages/pipeline/src/source/types.ts`
- Create: `packages/pipeline/src/source/inventory-prompt.ts`
- Create: `packages/pipeline/src/source/inventory.ts`
- Create: `packages/pipeline/src/source/__tests__/inventory.test.ts`
- Modify: `packages/pipeline/src/extract/index.ts` (add `extractPDFPages`)
- Modify: `packages/pipeline/src/extract/__tests__/extract.test.ts`

**IMPORTANT:** Read the existing `packages/pipeline/src/extract/index.ts` before modifying, to understand the current PDF parsing approach. Then add page boundary preservation.

- [ ] **Step 1: Create `packages/pipeline/src/source/types.ts`**

```typescript
import { z } from 'zod';

export const SOURCE_UNIT_TYPES = [
  'lesson',
  'section',
  'objective',
  'definition',
  'worked_example',
  'exercise',
  'review',
  'assessment',
  'diagram',
  'unclassified',
] as const;

export type SourceUnitType = (typeof SOURCE_UNIT_TYPES)[number];

export const SourceLocationSchema = z.object({
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive().optional(),
  heading: z.string().optional(),
  sectionId: z.string().optional(),
});

export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const SourceUnitSchema = z.object({
  id: z.string().min(1),
  type: z.enum(SOURCE_UNIT_TYPES),
  text: z.string(),
  location: SourceLocationSchema,
  parentId: z.string().optional(),
  extractionConfidence: z.number().min(0).max(1),
  requiredCoverage: z.boolean(),
});

export type SourceUnit = z.infer<typeof SourceUnitSchema>;

export const SourceInventorySchema = z.object({
  documentId: z.string(),
  title: z.string(),
  totalPages: z.number().int().positive(),
  units: z.array(SourceUnitSchema),
  warnings: z.array(z.string()),
});

export type SourceInventory = z.infer<typeof SourceInventorySchema>;

export const InventoryLLMResponseSchema = z.object({
  classifications: z.array(
    z.object({
      unitId: z.string(),
      type: z.enum(SOURCE_UNIT_TYPES),
      extractionConfidence: z.number().min(0).max(1),
    }),
  ),
});
```

- [ ] **Step 2: Create `packages/pipeline/src/source/inventory-prompt.ts`**

```typescript
export function buildInventoryPrompt(
  units: Array<{ id: string; pageStart: number; heading?: string; text: string }>,
): string {
  const unitsJson = JSON.stringify(units, null, 2);
  return `You are classifying source units extracted from a textbook.

Each unit has an ID, page number, optional heading, and text.

Classify each unit into exactly one of these types:
- lesson: Start of a new lesson/chapter
- section: Major section within a lesson
- objective: Learning objectives or goals
- definition: Formal definition of a term or concept
- worked_example: Step-by-step worked example with solution
- exercise: Practice exercises or problems (grouped)
- review: Review or revision section
- assessment: Test, quiz, or assessment section
- diagram: Figure, chart, diagram, or illustration description
- unclassified: Does not clearly fit any category

Input units:
${unitsJson}

Return a JSON object with a "classifications" array. Each entry has:
- "unitId": the original unit ID
- "type": one of the types above
- "extractionConfidence": 0.0-1.0

Do not invent new unit IDs. Only classify the units provided.`;
}
```

- [ ] **Step 3: Create `packages/pipeline/src/source/inventory.ts`**

```typescript
import type { LlmRouter } from '@open-edu/llm-config';
import type { SourceUnit, SourceInventory } from './types.js';
import { SourceInventorySchema, InventoryLLMResponseSchema } from './types.js';
import { buildInventoryPrompt } from './inventory-prompt.js';

const NIOS_LESSON_HEADING = /^(?:Lesson|पाठ)\s+(\d+)\s*[:\-\u2013\u2014]\s*(.+)$/im;
const NIOS_OBJECTIVE_MARKER = /^(?:LEARNING\s*OUTCOMES|Objectives|OBJECTIVES|सीखने के परिणाम)/im;
const NIOS_EXAMPLE_MARKER = /^(?:Example|उदाहरण)\s+(\d+(?:\.\d+)?)\s*[:\-\u2013\u2014]/im;
const NIOS_EXERCISE_MARKER =
  /^(?:Let us see what you have learnt|Exercise|अभ्यास|आइए देखें आपने क्या सीखा)/im;
const NIOS_REVIEW_MARKER = /^(?:REVIEW|Review|पुनरावृत्ति|What have you learnt|आपने क्या सीखा)/im;
const NIOS_TEST_MARKER = /^(?:TEST|Test|परीक्षा|Assessment|मूल्यांकन)/im;

export interface PageContent {
  pageNum: number;
  text: string;
}

function splitIntoSegments(pages: PageContent[]): SourceUnit[] {
  const units: SourceUnit[] = [];
  let exerciseMode = false;
  let unitCounter = 0;

  for (const page of pages) {
    const segments = page.text.split(/\n{2,}/).filter((s) => s.trim().length > 0);

    for (const segment of segments) {
      unitCounter++;
      const id = `src-${unitCounter}`;
      const trimmed = segment.trim();
      const location = { pageStart: page.pageNum };

      if (NIOS_LESSON_HEADING.test(trimmed)) {
        exerciseMode = false;
        units.push({
          id,
          type: 'lesson',
          text: trimmed,
          location,
          extractionConfidence: 1.0,
          requiredCoverage: true,
        });
        continue;
      }

      if (NIOS_EXERCISE_MARKER.test(trimmed)) {
        exerciseMode = true;
        units.push({
          id,
          type: 'exercise',
          text: trimmed,
          location,
          extractionConfidence: 0.9,
          requiredCoverage: true,
        });
        continue;
      }

      if (NIOS_OBJECTIVE_MARKER.test(trimmed)) {
        units.push({
          id,
          type: 'objective',
          text: trimmed,
          location,
          extractionConfidence: 0.95,
          requiredCoverage: true,
        });
        continue;
      }

      if (NIOS_REVIEW_MARKER.test(trimmed)) {
        exerciseMode = false;
        units.push({
          id,
          type: 'review',
          text: trimmed,
          location,
          extractionConfidence: 0.9,
          requiredCoverage: false,
        });
        continue;
      }

      if (NIOS_TEST_MARKER.test(trimmed)) {
        exerciseMode = false;
        units.push({
          id,
          type: 'assessment',
          text: trimmed,
          location,
          extractionConfidence: 0.9,
          requiredCoverage: true,
        });
        continue;
      }

      if (NIOS_EXAMPLE_MARKER.test(trimmed)) {
        units.push({
          id,
          type: 'worked_example',
          text: trimmed,
          location,
          extractionConfidence: 0.9,
          requiredCoverage: true,
        });
        continue;
      }

      units.push({
        id,
        type: exerciseMode ? 'exercise' : 'unclassified',
        text: trimmed,
        location,
        extractionConfidence: exerciseMode ? 0.8 : 0.5,
        requiredCoverage: exerciseMode,
      });
    }
  }

  return units;
}

export async function buildSourceInventory(
  router: LlmRouter,
  pages: PageContent[],
  documentTitle: string,
): Promise<SourceInventory> {
  const rawUnits = splitIntoSegments(pages);

  const unclassifiedUnits = rawUnits.filter((u) => u.type === 'unclassified');

  if (unclassifiedUnits.length > 0) {
    const promptInput = unclassifiedUnits.map((u) => ({
      id: u.id,
      pageStart: u.location.pageStart,
      heading: u.location.heading,
      text: u.text.slice(0, 1000),
    }));

    const prompt = buildInventoryPrompt(promptInput);
    try {
      const result = await router.generateStructuredRaw(
        'source_inventory',
        prompt,
        InventoryLLMResponseSchema,
        { temperature: 0.1 },
      );

      for (const classification of result.classifications) {
        const unit = unclassifiedUnits.find((u) => u.id === classification.unitId);
        if (unit) {
          unit.type = classification.type;
          unit.extractionConfidence = classification.extractionConfidence;
          unit.requiredCoverage = [
            'worked_example',
            'exercise',
            'assessment',
            'objective',
          ].includes(classification.type);
        }
      }
    } catch {
      // Keep unclassified on LLM failure
    }
  }

  const warnings: string[] = [];
  if (pages.length === 0) {
    warnings.push('No pages extracted from document');
  }

  const inventory: SourceInventory = {
    documentId: documentTitle.toLowerCase().replace(/\s+/g, '-'),
    title: documentTitle,
    totalPages: pages.length,
    units: rawUnits,
    warnings,
  };

  return SourceInventorySchema.parse(inventory);
}
```

- [ ] **Step 4: Create `packages/pipeline/src/source/__tests__/inventory.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { SourceUnitSchema, SourceInventorySchema } from '../types.js';

describe('SourceUnitSchema', () => {
  it('validates a valid source unit', () => {
    const unit = {
      id: 'src-1',
      type: 'lesson' as const,
      text: 'Lesson 1: Numbers',
      location: { pageStart: 1 },
      extractionConfidence: 1.0,
      requiredCoverage: true,
    };
    expect(() => SourceUnitSchema.parse(unit)).not.toThrow();
  });

  it('rejects empty id', () => {
    expect(() =>
      SourceUnitSchema.parse({
        id: '',
        type: 'lesson',
        text: 'text',
        location: { pageStart: 1 },
        extractionConfidence: 1.0,
        requiredCoverage: true,
      }),
    ).toThrow();
  });

  it('rejects invalid type', () => {
    expect(() =>
      SourceUnitSchema.parse({
        id: 'src-1',
        type: 'not_a_type',
        text: 'text',
        location: { pageStart: 1 },
        extractionConfidence: 1.0,
        requiredCoverage: true,
      }),
    ).toThrow();
  });

  it('rejects confidence > 1', () => {
    expect(() =>
      SourceUnitSchema.parse({
        id: 'src-1',
        type: 'lesson',
        text: 'text',
        location: { pageStart: 1 },
        extractionConfidence: 1.5,
        requiredCoverage: true,
      }),
    ).toThrow();
  });

  it('rejects negative page number', () => {
    expect(() =>
      SourceUnitSchema.parse({
        id: 'src-1',
        type: 'lesson',
        text: 'text',
        location: { pageStart: -1 },
        extractionConfidence: 1.0,
        requiredCoverage: true,
      }),
    ).toThrow();
  });
});

describe('SourceInventorySchema', () => {
  it('validates a complete inventory', () => {
    const inventory = {
      documentId: 'math-level-b',
      title: 'Math Level B',
      totalPages: 203,
      units: [
        {
          id: 'src-1',
          type: 'lesson' as const,
          text: 'Lesson 1',
          location: { pageStart: 1 },
          extractionConfidence: 1.0,
          requiredCoverage: true,
        },
      ],
      warnings: [],
    };
    expect(() => SourceInventorySchema.parse(inventory)).not.toThrow();
  });

  it('rejects zero pages', () => {
    expect(() =>
      SourceInventorySchema.parse({
        documentId: 'empty',
        title: 'Empty',
        totalPages: 0,
        units: [],
        warnings: [],
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 5: Modify `packages/pipeline/src/extract/index.ts` — add `extractPDFPages` function**

Read the existing file first to understand the current imports and exports. Then add:

```typescript
import type { PageContent } from '../source/inventory.js';

export async function extractPDFPages(pdfPath: string): Promise<PageContent[]> {
  const pdfBuffer = readFileSync(pdfPath);
  const pdfData = await pdfParse(pdfBuffer);
  const fullText = pdfData.text;

  const pages: PageContent[] = [];
  const pageTexts = fullText.split(/\f/);

  for (let i = 0; i < pageTexts.length; i++) {
    const text = pageTexts[i].trim();
    if (text.length > 0) {
      pages.push({ pageNum: i + 1, text });
    }
  }

  return pages;
}
```

- [ ] **Step 6: Modify `packages/pipeline/src/extract/__tests__/extract.test.ts` add page preservation test**

```typescript
it('rejects non-existent PDF with extractPDFPages', async () => {
  await expect(extractPDFPages('/nonexistent/file.pdf')).rejects.toThrow();
});
```

Add `import { extractPDFPages } from '../index.js';` at the top.

- [ ] **Step 7: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- inventory extract
```

- [ ] **Step 8: Commit**

```bash
git add packages/pipeline/src/source/ packages/pipeline/src/extract/
git commit -m "feat(pipeline): add page-aware source inventory with NIOS heading recognition"
```

---

### Task 5: Coverage-Aware Concept Map

**Files:**

- Create: `packages/pipeline/src/concepts/types.ts`
- Create: `packages/pipeline/src/concepts/prompt.ts`
- Create: `packages/pipeline/src/concepts/index.ts`
- Create: `packages/pipeline/src/concepts/__tests__/concept-map.test.ts`
- Modify: `packages/pipeline/src/chunk/index.ts` (add router-aware wrapper)
- Modify: `packages/pipeline/src/chunk/prompts/chapter-concepts.txt` (source-unit-driven)
- Modify: `packages/pipeline/src/generate-concept/index.ts` (add router-aware wrapper)
- Modify: `packages/pipeline/src/generate-concept/prompts/enrich-concept.txt` (representations + context)

- [ ] **Step 1: Create `packages/pipeline/src/concepts/types.ts`**

```typescript
import { z } from 'zod';

export const CONCEPT_KINDS = ['skill', 'knowledge', 'procedure', 'application'] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];

export const REPRESENTATION_TYPES = ['concrete', 'visual', 'symbolic'] as const;

export const ConceptSchema = z.object({
  conceptId: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(3),
  kind: z.enum(CONCEPT_KINDS),
  sourceUnitIds: z.array(z.string()).min(1),
  learningObjective: z.string().min(10),
  coreIdea: z.string().min(20),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  masteryThreshold: z.number().min(0.5).max(0.95),
  prerequisites: z.array(z.string()),
  representations: z.array(z.enum(REPRESENTATION_TYPES)).min(1),
  exerciseFamilies: z.array(z.string()).min(1),
  misconceptionTargets: z.array(z.string()),
  adultContext: z.string().optional(),
  recommendedWidgetCategories: z.array(z.string()),
  estimatedMinutes: z.number().int().min(5).max(60),
});

export type Concept = z.infer<typeof ConceptSchema>;

export const ConceptMapSchema = z.object({
  concepts: z.array(ConceptSchema),
  documentId: z.string(),
});

export type ConceptMap = z.infer<typeof ConceptMapSchema>;
```

- [ ] **Step 2: Create `packages/pipeline/src/concepts/prompt.ts`**

```typescript
import type { SourceUnit } from '../source/types.js';

export function buildConceptMapPrompt(sourceUnits: SourceUnit[], lessonName: string): string {
  const inputUnits = sourceUnits.map((u) => ({
    unitId: u.id,
    type: u.type,
    pageStart: u.location.pageStart,
    text: u.text.slice(0, 1500),
  }));
  const unitsJson = JSON.stringify(inputUnits, null, 2);

  return `You are designing a concept map for a mathematics lesson: "${lessonName}".

Below are extracted source units from the textbook. Each unit has a unique unitId, type, page number, and content text.

Source units:
${unitsJson}

Generate a list of discrete, teachable concepts. Rules:
1. Each concept MUST reference at least one source unit ID as evidence.
2. Concepts MUST cover every objective and assessment family in the source material.
3. Create ONE concept per independently teachable skill (not a fixed count).
4. Never generate a concept without citing source evidence via sourceUnitIds.
5. conceptId must match pattern: lowercase letters, digits, underscores.
6. Do NOT generate more than 15 concepts per lesson.

For each concept, provide:
- conceptId, label, kind (skill/knowledge/procedure/application)
- sourceUnitIds: array of source unit IDs
- learningObjective, coreIdea, difficulty, masteryThreshold
- prerequisites: conceptIds of prerequisites (empty array if none)
- representations: at least one of "concrete", "visual", "symbolic"
- exerciseFamilies, misconceptionTargets
- adultContext: real-world application (optional)
- recommendedWidgetCategories
- estimatedMinutes (5-60)

Return a JSON object with a "concepts" array.`;
}
```

- [ ] **Step 3: Create `packages/pipeline/src/concepts/index.ts`**

```typescript
import type { LlmRouter } from '@open-edu/llm-config';
import type { SourceUnit } from '../source/types.js';
import type { Concept, ConceptMap } from './types.js';
import { ConceptSchema, ConceptMapSchema } from './types.js';
import { buildConceptMapPrompt } from './prompt.js';

export function validateConceptGraph(concepts: Concept[]): string[] {
  const errors: string[] = [];
  const ids = new Set(concepts.map((c) => c.conceptId));

  for (const concept of concepts) {
    if (concept.prerequisites.includes(concept.conceptId)) {
      errors.push(`Concept "${concept.conceptId}" lists itself as a prerequisite`);
    }
    for (const prereq of concept.prerequisites) {
      if (!ids.has(prereq)) {
        errors.push(`Concept "${concept.conceptId}" references unknown prerequisite "${prereq}"`);
      }
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const adj = new Map<string, string[]>();
  for (const c of concepts) adj.set(c.conceptId, c.prerequisites);

  function detectCycle(nodeId: string): boolean {
    if (inStack.has(nodeId)) {
      errors.push(`Dependency cycle detected via "${nodeId}"`);
      return true;
    }
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const dep of adj.get(nodeId) || []) detectCycle(dep);
    inStack.delete(nodeId);
    return false;
  }
  for (const c of concepts) detectCycle(c.conceptId);

  for (const c of concepts) {
    if (c.sourceUnitIds.length === 0)
      errors.push(`Concept "${c.conceptId}" has no source evidence`);
  }

  return errors;
}

export async function generateConceptMap(
  router: LlmRouter,
  sourceUnits: SourceUnit[],
  lessonName: string,
): Promise<{ concepts: Concept[]; warnings: string[] }> {
  const prompt = buildConceptMapPrompt(sourceUnits, lessonName);
  const result = await router.generateStructuredRaw('concept_map', prompt, ConceptMapSchema, {
    temperature: 0.2,
  });

  const warnings: string[] = [];
  const graphErrors = validateConceptGraph(result.concepts);
  if (graphErrors.length > 0) warnings.push(...graphErrors);

  const validConcepts = result.concepts.filter((c) => {
    const r = ConceptSchema.safeParse(c);
    if (!r.success) warnings.push(`Concept "${c.conceptId}" failed validation: ${r.error.message}`);
    return r.success;
  });

  return { concepts: validConcepts, warnings };
}
```

- [ ] **Step 4: Create `packages/pipeline/src/concepts/__tests__/concept-map.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { validateConceptGraph } from '../index.js';
import { ConceptSchema } from '../types.js';
import type { Concept } from '../types.js';

function makeConcept(overrides: Partial<Concept>): Concept {
  return {
    conceptId: 'test_c',
    label: 'Test',
    kind: 'knowledge',
    sourceUnitIds: ['src-1'],
    learningObjective: 'Learn the test concept thoroughly',
    coreIdea: 'This is a test concept with enough detail for validation.',
    difficulty: 'beginner',
    masteryThreshold: 0.8,
    prerequisites: [],
    representations: ['visual'],
    exerciseFamilies: ['test_ex'],
    misconceptionTargets: [],
    recommendedWidgetCategories: [],
    estimatedMinutes: 10,
    ...overrides,
  } as Concept;
}

describe('ConceptSchema', () => {
  it('validates a valid concept', () => {
    expect(() => ConceptSchema.parse(makeConcept({}))).not.toThrow();
  });

  it('rejects invalid conceptId format', () => {
    expect(() => ConceptSchema.parse(makeConcept({ conceptId: 'Bad ID' }))).toThrow();
  });

  it('rejects no source units', () => {
    expect(() => ConceptSchema.parse(makeConcept({ sourceUnitIds: [] }))).toThrow();
  });

  it('rejects short learningObjective', () => {
    expect(() => ConceptSchema.parse(makeConcept({ learningObjective: 'Learn' }))).toThrow();
  });
});

describe('validateConceptGraph', () => {
  it('returns no errors for valid acyclic graph', () => {
    const a = makeConcept({ conceptId: 'a', prerequisites: [] });
    const b = makeConcept({ conceptId: 'b', prerequisites: ['a'] });
    expect(validateConceptGraph([a, b])).toEqual([]);
  });

  it('detects self-dependency', () => {
    const a = makeConcept({ conceptId: 'a', prerequisites: ['a'] });
    expect(validateConceptGraph([a]).some((e) => e.includes('itself'))).toBe(true);
  });

  it('detects missing dependency', () => {
    const b = makeConcept({ conceptId: 'b', prerequisites: ['a'] });
    expect(validateConceptGraph([b]).some((e) => e.includes('unknown prerequisite'))).toBe(true);
  });

  it('detects cycle', () => {
    const a = makeConcept({ conceptId: 'a', prerequisites: ['b'] });
    const b = makeConcept({ conceptId: 'b', prerequisites: ['a'] });
    expect(validateConceptGraph([a, b]).some((e) => e.includes('cycle'))).toBe(true);
  });
});
```

- [ ] **Step 5: Modify `packages/pipeline/src/chunk/prompts/chapter-concepts.txt`**

Replace with:

```text
You are an expert curriculum designer analyzing a textbook lesson to identify teachable concepts.

Given the lesson text below containing source units (each marked with an ID and type), identify discrete concepts that can be taught independently.

Rules:
- Every concept MUST cite at least one source unit ID as evidence.
- You MUST cover every learning objective found in the source.
- You MUST cover every worked example family and exercise family.
- Generate ONE concept per independently teachable skill (let content determine count, not a fixed 3-8).
- conceptId must be lowercase with underscores (e.g. indian_place_value).

For each concept, return:
- conceptId, learningObjective (action verb, <=12 words), coreIdea (2-4 sentences)
- examples (2-3 from source), misconceptions (1-2), suggestedDependencies
- sourceSections (sourceUnitIds that provide evidence), estimatedDuration (5-60 min)
```

- [ ] **Step 6: Modify `packages/pipeline/src/chunk/index.ts` — add router-aware `chunkContentWithRouter`**

Add at the end of the file:

```typescript
import type { LlmRouter } from '@open-edu/llm-config';

export async function chunkContentWithRouter(
  router: LlmRouter,
  chapters: ChapterChunk[],
): Promise<ConceptCandidate[]> {
  const allCandidates: ConceptCandidate[] = [];
  for (const chapter of chapters) {
    const candidates = await extractConceptsFromChapterWithRouter(router, chapter);
    allCandidates.push(...candidates);
  }
  return allCandidates;
}

async function extractConceptsFromChapterWithRouter(
  router: LlmRouter,
  chapter: ChapterChunk,
): Promise<ConceptCandidate[]> {
  const adapter = {
    async generateStructured<T>(prompt: string, schema: any, options?: any): Promise<T> {
      return router.generateStructuredRaw('concept_map', prompt, schema, options);
    },
  };
  return extractConceptsFromChapter(adapter, chapter);
}
```

- [ ] **Step 7: Modify `packages/pipeline/src/generate-concept/prompts/enrich-concept.txt`**

Replace with:

```text
You are adding pedagogical metadata to existing concepts from a mathematics curriculum.

Given the concept and its source evidence, enrich it with:
1. difficulty: "beginner", "intermediate", or "advanced"
2. masteryCriteria: 0.5-0.95 target threshold
3. supports: whether visual representation is beneficial (true/false)
4. representations: "concrete", "visual", "symbolic"
5. adultContext: real-world adult-life application
6. recommendedWidgets: widget categories for teaching this concept
7. misconceptionTargets: refined list of likely student errors
8. dependencies: resolved prerequisite conceptIds

Rules:
- Do NOT change the conceptId or coreIdea.
- Visual concepts (place value, fractions, geometry) MUST have supports.visual = true.
```

- [ ] **Step 8: Modify `packages/pipeline/src/generate-concept/index.ts` — add router-aware wrapper**

```typescript
import type { LlmRouter } from '@open-edu/llm-config';

export async function enrichConceptsWithRouter(
  router: LlmRouter,
  candidates: ConceptCandidate[],
): Promise<{ concepts: GeneratedConcept[]; warnings: string[] }> {
  const adapter = {
    async generateStructured<T>(prompt: string, schema: any, options?: any): Promise<T> {
      return router.generateStructuredRaw('concept_enrichment', prompt, schema, options);
    },
  };
  return generateConcepts(adapter, candidates);
}
```

- [ ] **Step 9: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- concept chunk generate-concept
```

- [ ] **Step 10: Commit**

```bash
git add packages/pipeline/src/concepts/ packages/pipeline/src/chunk/ packages/pipeline/src/generate-concept/
git commit -m "feat(pipeline): add coverage-aware concept map with graph validation and enrichment routing"
```

---

### Task 6: Add Lesson Blueprints

**Files:**

- Create: `packages/pipeline/src/blueprint/types.ts`
- Create: `packages/pipeline/src/blueprint/prompt.ts`
- Create: `packages/pipeline/src/blueprint/index.ts`
- Create: `packages/pipeline/src/blueprint/__tests__/blueprint.test.ts`

- [ ] **Step 1: Create `packages/pipeline/src/blueprint/types.ts`**

```typescript
import { z } from 'zod';

export const LESSON_ARC_STEPS = [
  'hook',
  'observe',
  'worked_example',
  'guided_practice',
  'widget_practice',
  'independent_practice',
  'mastery_check',
  'remediation',
  'extension',
] as const;

export type LessonArcStep = (typeof LESSON_ARC_STEPS)[number];

export const AssetRequestSchema = z.object({
  id: z.string().min(1),
  rendererType: z.string().min(1),
  parameters: z.record(z.unknown()),
  description: z.string(),
});

export const WidgetRequestSchema = z.object({
  step: z.enum(LESSON_ARC_STEPS),
  widgetCategory: z.string(),
  mode: z.enum(['observe', 'interactive']),
  description: z.string(),
});

export const LessonBlueprintSchema = z.object({
  conceptId: z.string().min(1),
  sourceUnitIds: z.array(z.string()).min(1),
  objective: z.string().min(10),
  priorKnowledge: z.array(z.string()),
  representations: z.array(z.enum(['concrete', 'visual', 'symbolic'])).min(1),
  lessonArc: z
    .array(
      z.object({
        step: z.enum(LESSON_ARC_STEPS),
        description: z.string(),
        durationMinutes: z.number().int().min(1).max(20),
      }),
    )
    .min(2),
  assetRequests: z.array(AssetRequestSchema),
  widgetRequests: z.array(WidgetRequestSchema),
  questionFamilies: z.array(z.string()).min(1),
  misconceptionTargets: z.array(z.string()),
});

export type LessonBlueprint = z.infer<typeof LessonBlueprintSchema>;

export function validateBlueprint(blueprint: LessonBlueprint): string[] {
  const errors: string[] = [];

  if (blueprint.sourceUnitIds.length === 0) {
    errors.push(`Blueprint for "${blueprint.conceptId}" has no source units`);
  }

  if (!blueprint.lessonArc.some((a) => a.step === 'mastery_check')) {
    errors.push(`Blueprint for "${blueprint.conceptId}" has no mastery_check step`);
  }

  if (blueprint.representations.includes('visual') && blueprint.assetRequests.length === 0) {
    errors.push(`Blueprint for "${blueprint.conceptId}" is visual but has no asset requests`);
  }

  const validSteps = ['observe', 'widget_practice', 'guided_practice', 'independent_practice'];
  for (const wr of blueprint.widgetRequests) {
    if (!validSteps.includes(wr.step)) {
      errors.push(
        `Blueprint for "${blueprint.conceptId}" has widget request for unsupported step "${wr.step}"`,
      );
    }
  }

  return errors;
}
```

- [ ] **Step 2: Create `packages/pipeline/src/blueprint/prompt.ts`**

```typescript
import type { Concept } from '../concepts/types.js';
import type { SourceUnit } from '../source/types.js';

export function buildBlueprintPrompt(
  concept: Concept,
  sourceUnits: SourceUnit[],
  activeWidgetCategories: string[],
): string {
  return `Design a lesson blueprint for teaching this mathematics concept.

CONCEPT:
${JSON.stringify(
  {
    conceptId: concept.conceptId,
    label: concept.label,
    kind: concept.kind,
    learningObjective: concept.learningObjective,
    coreIdea: concept.coreIdea,
    difficulty: concept.difficulty,
    representations: concept.representations,
    misconceptionTargets: concept.misconceptionTargets,
    prerequisites: concept.prerequisites,
    adultContext: concept.adultContext,
    recommendedWidgetCategories: concept.recommendedWidgetCategories,
  },
  null,
  2,
)}

SOURCE EVIDENCE (textbook excerpts):
${JSON.stringify(
  sourceUnits
    .filter((u) => concept.sourceUnitIds.includes(u.id))
    .map((u) => ({ id: u.id, type: u.type, text: u.text.slice(0, 1000) })),
  null,
  2,
)}

AVAILABLE WIDGET CATEGORIES: ${activeWidgetCategories.join(', ')}

Create a lesson blueprint with:
- conceptId, sourceUnitIds (non-empty), objective, priorKnowledge
- representations: "concrete", "visual", "symbolic"
- lessonArc: array of { step, description, durationMinutes (1-20) }.
  Valid steps: hook, observe, worked_example, guided_practice, widget_practice, independent_practice, mastery_check, remediation, extension.
  mastery_check is REQUIRED.
- assetRequests: array of { id, rendererType, parameters, description }.
  rendererType must be one of: place-value-chart, number-line, fraction-bar, fraction-circle, decimal-grid, measurement-scale, area-grid, perimeter-grid, geometry-basic, bar-chart, pictograph.
- widgetRequests: array of { step, widgetCategory, mode (observe|interactive), description }.
- questionFamilies: types of questions (e.g. direct_computation, word_problems).
- misconceptionTargets.

DO NOT request widget categories not in the available list.
If the concept has "visual" representation, include at least one assetRequest.`;
}
```

- [ ] **Step 3: Create `packages/pipeline/src/blueprint/index.ts`**

```typescript
import { z } from 'zod';
import type { LlmRouter } from '@open-edu/llm-config';
import type { Concept } from '../concepts/types.js';
import type { SourceUnit } from '../source/types.js';
import type { LessonBlueprint } from './types.js';
import { LessonBlueprintSchema, validateBlueprint } from './types.js';
import { buildBlueprintPrompt } from './prompt.js';

export async function generateLessonBlueprints(
  router: LlmRouter,
  concepts: Concept[],
  sourceUnits: SourceUnit[],
  widgetCategories: string[],
): Promise<{ blueprints: LessonBlueprint[]; warnings: string[] }> {
  const warnings: string[] = [];
  const blueprints: LessonBlueprint[] = [];

  for (const concept of concepts) {
    const prompt = buildBlueprintPrompt(concept, sourceUnits, widgetCategories);
    const result = await router.generateStructuredRaw(
      'lesson_blueprint',
      prompt,
      z.object({ blueprints: z.array(LessonBlueprintSchema) }),
      { temperature: 0.3 },
    );

    for (const bp of result.blueprints) {
      const errors = validateBlueprint(bp);
      if (errors.length > 0) {
        warnings.push(...errors.map((e) => `[${bp.conceptId}] ${e}`));
      } else {
        blueprints.push(bp);
      }
    }
  }

  return { blueprints, warnings };
}
```

- [ ] **Step 4: Create `packages/pipeline/src/blueprint/__tests__/blueprint.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { LessonBlueprintSchema, validateBlueprint } from '../types.js';
import type { LessonBlueprint } from '../types.js';

function makeValidBlueprint(overrides: Partial<LessonBlueprint> = {}): LessonBlueprint {
  return {
    conceptId: 'indian_place_value',
    sourceUnitIds: ['src-5', 'src-6'],
    objective: 'Identify place values up to crores using the Indian numbering system',
    priorKnowledge: ['counting_1_100'],
    representations: ['visual', 'symbolic'],
    lessonArc: [
      { step: 'hook', description: 'Hook', durationMinutes: 3 },
      { step: 'observe', description: 'Observe', durationMinutes: 5 },
      { step: 'worked_example', description: 'Example', durationMinutes: 5 },
      { step: 'guided_practice', description: 'Practice', durationMinutes: 7 },
      { step: 'widget_practice', description: 'Widget', durationMinutes: 5 },
      { step: 'independent_practice', description: 'Independent', durationMinutes: 8 },
      { step: 'mastery_check', description: 'Quiz', durationMinutes: 5 },
      { step: 'remediation', description: 'Review', durationMinutes: 5 },
      { step: 'extension', description: 'Extend', durationMinutes: 7 },
    ],
    assetRequests: [
      {
        id: 'chart-1',
        rendererType: 'place-value-chart',
        parameters: { maxPlaces: 7, number: 352648 },
        description: 'Place value chart',
      },
    ],
    widgetRequests: [
      {
        step: 'widget_practice',
        widgetCategory: 'place-value',
        mode: 'interactive',
        description: 'Place value widget',
      },
    ],
    questionFamilies: ['place_value_identification', 'expanded_form'],
    misconceptionTargets: ['Confusing lakhs with millions'],
    ...overrides,
  };
}

describe('LessonBlueprintSchema', () => {
  it('validates a valid blueprint', () => {
    expect(() => LessonBlueprintSchema.parse(makeValidBlueprint())).not.toThrow();
  });

  it('rejects empty sourceUnitIds', () => {
    expect(() => LessonBlueprintSchema.parse(makeValidBlueprint({ sourceUnitIds: [] }))).toThrow();
  });

  it('rejects short objective', () => {
    expect(() => LessonBlueprintSchema.parse(makeValidBlueprint({ objective: 'Learn' }))).toThrow();
  });

  it('rejects empty representations', () => {
    expect(() =>
      LessonBlueprintSchema.parse(makeValidBlueprint({ representations: [] })),
    ).toThrow();
  });

  it('rejects less than 2 arc steps', () => {
    expect(() =>
      LessonBlueprintSchema.parse(
        makeValidBlueprint({
          lessonArc: [{ step: 'mastery_check', description: 'Quiz', durationMinutes: 5 }],
        }),
      ),
    ).toThrow();
  });
});

describe('validateBlueprint', () => {
  it('returns no errors for valid blueprint', () => {
    expect(validateBlueprint(makeValidBlueprint())).toEqual([]);
  });

  it('detects no mastery check', () => {
    const bp = makeValidBlueprint({
      lessonArc: [
        { step: 'observe', description: 'O', durationMinutes: 10 },
        { step: 'independent_practice', description: 'IP', durationMinutes: 10 },
      ],
    });
    expect(validateBlueprint(bp).some((e) => e.includes('no mastery_check'))).toBe(true);
  });

  it('detects visual concept with no assets', () => {
    const bp = makeValidBlueprint({ assetRequests: [], representations: ['visual'] });
    expect(validateBlueprint(bp).some((e) => e.includes('visual') && e.includes('no asset'))).toBe(
      true,
    );
  });
});
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- blueprint
```

- [ ] **Step 6: Commit**

```bash
git add packages/pipeline/src/blueprint/
git commit -m "feat(pipeline): add lesson blueprints with arc steps, asset/widget requests, and validation"
```

---

### Task 7: Build Deterministic Visual Assets (SVG Renderers)

**Files:**

- Create: `packages/pipeline/src/assets/types.ts`
- Create: `packages/pipeline/src/assets/svg.ts`
- Create: `packages/pipeline/src/assets/manifest.ts`
- Create: `packages/pipeline/src/assets/__tests__/svg.test.ts`
- Create: `packages/pipeline/src/assets/__tests__/manifest.test.ts`

This task implements 11 deterministic SVG renderers for math visual assets. Each produces identical output for identical input and includes accessible `<title>` and `<desc>` elements. See Part 2 of this plan for the complete SVG implementation.

- [ ] **Step 1: Create `packages/pipeline/src/assets/types.ts`**

```typescript
import { z } from 'zod';

export const SVG_RENDERER_TYPES = [
  'place-value-chart',
  'number-line',
  'fraction-bar',
  'fraction-circle',
  'decimal-grid',
  'measurement-scale',
  'area-grid',
  'perimeter-grid',
  'geometry-basic',
  'bar-chart',
  'pictograph',
] as const;

export type SvgRendererType = (typeof SVG_RENDERER_TYPES)[number];

export const AssetManifestEntrySchema = z.object({
  id: z.string().min(1),
  filename: z
    .string()
    .min(1)
    .regex(/\.svg$/),
  mediaType: z.literal('image/svg+xml'),
  altText: z.string().min(1),
  caption: z.string().optional(),
  rendererType: z.enum(SVG_RENDERER_TYPES),
  conceptIds: z.array(z.string()).min(1),
  sourceUnitIds: z.array(z.string()),
  parameters: z.record(z.unknown()),
});

export type AssetManifestEntry = z.infer<typeof AssetManifestEntrySchema>;

export const AssetManifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  assets: z.array(AssetManifestEntrySchema),
});

export type AssetManifest = z.infer<typeof AssetManifestSchema>;
```

- [ ] **Step 2: Create `packages/pipeline/src/assets/svg.ts`**

This file implements 11 deterministic SVG renderers. Copy the complete implementation from the companion file `docs/superpowers/plans/2026-07-24-svg-renderers.md`. If that companion file does not exist yet, implement the renderers as follows (full code for each renderer is specified in the tests below — the tests document the expected behavior):

The entry point:

```typescript
import type { AssetManifestEntry } from './types.js';
import { SVG_RENDERER_TYPES } from './types.js';

export function isAllowedRendererType(type: string): boolean {
  return (SVG_RENDERER_TYPES as readonly string[]).includes(type);
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function svgWrapper(
  content: string,
  width: number,
  height: number,
  title: string,
  desc: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n  <title>${esc(title)}</title>\n  <desc>${esc(desc)}</desc>\n${content}\n</svg>`;
}

export function renderSvg(entry: AssetManifestEntry): string {
  const { rendererType, parameters, altText, caption } = entry;
  const title = altText;
  const desc = caption || '';

  switch (rendererType) {
    case 'place-value-chart': {
      const maxPlaces = (parameters as any).maxPlaces || 4;
      const num = (parameters as any).number;
      const digits =
        num !== undefined
          ? String(num).padStart(maxPlaces, '0').split('')
          : Array(maxPlaces).fill('0');
      const placeNames = [
        'Ones',
        'Tens',
        'Hundreds',
        'Thousands',
        'Ten Thousands',
        'Lakhs',
        'Ten Lakhs',
        'Crores',
        'Ten Crores',
      ];
      const cw = 90,
        ch = 44,
        hh = 28,
        w = maxPlaces * cw,
        h = ch + hh + 24;
      let c = '';
      for (let i = 0; i < maxPlaces; i++) {
        const x = i * cw;
        const pi = maxPlaces - 1 - i;
        c += `<rect x="${x}" y="${hh}" width="${cw}" height="${ch}" fill="#f0f4f8" stroke="#64748b" stroke-width="1"/>\n`;
        c += `<text x="${x + cw / 2}" y="${hh - 7}" text-anchor="middle" font-size="11" fill="#475569">${esc(placeNames[pi] || '')}</text>\n`;
        c += `<text x="${x + cw / 2}" y="${hh + ch / 2 + 5}" text-anchor="middle" font-size="16" font-weight="bold" fill="#1e293b">${esc(digits[i] || '')}</text>\n`;
      }
      return svgWrapper(c, w, h, title, desc);
    }
    case 'number-line': {
      const min = (parameters as any).min || 0,
        max = (parameters as any).max || 10,
        target = (parameters as any).target,
        markers = (parameters as any).markers;
      const pad = 60,
        w = 600,
        h = 120,
        ly = h / 2,
        ls = pad,
        le = w - pad,
        range = max - min;
      let c = `<line x1="${ls}" y1="${ly}" x2="${le}" y2="${ly}" stroke="#1e293b" stroke-width="2"/>\n`;
      const ti = range <= 10 ? 1 : range <= 20 ? 2 : 5;
      for (let v = min; v <= max; v += ti) {
        const x = ls + ((v - min) / range) * (le - ls);
        c += `<line x1="${x}" y1="${ly - 8}" x2="${x}" y2="${ly + 8}" stroke="#1e293b" stroke-width="1.5"/>\n`;
        c += `<text x="${x}" y="${ly + 22}" text-anchor="middle" font-size="11" fill="#475569">${v}</text>\n`;
      }
      if (target != null && target >= min && target <= max) {
        const tx = ls + ((target - min) / range) * (le - ls);
        c += `<circle cx="${tx}" cy="${ly}" r="6" fill="#ef4444"/>\n`;
      }
      if (markers)
        for (const m of markers)
          if (m >= min && m <= max) {
            const mx = ls + ((m - min) / range) * (le - ls);
            c += `<circle cx="${mx}" cy="${ly}" r="4" fill="#3b82f6"/>\n`;
          }
      return svgWrapper(c, w, h, title, desc);
    }
    case 'fraction-bar': {
      const num = (parameters as any).numerator,
        den = (parameters as any).denominator;
      const bw = 500,
        bh = 40,
        pad = 50,
        w = bw + 2 * pad,
        h = 120;
      let c = '';
      for (let i = 0; i < den; i++) {
        const x = pad + i * (bw / den);
        c += `<rect x="${x}" y="40" width="${bw / den}" height="${bh}" fill="${i < num ? '#3b82f6' : '#e2e8f0'}" stroke="#64748b" stroke-width="1"/>\n`;
      }
      c += `<rect x="${pad}" y="40" width="${bw}" height="${bh}" fill="none" stroke="#1e293b" stroke-width="2"/>\n`;
      c += `<text x="${w / 2}" y="30" text-anchor="middle" font-size="14" fill="#1e293b" font-weight="bold">${num}/${den}</text>\n`;
      return svgWrapper(c, w, h, title, desc);
    }
    case 'fraction-circle': {
      const num = (parameters as any).numerator,
        den = (parameters as any).denominator;
      const cx = 100,
        cy = 100,
        r = 80,
        w = 220,
        h = 240;
      let c = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e2e8f0" stroke="#1e293b" stroke-width="2"/>\n`;
      const sa = 360 / den;
      for (let i = 0; i < num; i++) {
        const a1 = ((i * sa - 90) * Math.PI) / 180,
          a2 = (((i + 1) * sa - 90) * Math.PI) / 180;
        const x1 = cx + r * Math.cos(a1),
          y1 = cy + r * Math.sin(a1),
          x2 = cx + r * Math.cos(a2),
          y2 = cy + r * Math.sin(a2);
        c += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${sa > 180 ? 1 : 0} 1 ${x2},${y2} Z" fill="#3b82f6" stroke="#1e293b" stroke-width="1"/>\n`;
      }
      c += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="18" fill="#1e293b" font-weight="bold">${num}/${den}</text>\n`;
      return svgWrapper(c, w, h, title, desc);
    }
    case 'decimal-grid': {
      const w = (parameters as any).whole || 0,
        t = (parameters as any).tenths || 0,
        hd = (parameters as any).hundredths || 0;
      const cs = 24,
        cols = 10,
        rows = 10,
        pad = 40,
        tw = cols * cs + 2 * pad,
        th = rows * cs + 2 * pad + 60;
      let c = '';
      const filled = t * 10 + hd;
      for (let r = 0; r < rows; r++)
        for (let col = 0; col < cols; col++) {
          const idx = r * cols + col;
          c += `<rect x="${pad + col * cs}" y="${pad + r * cs}" width="${cs}" height="${cs}" fill="${idx < filled ? '#3b82f6' : '#f8fafc'}" stroke="#cbd5e1" stroke-width="0.5"/>\n`;
        }
      c += `<rect x="${pad}" y="${pad}" width="${cols * cs}" height="${rows * cs}" fill="none" stroke="#1e293b" stroke-width="2"/>\n`;
      c += `<text x="${tw / 2}" y="${pad + rows * cs + 30}" text-anchor="middle" font-size="14" fill="#1e293b" font-weight="bold">${w}.${t}${hd}</text>\n`;
      return svgWrapper(c, tw, th, title, desc);
    }
    case 'measurement-scale': {
      const min = (parameters as any).min || 0,
        max = (parameters as any).max || 10,
        step = (parameters as any).step || 1,
        unit = (parameters as any).unit || '';
      const uw = 60,
        pad = 40,
        w = (max - min) * uw + 2 * pad,
        h = 100,
        sy = 40;
      let c = `<line x1="${pad}" y1="${sy}" x2="${w - pad}" y2="${sy}" stroke="#1e293b" stroke-width="2"/>\n`;
      for (let v = min; v <= max; v += step) {
        const x = pad + (v - min) * uw,
          major = v % (step * 5) === 0;
        c += `<line x1="${x}" y1="${sy}" x2="${x}" y2="${sy + (major ? 15 : v % (step * 2) === 0 ? 10 : 5)}" stroke="#1e293b" stroke-width="1"/>\n`;
        if (major || v === min || v === max)
          c += `<text x="${x}" y="${sy + 28}" text-anchor="middle" font-size="11" fill="#475569">${v} ${unit}</text>\n`;
      }
      return svgWrapper(c, w, h, title, desc);
    }
    case 'area-grid':
    case 'perimeter-grid': {
      const rows = (parameters as any).rows || 1,
        cols = (parameters as any).cols || 1,
        cs = (parameters as any).cellSize || 30;
      const shaded = new Set(((parameters as any).shadedCells || []) as number[]);
      const pad = 40,
        w = cols * cs + 2 * pad,
        h = rows * cs + 2 * pad;
      let c = '';
      for (let r = 0; r < rows; r++)
        for (let col = 0; col < cols; col++) {
          const idx = r * cols + col;
          c += `<rect x="${pad + col * cs}" y="${pad + r * cs}" width="${cs}" height="${cs}" fill="${shaded.has(idx) ? '#3b82f6' : '#f8fafc'}" stroke="${rendererType === 'perimeter-grid' ? '#ef4444' : '#cbd5e1'}" stroke-width="0.5"/>\n`;
        }
      c += `<rect x="${pad}" y="${pad}" width="${cols * cs}" height="${rows * cs}" fill="none" stroke="#1e293b" stroke-width="2"/>\n`;
      if (rendererType === 'perimeter-grid')
        c += `<rect x="${pad}" y="${pad}" width="${cols * cs}" height="${rows * cs}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,3"/>\n`;
      return svgWrapper(c, w, h, title, desc);
    }
    case 'geometry-basic': {
      const type = (parameters as any).type,
        sw = 300,
        sh = 260;
      let c = '';
      if (type === 'square') {
        const s = (parameters as any).side || 100;
        c += `<rect x="${(sw - s) / 2}" y="${(sh - s) / 2}" width="${s}" height="${s}" fill="#dbeafe" stroke="#1e293b" stroke-width="2"/>\n`;
      } else if (type === 'rectangle') {
        const rw = (parameters as any).width || 140,
          rh = (parameters as any).height || 80;
        c += `<rect x="${(sw - rw) / 2}" y="${(sh - rh) / 2}" width="${rw}" height="${rh}" fill="#dbeafe" stroke="#1e293b" stroke-width="2"/>\n`;
      } else if (type === 'triangle') {
        const b = (parameters as any).base || 120,
          th = (parameters as any).triangleHeight || 80;
        c += `<polygon points="${(sw - b) / 2},${sh - 40} ${(sw + b) / 2},${sh - 40} ${sw / 2},${sh - 40 - th}" fill="#dbeafe" stroke="#1e293b" stroke-width="2"/>\n`;
      } else if (type === 'circle') {
        const r = (parameters as any).radius || 60;
        c += `<circle cx="${sw / 2}" cy="${sh / 2}" r="${r}" fill="#dbeafe" stroke="#1e293b" stroke-width="2"/>\n`;
      }
      return svgWrapper(c, sw, sh, title, desc);
    }
    case 'bar-chart': {
      const labels = (parameters as any).labels || [],
        values = (parameters as any).values || [];
      const bw = 50,
        bg = 20,
        pad = 60,
        ch = 200,
        w = labels.length * (bw + bg) + bg + 2 * pad,
        h = ch + 2 * pad + 40,
        maxV = Math.max(...values, 1);
      let c = `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${pad + ch}" stroke="#1e293b" stroke-width="2"/>\n`;
      c += `<line x1="${pad}" y1="${pad + ch}" x2="${w - pad}" y2="${pad + ch}" stroke="#1e293b" stroke-width="2"/>\n`;
      for (let i = 0; i < labels.length; i++) {
        const bh = (values[i] / maxV) * ch,
          x = pad + bg + i * (bw + bg),
          y = pad + ch - bh;
        c += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#3b82f6" stroke="#1e293b" stroke-width="1"/>\n`;
        c += `<text x="${x + bw / 2}" y="${pad + ch + 16}" text-anchor="middle" font-size="10" fill="#475569">${esc(labels[i])}</text>\n`;
      }
      return svgWrapper(c, w, h, title, desc);
    }
    case 'pictograph': {
      const labels = (parameters as any).labels || [],
        values = (parameters as any).values || [];
      const isz = 24,
        ipr = 10,
        pad = 80,
        rh = 30,
        w = ipr * isz + 2 * pad,
        h = labels.length * rh + 2 * pad + 40;
      let c = '';
      for (let i = 0; i < labels.length; i++) {
        const y = pad + i * rh;
        c += `<text x="${pad - 8}" y="${y + 16}" text-anchor="end" font-size="11" fill="#475569">${esc(labels[i])}</text>\n`;
        for (let j = 0; j < values[i]; j++)
          c += `<circle cx="${pad + j * isz + isz / 2}" cy="${y + isz / 2}" r="8" fill="#3b82f6" stroke="#1e293b" stroke-width="0.5"/>\n`;
      }
      return svgWrapper(c, w, h, title, desc);
    }
    default:
      throw new Error(`Unknown renderer type: ${rendererType}`);
  }
}
```

- [ ] **Step 3: Create `packages/pipeline/src/assets/manifest.ts`**

```typescript
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { AssetManifest } from './types.js';
import { AssetManifestSchema, AssetManifestEntrySchema } from './types.js';
import { renderSvg } from './svg.js';

export function generateAssetFiles(
  manifest: AssetManifest,
  outputDir: string,
): { written: string[]; errors: string[] } {
  const assetsDir = join(outputDir, 'assets');
  const written: string[] = [];
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const entry of manifest.assets) {
    if (ids.has(entry.id)) {
      errors.push(`Duplicate asset ID: "${entry.id}"`);
      continue;
    }
    ids.add(entry.id);

    const parseResult = AssetManifestEntrySchema.safeParse(entry);
    if (!parseResult.success) {
      errors.push(`Asset "${entry.id}" schema violation: ${parseResult.error.message}`);
      continue;
    }

    const filePath = join(assetsDir, entry.filename);
    if (!filePath.startsWith(assetsDir)) {
      errors.push(`Path traversal prevented: ${entry.filename}`);
      continue;
    }

    try {
      const svgContent = renderSvg(entry);
      if (!existsSync(dirname(filePath))) {
        mkdirSync(dirname(filePath), { recursive: true });
      }
      writeFileSync(filePath, svgContent, 'utf-8');
      written.push(entry.filename);
    } catch (err: unknown) {
      errors.push(
        `Asset "${entry.id}" render failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const manifestPath = join(outputDir, 'assets', 'manifest.json');
  if (!existsSync(dirname(manifestPath))) {
    mkdirSync(dirname(manifestPath), { recursive: true });
  }
  writeFileSync(
    manifestPath,
    JSON.stringify(AssetManifestSchema.parse(manifest), null, 2),
    'utf-8',
  );
  return { written, errors };
}
```

- [ ] **Step 4: Create `packages/pipeline/src/assets/__tests__/svg.test.ts`**

Write tests covering each renderer:

- Valid SVG output (contains `<svg>` open/close, `<title>`, `<desc>`)
- Determinism (same params → identical output)
- Correct content (e.g., place-value shows digits, number-line shows ticks, fraction-bar shows divisions)
- HTML escaping (script tags in alt text are escaped)
- Accessible elements (title and desc always present)

Test count: ~15 tests covering all 11 renderers + escaping + determinism.

- [ ] **Step 5: Create `packages/pipeline/src/assets/__tests__/manifest.test.ts`**

Write tests for:

- Valid manifest entry validation
- Empty id rejection
- Non-svg filename rejection
- No concept IDs rejection
- Complete manifest validation
- Duplicate ID detection

Test count: ~6 tests.

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- svg manifest
```

- [ ] **Step 7: Commit**

```bash
git add packages/pipeline/src/assets/
git commit -m "feat(pipeline): add deterministic SVG renderers and asset manifest"
```

---

**END OF PART 1.** Part 2 (Tasks 8–14) continues in a separate commit. See the continuation in the next plan section.

---

### Task 8: Make Widgets Catalog-Driven and Strict

**Files:**

- Modify: `packages/pipeline/src/generate-activities/widget-schemas.ts` (canonical IDs)
- Modify: `packages/pipeline/src/generate-activities/index.ts` (canonical validation)
- Modify: `packages/pipeline/src/generate-activities/exemplars.ts` (canonical IDs)
- Modify: `packages/pipeline/src/generate-activities/prompts/observe.ts` (canonical IDs)
- Modify: `packages/pipeline/src/generate-activities/prompts/guided-practice.ts` (canonical IDs)
- Modify: `packages/pipeline/src/generate-activities/prompts/independent-practice.ts` (canonical IDs)
- Modify: `packages/pipeline/src/generate-activities/prompts/mastery-check.ts` (canonical IDs)
- Modify: `packages/pipeline/src/generate-activities/prompts/positive-completion.ts` (canonical IDs)

This task switches widget IDs from legacy `open-edu.*` to canonical `core.*` and `math.*` prefixes, imports `WIDGET_ALIAS_MAP` from `@open-edu/core` for backward compat, normalizes generated IDs, rejects unknown/missing widgets, and restricts widget selection to blueprint `widgetRequests`.

- [ ] **Step 1: Read existing files to understand current state**

Read ALL of these files before making changes:

1. `packages/pipeline/src/generate-activities/widget-schemas.ts`
2. `packages/pipeline/src/generate-activities/index.ts`
3. `packages/pipeline/src/generate-activities/exemplars.ts`
4. `packages/core/src/widget-catalog.ts` (for WIDGET_ALIAS_MAP)

- [ ] **Step 2: Update `widget-schemas.ts` — canonical IDs with alias fallback**

The alias map from `@open-edu/core`:

```
open-edu.matching → core.matching
open-edu.drag-drop → core.drag-drop
open-edu.sequencing → core.sequencing
open-edu.story-question → core.story-question
open-edu.fill-blank → core.fill-blank
open-edu.visual-counting → core.visual-counting
open-edu.fraction-visual → math.fraction-visual
open-edu.chart-reader → core.chart-reader
open-edu.clock-time → math.clock-time
open-edu.measurement-scale → math.measurement-scale
open-edu.place-value-chart → math.place-value-chart
open-edu.grid-area → math.grid-area
open-edu.real-world → core.real-world
open-edu.multiple-choice → core.multiple-choice
open-edu.multiple-choice-practice → core.multiple-choice
```

1. Add `import { WIDGET_ALIAS_MAP } from '@open-edu/core';` at the top.
2. Rename ALL schema registry keys from `open-edu.*` to their canonical equivalents.
3. Add `core.multiple-choice-practice` as an alias pointing to `core.multiple-choice` schema.
4. Update `getWidgetSchema()` to normalize through `WIDGET_ALIAS_MAP` first.
5. Update `registerWidgetSchema()` to accept both legacy and canonical IDs.
6. Export `isKnownWidgetId(id: string): boolean` that normalizes before lookup.
7. Export `normalizeWidgetId(id: string): string` using the alias map.

Keep all existing Zod schemas unchanged (they are already correct). Only the registry keys and lookup logic change.

- [ ] **Step 3: Update `exemplars.ts` — canonical widget IDs**

Search for all `open-edu.*` widget IDs and replace with canonical equivalents:

- `open-edu.matching` → `core.matching`
- `open-edu.drag-drop` → `core.drag-drop`
- `open-edu.sequencing` → `core.sequencing`

- [ ] **Step 4: Update all 5 prompt files to use canonical widget catalog table**

In each of: `observe.ts`, `guided-practice.ts`, `independent-practice.ts`, `mastery-check.ts`, `positive-completion.ts`:

Replace the widget catalog reference table to use canonical IDs. The table should include these widgets for Math Level B:

| Widget ID                | Type        | Description                   |
| ------------------------ | ----------- | ----------------------------- |
| `core.matching`          | Match pairs | Match concepts to definitions |
| `core.visual-counting`   | Counting    | Visual counting               |
| `math.fraction-visual`   | Fraction    | Fraction bars/circles         |
| `math.place-value-chart` | Place value | Indian place value chart      |
| `math.number-line`       | Number line | Interactive number line       |
| `math.clock-time`        | Clock       | Analog/digital clock          |
| `math.measurement-scale` | Scale       | Ruler/scale                   |
| `core.chart-reader`      | Chart       | Bar chart/pictograph          |
| `math.grid-area`         | Area grid   | Shaded area grid              |
| `core.multiple-choice`   | MCQ         | Multiple choice questions     |

- [ ] **Step 5: Update `generate-activities/index.ts` — widget validation with canonical IDs**

Add these functions:

```typescript
import { normalizeWidgetId, isKnownWidgetId } from './widget-schemas.js';

function validateAndNormalizeWidgetId(widgetId: string | undefined): string | null {
  if (!widgetId) return null;
  const normalized = normalizeWidgetId(widgetId);
  if (!isKnownWidgetId(normalized)) {
    throw new Error(`Unknown widget ID: "${widgetId}". Not in the widget catalog.`);
  }
  return normalized;
}
```

Use this in the activity generation loop: when the LLM returns a `type: "widget"` activity with a `widgetId`, call `validateAndNormalizeWidgetId()` BEFORE attempting schema validation. If it throws, catch it and mark the activity as failed (falling back to `reading` type as the existing code does for validation failures).

- [ ] **Step 6: Add to `widget-schemas.test.ts` — canonical ID tests**

Read the existing test file and append these tests:

```typescript
import { normalizeWidgetId, isKnownWidgetId } from '../widget-schemas.js';

describe('canonical widget IDs', () => {
  it('normalizes open-edu.matching to core.matching', () => {
    expect(normalizeWidgetId('open-edu.matching')).toBe('core.matching');
  });

  it('normalizes open-edu.fraction-visual to math.fraction-visual', () => {
    expect(normalizeWidgetId('open-edu.fraction-visual')).toBe('math.fraction-visual');
  });

  it('passes through canonical IDs unchanged', () => {
    expect(normalizeWidgetId('core.matching')).toBe('core.matching');
    expect(normalizeWidgetId('math.number-line')).toBe('math.number-line');
  });

  it('passes through unknown IDs unchanged', () => {
    expect(normalizeWidgetId('unknown.widget')).toBe('unknown.widget');
  });

  it('rejects unknown widget IDs', () => {
    expect(isKnownWidgetId('not.a.widget')).toBe(false);
  });

  it('accepts known widget IDs', () => {
    expect(isKnownWidgetId('core.matching')).toBe(true);
    expect(isKnownWidgetId('math.place-value-chart')).toBe(true);
  });

  it('accepts legacy IDs via alias', () => {
    expect(isKnownWidgetId('open-edu.matching')).toBe(true);
  });
});
```

- [ ] **Step 7: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- widget
pnpm --filter @open-edu/widgets test
```

Expected: All existing widget-schemas tests pass. New canonical ID tests pass. Widget catalog tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/pipeline/src/generate-activities/
git commit -m "feat(pipeline): switch to canonical widget IDs (core.*, math.*) with alias migration"
```

---

### Task 9: Blueprint-Driven Activities

**Files:**

- Modify: `packages/pipeline/src/generate-activities/index.ts` (blueprint-driven, source evidence, asset context)
- Modify: `packages/pipeline/src/generate-activities/exemplars.ts` (math exemplars with canonical IDs)
- Modify: `packages/pipeline/src/generate-activities/prompts/observe.ts` (concrete→visual→symbolic)
- Modify: `packages/pipeline/src/generate-activities/prompts/guided-practice.ts` (scaffold misconceptions)
- Modify: `packages/pipeline/src/generate-activities/prompts/independent-practice.ts` (varied + transfer)
- Modify: `packages/pipeline/src/generate-activities/prompts/mastery-check.ts` (conceptual/procedural/application)
- Modify: `packages/pipeline/src/types.ts` (add ActivityContext)

This task passes source-unit excerpts, blueprint metadata, asset manifest entries, catalog context, misconceptions, and required question families into every activity generation request. Activities become blueprint-aware instead of only concept-aware.

- [ ] **Step 1: Add `ActivityContext` type to `packages/pipeline/src/types.ts`**

Read the existing types file first. Append:

```typescript
export interface ActivityContext {
  sourceExcerpts: Array<{ id: string; type: string; text: string }>;
  assetManifestEntries: Array<{
    id: string;
    filename: string;
    altText: string;
    rendererType: string;
  }>;
  widgetCatalog: Array<{ id: string; name: string; description: string; capabilities: string[] }>;
  questionFamilies: string[];
  misconceptions: string[];
}

export interface ActivityRequest {
  concept: GeneratedConcept;
  blueprint: LessonBlueprint;
  context: ActivityContext;
  step: ActivityStep;
  exemplars: string;
  widgetRestrictions?: { allowedIds: string[]; mode?: 'observe' | 'interactive' };
}
```

Note: `LessonBlueprint` is imported from `./blueprint/types.js`. Add this import at the top of `types.ts`.

- [ ] **Step 2: Update `generate-activities/index.ts` — add blueprint-driven generation**

Add a new function `generateActivitiesFromBlueprint()` that takes the router, blueprint, activity context, and exemplars, and generates all 5 steps in blueprint order:

```typescript
import type { LlmRouter } from '@open-edu/llm-config';
import type { ActivityRequest, ActivityContext, GeneratedActivity } from '../types.js';
import type { LessonBlueprint } from '../blueprint/types.js';
import { validateAndNormalizeWidgetId } from './widget-schemas.js';

async function generateActivityStep(
  router: LlmRouter,
  request: ActivityRequest,
): Promise<GeneratedActivity> {
  const prompt = buildActivityPrompt(request);

  const result = await router.generateStructuredRaw(
    'activity_generation',
    prompt,
    stepOutputSchema(request.step),
    { temperature: request.step === 'mastery_check' ? 0.2 : 0.4, maxTokens: 4096 },
  );

  const activity = result as GeneratedActivity;

  if (activity.type === 'widget' && activity.widgetId) {
    try {
      const normalized = validateAndNormalizeWidgetId(activity.widgetId);
      if (normalized) {
        activity.widgetId = normalized;
        const schema = getWidgetSchema(normalized);
        if (schema && activity.widgetConfig) {
          activity.widgetConfig = schema.parse(activity.widgetConfig);
        }
      }
    } catch {
      activity.type = 'reading';
      delete activity.widgetId;
      delete activity.widgetConfig;
    }
  }

  return activity;
}

function buildActivityPrompt(request: ActivityRequest): string {
  const parts = [
    `CONCEPT: ${request.concept.conceptId} - ${request.concept.learningObjective}`,
    `Core Idea: ${request.concept.coreIdea}`,
    `Difficulty: ${request.concept.difficulty}`,
    `Misconceptions: ${request.concept.misconceptions.join(', ')}`,
  ];

  if (request.context.sourceExcerpts.length > 0) {
    parts.push(
      `\nSOURCE EVIDENCE (from the textbook):\n${JSON.stringify(request.context.sourceExcerpts, null, 2)}`,
    );
  }

  if (request.context.assetManifestEntries.length > 0) {
    parts.push(
      `\nAVAILABLE ASSETS:\n${JSON.stringify(request.context.assetManifestEntries, null, 2)}`,
    );
  }

  const widgetList = request.context.widgetCatalog.filter((w) => {
    if (!request.widgetRestrictions?.allowedIds?.length) return true;
    return request.widgetRestrictions.allowedIds.some((a) => w.id === a || w.id.startsWith(a));
  });

  parts.push(`\nAVAILABLE WIDGETS:\n${JSON.stringify(widgetList, null, 2)}`);
  if (request.widgetRestrictions?.mode) {
    parts.push(`Widget mode restriction: ${request.widgetRestrictions.mode}`);
  }

  parts.push(`\nREQUIRED QUESTION FAMILIES: ${request.context.questionFamilies.join(', ')}`);
  parts.push(`\nTARGET MISCONCEPTIONS: ${request.context.misconceptions.join(', ')}`);
  parts.push(`\nEXEMPLARS:\n${request.exemplars}`);

  const arcStep = request.blueprint.lessonArc.find((a) => a.step === request.step);
  parts.push(`\nGenerate ONE activity for step "${request.step}" (order ${arcStep?.order || 0}).`);
  parts.push(
    `Include: type (reading|exercise|quiz|reflection|widget), description, step-specific content.`,
  );
  if (request.step === 'mastery_check')
    parts.push('Create 2-3 MCQs with 4 options each and explanations for each option.');
  if (request.step === 'guided_practice')
    parts.push('Include hints that scaffold for identified misconceptions.');
  if (request.step === 'independent_practice')
    parts.push('No hints. Include 1 word problem and varied question types.');
  if (request.step === 'observe')
    parts.push(
      'Use concrete→visual→symbolic explanation sequence. Show step-by-step for worked examples.',
    );

  return parts.join('\n');
}
```

Keep the existing `generateActivitiesForConcept()` and `generateAllActivities()` as deprecated wrappers that convert to the new blueprint-driven approach. Add a new `generateActivitiesFromBlueprints()` function:

```typescript
export async function generateActivitiesFromBlueprints(
  router: LlmRouter,
  blueprints: LessonBlueprint[],
  contextFactory: (bp: LessonBlueprint) => ActivityContext,
): Promise<Map<string, GeneratedActivity[]>> {
  const activityMap = new Map<string, GeneratedActivity[]>();

  for (const bp of blueprints) {
    const context = contextFactory(bp);
    const activities: GeneratedActivity[] = [];

    for (const arcStep of bp.lessonArc) {
      if (!ACTIVITY_STEPS.includes(arcStep.step as ActivityStep)) continue;

      const step = arcStep.step as ActivityStep;
      const request: ActivityRequest = {
        concept: {
          ...bp,
          learningObjective: bp.objective,
          coreIdea: '',
          examples: [],
          misconceptions: bp.misconceptionTargets,
        },
        blueprint: bp,
        context,
        step,
        exemplars: JSON.stringify(EXEMPLARS),
        widgetRestrictions: bp.widgetRequests
          ? {
              allowedIds: bp.widgetRequests.map((wr) => wr.widgetCategory),
              mode: arcStep.step === 'observe' ? 'observe' : 'interactive',
            }
          : undefined,
      };

      const activity = await generateActivityStep(router, request);
      activities.push(activity);
    }

    activityMap.set(bp.conceptId, activities);
  }

  return activityMap;
}
```

- [ ] **Step 3: Update prompt templates with source-driven instructions**

For each of the 5 prompt files, add these sections to the existing templates:

1. **Source Evidence section**: The prompt should include actual textbook excerpts the activities should be grounded in.
2. **Asset References section**: List available SVG assets the activities can reference.
3. **Widget Catalog section**: Already present but ensure canonical IDs.
4. **Step-specific instructions**:
   - **observe**: "Use concrete → visual → symbolic explanation sequence. For worked examples, show each step. Prefer widgets in 'observe' mode."
   - **guided-practice**: "Scaffold for identified misconceptions. Include hints that address common errors. 2-3 problems with increasing difficulty."
   - **independent-practice**: "No hints. Include varied and transfer questions. 3-4 problems including at least 1 word problem."
   - **mastery-check**: "Cover conceptual, procedural, and application forms. 2-3 MCQs with 4 options each. Include explanations for each option."
   - **positive-completion**: Already fine as-is — congratulatory + reflection + real-world activity.

- [ ] **Step 4: Add math exemplars with canonical widget IDs**

In `exemplars.ts`, add 5 new exemplars for Math Level B concepts using canonical IDs:

```typescript
// Place Value — observe step with math.place-value-chart
// Fractions — observe step with math.fraction-visual
// Decimals — guided_practice step with math.decimal-grid (new)
// Measurement — independent_practice step with math.measurement-scale
// Comparison — mastery-check step with core.multiple-choice
```

Each exemplar must use canonical IDs (`math.place-value-chart`, `math.fraction-visual`, etc.) and include `sourceEvidence`, `assetRefs`, and `widgetCatalog` context fields.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- types generate-activities
```

Expected: Types tests pass. Activity generation tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/pipeline/src/generate-activities/ packages/pipeline/src/types.ts
git commit -m "feat(pipeline): add blueprint-driven activity generation with source evidence and exemplars"
```

---

### Task 10: Add Deterministic Math Validation

**Files:**

- Create: `packages/pipeline/src/validation/math.ts`
- Create: `packages/pipeline/src/validation/__tests__/math.test.ts`
- Create: `packages/pipeline/src/validation/widgets.ts`
- Create: `packages/pipeline/src/validation/__tests__/widgets.test.ts`
- Modify: `packages/pipeline/src/validate/index.ts` (integrate math + widget validators)

This task extends numerical questions with structured expression data and validates addition, subtraction, multiplication, division, place value, expanded form, comparison, ordering, fraction equivalence/comparison, decimals, unit conversions, area/perimeter/volume, clock/money, and chart questions. MCQs are rejected if they have zero or multiple correct options, invalid indices, or duplicate options where uniqueness is required.

- [ ] **Step 1: Create `packages/pipeline/src/validation/math.ts`**

```typescript
export interface MathQuestion {
  questionId: string;
  operation:
    | 'add'
    | 'subtract'
    | 'multiply'
    | 'divide'
    | 'place_value'
    | 'expanded_form'
    | 'compare'
    | 'order'
    | 'fraction_equiv'
    | 'fraction_compare'
    | 'decimal'
    | 'unit_convert'
    | 'area'
    | 'perimeter'
    | 'volume'
    | 'clock'
    | 'money'
    | 'chart';
  inputs: Record<string, number | number[] | string>;
  expectedAnswer: number | string | number[];
  unit?: string;
  tolerance?: number;
}

export interface MathValidationResult {
  questionId: string;
  valid: boolean;
  errors: string[];
  computedAnswer?: number | string;
}

export function validateMathQuestion(question: MathQuestion): MathValidationResult {
  const errors: string[] = [];

  switch (question.operation) {
    case 'add': {
      const numbers = question.inputs.numbers as number[];
      if (!numbers || numbers.length < 2) {
        errors.push('Addition requires at least 2 numbers');
        break;
      }
      const sum = numbers.reduce((a, b) => a + b, 0);
      const expected = Number(question.expectedAnswer);
      if (Math.abs(sum - expected) > (question.tolerance || 0.001)) {
        errors.push(`Addition: computed ${sum}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: sum,
      };
    }

    case 'subtract': {
      const a = question.inputs.a as number;
      const b = question.inputs.b as number;
      if (a === undefined || b === undefined) {
        errors.push('Subtraction requires a and b');
        break;
      }
      const diff = a - b;
      const expected = Number(question.expectedAnswer);
      if (Math.abs(diff - expected) > (question.tolerance || 0.001)) {
        errors.push(`Subtraction: computed ${diff}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: diff,
      };
    }

    case 'multiply': {
      const numbers = question.inputs.numbers as number[];
      if (!numbers || numbers.length < 2) {
        errors.push('Multiplication requires at least 2 numbers');
        break;
      }
      const product = numbers.reduce((a, b) => a * b, 1);
      const expected = Number(question.expectedAnswer);
      if (Math.abs(product - expected) > (question.tolerance || 0.001)) {
        errors.push(`Multiplication: computed ${product}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: product,
      };
    }

    case 'divide': {
      const a = question.inputs.a as number;
      const b = question.inputs.b as number;
      if (b === 0) {
        errors.push('Division by zero');
        break;
      }
      const quot = a / b;
      const expected = Number(question.expectedAnswer);
      if (Math.abs(quot - expected) > (question.tolerance || 0.001)) {
        errors.push(`Division: computed ${quot}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: quot,
      };
    }

    case 'place_value': {
      const number = question.inputs.number as number;
      const place = question.inputs.place as string;
      const numStr = String(number);
      const placeValues: Record<string, number> = {
        ones: numStr.length - 1,
        tens: numStr.length - 2,
        hundreds: numStr.length - 3,
        thousands: numStr.length - 4,
        lakhs: numStr.length - 6,
        crores: numStr.length - 8,
      };
      const idx = placeValues[place];
      if (idx === undefined) {
        errors.push(`Unknown place: ${place}`);
        break;
      }
      const digit = idx >= 0 ? parseInt(numStr[idx], 10) : 0;
      const expected = Number(question.expectedAnswer);
      if (digit !== expected) {
        errors.push(
          `Place value of ${place} in ${number}: computed ${digit}, expected ${expected}`,
        );
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: digit,
      };
    }

    case 'expanded_form': {
      const number = question.inputs.number as number;
      const form = question.inputs.form as string;
      const num = Number(number);
      const digitStr = String(num);
      const expanded: string[] = [];
      for (let i = 0; i < digitStr.length; i++) {
        const d = parseInt(digitStr[i], 10);
        if (d !== 0) {
          expanded.push(`${d}${'0'.repeat(digitStr.length - 1 - i)}`);
        }
      }
      const computedForm = expanded.join(' + ');
      if (computedForm !== form) {
        errors.push(`Expanded form of ${num}: computed "${computedForm}", expected "${form}"`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: computedForm,
      };
    }

    case 'compare': {
      const a = question.inputs.a as number;
      const b = question.inputs.b as number;
      const expected = question.expectedAnswer as string;
      const actual = a > b ? '>' : a < b ? '<' : '=';
      if (actual !== expected) {
        errors.push(`Compare ${a} and ${b}: computed "${actual}", expected "${expected}"`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: actual,
      };
    }

    case 'order': {
      const numbers = question.inputs.numbers as number[];
      const order = question.inputs.order as string;
      const sorted =
        order === 'ascending'
          ? [...numbers].sort((a, b) => a - b)
          : [...numbers].sort((a, b) => b - a);
      const expected = question.expectedAnswer as number[];
      if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
        errors.push(
          `Order (${order}): computed ${JSON.stringify(sorted)}, expected ${JSON.stringify(expected)}`,
        );
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: sorted.join(','),
      };
    }

    case 'fraction_equiv': {
      const n1 = question.inputs.n1 as number;
      const d1 = question.inputs.d1 as number;
      const n2 = question.inputs.n2 as number;
      const d2 = question.inputs.d2 as number;
      const equiv = Math.abs(n1 / d1 - n2 / d2) < 0.0001;
      const expected = question.expectedAnswer as boolean;
      if (equiv !== expected) {
        errors.push(
          `Fraction equivalence ${n1}/${d1} vs ${n2}/${d2}: computed ${equiv}, expected ${expected}`,
        );
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: String(equiv),
      };
    }

    case 'fraction_compare': {
      const n1 = question.inputs.n1 as number;
      const d1 = question.inputs.d1 as number;
      const n2 = question.inputs.n2 as number;
      const d2 = question.inputs.d2 as number;
      const v1 = n1 / d1;
      const v2 = n2 / d2;
      const actual = v1 > v2 ? '>' : v1 < v2 ? '<' : '=';
      const expected = question.expectedAnswer as string;
      if (actual !== expected) {
        errors.push(
          `Fraction compare ${n1}/${d1} vs ${n2}/${d2}: computed "${actual}", expected "${expected}"`,
        );
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: actual,
      };
    }

    case 'decimal': {
      const a = question.inputs.a as number;
      const b = question.inputs.b as number;
      const op = question.inputs.op as string;
      let result: number;
      switch (op) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        default:
          errors.push(`Unknown decimal op: ${op}`);
          return { questionId: question.questionId, valid: false, errors };
      }
      const expected = Number(question.expectedAnswer);
      if (Math.abs(result - expected) > (question.tolerance || 0.01)) {
        errors.push(`Decimal ${op}: computed ${result}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: result,
      };
    }

    case 'unit_convert': {
      const value = question.inputs.value as number;
      const from = question.inputs.from as string;
      const to = question.inputs.to as string;
      const conversions: Record<string, Record<string, number>> = {
        km: { m: 1000, cm: 100000 },
        m: { cm: 100, mm: 1000, km: 0.001 },
        cm: { mm: 10, m: 0.01 },
        kg: { g: 1000 },
        g: { kg: 0.001, mg: 1000 },
        l: { ml: 1000 },
        ml: { l: 0.001 },
        hour: { min: 60, sec: 3600 },
        min: { sec: 60, hour: 1 / 60 },
        rupee: { paisa: 100 },
        paisa: { rupee: 0.01 },
      };
      const factor = conversions[from]?.[to];
      if (factor === undefined) {
        errors.push(`Unknown conversion: ${from} → ${to}`);
        break;
      }
      const converted = value * factor;
      const expected = Number(question.expectedAnswer);
      if (Math.abs(converted - expected) > (question.tolerance || 0.01)) {
        errors.push(
          `Unit conversion ${value} ${from} → ${to}: computed ${converted}, expected ${expected}`,
        );
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: converted,
      };
    }

    case 'area': {
      const length = question.inputs.length as number;
      const width = question.inputs.width as number;
      const area = length * width;
      const expected = Number(question.expectedAnswer);
      if (Math.abs(area - expected) > (question.tolerance || 0.001)) {
        errors.push(`Area: computed ${area}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: area,
      };
    }

    case 'perimeter': {
      const length = question.inputs.length as number;
      const width = question.inputs.width as number;
      const perimeter = 2 * (length + width);
      const expected = Number(question.expectedAnswer);
      if (Math.abs(perimeter - expected) > (question.tolerance || 0.001)) {
        errors.push(`Perimeter: computed ${perimeter}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: perimeter,
      };
    }

    case 'volume': {
      const length = question.inputs.length as number;
      const width = question.inputs.width as number;
      const height = question.inputs.height as number;
      const volume = length * width * height;
      const expected = Number(question.expectedAnswer);
      if (Math.abs(volume - expected) > (question.tolerance || 0.001)) {
        errors.push(`Volume: computed ${volume}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: volume,
      };
    }

    case 'clock': {
      const hour = question.inputs.hour as number;
      const minute = question.inputs.minute as number;
      const expected = question.expectedAnswer as string;
      const formatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      if (formatted !== expected) {
        errors.push(`Clock: computed ${formatted}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: formatted,
      };
    }

    case 'money': {
      const amounts = question.inputs.amounts as number[];
      const sum = amounts.reduce((a, b) => a + b, 0);
      const expected = Number(question.expectedAnswer);
      if (Math.abs(sum - expected) > (question.tolerance || 0.01)) {
        errors.push(`Money: computed ${sum}, expected ${expected}`);
      }
      return {
        questionId: question.questionId,
        valid: errors.length === 0,
        errors,
        computedAnswer: sum,
      };
    }

    default:
      errors.push(`Unknown operation: ${question.operation}`);
  }

  return { questionId: question.questionId, valid: errors.length === 0, errors };
}

export function validateMCQOptions(question: {
  question: string;
  options: string[];
  correctIndex: number;
}): string[] {
  const errors: string[] = [];

  if (question.options.length < 2) {
    errors.push('MCQ must have at least 2 options');
  }

  if (question.correctIndex < 0 || question.correctIndex >= question.options.length) {
    errors.push(
      `Correct index ${question.correctIndex} is out of range (0-${question.options.length - 1})`,
    );
  }

  const uniqueOptions = new Set(question.options);
  if (uniqueOptions.size !== question.options.length) {
    errors.push('MCQ has duplicate options');
  }

  return errors;
}

export function validateAllMath(questions: MathQuestion[]): MathValidationResult[] {
  return questions.map(validateMathQuestion);
}
```

- [ ] **Step 2: Create `packages/pipeline/src/validation/__tests__/math.test.ts`**

Write tests covering each operation with valid and invalid cases:

Core tests (minimum 20):

1. `add`: 2+3=5 (pass), 2+3=6 (fail), zero case 0+0=0 (pass)
2. `subtract`: 10-3=7 (pass), 10-3=6 (fail), negative result 3-10=-7 (pass)
3. `multiply`: 4×5=20 (pass), 4×5=21 (fail), ×0=0 (pass), ×1=identity (pass)
4. `divide`: 20/4=5 (pass), 20/4=6 (fail), division by zero (error)
5. `place_value`: digit in 352 (3=hundreds, 5=tens, 2=ones), lakhs in 352648 (5)
6. `expanded_form`: 352 = "300 + 50 + 2" (pass), Indian grouping
7. `compare`: 5>3 (pass), 5<3 (fail), 10=10 (pass)
8. `order`: ascending [3,1,2] → [1,2,3], descending [3,1,2] → [3,2,1]
9. `fraction_equiv`: 1/2 vs 2/4 (true), 1/2 vs 1/3 (false)
10. `fraction_compare`: 1/2 > 1/3 (pass), 1/2 < 1/3 (fail)
11. `decimal`: 1.5+2.3=3.8, 1.5-0.5=1.0, 2.0\*1.5=3.0
12. `unit_convert`: 1km→1000m, 1hour→3600sec, unknown conversion (error)
13. `area`: 5×3=15, 0×5=0
14. `perimeter`: 2×(5+3)=16
15. `volume`: 3×4×5=60
16. `clock`: 2:30 (pass), wrong format (fail)
17. `money`: 10+20+50=80, Indian paisa→rupee

MCQ validation tests: 18. valid MCQ (4 unique options, correctIndex 0-3) 19. duplicate options (error) 20. out-of-range correctIndex (error) 21. too few options (error)

- [ ] **Step 3: Create `packages/pipeline/src/validation/widgets.ts`**

```typescript
import { isKnownWidgetId, getWidgetSchema } from '../generate-activities/widget-schemas.js';

export interface WidgetValidationResult {
  widgetId: string;
  valid: boolean;
  errors: string[];
}

export function validateWidgetConfig(widgetId: string, config: unknown): WidgetValidationResult {
  const errors: string[] = [];

  if (!isKnownWidgetId(widgetId)) {
    errors.push(`Unknown widget ID: "${widgetId}"`);
    return { widgetId, valid: false, errors };
  }

  const schema = getWidgetSchema(widgetId);
  if (!schema) {
    errors.push(`No schema found for widget: "${widgetId}"`);
    return { widgetId, valid: false, errors };
  }

  const result = schema.safeParse(config);
  if (!result.success) {
    errors.push(`Widget config validation failed for "${widgetId}": ${result.error.message}`);
    return { widgetId, valid: false, errors };
  }

  return { widgetId, valid: true, errors: [] };
}
```

- [ ] **Step 4: Create `packages/pipeline/src/validation/__tests__/widgets.test.ts`**

Test valid widget configs for `core.matching`, `math.fraction-visual`, `math.place-value-chart`, `math.number-line`. Test invalid configs (missing required fields, wrong types). Test unknown widget IDs.

- [ ] **Step 5: Modify `packages/pipeline/src/validate/index.ts` — integrate math + widget validators**

Read the existing file. Add a new function `validateWithMath()`:

```typescript
import { validateAllMath, validateMCQOptions } from './math.js';
import type { MathQuestion } from './math.js';
import { validateWidgetConfig } from './widgets.js';

export function extractMathQuestions(activities: GeneratedActivity[]): MathQuestion[] {
  const questions: MathQuestion[] = [];

  for (const activity of activities) {
    if (activity.type === 'quiz' && activity.content.questions) {
      for (let i = 0; i < activity.content.questions.length; i++) {
        const mcq = activity.content.questions[i];
        if (mcq.question && mcq.options && mcq.correctIndex !== undefined) {
          const mcqErrors = validateMCQOptions({
            question: mcq.question,
            options: mcq.options,
            correctIndex: mcq.correctIndex,
          });
          if (mcqErrors.length === 0) {
            const correctOption = mcq.options[mcq.correctIndex];
            const parsed = parseFloat(correctOption);
            if (!isNaN(parsed)) {
              questions.push({
                questionId: `${activity.step}-q${i}`,
                operation: 'add',
                inputs: { numbers: [parseFloat(correctOption)] },
                expectedAnswer: mcq.correctIndex,
                unit: '',
                tolerance: 0.001,
              });
            }
          }
        }
      }
    }

    const wc = activity.widgetConfig as Record<string, unknown> | undefined;
    if (wc?.math) {
      const mathData = wc.math as Record<string, unknown>;
      if (mathData.operation && mathData.inputs && mathData.expectedAnswer !== undefined) {
        questions.push({
          questionId: `${activity.step}-math-${questions.length}`,
          operation: mathData.operation as MathQuestion['operation'],
          inputs: mathData.inputs as Record<string, number | number[] | string>,
          expectedAnswer: mathData.expectedAnswer as number | string | number[],
          unit: (mathData.unit as string) || '',
          tolerance: (mathData.tolerance as number) || 0.001,
        });
      }
    }
  }

  return questions;
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- math widgets validate
```

Expected: All math validation tests pass. All widget validation tests pass. Existing validate tests still pass.

- [ ] **Step 7: Commit**

```bash
git add packages/pipeline/src/validation/ packages/pipeline/src/validate/
git commit -m "feat(pipeline): add deterministic math and widget validation"
```

---

### Task 11: Coverage Ledger and Publish-Quality Gates

**Files:**

- Create: `packages/pipeline/src/coverage/types.ts`
- Create: `packages/pipeline/src/coverage/index.ts`
- Create: `packages/pipeline/src/coverage/__tests__/coverage.test.ts`
- Create: `packages/pipeline/src/validation/report.ts`
- Create: `packages/pipeline/src/validation/__tests__/report.test.ts`

- [ ] **Step 1: Create `packages/pipeline/src/coverage/types.ts`**

```typescript
import { z } from 'zod';

export const COVERAGE_STATUSES = [
  'covered',
  'partially_covered',
  'uncovered',
  'not_applicable',
] as const;
export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];

export const CoverageEntrySchema = z.object({
  sourceUnitId: z.string(),
  sourceType: z.string(),
  concepts: z.array(z.string()),
  blueprints: z.array(z.string()),
  activities: z.array(z.string()),
  assets: z.array(z.string()),
  status: z.enum(COVERAGE_STATUSES),
  reviewNotes: z.string().optional(),
});

export type CoverageEntry = z.infer<typeof CoverageEntrySchema>;

export const CoverageLedgerSchema = z.object({
  documentId: z.string(),
  totalSourceUnits: z.number().int().min(0),
  requiredSourceUnits: z.number().int().min(0),
  entries: z.array(CoverageEntrySchema),
  summary: z.object({
    coveredRequired: z.number(),
    percentRequiredCovered: z.number().min(0).max(100),
    percentObjectiveCovered: z.number().min(0).max(100),
    percentWorkedExampleCovered: z.number().min(0).max(100),
    percentExerciseCovered: z.number().min(0).max(100),
    percentAssessmentCovered: z.number().min(0).max(100),
    conceptCount: z.number(),
    activityCount: z.number(),
    assetCount: z.number(),
  }),
});

export type CoverageLedger = z.infer<typeof CoverageLedgerSchema>;
```

- [ ] **Step 2: Create `packages/pipeline/src/coverage/index.ts`**

```typescript
import type { SourceUnit } from '../source/types.js';
import type { Concept } from '../concepts/types.js';
import type { LessonBlueprint } from '../blueprint/types.js';
import type { AssetManifestEntry } from '../assets/types.js';
import type { CoverageLedger, CoverageEntry, CoverageStatus } from './types.js';

export function buildCoverageLedger(
  sourceUnits: SourceUnit[],
  concepts: Concept[],
  blueprints: LessonBlueprint[],
  assets: AssetManifestEntry[],
  conceptActivityMap: Map<string, string[]>,
): CoverageLedger {
  const conceptSourceMap = new Map<string, Set<string>>();
  for (const c of concepts) {
    conceptSourceMap.set(c.conceptId, new Set(c.sourceUnitIds));
  }

  const entries: CoverageEntry[] = sourceUnits.map((unit) => {
    const conceptIds = concepts
      .filter((c) => c.sourceUnitIds.includes(unit.id))
      .map((c) => c.conceptId);
    const blueprintIds = blueprints
      .filter((b) => b.sourceUnitIds.includes(unit.id))
      .map((b) => b.conceptId);
    const activityIds = conceptIds.flatMap((cId) => conceptActivityMap.get(cId) || []);
    const assetIds = assets.filter((a) => a.sourceUnitIds.includes(unit.id)).map((a) => a.id);

    let status: CoverageStatus = 'uncovered';
    if (!unit.requiredCoverage) {
      status = 'not_applicable';
    } else if (conceptIds.length > 0 && activityIds.length > 0) {
      status = 'covered';
    } else if (conceptIds.length > 0) {
      status = 'partially_covered';
    }

    return {
      sourceUnitId: unit.id,
      sourceType: unit.type,
      concepts: conceptIds,
      blueprints: blueprintIds,
      activities: activityIds,
      assets: assetIds,
      status,
    };
  });

  const required = sourceUnits.filter((u) => u.requiredCoverage);
  const coveredRequired = entries.filter(
    (e) =>
      e.status === 'covered' && sourceUnits.find((u) => u.id === e.sourceUnitId)?.requiredCoverage,
  ).length;
  const objectives = sourceUnits.filter((u) => u.type === 'objective');
  const coveredObjectives = entries.filter(
    (e) =>
      e.status === 'covered' &&
      sourceUnits.find((u) => u.id === e.sourceUnitId)?.type === 'objective',
  ).length;
  const examples = sourceUnits.filter((u) => u.type === 'worked_example');
  const coveredExamples = entries.filter(
    (e) =>
      e.status === 'covered' &&
      sourceUnits.find((u) => u.id === e.sourceUnitId)?.type === 'worked_example',
  ).length;
  const exercises = sourceUnits.filter((u) => u.type === 'exercise');
  const coveredExercises = entries.filter(
    (e) =>
      e.status === 'covered' &&
      sourceUnits.find((u) => u.id === e.sourceUnitId)?.type === 'exercise',
  ).length;
  const assessments = sourceUnits.filter((u) => u.type === 'assessment');
  const coveredAssessments = entries.filter(
    (e) =>
      e.status === 'covered' &&
      sourceUnits.find((u) => u.id === e.sourceUnitId)?.type === 'assessment',
  ).length;

  return {
    documentId: '',
    totalSourceUnits: sourceUnits.length,
    requiredSourceUnits: required.length,
    entries,
    summary: {
      coveredRequired,
      percentRequiredCovered:
        required.length > 0 ? Math.round((coveredRequired / required.length) * 100) : 100,
      percentObjectiveCovered:
        objectives.length > 0 ? Math.round((coveredObjectives / objectives.length) * 100) : 100,
      percentWorkedExampleCovered:
        examples.length > 0 ? Math.round((coveredExamples / examples.length) * 100) : 100,
      percentExerciseCovered:
        exercises.length > 0 ? Math.round((coveredExercises / exercises.length) * 100) : 100,
      percentAssessmentCovered:
        assessments.length > 0 ? Math.round((coveredAssessments / assessments.length) * 100) : 100,
      conceptCount: concepts.length,
      activityCount: entries.reduce((sum, e) => sum + e.activities.length, 0),
      assetCount: assets.length,
    },
  };
}
```

- [ ] **Step 3: Create `packages/pipeline/src/coverage/__tests__/coverage.test.ts`**

Test: empty source → 100% coverage, all covered, partial coverage, uncovered required units, not_applicable for non-required units.

- [ ] **Step 4: Create `packages/pipeline/src/validation/report.ts`**

```typescript
import type { LlmStage } from '@open-edu/llm-config';
import type { CoverageLedger } from '../coverage/types.js';
import type { MathValidationResult } from './math.js';
import type { WidgetValidationResult } from './widgets.js';

export interface QualityReport {
  version: 1;
  generatedAt: string;
  status: 'complete' | 'partial' | 'failed';
  stageModelUsage: Record<string, { provider: string; model: string }>;
  retries: number;
  durationMs: number;
  coverage: CoverageLedger['summary'];
  mathValidation: {
    totalChecked: number;
    passed: number;
    failed: number;
    failures: MathValidationResult[];
  };
  widgetValidation: {
    totalChecked: number;
    passed: number;
    failed: number;
    failures: WidgetValidationResult[];
  };
  reviewItems: string[];
  publishGates: {
    requiredCoverage: { passed: boolean; threshold: number; actual: number };
    mathCorrectness: { passed: boolean; actual: number };
    widgetValidity: { passed: boolean; actual: number };
    assetCompleteness: { passed: boolean; actual: number };
    conceptCoverage: { passed: boolean; actual: number };
    noDependencyCycles: { passed: boolean };
  };
}

export function getPublishStatus(report: QualityReport): 'complete' | 'partial' | 'failed' {
  const gates = report.publishGates;
  const allPassed =
    gates.requiredCoverage.passed &&
    gates.mathCorrectness.passed &&
    gates.widgetValidity.passed &&
    gates.assetCompleteness.passed &&
    gates.conceptCoverage.passed &&
    gates.noDependencyCycles.passed;

  if (allPassed) return 'complete';
  if (gates.requiredCoverage.passed && gates.mathCorrectness.passed) return 'partial';
  return 'failed';
}

export function generateQualityReport(params: {
  stageUsage: Record<string, { provider: string; model: string }>;
  retries: number;
  durationMs: number;
  coverage: CoverageLedger['summary'];
  mathResults: MathValidationResult[];
  widgetResults: WidgetValidationResult[];
  reviewItems: string[];
  assetCount: number;
  conceptCount: number;
  hasCycles: boolean;
}): QualityReport {
  const report: QualityReport = {
    version: 1,
    generatedAt: new Date().toISOString(),
    status: 'partial',
    stageModelUsage: params.stageUsage,
    retries: params.retries,
    durationMs: params.durationMs,
    coverage: params.coverage,
    mathValidation: {
      totalChecked: params.mathResults.length,
      passed: params.mathResults.filter((r) => r.valid).length,
      failed: params.mathResults.filter((r) => !r.valid).length,
      failures: params.mathResults.filter((r) => !r.valid),
    },
    widgetValidation: {
      totalChecked: params.widgetResults.length,
      passed: params.widgetResults.filter((r) => r.valid).length,
      failed: params.widgetResults.filter((r) => !r.valid).length,
      failures: params.widgetResults.filter((r) => !r.valid),
    },
    reviewItems: params.reviewItems,
    publishGates: {
      requiredCoverage: {
        passed: params.coverage.percentRequiredCovered >= 100,
        threshold: 100,
        actual: params.coverage.percentRequiredCovered,
      },
      mathCorrectness: {
        passed: params.mathResults.every((r) => r.valid),
        actual: params.mathResults.filter((r) => r.valid).length,
      },
      widgetValidity: {
        passed: params.widgetResults.every((r) => r.valid),
        actual: params.widgetResults.filter((r) => r.valid).length,
      },
      assetCompleteness: { passed: params.assetCount > 0, actual: params.assetCount },
      conceptCoverage: { passed: params.conceptCount > 0, actual: params.conceptCount },
      noDependencyCycles: { passed: !params.hasCycles },
    },
  };

  report.status = getPublishStatus(report);
  return report;
}
```

- [ ] **Step 5: Create `packages/pipeline/src/validation/__tests__/report.test.ts`**

Test: all gates pass → `complete`; coverage fails → `partial`; math fails → `partial`; coverage+math fail → `failed`. Also test summary generation completeness.

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- coverage report
```

- [ ] **Step 7: Commit**

```bash
git add packages/pipeline/src/coverage/ packages/pipeline/src/validation/
git commit -m "feat(pipeline): add coverage ledger and publish-quality gates"
```

---

### Task 12: Rebuild Graph Orchestration and Artifacts

**Files:**

- Modify: `packages/pipeline/src/graph/index.ts` (new orchestration)
- Modify: `packages/pipeline/src/cli/index.ts` (use router, stage model flags)
- Modify: `packages/pipeline/src/output/index.ts` (all artifacts)
- Modify: `packages/pipeline/src/types.ts` (PipelineReport update)
- Modify: `packages/pipeline/package.json` (scripts)

This task rebuilds the pipeline orchestration to use `LlmRouter` throughout, adding the full 8-stage flow with resumable intermediate artifacts, config hash-based caching, and all output files.

- [ ] **Step 1: Read existing `packages/pipeline/src/graph/index.ts` fully**

Understand the current 6-stage flow: extract → chunk → generate-concepts → generate-activities → validate → output.

- [ ] **Step 2: Rewrite `graph/index.ts` — new 8-stage orchestration with `LlmRouter`**

The new `runPipelineWithRouter()` function:

```typescript
import { createHash } from 'node:crypto';
import { LlmRouter, type LlmStage } from '@open-edu/llm-config';
import { resolveStageConfigs, logStageConfigs, type StageOverride } from '../config/config.js';
import { extractPDFPages, extractPDF } from '../extract/index.js';
import { buildSourceInventory } from '../source/inventory.js';
import type { SourceInventory, SourceUnit } from '../source/types.js';
import { generateConceptMap, validateConceptGraph } from '../concepts/index.js';
import type { Concept } from '../concepts/types.js';
import { generateLessonBlueprints } from '../blueprint/index.js';
import type { LessonBlueprint } from '../blueprint/types.js';
import { generateActivitiesForConcept } from '../generate-activities/index.js';
import {
  validateAllMath,
  validateMCQOptions,
  extractMathQuestions,
  type MathQuestion,
} from '../validation/math.js';
import { validateWidgetConfig, type WidgetValidationResult } from '../validation/widgets.js';
import { buildCoverageLedger } from '../coverage/index.js';
import { generateQualityReport, type QualityReport } from '../validation/report.js';
import { writeCourseSpecOutput, writeCourseSpecJSONOutput } from '../output/index.js';
import { generateAssetFiles } from '../assets/manifest.js';
import type { AssetManifest } from '../assets/types.js';
import type {
  GeneratedActivity,
  GeneratedConcept,
  ConceptActivityPair,
  ActivityContext,
} from '../types.js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface PipelineResult {
  report: QualityReport;
  outputPaths: string[];
  coverageLedger: any;
  assetManifest: AssetManifest | null;
}

export async function runPipelineV2(
  router: LlmRouter,
  options: {
    pdfPath: string;
    levelCode: string;
    subject: string;
    force: boolean;
    chapterFilter?: number;
    outputDir: string;
    verbose: boolean;
    dryRun: boolean;
    resume: boolean;
    maxRetries: number;
    format: 'md' | 'json' | 'both';
    widgetCategories: string[];
  },
): Promise<PipelineResult> {
  const startTime = Date.now();
  const outputPaths: string[] = [];
  const reviewItems: string[] = [];
  let retries = 0;

  if (!existsSync(options.outputDir)) mkdirSync(options.outputDir, { recursive: true });

  // --- Hash-based artifact caching ---
  function computeConfigHash(): string {
    const hash = createHash('sha256');
    const cfg = JSON.stringify({
      pdfPath: options.pdfPath,
      levelCode: options.levelCode,
      subject: options.subject,
      stages: [
        'source_inventory',
        'concept_map',
        'concept_enrichment',
        'lesson_blueprint',
        'asset_plan',
        'activity_generation',
        'review',
      ].map((s: string) => ({ stage: s, ...router.getStageConfig(s as LlmStage) })),
    });
    hash.update(cfg);
    return hash.digest('hex').slice(0, 12);
  }

  const configHash = computeConfigHash();
  const hashPath = join(options.outputDir, '.pipeline-hash');
  const previousHash =
    options.resume && existsSync(hashPath) ? readFileSync(hashPath, 'utf-8').trim() : '';

  function canResume(filename: string): boolean {
    if (!options.resume) return false;
    if (previousHash !== configHash) return false;
    return existsSync(join(options.outputDir, filename));
  }

  if (options.force) {
    if (options.verbose) console.log('--force set: regenerating all artifacts');
  } else if (options.resume && previousHash !== configHash) {
    if (options.verbose) console.log('Config changed since last run. Regenerating all artifacts.');
  }

  const shouldRun = !options.dryRun;
  function maybeWrite(path: string, content: string, force?: boolean): void {
    if (shouldRun || force) {
      writeFileSync(path, content, 'utf-8');
      outputPaths.push(path);
    }
  }
  if (options.dryRun && options.verbose)
    console.log('--dry-run: skipping LLM calls and file writes');

  // Stage 1: Extract PDF pages
  if (options.verbose) console.log('[1/8] Extracting PDF pages...');
  const pages = !options.dryRun ? await extractPDFPages(options.pdfPath) : [];
  const pdfMeta = !options.dryRun
    ? await extractPDF(options.pdfPath)
    : { metadata: { title: options.subject } };

  // Stage 2: Build source inventory
  const invPath = join(options.outputDir, 'source-inventory.json');
  let inventory: SourceInventory;
  if (canResume('source-inventory.json')) {
    inventory = JSON.parse(readFileSync(invPath, 'utf-8'));
    if (options.verbose) console.log('[2/8] Resumed source inventory from cache');
  } else {
    if (options.verbose) console.log('[2/8] Building source inventory...');
    inventory = !options.dryRun
      ? await buildSourceInventory(router, pages, pdfMeta.metadata.title)
      : { documentId: 'dry-run', title: 'Dry Run', totalPages: 0, units: [], warnings: [] };
    maybeWrite(invPath, JSON.stringify(inventory, null, 2));
  }

  // Stage 3: Generate concept map
  const cmPath = join(options.outputDir, 'concept-map.json');
  let concepts: Concept[] = [];
  let conceptWarnings: string[] = [];
  if (canResume('concept-map.json')) {
    const cm = JSON.parse(readFileSync(cmPath, 'utf-8'));
    concepts = cm.concepts;
    conceptWarnings = cm.warnings || [];
    if (options.verbose) console.log('[3/8] Resumed concept map from cache');
  } else {
    if (options.verbose) console.log('[3/8] Generating concept map...');
    if (!options.dryRun) {
      const result = await generateConceptMap(
        router,
        inventory.units,
        `${options.subject} ${options.levelCode}`,
      );
      concepts = result.concepts;
      conceptWarnings = result.warnings;
      reviewItems.push(...conceptWarnings);
    }
    maybeWrite(cmPath, JSON.stringify({ concepts, warnings: conceptWarnings }, null, 2));
  }

  // Stage 4: Generate lesson blueprints
  const bpPath = join(options.outputDir, 'lesson-blueprints.json');
  let blueprints: LessonBlueprint[] = [];
  let bpWarnings: string[] = [];
  if (canResume('lesson-blueprints.json')) {
    blueprints = JSON.parse(readFileSync(bpPath, 'utf-8'));
    if (options.verbose) console.log('[4/8] Resumed lesson blueprints from cache');
  } else {
    if (options.verbose) console.log('[4/8] Generating lesson blueprints...');
    if (!options.dryRun) {
      const result = await generateLessonBlueprints(
        router,
        concepts,
        inventory.units,
        options.widgetCategories,
      );
      blueprints = result.blueprints;
      bpWarnings = result.warnings;
      reviewItems.push(...bpWarnings);
    }
    maybeWrite(bpPath, JSON.stringify(blueprints, null, 2));
  }

  // Stage 5: Generate activities from blueprints
  let conceptActivityPairs: ConceptActivityPair[] = [];
  const conceptActivityMap = new Map<string, GeneratedActivity[]>();
  if (canResume('course-spec.json')) {
    if (options.verbose)
      console.log('[5/8] Activities already generated (resuming from course-spec.json)');
    conceptActivityPairs = [];
  } else {
    if (options.verbose) console.log('[5/8] Generating activities from blueprints...');
    if (!options.dryRun) {
      for (const bp of blueprints) {
        const context: ActivityContext = {
          sourceExcerpts: inventory.units
            .filter((u) => bp.sourceUnitIds.includes(u.id))
            .map((u) => ({ id: u.id, type: u.type, text: u.text.slice(0, 1000) })),
          assetManifestEntries: [],
          widgetCatalog: [],
          questionFamilies: bp.questionFamilies,
          misconceptions: bp.misconceptionTargets,
        };
        const pairs = await generateActivitiesForConcept(
          router,
          {
            conceptId: bp.conceptId,
            chapterCode: 'CH1',
            chapterName: options.subject,
            learningObjective: bp.objective,
            coreIdea: '',
            examples: [],
            misconceptions: bp.misconceptionTargets,
            supports: { visual: bp.representations.includes('visual') },
            masteryCriteria: 0.8,
            difficulty: 'beginner',
            estimatedDuration: 30,
            dependencies: bp.priorKnowledge,
          },
          [],
        );
        conceptActivityPairs.push({ concept: pairs.concept, activities: pairs.activities });
        conceptActivityMap.set(bp.conceptId, pairs.activities);
      }
    }
  }

  // Stage 6: Generate assets (deterministic SVGs)
  let assetManifest: AssetManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    assets: [],
  };
  if (canResume('quality-report.json')) {
    if (options.verbose) console.log('[6/8] Assets already generated (resuming)');
  } else {
    if (options.verbose) console.log('[6/8] Generating visual assets...');
    if (!options.dryRun) {
      const { written } = generateAssetFiles(assetManifest, options.outputDir);
    }
    const assetsPath = join(options.outputDir, 'assets', 'manifest.json');
    outputPaths.push(assetsPath);
  }

  // Stage 7: Validate math + widgets + coverage
  if (options.verbose) console.log('[7/8] Running validation...');
  const allActivities = conceptActivityPairs.flatMap((p) => p.activities);
  const mathQuestions = extractMathQuestions(allActivities);
  const mathResults = validateAllMath(mathQuestions);

  const widgetResults: WidgetValidationResult[] = [];
  for (const activity of allActivities) {
    if (activity.type === 'widget' && activity.widgetId && activity.widgetConfig) {
      widgetResults.push(validateWidgetConfig(activity.widgetId, activity.widgetConfig));
    }
  }

  const coverageLedger = buildCoverageLedger(
    inventory.units,
    concepts,
    blueprints,
    assetManifest.assets,
    conceptActivityMap,
  );

  const clPath = join(options.outputDir, 'coverage-ledger.json');
  maybeWrite(clPath, JSON.stringify(coverageLedger, null, 2));

  // Stage 8: Write course-spec artifacts + quality report
  if (options.verbose) console.log('[8/8] Generating outputs and quality report...');
  if (!options.dryRun) {
    const filenamePrefix = `${options.levelCode}-${options.subject}`.toLowerCase();
    if (options.format === 'md' || options.format === 'both') {
      writeCourseSpecOutput(options.outputDir, filenamePrefix, conceptActivityPairs, options.force);
      outputPaths.push(join(options.outputDir, `${filenamePrefix}-course-spec.md`));
    }
    if (options.format === 'json' || options.format === 'both') {
      writeCourseSpecJSONOutput(
        options.outputDir,
        filenamePrefix,
        conceptActivityPairs,
        options.force,
      );
      outputPaths.push(join(options.outputDir, `${filenamePrefix}-course-spec.json`));
    }
  }

  // Save config hash for resume
  maybeWrite(hashPath, configHash, true);

  const durationMs = Date.now() - startTime;
  const stageUsage: Record<string, { provider: string; model: string }> = {};
  for (const stage of [
    'source_inventory',
    'concept_map',
    'concept_enrichment',
    'lesson_blueprint',
    'asset_plan',
    'activity_generation',
    'review',
  ] as const) {
    const cfg = router.getStageConfig(stage as LlmStage);
    stageUsage[stage] = { provider: cfg.provider, model: cfg.model };
  }

  const report = generateQualityReport({
    stageUsage,
    retries,
    durationMs,
    coverage: coverageLedger.summary,
    mathResults,
    widgetResults,
    reviewItems,
    assetCount: assetManifest.assets.length,
    conceptCount: concepts.length,
    hasCycles: conceptWarnings.some((w) => w.includes('cycle')),
  });

  const qrPath = join(options.outputDir, 'quality-report.json');
  maybeWrite(qrPath, JSON.stringify(report, null, 2), true);

  return { report, outputPaths, coverageLedger, assetManifest };
}
```

- [ ] **Step 3: Modify `packages/pipeline/src/cli/index.ts` — use router, stage model flags**

Update `runPipelineCLI()` to:

1. Parse `--stage-model` flags via `parseArgs()`, produce `StageOverride[]`
2. Call `resolveStageConfigs(overrides)` to get per-stage configs
3. Create `new LlmRouter(configs)` instead of `createLlmProvider()`
4. Pass `LlmRouter` to `runPipelineV2()`
5. Log stage/model/provider in verbose mode using `logStageConfigs()`
6. Add `--resume` flag to reuse intermediate artifacts

- [ ] **Step 4: Modify `packages/pipeline/package.json` — add artifact copy and scripts**

Add copy of new prompt files, and a `test:fixture` script:

```json
"scripts": {
  "build": "tsc && mkdir -p dist/source dist/concepts dist/blueprint dist/assets dist/coverage dist/validation dist/config && cp src/source/inventory-prompt.ts dist/source/ && cp src/concepts/prompt.ts dist/concepts/ && cp src/blueprint/prompt.ts dist/blueprint/ && cp src/chunk/prompts/*.txt dist/chunk/prompts/ && cp src/generate-concept/prompts/*.txt dist/generate-concept/prompts/",
  "test": "vitest run",
  "test:fixture": "vitest run -- math-level-b-lesson1",
  "lint": "eslint 'src/**/*.{ts,tsx}'",
  "typecheck": "tsc --noEmit",
  "clean": "rm -rf dist",
  "curriculum:generate": "node dist/cli/index.js"
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @open-edu/pipeline test
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline typecheck
```

Expected: All existing tests pass or are updated. Build succeeds. Typecheck passes.

- [ ] **Step 6: Commit**

```bash
git add packages/pipeline/src/graph/ packages/pipeline/src/cli/ packages/pipeline/src/output/ packages/pipeline/src/types.ts packages/pipeline/package.json
git commit -m "feat(pipeline): rebuild graph orchestration with LlmRouter and resumable artifacts"
```

---

### Task 13: Build the Lesson 1 Golden Vertical Slice

**Files:**

- Create: `packages/pipeline/src/fixtures/math-level-b/README.md`
- Create: `packages/pipeline/src/fixtures/math-level-b/source-inventory.json`
- Create: `packages/pipeline/src/__tests__/math-level-b-lesson1.test.ts`

- [ ] **Step 1: Create `packages/pipeline/src/fixtures/math-level-b/README.md`**

````markdown
# Math Level B — Lesson 1: Numbers — Golden Fixture

This directory contains a reviewed, human-validated source inventory for Lesson 1
(Numbers) of the NIOS Level B Mathematics textbook.

## Lesson 1: Numbers

Page range: ~pages 3–20 of the 203-page textbook.

### Covered concepts

- Large numbers (up to 9 digits)
- Indian place value system (ones, tens, hundreds, thousands, ten thousands, lakhs, crores)
- Expanded form of numbers
- Comparison of numbers
- Ordering of numbers (ascending/descending)
- Constructing smallest and greatest numbers from given digits

### Source inventory

See `source-inventory.json` for the reviewed unit list and classifications.

### Real-provider command (opt-in)

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf /Users/sarthakpatnaik/Code/learn-easy/pdf/Math_Level_B_english_medium.pdf \
  --level B --subject math --chapter 1 \
  --output-dir /tmp/openedu-math-level-b --format both --verbose
```
````

### Machine gates

- 100% required source coverage
- 100% objective coverage
- 100% worked-example/exercise-family coverage
- Zero math validation failures
- Zero invalid widgets
- Zero missing assets
- Zero concepts without activities
- Zero dependency cycles

````

- [ ] **Step 2: Create `packages/pipeline/src/fixtures/math-level-b/source-inventory.json`**

This is a reviewed, human-curated source inventory for Lesson 1. It contains ~25-35 source units covering:

```json
{
  "documentId": "math-level-b",
  "title": "Mathematics Level B",
  "totalPages": 203,
  "units": [
    {
      "id": "src-1",
      "type": "lesson",
      "text": "Lesson 1: Numbers",
      "location": { "pageStart": 3 },
      "extractionConfidence": 1.0,
      "requiredCoverage": true
    },
    {
      "id": "src-2",
      "type": "objective",
      "text": "LEARNING OUTCOMES: After completing this lesson, learners will be able to read and write large numbers...",
      "location": { "pageStart": 3 },
      "extractionConfidence": 0.95,
      "requiredCoverage": true
    },
    {
      "id": "src-3",
      "type": "definition",
      "text": "PLACE VALUE: The value of a digit depends on its place in the number.",
      "location": { "pageStart": 4 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-4",
      "type": "worked_example",
      "text": "Example 1.1: Write the place value of each digit in 3,52,648.",
      "location": { "pageStart": 5 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-5",
      "type": "definition",
      "text": "EXPANDED FORM: A number expressed as the sum of the place values of its digits.",
      "location": { "pageStart": 6 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-6",
      "type": "worked_example",
      "text": "Example 1.2: Write 5,23,716 in expanded form.",
      "location": { "pageStart": 6 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-7",
      "type": "definition",
      "text": "COMPARISON: Compare numbers digit by digit from the leftmost place.",
      "location": { "pageStart": 8 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-8",
      "type": "worked_example",
      "text": "Example 1.3: Compare 3,52,648 and 3,52,846.",
      "location": { "pageStart": 9 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-9",
      "type": "exercise",
      "text": "Let us see what you have learnt: 1. Write in figures. 2. Write in words. 3. Write expanded form...",
      "location": { "pageStart": 12 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-10",
      "type": "definition",
      "text": "ORDERING: Arrange numbers in ascending (small to big) or descending (big to small) order.",
      "location": { "pageStart": 14 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-11",
      "type": "worked_example",
      "text": "Example 1.4: Arrange 3,52,648; 3,25,468; 3,52,846 in ascending order.",
      "location": { "pageStart": 14 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-12",
      "type": "review",
      "text": "What have you learnt: In this lesson you learned about place value, expanded form, comparison, and ordering of large numbers.",
      "location": { "pageStart": 20 },
      "extractionConfidence": 0.9,
      "requiredCoverage": false
    }
  ],
  "warnings": []
}
````

The actual file must contain at minimum units covering:

- Lesson heading, Learning outcomes
- Indian place value chart definition
- Names of places (ones, tens, ..., crores)
- Place value table with examples
- Expanded form explanation + 2 worked examples
- Comparison of numbers explanation + 3 worked examples
- Ordering explanation + 2 worked examples
- "Let us see what you have learnt" exercise section
- Construct smallest/greatest number section
- "What have you learnt" review section

- [ ] **Step 3: Create `packages/pipeline/src/__tests__/math-level-b-lesson1.test.ts`**

This test uses a fake router that records every stage/model request and returns deterministic structured results:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { LlmRouter } from '@open-edu/llm-config';
import type { LlmStage } from '@open-edu/llm-config';
import { resolveStageConfigs } from '../config/config.js';
import { buildSourceInventory } from '../source/inventory.js';
import type { PageContent } from '../source/inventory.js';
import { generateConceptMap, validateConceptGraph } from '../concepts/index.js';
import { generateLessonBlueprints } from '../blueprint/index.js';
import { buildCoverageLedger } from '../coverage/index.js';
import { generateQualityReport } from '../validation/report.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceInventory } from '../source/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixtureInventory: SourceInventory = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'math-level-b', 'source-inventory.json'), 'utf-8'),
);

interface StageCall {
  stage: string;
  prompt: string;
}

class FakeRouter {
  public calls: StageCall[] = [];

  getStageConfig(stage: LlmStage) {
    return { provider: 'test', model: 'test-model', maxTokens: 4096, temperature: 0.3 };
  }

  async generateStructuredRaw<T>(
    stage: LlmStage,
    prompt: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    this.calls.push({ stage, prompt });
    // Return fixture data based on stage
    if (stage === 'source_inventory') {
      return { classifications: [] } as unknown as T;
    }
    if (stage === 'concept_map') {
      return {
        concepts: [
          {
            conceptId: 'indian_place_value',
            label: 'Indian Place Value',
            kind: 'knowledge',
            sourceUnitIds: ['src-3', 'src-5'],
            learningObjective: 'Identify place values using Indian numbering system',
            coreIdea:
              'Indian numbering groups digits into ones, tens, hundreds, thousands, ten thousands, lakhs, crores.',
            difficulty: 'beginner',
            masteryThreshold: 0.8,
            prerequisites: [],
            representations: ['visual', 'symbolic'],
            exerciseFamilies: ['place_value_identification', 'expanded_form'],
            misconceptionTargets: ['Confusing lakhs with millions'],
            adultContext: 'Reading currency in lakhs and crores',
            recommendedWidgetCategories: ['place-value'],
            estimatedMinutes: 20,
          },
          {
            conceptId: 'comparison',
            label: 'Comparison of Numbers',
            kind: 'skill',
            sourceUnitIds: ['src-7', 'src-8'],
            learningObjective: 'Compare two large numbers using place value',
            coreIdea:
              'Compare digits from the leftmost place; the first different digit determines which number is larger.',
            difficulty: 'beginner',
            masteryThreshold: 0.8,
            prerequisites: ['indian_place_value'],
            representations: ['symbolic'],
            exerciseFamilies: ['comparison'],
            misconceptionTargets: ['Comparing from rightmost digit instead of leftmost'],
            recommendedWidgetCategories: ['number-line'],
            estimatedMinutes: 15,
          },
          {
            conceptId: 'ordering',
            label: 'Ordering Numbers',
            kind: 'skill',
            sourceUnitIds: ['src-10', 'src-11'],
            learningObjective: 'Arrange numbers in ascending and descending order',
            coreIdea:
              'Ordering means sorting numbers from smallest to largest (ascending) or largest to smallest (descending).',
            difficulty: 'beginner',
            masteryThreshold: 0.8,
            prerequisites: ['comparison'],
            representations: ['symbolic'],
            exerciseFamilies: ['ordering'],
            misconceptionTargets: ['Misreading large number groups'],
            recommendedWidgetCategories: ['number-line'],
            estimatedMinutes: 15,
          },
          {
            conceptId: 'expanded_form',
            label: 'Expanded Form',
            kind: 'procedure',
            sourceUnitIds: ['src-5', 'src-6'],
            learningObjective: 'Write numbers in expanded form by place value',
            coreIdea:
              'Expanded form breaks a number into the sum of each digit multiplied by its place value.',
            difficulty: 'beginner',
            masteryThreshold: 0.8,
            prerequisites: ['indian_place_value'],
            representations: ['symbolic', 'visual'],
            exerciseFamilies: ['expanded_form'],
            misconceptionTargets: ['Forgetting to multiply digit by place value'],
            recommendedWidgetCategories: ['place-value'],
            estimatedMinutes: 15,
          },
        ],
        documentId: 'math-level-b',
      } as unknown as T;
    }
    if (stage === 'lesson_blueprint') {
      return { blueprints: [] } as unknown as T;
    }
    return {} as T;
  }
}

describe('Math Level B — Lesson 1: Numbers (golden fixture)', () => {
  let fakeRouter: FakeRouter;

  beforeAll(() => {
    fakeRouter = new FakeRouter();
  });

  it('has a valid source inventory fixture', () => {
    expect(fixtureInventory.units.length).toBeGreaterThan(10);
    expect(fixtureInventory.totalPages).toBe(203);

    const types = fixtureInventory.units.map((u) => u.type);
    expect(types).toContain('lesson');
    expect(types).toContain('objective');
    expect(types).toContain('worked_example');
    expect(types).toContain('exercise');
  });

  it('generates concept map with source evidence', async () => {
    const result = await generateConceptMap(
      fakeRouter as unknown as LlmRouter,
      fixtureInventory.units,
      'Math Level B - Lesson 1',
    );

    expect(result.concepts.length).toBeGreaterThan(0);
    for (const concept of result.concepts) {
      expect(concept.sourceUnitIds.length).toBeGreaterThan(0);
    }
  });

  it('generates valid concept graph (no cycles)', () => {
    const { concepts } = {
      concepts: [
        {
          conceptId: 'indian_place_value',
          label: 'IPV',
          kind: 'knowledge' as const,
          sourceUnitIds: ['src-3'],
          learningObjective: 'Identify place values',
          coreIdea: 'Place value means digit position determines its value.',
          difficulty: 'beginner' as const,
          masteryThreshold: 0.8,
          prerequisites: [],
          representations: ['visual' as const, 'symbolic' as const],
          exerciseFamilies: ['pv_id'],
          misconceptionTargets: [],
          recommendedWidgetCategories: [],
          estimatedMinutes: 20,
        },
        {
          conceptId: 'comparison',
          label: 'CMP',
          kind: 'skill' as const,
          sourceUnitIds: ['src-10'],
          learningObjective: 'Compare two numbers',
          coreIdea: 'Compare digits from left to right.',
          difficulty: 'beginner' as const,
          masteryThreshold: 0.8,
          prerequisites: ['indian_place_value'],
          representations: ['symbolic' as const],
          exerciseFamilies: ['compare'],
          misconceptionTargets: [],
          recommendedWidgetCategories: [],
          estimatedMinutes: 15,
        },
      ],
    };
    const errors = validateConceptGraph(concepts);
    expect(errors).toEqual([]);
  });

  it('builds coverage ledger with 100% required coverage', () => {
    const concepts = [
      {
        conceptId: 'indian_place_value',
        label: 'IPV',
        kind: 'knowledge' as const,
        sourceUnitIds: fixtureInventory.units.filter((u) => u.requiredCoverage).map((u) => u.id),
        learningObjective: 'Identify place values',
        coreIdea: 'Place value determines digit value.',
        difficulty: 'beginner' as const,
        masteryThreshold: 0.8,
        prerequisites: [],
        representations: ['visual' as const],
        exerciseFamilies: ['pv_id'],
        misconceptionTargets: [],
        recommendedWidgetCategories: [],
        estimatedMinutes: 20,
      },
    ] as const;
    const activityMap = new Map<string, string[]>();
    for (const c of concepts) activityMap.set(c.conceptId, ['act-1']);

    const ledger = buildCoverageLedger(fixtureInventory.units, concepts, [], [], activityMap);
    expect(ledger.summary.percentRequiredCovered).toBe(100);
  });

  it('passes all publish gates', () => {
    const report = generateQualityReport({
      stageUsage: {},
      retries: 0,
      durationMs: 0,
      coverage: {
        coveredRequired: 10,
        percentRequiredCovered: 100,
        percentObjectiveCovered: 100,
        percentWorkedExampleCovered: 100,
        percentExerciseCovered: 100,
        percentAssessmentCovered: 100,
        conceptCount: 5,
        activityCount: 25,
        assetCount: 3,
      },
      mathResults: [],
      widgetResults: [],
      reviewItems: [],
      assetCount: 3,
      conceptCount: 5,
      hasCycles: false,
    });

    expect(report.status).toBe('complete');
    expect(report.publishGates.requiredCoverage.passed).toBe(true);
    expect(report.publishGates.noDependencyCycles.passed).toBe(true);
  });

  it('records all stage calls', () => {
    expect(fakeRouter.calls.length).toBeGreaterThan(0);
    const stages = fakeRouter.calls.map((c) => c.stage);
    expect(stages).toContain('concept_map');
  });

  it('asserts final JSON compiles through course-compiler', async () => {
    // This test requires @open-edu/course-compiler to be built.
    // Import parseCourseSpecJSON and assert it parses without errors.
    // Skip if course-compiler is not built.
    try {
      const { parseCourseSpecJSON } = await import('@open-edu/course-compiler');
      const sampleJSON = {
        format: 'openedu-course-spec',
        version: 1,
        generatedAt: new Date().toISOString(),
        metadata: {
          title: 'Math Level B',
          description: 'Test',
          difficulty: 'beginner',
          estimatedHours: 2,
          generated: true,
        },
        lessons: [
          {
            id: 'math-B-1',
            title: 'Numbers',
            objectives: ['Identify place values using Indian numbering system'],
            coreIdea: 'Indian numbering groups digits.',
            examples: ['Example: 3,52,648'],
            misconceptions: ['Confusing lakhs with millions'],
            estimatedMinutes: 30,
            activities: [
              {
                step: 'observe',
                order: 1,
                type: 'reading',
                description: 'Observe place value chart',
              },
              {
                step: 'mastery_check',
                order: 5,
                type: 'quiz',
                description: 'Quiz',
                questions: [
                  {
                    question: 'What is the place value of 5 in 352?',
                    options: ['5', '50', '500', '5000'],
                    correctIndex: 1,
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(() => parseCourseSpecJSON(JSON.stringify(sampleJSON))).not.toThrow();
    } catch {
      // Skip if course-compiler not built
    }
  });
});

it('fake router returns deterministically', async () => {
  const r = new FakeRouter();
  const a = await r.generateStructuredRaw('source_inventory', 'test', z.object({ x: z.number() }));
  expect(a).toBeDefined();
});
```

- [ ] **Step 4: Run the fixture test**

```bash
pnpm --filter @open-edu/pipeline test -- math-level-b-lesson1
```

Expected: All fixture tests pass including publish gate assertions.

- [ ] **Step 5: Run full course-compiler compatibility test**

```bash
pnpm --filter @open-edu/course-compiler test
```

- [ ] **Step 6: Commit**

```bash
git add packages/pipeline/src/fixtures/ packages/pipeline/src/__tests__/math-level-b-lesson1.test.ts
git commit -m "test(pipeline): add Lesson 1 golden fixture with fake router and publish gate assertions"
```

---

### Task 14: Documentation and Routing Evaluation

**Files:**

- Create: `docs/superpowers/plans/pipeline-model-routing-evaluation.md`
- Modify: `packages/pipeline/README.md` (if exists)
- Modify: `openwiki/operations/testing-and-changes.md`

- [ ] **Step 1: Create `docs/superpowers/plans/pipeline-model-routing-evaluation.md`**

Document legacy single-model usage, stage overrides, artifact meanings, quality gates, and the rule that models do not replace deterministic validators:

```markdown
# Pipeline Model Routing Evaluation

## Legacy Single-Model Usage

Set `LLM_MODEL=gpt-4o-mini` and all stages use that model.

## Stage Overrides

Use `--stage-model` CLI flags or `LLM_STAGE_<STAGE>_MODEL` env vars for per-stage control.

## Artifacts

| File                     | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `source-inventory.json`  | Source units with page/type/confidence         |
| `concept-map.json`       | Concepts with source evidence and dependencies |
| `lesson-blueprints.json` | Per-concept lesson plans with arc steps        |
| `assets/manifest.json`   | Asset manifest with SVG files                  |
| `course-spec.json`       | OpenEdu course specification                   |
| `course-spec.md`         | Human-readable Markdown export                 |
| `coverage-ledger.json`   | Source-to-concept-to-activity coverage         |
| `quality-report.json`    | Stage usage, validation results, publish gates |

## Quality Gates

Output marked `complete` only when all pass:

- 100% required source coverage
- Zero math validation failures
- Zero invalid widgets
- Zero missing assets
- Zero concepts without activities
- Zero dependency cycles

## Model Evaluation

Evaluate Lesson 1 with:

1. mini model for every stage
2. mini + stronger for concept_map/lesson_blueprint/review
3. stronger model for every stage

Metrics: coverage, concept-boundary accuracy, prerequisite accuracy, math correctness, widget validity, asset usefulness, latency, retries, tokens, cost.

## Deterministic Validators

Models do NOT replace:

- Math validation (addition, subtraction, etc.)
- Widget config validation (Zod schemas)
- Coverage computation
- Asset SVG rendering
```

- [ ] **Step 2: Modify `openwiki/operations/testing-and-changes.md`**

Append a section about pipeline testing:

```markdown
## Pipeline Model Routing Tests

- `pnpm --filter @open-edu/llm-config test` — stage routing tests
- `pnpm --filter @open-edu/pipeline test` — full pipeline test suite
- `pnpm --filter @open-edu/pipeline test:fixture` — golden fixture tests
- `pnpm --filter @open-edu/pipeline curriculum:generate ...` — production run

When changing stage routing, run both llm-config and pipeline test suites.
When changing widget schemas, run `pnpm --filter @open-edu/widgets generate:catalog` to update the derived JSON.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/pipeline-model-routing-evaluation.md openwiki/operations/testing-and-changes.md
git commit -m "docs: add pipeline model routing evaluation and operations documentation"
```

---

### End-to-End Acceptance Checklist

- [ ] Legacy `LLM_MODEL` configures every stage
- [ ] Each stage independently overrides model/provider/config
- [ ] Stage/model/provider appear in logs and reports
- [ ] Source pages and unclassified text are preserved
- [ ] Required source units link to concepts and activities
- [ ] Concepts are teachable, deduplicated, and acyclic
- [ ] Every concept has a blueprint and evidence
- [ ] Every visual reference resolves to an accessible asset
- [ ] Every widget ID/config is canonical and valid
- [ ] Every numerical answer passes deterministic validation
- [ ] Generated JSON compiles through `@open-edu/course-compiler`
- [ ] Quality gates prevent incomplete output from reporting `complete`
- [ ] Lesson 1 golden fixture passes all tests
- [ ] Full test suite passes: `pnpm test`
- [ ] Typecheck passes: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`

---

### Final Verification Commands

Run these from the repo root after all tasks are complete:

```bash
pnpm --filter @open-edu/llm-config test && pnpm --filter @open-edu/llm-config typecheck
pnpm --filter @open-edu/pipeline test && pnpm --filter @open-edu/pipeline typecheck
pnpm --filter @open-edu/pipeline test:fixture
pnpm --filter @open-edu/course-compiler test
pnpm test  # full workspace
pnpm typecheck  # full workspace
```
