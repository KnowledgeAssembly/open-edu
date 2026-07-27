# Pipili AI Companion — Implementation Plan

**Based on:** `docs/superpowers/specs/2026-07-26-pipili-ai-companion-design.md`
**Date:** 2026-07-26
**Status:** Ready for implementation

---

## Architecture Overview

```
Learner UI                    Learner Server                Packages
────────────                  ──────────────                ────────
useChat (AI SDK UI)    →    /api/pipili/chat          →    @open-edu/llm-config
DefaultChatTransport         │ request validation           │ AI SDK model factory
                             │ context assembly             │ fast/escalation routing
CompanionPanel               │ assessment policy            │ provider capability
CourseRightSidebar           │ accessibility policy
Pipili stub → real           │ tool registry            →    @open-edu/ai-companion
Citation rendering           │ streamText + tools           │ Pipili types/contracts
Hint controls                │ metadata response            │ context normalization
Retry/stop/error             │                              │ citation/hint contracts
```

---

## Environment Variables

All provider/model selection is driven by `.env`. The following variables control Pipili:

| Variable               | Required | Default              | Description                                   |
| ---------------------- | -------- | -------------------- | --------------------------------------------- |
| `LLM_PROVIDER`         | Yes      | `openai`             | Provider: `openai`, `google`, or `openrouter` |
| `LLM_API_KEY`          | Yes      | —                    | API key for the selected provider             |
| `LLM_MODEL`            | No       | `gpt-4o-mini`        | Default/fallback model ID                     |
| `LLM_FAST_MODEL`       | No       | provider-dependent   | Fast-tier model for routine queries           |
| `LLM_ESCALATION_MODEL` | No       | value of `LLM_MODEL` | Escalation-tier model for complex requests    |
| `LLM_MAX_TOKENS`       | No       | `4096`               | Max tokens per response                       |
| `LLM_TEMPERATURE`      | No       | `0.3`                | Sampling temperature                          |

**Provider-specific fast-model defaults:**

| Provider     | `LLM_FAST_MODEL` default  |
| ------------ | ------------------------- |
| `openai`     | `gpt-4o-mini`             |
| `google`     | `gemini-2.0-flash-001`    |
| `openrouter` | falls back to `LLM_MODEL` |

**Escalation-model default:** always falls back to `LLM_MODEL` if `LLM_ESCALATION_MODEL` is not set.

**`.env` example:**

```env
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
LLM_FAST_MODEL=gpt-4o-mini
LLM_ESCALATION_MODEL=gpt-4o
LLM_MAX_TOKENS=4096
LLM_TEMPERATURE=0.3
```

---

## Phase 1: Dependencies & Package Setup

> **AI SDK version:** This plan targets **AI SDK v7 (latest)**. The React hook `useChat` lives in `@ai-sdk/react` (not `ai/react`), server streaming uses the UI Message Stream protocol (`createUIMessageStreamResponse` + `toUIMessageStream`), and messages use the `UIMessage` `parts` array (no `content` string).

### Step 1.1 — Add AI SDK dependencies to `@open-edu/llm-config`

**File:** `packages/llm-config/package.json`

Add to `dependencies`:

```json
"@ai-sdk/openai": "^1.0.0",
"@ai-sdk/google": "^1.0.0",
"@openrouter/ai-sdk-provider": "^0.4.0",
"ai": "^4.0.0"
```

Run:

```bash
cd packages/llm-config && pnpm install
```

### Step 1.2 — Add `zod` dependency to `@open-edu/ai-companion`

**File:** `packages/ai-companion/package.json`

Add to `dependencies`:

```json
"zod": "^3.22.0"
```

Run:

```bash
cd packages/ai-companion && pnpm install
```

### Step 1.3 — Add AI SDK UI dependencies to `apps/learner`

**File:** `apps/learner/package.json`

Add to `dependencies`:

```json
"@ai-sdk/react": "^1.0.0",
"ai": "^4.0.0"
```

`@ai-sdk/react` exports `useChat`; the `ai` package exports `DefaultChatTransport`, `createUIMessageStreamResponse`, `toUIMessageStream`, `convertToModelMessages`, and `UIMessage` types. Do **not** add `@ai-sdk/ui-utils` (it is not needed for the v7 chatbot pattern).

Run:

```bash
cd apps/learner && pnpm install
```

---

## Phase 2: `@open-edu/llm-config` — AI SDK Model Factory

### Step 2.1 — Create `src/model-factory.ts`

**File:** `packages/llm-config/src/model-factory.ts`

This file creates AI SDK `LanguageModelV1` instances from existing `LlmConfig`.

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModelV1 } from 'ai';
import { loadConfig, type LlmConfig } from './types.js';

export type ProviderCapability = 'streaming' | 'structured-output' | 'tool-calling';

// NOTE: capability claims must be verified per-model. These defaults reflect
// AI SDK provider packages as of v7; add tests that assert the declared
// capability actually works for the configured model.
export const PROVIDER_CAPABILITIES: Record<string, ProviderCapability[]> = {
  openai: ['streaming', 'structured-output', 'tool-calling'],
  google: ['streaming', 'structured-output', 'tool-calling'],
  openrouter: ['streaming', 'structured-output', 'tool-calling'],
};

export type ModelTier = 'fast' | 'escalation';

export interface ModelFactoryConfig {
  config: LlmConfig;
  tier?: ModelTier;
}

export interface ModelFactory {
  getModel(tier?: ModelTier): LanguageModelV1;
  getCapabilities(): ProviderCapability[];
  hasCapability(cap: ProviderCapability): boolean;
}

class ModelFactoryImpl implements ModelFactory {
  private fastModel: LanguageModelV1 | null = null;
  private escalationModel: LanguageModelV1 | null = null;
  private config: LlmConfig;

  constructor(config: LlmConfig) {
    this.config = config;
  }

  private createProvider() {
    const { provider, apiKey } = this.config;
    switch (provider) {
      case 'openai':
        return createOpenAI({ apiKey, compatibility: 'strict' });
      case 'google':
        return createGoogleGenerativeAI({ apiKey });
      case 'openrouter': {
        // createOpenRouter handles the OpenRouter base URL internally.
        return createOpenRouter({ apiKey });
      }
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  getModel(tier: ModelTier = 'fast'): LanguageModelV1 {
    if (tier === 'fast' && this.fastModel) return this.fastModel;
    if (tier === 'escalation' && this.escalationModel) return this.escalationModel;

    const p = this.createProvider();
    const modelId = this.resolveModelId(tier);
    const model = p(modelId);

    if (tier === 'fast') this.fastModel = model;
    else this.escalationModel = model;

    return model;
  }

  private resolveModelId(tier: ModelTier): string {
    // 1. Explicit env var for this tier takes highest priority
    if (tier === 'fast' && process.env.LLM_FAST_MODEL) {
      return process.env.LLM_FAST_MODEL;
    }
    if (tier === 'escalation' && process.env.LLM_ESCALATION_MODEL) {
      return process.env.LLM_ESCALATION_MODEL;
    }

    // 2. Escalation tier falls back to LLM_MODEL (the configured primary model)
    if (tier === 'escalation') {
      return this.config.model;
    }

    // 3. Fast tier: use provider-specific sensible defaults
    const { provider } = this.config;
    if (provider === 'openai') return 'gpt-4o-mini';
    if (provider === 'google') return 'gemini-2.0-flash-001';
    // openrouter or unknown: fall back to LLM_MODEL
    return this.config.model;
  }

  getCapabilities(): ProviderCapability[] {
    return PROVIDER_CAPABILITIES[this.config.provider] ?? [];
  }

  hasCapability(cap: ProviderCapability): boolean {
    return this.getCapabilities().includes(cap);
  }
}

export function createModelFactory(config: LlmConfig): ModelFactory {
  return new ModelFactoryImpl(config);
}

export function createModelFactoryFromEnv(): ModelFactory {
  // `loadConfig` is imported statically at the top of this ESM module.
  return createModelFactory(loadConfig());
}
```

> **Why static import:** `@open-edu/llm-config` has `"type": "module"`. The CommonJS `require()` function is not available in ESM — a dynamic `require()` would throw at runtime. Use a static `import` (hoisted) instead.

### Step 2.2 — Export from `src/index.ts`

**File:** `packages/llm-config/src/index.ts`

Add to existing exports:

```typescript
export { createModelFactory, createModelFactoryFromEnv } from './model-factory.js';
export type {
  ModelFactory,
  ModelFactoryConfig,
  ModelTier,
  ProviderCapability,
} from './model-factory.js';
export { PROVIDER_CAPABILITIES } from './model-factory.js';
```

### Step 2.3 — Tests for model factory

**File:** `packages/llm-config/src/__tests__/model-factory.test.ts`

Test cases:

1. `createModelFactory` returns a factory with `getModel`, `getCapabilities`, `hasCapability`
2. `getModel('fast')` returns a LanguageModel for openai provider
3. `getModel('escalation')` returns a LanguageModel for openai provider
4. `getCapabilities()` returns correct capabilities for openai (streaming, structured-output, tool-calling)
5. `getCapabilities()` returns correct capabilities for google (streaming, structured-output, tool-calling)
6. `hasCapability('streaming')` returns true for openai
7. `hasCapability('structured-output')` returns true for google
8. Missing API key: factory still constructs (deferred validation)
9. Unknown provider: throws
10. `createModelFactoryFromEnv` reads from environment variables
11. `LLM_FAST_MODEL` env var overrides the default fast model
12. `LLM_ESCALATION_MODEL` env var overrides the default escalation model
13. When `LLM_FAST_MODEL` is not set, falls back to provider default (gpt-4o-mini for openai)
14. When `LLM_ESCALATION_MODEL` is not set, falls back to `LLM_MODEL`

---

## Phase 3: `@open-edu/ai-companion` — Pipili Domain Contracts

### Step 3.1 — Create `src/pipili/types.ts`

**File:** `packages/ai-companion/src/pipili/types.ts`

```typescript
/**
 * Pipili request sent from learner UI to server endpoint.
 */
export interface PipiliRequest {
  conversationId: string;
  messages: PipiliMessage[];
  context: PipiliContextSnapshot;
}

export interface PipiliMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Runtime context snapshot captured by the learner UI at request time.
 */
export interface PipiliContextSnapshot {
  page?: PageContext;
  widget?: WidgetContext;
  lesson?: LessonContext;
  module?: ModuleContext;
  course?: CourseContext;
  notes?: NotesContext;
  assessment?: AssessmentContext;
  learner?: LearnerProfile;
  history?: LearningHistory;
}

export interface PageContext {
  id: string;
  title: string;
  content: string;
  nodeType: string;
}

export interface WidgetContext {
  id: string;
  type: string;
  state: Record<string, unknown>;
  question?: string;
  answer?: string;
  userResponse?: string;
}

export interface LessonContext {
  id: string;
  title: string;
  objectives: string[];
  topics: string[];
}

export interface ModuleContext {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string }>;
}

export interface CourseContext {
  id: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  language: string;
}

export interface NotesContext {
  entries: NoteEntry[];
  searchQuery?: string;
}

export interface NoteEntry {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  pageId?: string;
  lessonId?: string;
}

export interface AssessmentContext {
  isActive: boolean;
  assessmentId?: string;
  questionType?: string;
  questionText?: string;
  maxAttempts?: number;
  attemptsUsed?: number;
  // We do NOT include the answer key in context;
  // the server enforces assessment policy.
}

export interface LearnerProfile {
  language: string;
  readingLevel: string;
  accessibilityProfile?: AccessibilityProfile;
}

export type AccessibilityProfile = 'autism' | 'adhd' | 'dyslexia';

export interface LearningHistory {
  completedLessons: string[];
  recentPages: Array<{ pageId: string; timeSpent: number }>;
  strengths: string[];
  weakConcepts: string[];
}
```

### Step 3.2 — Create `src/pipili/metadata.ts`

**File:** `packages/ai-companion/src/pipili/metadata.ts`

```typescript
export type PipiliMode = 'tutor' | 'coach' | 'reflection' | 'navigator' | 'accessibility';

export interface Citation {
  source: string;
  text: string;
  type: 'lesson' | 'course' | 'note' | 'glossary';
  referenceId?: string;
}

export interface PipiliResponseMetadata {
  mode: PipiliMode;
  citations: Citation[];
  hintLevel?: 1 | 2 | 3 | 4;
  assessmentSafe: boolean;
  suggestedNextSteps: string[];
}

/**
 * Schema for validating metadata embedded in AI SDK data parts.
 */
import { z } from 'zod';

export const citationSchema = z.object({
  source: z.string(),
  text: z.string(),
  type: z.enum(['lesson', 'course', 'note', 'glossary']),
  referenceId: z.string().optional(),
});

export const pipiliResponseMetadataSchema = z.object({
  mode: z.enum(['tutor', 'coach', 'reflection', 'navigator', 'accessibility']),
  citations: z.array(citationSchema),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  assessmentSafe: z.boolean(),
  suggestedNextSteps: z.array(z.string()),
});
```

### Step 3.3 — Create `src/pipili/context-utils.ts`

**File:** `packages/ai-companion/src/pipili/context-utils.ts`

```typescript
import type { PipiliContextSnapshot } from './types.js';

/**
 * Priority order for context selection (highest to lowest):
 * 0. Current page
 * 1. Current widget
 * 2. Current lesson
 * 3. Current module
 * 4. Current course
 * 5. Learner notes
 * 6. Learning history
 * 7. Concept graph (V2 seam)
 * 8. Global knowledge
 */
export const CONTEXT_PRIORITY = [
  'page',
  'widget',
  'lesson',
  'module',
  'course',
  'notes',
  'history',
] as const;

export type ContextSource = (typeof CONTEXT_PRIORITY)[number];

export interface BoundedContextEntry {
  source: ContextSource;
  content: string;
  priority: number;
  truncated: boolean;
}

export interface BoundedContext {
  entries: BoundedContextEntry[];
  totalTokens: number;
  truncated: boolean;
}

const MAX_CONTEXT_TOKENS = 8000;
const TOKEN_ESTIMATE_RATIO = 0.75; // rough estimate: 1 token ≈ 0.75 words

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length / TOKEN_ESTIMATE_RATIO);
}

/**
 * Normalize and bound the context snapshot into a priority-ordered
 * list suitable for prompt construction. Higher priority entries
 * are never truncated in favor of lower priority entries.
 * Returns entries with provenance and truncation markers.
 */
export function boundContext(snapshot: PipiliContextSnapshot): BoundedContext {
  const entries: BoundedContextEntry[] = [];
  let totalTokens = 0;

  for (let i = 0; i < CONTEXT_PRIORITY.length; i++) {
    const source = CONTEXT_PRIORITY[i];
    const content = sourceToContent(snapshot, source);
    if (!content) continue;

    const tokens = estimateTokens(content);
    const remaining = MAX_CONTEXT_TOKENS - totalTokens;

    if (remaining <= 0) break;

    if (tokens <= remaining) {
      entries.push({ source, content, priority: i, truncated: false });
      totalTokens += tokens;
    } else {
      // Truncate content to fit remaining tokens, then truncate further
      // to avoid cutting mid-sentence
      const truncatedContent = truncateToTokens(content, remaining);
      entries.push({ source, content: truncatedContent, priority: i, truncated: true });
      totalTokens += remaining;
    }
  }

  return {
    entries,
    totalTokens,
    truncated: entries.some((e) => e.truncated),
  };
}

function sourceToContent(snapshot: PipiliContextSnapshot, source: ContextSource): string | null {
  switch (source) {
    case 'page': {
      const p = snapshot.page;
      return p ? formatPage(p) : null;
    }
    case 'widget': {
      const w = snapshot.widget;
      return w ? formatWidget(w) : null;
    }
    case 'lesson': {
      const l = snapshot.lesson;
      return l ? formatLesson(l) : null;
    }
    case 'module': {
      const m = snapshot.module;
      return m ? formatModule(m) : null;
    }
    case 'course': {
      const c = snapshot.course;
      return c ? formatCourse(c) : null;
    }
    case 'notes':
      return formatNotes(snapshot.notes);
    case 'history':
      return formatHistory(snapshot.history);
    default:
      return null;
  }
}

function formatPage(ctx: NonNullable<PipiliContextSnapshot['page']>): string {
  return `[Current Page]\nTitle: ${ctx.title}\nType: ${ctx.nodeType}\nContent:\n${ctx.content}`;
}

function formatWidget(ctx: NonNullable<PipiliContextSnapshot['widget']>): string {
  return `[Current Widget]\nType: ${ctx.type}\nState: ${JSON.stringify(ctx.state)}`;
}

function formatLesson(ctx: NonNullable<PipiliContextSnapshot['lesson']>): string {
  const objectives = ctx.objectives.map((o) => `- ${o}`).join('\n');
  const topics = ctx.topics.join(', ');
  return `[Current Lesson]\nTitle: ${ctx.title}\nObjectives:\n${objectives}\nTopics: ${topics}`;
}

function formatModule(ctx: NonNullable<PipiliContextSnapshot['module']>): string {
  const lessons = ctx.lessons.map((l) => `- ${l.title}`).join('\n');
  return `[Current Module]\nTitle: ${ctx.title}\nLessons:\n${lessons}`;
}

function formatCourse(ctx: NonNullable<PipiliContextSnapshot['course']>): string {
  return `[Course]\nTitle: ${ctx.title}\nDescription: ${ctx.description}\nSubject: ${ctx.subject}\nLevel: ${ctx.level}\nLanguage: ${ctx.language}`;
}

function formatNotes(notes: PipiliContextSnapshot['notes']): string | null {
  if (!notes || notes.entries.length === 0) return null;
  const formatted = notes.entries.map((n) => `[Note: ${n.title}]\n${n.content}`).join('\n\n');
  return `[Learner Notes]\n${formatted}`;
}

function formatHistory(history: PipiliContextSnapshot['history']): string | null {
  if (!history) return null;
  const strengths =
    history.strengths.length > 0 ? `Strengths: ${history.strengths.join(', ')}` : '';
  const weak =
    history.weakConcepts.length > 0 ? `Weak concepts: ${history.weakConcepts.join(', ')}` : '';
  if (!strengths && !weak) return null;
  return `[Learning History]\n${strengths}\n${weak}`;
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxWords = Math.floor(maxTokens * TOKEN_ESTIMATE_RATIO);
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  // Find last sentence boundary
  const truncated = words.slice(0, maxWords).join(' ');
  const lastSentence = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('\n'),
  );
  if (lastSentence > maxWords * 0.5) {
    return truncated.slice(0, lastSentence + 1) + ' [truncated]';
  }
  return truncated + ' [truncated]';
}
```

### Step 3.4 — Create `src/pipili/hint-utils.ts`

**File:** `packages/ai-companion/src/pipili/hint-utils.ts`

```typescript
export type HintLevel = 1 | 2 | 3 | 4;

/**
 * Hint progression levels:
 * Level 1: Conceptual nudge — redirect attention to relevant concept
 * Level 2: Scaffolded hint — partial approach without the answer
 * Level 3: Detailed walkthrough — step-by-step approach
 * Level 4: Full explanation — complete solution walkthrough
 *
 * The model must ask for learner effort before providing level 4.
 */

export interface HintRequest {
  currentLevel: HintLevel;
  requestedLevel: HintLevel;
  learnerHasAttempted: boolean;
  assessmentActive: boolean;
}

/**
 * Determine the actual hint level to serve based on policy:
 * - Cannot jump more than 1 level at a time
 * - Level 4 requires learnerHasAttempted = true (or explicit request)
 * - During assessment, cap at level 3
 */
export function resolveHintLevel(req: HintRequest): HintLevel {
  if (req.assessmentActive && req.requestedLevel >= 4) return 3;

  // Cannot skip more than one level
  const maxAllowed = Math.min(req.currentLevel + 1, 4) as HintLevel;
  if (req.requestedLevel > maxAllowed) return maxAllowed;

  // Level 4 requires demonstrated effort
  if (req.requestedLevel === 4 && !req.learnerHasAttempted) return 3;

  return req.requestedLevel as HintLevel;
}

/**
 * Hint instruction fragments for each level, used in system prompt.
 */
export const HINT_INSTRUCTIONS: Record<HintLevel, string> = {
  1: 'Provide a conceptual nudge. Point the learner toward the relevant concept or approach without revealing the solution. Ask a guiding question.',
  2: 'Provide a scaffolded hint. Give a high-level approach or partial strategy, but do not solve the problem. Suggest one technique or principle.',
  3: 'Provide a detailed walkthrough. Break the problem into steps and explain the reasoning at each step. The learner should still need to combine the steps themselves.',
  4: 'Provide a complete explanation. Walk through the full solution with reasoning. Confirm the learner attempted the problem first. Encourage reflection.',
};
```

### Step 3.5 — Create `src/pipili/index.ts` (barrel)

**File:** `packages/ai-companion/src/pipili/index.ts`

```typescript
export type {
  PipiliRequest,
  PipiliMessage,
  PipiliContextSnapshot,
  PageContext,
  WidgetContext,
  LessonContext,
  ModuleContext,
  CourseContext,
  NotesContext,
  NoteEntry,
  AssessmentContext,
  LearnerProfile,
  AccessibilityProfile,
  LearningHistory,
} from './types.js';

export type { PipiliMode, Citation, PipiliResponseMetadata } from './metadata.js';

export { citationSchema, pipiliResponseMetadataSchema } from './metadata.js';

export { boundContext, CONTEXT_PRIORITY } from './context-utils.js';

export type { BoundedContext, BoundedContextEntry, ContextSource } from './context-utils.js';

export { resolveHintLevel, HINT_INSTRUCTIONS } from './hint-utils.js';

export type { HintLevel, HintRequest } from './hint-utils.js';
```

### Step 3.6 — Update `packages/ai-companion/src/index.ts`

**File:** `packages/ai-companion/src/index.ts`

Add to existing exports:

```typescript
export * from './pipili/index.js';
```

### Step 3.7 — Tests for Pipili domain contracts

**File:** `packages/ai-companion/src/__tests__/pipili-context-utils.test.ts`

Test cases:

1. `boundContext` returns empty entries for empty snapshot
2. `boundContext` includes page context when present
3. `boundContext` orders entries by priority (page > widget > lesson > course)
4. `boundContext` truncates lower priority entries when token budget exceeded
5. `boundContext` never truncates page entry if widget/course entries can be truncated instead
6. `boundContext` marks entries as `truncated: true` when content is cut
7. `boundContext.totalTokens` is within MAX_CONTEXT_TOKENS
8. Content that fits entirely is not truncated
9. `boundContext` handles overflow by stopping (no entries beyond budget)
10. Truncation preserves sentence boundaries

**File:** `packages/ai-companion/src/__tests__/pipili-hint-utils.test.ts`

Test cases:

1. `resolveHintLevel` allows level 1 → 2 progression
2. `resolveHintLevel` allows level 2 → 3 progression
3. `resolveHintLevel` caps at currentLevel + 1 (can't skip)
4. `resolveHintLevel` requires learnerHasAttempted for level 4
5. `resolveHintLevel` caps at level 3 during assessment
6. `resolveHintLevel` returns exact match when within bounds
7. `HINT_INSTRUCTIONS` has entries for all 4 levels

**File:** `packages/ai-companion/src/__tests__/pipili-metadata.test.ts`

Test cases:

1. `pipiliResponseMetadataSchema` validates correct metadata
2. `pipiliResponseMetadataSchema` rejects missing assessmentSafe
3. `pipiliResponseMetadataSchema` accepts optional hintLevel
4. `citationSchema` validates correct citation
5. `citationSchema` rejects invalid citation type

---

## Phase 4: Server-Side Pipili Endpoint

### Step 4.1 — Create endpoint directory structure

```bash
mkdir -p apps/learner/src/pipili
```

### Step 4.2 — Create `src/pipili/config.ts`

**File:** `apps/learner/src/pipili/config.ts`

```typescript
import { z } from 'zod';

export const PIPILI_CONFIG = {
  MAX_MESSAGES: 50,
  MAX_MESSAGE_LENGTH: 4000,
  MAX_CONTEXT_SIZE: 8000,
  MAX_REQUEST_SIZE_BYTES: 100 * 1024, // 100 KB
  MAX_CONVERSATION_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  FAST_MODEL_TIMEOUT_MS: 30_000,
  ESCALATION_MODEL_TIMEOUT_MS: 60_000,
} as const;

export const pipiliMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(PIPILI_CONFIG.MAX_MESSAGE_LENGTH),
  timestamp: z.number(),
});

export const pipiliContextSchema = z.object({
  page: z
    .object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      nodeType: z.string(),
    })
    .optional(),
  widget: z
    .object({
      id: z.string(),
      type: z.string(),
      state: z.record(z.string(), z.unknown()),
    })
    .optional(),
  lesson: z
    .object({
      id: z.string(),
      title: z.string(),
      objectives: z.array(z.string()),
      topics: z.array(z.string()),
    })
    .optional(),
  module: z
    .object({
      id: z.string(),
      title: z.string(),
      lessons: z.array(z.object({ id: z.string(), title: z.string() })),
    })
    .optional(),
  course: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      subject: z.string(),
      level: z.string(),
      language: z.string(),
    })
    .optional(),
  notes: z
    .object({
      entries: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          content: z.string(),
          createdAt: z.number(),
          pageId: z.string().optional(),
          lessonId: z.string().optional(),
        }),
      ),
      searchQuery: z.string().optional(),
    })
    .optional(),
  assessment: z
    .object({
      isActive: z.boolean(),
      assessmentId: z.string().optional(),
      questionType: z.string().optional(),
      questionText: z.string().optional(),
      maxAttempts: z.number().optional(),
      attemptsUsed: z.number().optional(),
    })
    .optional(),
  learner: z
    .object({
      language: z.string(),
      readingLevel: z.string(),
      accessibilityProfile: z.enum(['autism', 'adhd', 'dyslexia']).optional(),
    })
    .optional(),
  history: z
    .object({
      completedLessons: z.array(z.string()),
      recentPages: z.array(z.object({ pageId: z.string(), timeSpent: z.number() })),
      strengths: z.array(z.string()),
      weakConcepts: z.array(z.string()),
    })
    .optional(),
});

export const pipiliRequestSchema = z.object({
  conversationId: z.string().min(1),
  messages: z.array(pipiliMessageSchema).max(PIPILI_CONFIG.MAX_MESSAGES),
  context: pipiliContextSchema,
});
```

### Step 4.3 — Create `src/pipili/policy.ts`

**File:** `apps/learner/src/pipili/policy.ts`

```typescript
import type {
  AccessibilityProfile,
  BoundedContext,
  Citation,
  PipiliMode,
  PipiliResponseMetadata,
} from '@open-edu/ai-companion';

export interface SystemPromptParams {
  boundedContext: BoundedContext;
  assessmentActive: boolean;
  learnerLanguage: string;
  readingLevel: string;
  accessibilityProfile?: AccessibilityProfile;
}

export function buildSystemPrompt(params: SystemPromptParams): string {
  const { boundedContext, assessmentActive, accessibilityProfile } = params;

  let prompt = `You are Pipili, a learning companion in the OpenEdu platform. Your role is to help learners understand, reflect, and progress through their educational content.

## Educational Context
${boundedContext.entries.map((e) => `### ${e.source}\n${e.content}`).join('\n\n')}

## Response Guidelines
1. Start with a direct answer or first useful hint.
2. Ground your explanation in the strongest available educational source from the context above.
3. Include a small example where useful.
4. End with a reflection prompt or check for understanding.
5. Suggest one concrete next step.

## Core Rules
- Guide learning rather than maximize answer completion.
- Ask for learner effort before providing level-4 walkthroughs.
- Do not change topics unless the learner explicitly asks.
- If information is absent from the provided context, say: "I cannot find that information in the current course" and offer a safe way to continue.
- NEVER invent course facts, citations, or educational content not present in the context.

`;

  if (assessmentActive) {
    prompt += `## Assessment Mode (ACTIVE)
- Do NOT reveal the answer, answer choice, or answer key.
- Do NOT solve the entire active assessment.
- You MAY: explain concepts, compare approaches, ask about reasoning, provide progressive hints.
- The question being assessed is provided in the context — reference it but do not solve it.
`;
  }

  if (accessibilityProfile) {
    prompt += `## Accessibility Adaptation
${getAccessibilityInstructions(accessibilityProfile)}
`;
  }

  // NOTE: the model is NOT asked to emit JSON metadata. Metadata (mode,
  // citations, hintLevel, assessmentSafe, suggestedNextSteps) is derived
  // server-side in extractMetadata() and delivered to the UI as AI SDK
  // message metadata — per spec: "It is not requested as free-form JSON
  // inside the visible response text."

  return prompt;
}

function getAccessibilityInstructions(profile: AccessibilityProfile): string {
  switch (profile) {
    case 'autism':
      return `- Use predictable headings and structure.
- Use literal, concrete wording — avoid metaphors and sarcasm.
- Keep paragraphs short and well-separated.
- Give clear, numbered instructions.
- Avoid unnecessary sensory language or emotional tone.`;

    case 'adhd':
      return `- Chunk content into small, scannable sections.
- Highlight key points at the start.
- Use short, actionable steps.
- Provide visible progress cues (e.g., "Step 2 of 4").
- Keep responses concise and avoid tangents.`;

    case 'dyslexia':
      return `- Use simpler wording and shorter sentences.
- Reduce dense prose — prefer bullet points and lists.
- Avoid complex sentence structures with multiple clauses.
- Use consistent terminology throughout.
- Break explanations into digestible parts.`;

    default:
      return '';
  }
}

export function isAssessmentActive(context: { assessment?: { isActive?: boolean } }): boolean {
  return context.assessment?.isActive === true;
}

/**
 * Derive PipiliResponseMetadata deterministically from the finished response
 * and policy state — never parse model-emitted JSON. This is the single
 * source of truth the UI uses to render citations, hints, and next steps.
 *
 * @param text       - the full assistant text produced by the model
 * @param boundedContext - the bounded context used for the request
 * @param assessmentActive - whether assessment policy constrained the request
 * @param toolCalls  - tool calls the model made (used to mark citations)
 */
export interface ExtractMetadataParams {
  text: string;
  boundedContext: BoundedContext;
  assessmentActive: boolean;
  toolCalls?: ReadonlyArray<{ toolName: string }>;
}

export function extractMetadata(params: ExtractMetadataParams): PipiliResponseMetadata {
  const { text, boundedContext, assessmentActive, toolCalls } = params;

  // 1. mode — derived from intent heuristics; the model never claims a mode.
  const mode = inferMode(text, toolCalls);

  // 2. citations — sourced from the bounded context entries the response
  //    references. We link each included context source to a Citation so the
  //    UI can tie claims back to course/lesson/notes provenance.
  const citations = deriveCitations(boundedContext, text);

  // 3. hintLevel — only set when a progressive hint tool was invoked.
  const hintLevel = inferHintLevel(toolCalls);

  // 4. assessmentSafe — set only when assessment policy was active AND the
  //    text does not appear to leak the answer key (heuristic guardrail).
  const assessmentSafe = assessmentActive ? !looksLikeAnswerLeak(text) : true;

  // 5. suggestedNextSteps — derived from the final sentence of the response
  //    when it reads like a next step, else from weak concepts in history.
  const suggestedNextSteps = deriveNextSteps(text, boundedContext);

  return {
    mode,
    citations,
    hintLevel,
    assessmentSafe,
    suggestedNextSteps,
  };
}

function inferMode(text: string, toolCalls?: ReadonlyArray<{ toolName: string }>): PipiliMode {
  if (toolCalls?.some((t) => t.toolName === 'createProgressiveHint')) {
    return 'coach';
  }
  const t = text.toLowerCase();
  if (t.includes('reflect') || t.includes('what do you think')) {
    return 'reflection';
  }
  if (t.includes('let me find') || t.includes('search your notes')) {
    return 'navigator';
  }
  // default learning interaction
  return 'tutor';
}

function deriveCitations(boundedContext: BoundedContext, text: string): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const entry of boundedContext.entries) {
    // Cite a source if a distinctive phrase from its content appears in the
    // response. Use the entry's first non-header line as a proxy signature.
    const signature = entry.content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith('[') && !l.startsWith('Title:'));
    if (!signature) continue;
    if (text.includes(signature.slice(0, 40)) && !seen.has(entry.source)) {
      seen.add(entry.source);
      citations.push({
        source: entry.source,
        text: signature.slice(0, 160),
        type:
          entry.source === 'notes' ? 'note' : entry.source === 'history' ? 'glossary' : 'lesson',
      });
    }
  }
  return citations;
}

function inferHintLevel(
  toolCalls?: ReadonlyArray<{ toolName: string }>,
): 1 | 2 | 3 | 4 | undefined {
  // The createProgressiveHint tool returns the resolved level in its output.
  // The handler passes that output back via toolResults; here we only mark
  // presence, leaving exact level parsing to the tool-result metadata path
  // (a follow-up can look up the tool result via onFinish's toolResults).
  return toolCalls?.some((t) => t.toolName === 'createProgressiveHint') ? 1 : undefined;
}

function looksLikeAnswerLeak(text: string): boolean {
  // Conservative heuristic: flag if the response states "the answer is"
  // followed by a short token. This is a guardrail, not a substitute for the
  // assessment policy in the system prompt.
  return /\bthe answer is\b/i.test(text) && text.length < 200;
}

function deriveNextSteps(text: string, _boundedContext: BoundedContext): string[] {
  // Take the last sentence if it reads like a directive ("Try ...", "Next, ...").
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const last = sentences[sentences.length - 1] ?? '';
  const directives = [/^try\b/i, /^next\b/i, /^you (could|might|should)\b/i, /^consider\b/i];
  if (directives.some((re) => re.test(last.trim()))) {
    return [last.trim()];
  }
  return [];
}
```

### Step 4.4 — Create `src/pipili/tools.ts`

**File:** `apps/learner/src/pipili/tools.ts`

```typescript
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Create the tool registry for Pipili.
 * Each tool uses explicit Zod input schemas and bounded outputs.
 * Tools are scoped to the active learner and course context.
 */
export function createToolRegistry(
  contextGetter: () => {
    courseId?: string;
    lessonId?: string;
    learnerId?: string;
    // Additional context accessors as needed
  },
) {
  const getCurrentPageContext = tool({
    description:
      'Returns the current page and widget content already authorized by runtime context.',
    parameters: z.object({}),
    execute: async () => {
      const ctx = contextGetter();
      // Return content from the current request's bounded context
      // In production, this reads from the authenticated session
      return { pageContent: 'Current page content from runtime context' };
    },
  });

  const getCurrentLessonContext = tool({
    description: 'Returns objectives, content, and activities for the active lesson.',
    parameters: z.object({}),
    execute: async () => {
      const ctx = contextGetter();
      return {
        lessonId: ctx.lessonId,
        objectives: [],
        content: [],
      };
    },
  });

  const searchNotes = tool({
    description: 'Searches learner-owned notes using the existing notes service/storage boundary.',
    parameters: z.object({
      query: z.string().describe('Search query for notes'),
      maxResults: z.number().default(5).describe('Maximum number of results'),
    }),
    execute: async ({ query, maxResults }) => {
      const ctx = contextGetter();
      // In production, this calls the existing notes storage service
      return {
        query,
        results: [] as Array<{ id: string; title: string; excerpt: string }>,
      };
    },
  });

  const getRelevantNotes = tool({
    description: 'Retrieves bounded note excerpts selected by searchNotes.',
    parameters: z.object({
      noteIds: z.array(z.string()).describe('Note IDs to retrieve'),
    }),
    execute: async ({ noteIds }) => {
      // In production, fetches full note contents by ID
      return {
        notes: [] as Array<{ id: string; title: string; content: string }>,
      };
    },
  });

  const getLearningHistory = tool({
    description: 'Returns only the history fields needed for current guidance.',
    parameters: z.object({
      fields: z
        .array(z.enum(['completedLessons', 'strengths', 'weakConcepts']))
        .default(['strengths', 'weakConcepts']),
    }),
    execute: async ({ fields }) => {
      return {
        completedLessons: [] as string[],
        strengths: [] as string[],
        weakConcepts: [] as string[],
      };
    },
  });

  const findRelatedConcepts = tool({
    description:
      'Finds concepts related to the given topic using available course/glossary data. Ready for V2 concept graph integration.',
    parameters: z.object({
      concept: z.string().describe('The concept to find relations for'),
      maxResults: z.number().default(5),
    }),
    execute: async ({ concept, maxResults }) => {
      return {
        concept,
        related: [] as Array<{
          name: string;
          relationship: string;
          definition: string;
        }>,
      };
    },
  });

  const createProgressiveHint = tool({
    description:
      'Produces or selects a hint level constrained by learner effort and assessment state.',
    parameters: z.object({
      topic: z.string().describe('The topic or problem to hint about'),
      requestedLevel: z
        .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
        .describe('Requested hint level (1-4)'),
      learnerHasAttempted: z
        .boolean()
        .describe('Whether the learner has demonstrated effort on this problem'),
    }),
    execute: async ({ topic, requestedLevel, learnerHasAttempted }) => {
      const ctx = contextGetter();
      const { resolveHintLevel, HINT_INSTRUCTIONS } = await import('@open-edu/ai-companion');

      const actualLevel = resolveHintLevel({
        currentLevel: 1,
        requestedLevel,
        learnerHasAttempted,
        assessmentActive: false,
      });

      return {
        topic,
        level: actualLevel,
        instruction: HINT_INSTRUCTIONS[actualLevel],
      };
    },
  });

  return {
    getCurrentPageContext,
    getCurrentLessonContext,
    searchNotes,
    getRelevantNotes,
    getLearningHistory,
    findRelatedConcepts,
    createProgressiveHint,
  };
}

export type PipiliToolRegistry = ReturnType<typeof createToolRegistry>;
```

### Step 4.5 — Create `src/pipili/handler.ts` (orchestration)

**File:** `apps/learner/src/pipili/handler.ts`

This handler uses the AI SDK v7 **UI Message Stream** protocol:

- `convertToModelMessages(messages)` to turn `UIMessage[]` (with `parts`) into model messages.
- `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream, messageMetadata }) })` to stream text + typed `PipiliResponseMetadata` back to the client. **Metadata is delivered as AI SDK message metadata, never as free-form JSON inside visible text** (per spec).
- `maxSteps` enables multi-turn tool chaining (e.g. `searchNotes` → `getRelevantNotes`).
- The model factory is created **once** (module-level singleton) so cached `LanguageModelV1` instances are reused across requests.

```typescript
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { createModelFactory, loadConfig, type ModelFactory } from '@open-edu/llm-config';
import {
  boundContext,
  pipiliResponseMetadataSchema,
  type PipiliContextSnapshot,
  type PipiliResponseMetadata,
} from '@open-edu/ai-companion';
import { PIPILI_CONFIG, pipiliContextSchema, pipiliRequestSchema } from './config.js';
import { buildSystemPrompt, isAssessmentActive, extractMetadata } from './policy.js';
import { createToolRegistry } from './tools.js';
import type { IncomingMessage, ServerResponse } from 'http';

export interface PipiliHandlerOptions {
  // Extensibility: future telemetry, teacher insights, etc.
}

// Module-level singleton. Created lazily so a missing API key does not crash
// import time — it only fails when a request actually needs a model.
let modelFactory: ModelFactory | null = null;
function getModelFactory(): ModelFactory {
  if (!modelFactory) modelFactory = createModelFactory(loadConfig());
  return modelFactory;
}

/**
 * Create the Pipili chat handler. Returns a function compatible with
 * Vite middleware or an Express/connect-style handler.
 *
 * The request body is a `PipiliRequest`:
 *   { conversationId, messages: UIMessage[], context: PipiliContextSnapshot }
 *
 * `messages` are AI SDK UIMessages (with `parts`), not plain `{role,content}`.
 * The transport on the client (DefaultChatTransport) sends UIMessages.
 */
export function createPipiliHandler(_options?: PipiliHandlerOptions) {
  return async function pipiliHandler(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<Response | void> {
    // 1. Validate HTTP method
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
      return;
    }

    // 2. Read and parse body (size-limited)
    let raw: unknown;
    try {
      raw = await readRequestBody(req);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'PAYLOAD_ERROR';
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message }));
      return;
    }

    // 3. Validate the Pipili request envelope + context snapshot.
    //    NOTE: `messages` is validated as an array of objects (UIMessage shape
    //    is enforced loosely here; AI SDK's convertToModelMessages will
    //    enforce the parts schema strictly). The context snapshot is fully
    //    validated via pipiliContextSchema.
    let conversationId: string;
    let messages: UIMessage[];
    let context: PipiliContextSnapshot;
    try {
      const parsed = pipiliRequestSchema.parse(raw);
      conversationId = parsed.conversationId;
      messages = parsed.messages as unknown as UIMessage[];
      context = pipiliContextSchema.parse(parsed.context) as PipiliContextSnapshot;

      if (contextStrLen(parsed.context) > PIPILI_CONFIG.MAX_REQUEST_SIZE_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'CONTEXT_TOO_LARGE' }));
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'VALIDATION_ERROR';
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'VALIDATION_ERROR', message }));
      return;
    }

    // 4. Determine assessment mode (policy gate — checked before any model call)
    const assessmentActive = isAssessmentActive(context);

    // 5. Resolve learner profile
    const learnerLanguage = context.learner?.language ?? 'en';
    const readingLevel = context.learner?.readingLevel ?? 'secondary';
    const accessibilityProfile = context.learner?.accessibilityProfile;

    // 6. Normalize and bound context (priority-ordered, deterministically truncated)
    const boundedCtx = boundContext(context);

    // 7. Build system instructions. NOTE: the instructions do NOT ask the model
    //    to emit a JSON metadata block — metadata is produced server-side in
    //    the messageMetadata callback (step 11) so it is validated, not
    //    free-form text (per spec).
    const instructions = buildSystemPrompt({
      boundedContext: boundedCtx,
      assessmentActive,
      learnerLanguage,
      readingLevel,
      accessibilityProfile,
    });

    // 8. Convert UIMessages (with parts) to CoreMessage[] for the model.
    const modelMessages = await convertToModelMessages(messages);

    // 9. Select model tier (fast vs escalation).
    const factory = getModelFactory();
    const isComplex = checkComplexity(messages);
    const model = factory.getModel(isComplex ? 'escalation' : 'fast');

    // 10. Tool registry — scoped to the active request's context.
    const tools = createToolRegistry(() => ({
      courseId: context.course?.id,
      lessonId: context.lesson?.id,
    }));

    // 11. Stream. maxSteps allows chained tool calls (e.g. searchNotes then
    //     getRelevantNotes). The onFinish callback logs telemetry only.
    //     Response metadata is derived in the messageMetadata callback (step 12)
    //     — never emitted by the model as JSON.
    const cfg = loadConfig();
    try {
      const result = streamText({
        model,
        system: instructions,
        messages: modelMessages,
        tools,
        maxSteps: 3,
        maxTokens: PIPILI_CONFIG.MAX_CONTEXT_SIZE,
        temperature: cfg.temperature,
        onFinish: async ({ text, usage, toolCalls }) => {
          // server telemetry seam (V2: InterventionProvider)
          // NOTE: never persist provider/credential internals here.
          console.log('Pipili response finished', {
            conversationId,
            assessmentActive,
            isComplex,
            tokensUsed: usage,
            toolCallCount: toolCalls?.length ?? 0,
          });
        },
      });

      // 12. Convert the AI SDK stream to a UI Message Stream Response.
      //     messageMetadata is invoked for `start` and `finish` parts; we
      //     synthesize the validated PipiliResponseMetadata on `finish`.
      return createUIMessageStreamResponse({
        stream: toUIMessageStream({
          stream: result.stream,
          originalMessages: messages,
          messageMetadata: ({ part }) => {
            if (part.type === 'finish') {
              // Extract metadata from the finished text + assessment policy.
              // extractMetadata never trusts model-emitted JSON; it is derived.
              //
              // NOTE on the `finish` part shape: AI SDK v7's `finish` part
              // carries `text` (the fully assembled assistant text), `toolCalls`,
              // and `totalUsage`. If the installed patch version does not expose
              // `part.text`, fall back to capturing the assembled text in the
              // `streamText` `onFinish` closure (which always receives `text`)
              // and read it here via a closure variable. Prefer `part.text`
              // since it avoids ordering concerns between the two callbacks.
              const finishText =
                typeof (part as { text?: string }).text === 'string'
                  ? (part as { text?: string }).text!
                  : '';
              const meta = extractMetadata({
                text: finishText,
                boundedContext: boundedCtx,
                assessmentActive,
                toolCalls: (part as { toolCalls?: Array<{ toolName: string }> }).toolCalls,
              });
              // Validate before handing to the client.
              const safe = pipiliResponseMetadataSchema.safeParse(meta);
              return safe.success ? safe.data : null;
            }
            return undefined;
          },
          onError: (error) => {
            // Never leak provider internals to the client.
            if (error == null) return 'unknown error';
            if (typeof error === 'string') return error;
            if (error instanceof Error) return error.message;
            return 'internal error';
          },
        }),
        status: 200,
      });
    } catch (err: unknown) {
      // Handler-level errors (e.g. model construction failure) before stream.
      console.error('Pipili orchestration error:', err);
      const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';

      let errorCode = 'INTERNAL_ERROR';
      if (message.includes('401') || message.includes('Unauthorized')) {
        errorCode = 'PROVIDER_AUTH_ERROR';
      } else if (message.includes('429') || message.includes('rate')) {
        errorCode = 'PROVIDER_RATE_LIMITED';
      } else if (message.includes('timeout') || message.includes('abort')) {
        errorCode = 'TIMEOUT';
      } else if (message.includes('Unknown provider')) {
        errorCode = 'PROVIDER_CONFIG_ERROR';
      }

      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorCode, message }));
      }
    }
  };
}

// Vite middleware returns void; the createUIMessageStreamResponse returns a
// Response object. We adapt it to Node's IncomingMessage/ServerResponse in
// the wiring step (4.7) by piping the Response body through res. This helper
// keeps the handler logic readable during tests (which use Request/Response).

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length > PIPILI_CONFIG.MAX_REQUEST_SIZE_BYTES) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function contextStrLen(context: unknown): number {
  try {
    return JSON.stringify(context).length;
  } catch {
    return 0;
  }
}

function checkComplexity(messages: UIMessage[]): boolean {
  // Escalate only for clearly heavy requests. We deliberately avoid matching
  // "why" (far too broad — most reflective questions contain it) and instead
  // require explicit phrasing or a long message.

  // text parts of the last user message
  const last = messages[messages.length - 1];
  if (!last) return false;
  const text = last.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
    .toLowerCase();

  if (text.length > 400) return true;

  const complexityIndicators = [
    'explain in detail',
    'step by step',
    'step-by-step',
    'compare and contrast',
    'walk me through',
    'in depth analysis',
    'comprehensive explanation',
  ];
  return complexityIndicators.some((ind) => text.includes(ind));
}
```

> **Adapting `Response` → Node `ServerResponse`:** `createUIMessageStreamResponse` returns a Web `Response` (the fetch standard shape), but Vite dev-server middleware uses Node's `IncomingMessage`/`ServerResponse`. Step 4.7 wraps the handler with a small adapter that pipes the `Response.body` ReadableStream into `res` and forwards status/headers. This keeps the handler's orchestration logic portable (usable in tests with Web `Request`/`Response`) and isolates the Node adapter to a single wiring function.

### Step 4.6 — Create `src/pipili/index.ts` (barrel)

**File:** `apps/learner/src/pipili/index.ts`

```typescript
export { createPipiliHandler } from './handler.js';
export type { PipiliHandlerOptions } from './handler.js';
```

### Step 4.7 — Create the Node middleware adapter and register the endpoint

**File:** `apps/learner/src/pipili/node-adapter.ts`

The handler returns a Web `Response` (the AI SDK's portable shape). Vite's `configureServer` middleware uses Node's `IncomingMessage`/`ServerResponse`. This adapter pipes one into the other so orchestration logic stays Web-`Request`/`Response`-native (and testable with `Request`).

```typescript
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Pipe a Web Response (from createUIMessageStreamResponse) into a Node
 * ServerResponse. Forwards status, headers, and the ReadableStream body.
 */
export async function pipeResponse(res: ServerResponse, response: Response): Promise<void> {
  // Forward status + headers
  res.writeHead(response.status, Object.fromEntries(response.headers));

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        break;
      }
      res.write(value);
      // Flush for true streaming (Node handles backpressure automatically).
    }
  } catch {
    if (!res.writableEnded) res.end();
  }
}
```

**File:** `apps/learner/vite.config.ts`

Add after existing middleware registration:

```typescript
// Add imports at top:
import { createPipiliHandler } from './src/pipili/index.js';
import { pipeResponse } from './src/pipili/node-adapter.js';

// In server -> configureServer, add before or after llmProxyHandler:
const pipiliHandler = createPipiliHandler();
server.middlewares.use('/api/pipili', async (req, res, next) => {
  // Only handle /api/pipili/chat
  if (req.url?.startsWith('/chat')) {
    try {
      const response = (await pipiliHandler(req, res)) as unknown as Response;
      // The handler may have already responded (validation/error path returns void
      // by writing directly to res). If it returned a Response, pipe it.
      if (response && !res.headersSent) {
        await pipeResponse(res, response);
      }
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INTERNAL_ERROR' }));
      }
    }
    return;
  }
  next();
});
```

> **Note on the handler's two return paths:** In the happy path the handler returns a Web `Response` (from `createUIMessageStreamResponse`) and the middleware pipes it into `res`. In validation/error paths the handler writes JSON status/error directly to `res` (since `headersSent` is already true) and returns the pre-written `Response` is ignored by the `!res.headersSent` guard. Keep the guard so we never write headers twice.

---

## Phase 5: Server-Side Tests

### Step 5.1 — Create `src/pipili/__tests__/handler.test.ts`

**File:** `apps/learner/src/pipili/__tests__/handler.test.ts`

Test cases (mock provider responses; the model is stubbed with a `MockLanguageModelV1` whose stream yields fixed text deltas — see AI SDK `MockUIMessageStreamID` / `simulateReadableStream`):

1. `POST /api/pipili/chat` returns 200 with a UI Message Stream body for a valid request
2. Returns 405 for non-POST methods
3. Returns 400 for invalid body (missing messages)
4. Returns 400 for invalid body (Zod validation failures)
5. Returns 413 for oversized context
6. Assessment mode prevents direct answers — verify the `system` arg passed to `streamText` includes assessment policy
7. `convertToModelMessages` is invoked on the incoming UIMessages (assert called once)
8. Fast model selected for simple queries (assert `getModel('fast')`)
9. Escalation model selected for complex queries (assert `getModel('escalation')`); "why" alone does NOT escalate
10. Tool registry includes all 7 tools
11. `streamText` is called with `maxSteps: 3`
12. Missing LLM config / unknown provider returns 500 with `PROVIDER_CONFIG_ERROR` (handler-level catch, before headers sent)
13. Provider 401 surfaces as stream error with `PROVIDER_AUTH_ERROR` channel; provider internals are NOT exposed
14. Provider 429 surfaces as `PROVIDER_RATE_LIMITED`
15. Stream interruption (client disconnect) does not persist a partial assistant message as complete
16. `messageMetadata` callback emits a `PipiliResponseMetadata` on the `finish` part that validates against `pipiliResponseMetadataSchema`
17. Metadata is delivered as AI SDK message metadata (`message.metadata.*`), never as JSON text inside the visible stream
18. Accessibility profile injects the correct adaptation instruction block in the system prompt

### Step 5.2 — Create `src/pipili/__tests__/policy.test.ts`

**File:** `apps/learner/src/pipili/__tests__/policy.test.ts`

Test cases:

1. `buildSystemPrompt` includes context entries in prompt
2. `buildSystemPrompt` includes assessment mode instructions when active
3. `buildSystemPrompt` includes autism accessibility instructions
4. `buildSystemPrompt` includes ADHD accessibility instructions
5. `buildSystemPrompt` includes dyslexia accessibility instructions
6. `buildSystemPrompt` excludes assessment section when not active
7. `buildSystemPrompt` excludes accessibility when no profile set
8. `buildSystemPrompt` does NOT ask the model to emit a JSON metadata block (assert no `metadata` heading in prompt)
9. `isAssessmentActive` returns true when assessment is active
10. `isAssessmentActive` returns false when assessment is not active
11. `isAssessmentActive` returns false when assessment field is missing
12. `extractMetadata` returns `mode: 'coach'` when `createProgressiveHint` tool was called
13. `extractMetadata` returns `mode: 'reflection'` when response text contains "reflect"
14. `extractMetadata` returns `assessmentSafe: false` when assessment active and answer-leak heuristic matches
15. `extractMetadata` returns `assessmentSafe: true` when assessment active but text is clean
16. `extractMetadata` returns `assessmentSafe: true` when assessment not active
17. `extractMetadata` derives a citation when response text repeats a context signature
18. `extractMetadata` returns empty citations when no context signature is found in text
19. `extractMetadata` returns a suggested next step when last sentence is a directive
20. `extractMetadata` returns matching output against `pipiliResponseMetadataSchema`

### Step 5.3 — Create `src/pipili/__tests__/tools.test.ts`

**File:** `apps/learner/src/pipili/__tests__/tools.test.ts`

Test cases:

1. `createToolRegistry` returns an object with all 7 tools
2. `getCurrentPageContext` executes without error
3. `searchNotes` validates query parameter
4. `searchNotes` rejects missing query
5. `getRelevantNotes` validates noteIds array
6. `createProgressiveHint` resolves hint level correctly
7. Tool execute functions are bounded (no file/network access)
8. All tools have explicit Zod schemas

---

## Phase 6: Learner UI — Streaming Chat Integration

### Step 6.1 — Create `src/ai/PipiliChatProvider.tsx`

**File:** `apps/learner/src/ai/PipiliChatProvider.tsx`

This component wraps the AI SDK v7 `useChat` hook (`@ai-sdk/react`) and bridges it with the existing OpenEdu companion state. Key v7 specifics:

- `useChat` is imported from **`@ai-sdk/react`** (the `ai/react` subpath is the v3/v4 path and does not exist in v7).
- Transport is configured via **`new DefaultChatTransport({ api, prepareSendMessagesRequest })`** — there is no `fetch` override on `useChat`, and no `api` shorthand in v7.
- The hook returns **`status`** (`'submitted' | 'streaming' | 'ready' | 'error'`) — there is no `isLoading`. We derive `isLoading` as `status === 'submitted' || status === 'streaming'`.
- The hook returns **`regenerate`** — there is no `retry`. We expose it as both names for the UI.
- `sendMessage` takes an object: **`sendMessage({ text })`** — not a bare string.
- `UIMessage` has a **`parts`** array (no `content` string). Renderers iterate `parts` (see `PipiliMessage`).
- The context snapshot is built **per request** from the live `ContextManager` (via `useCompanion().context`), not stubbed.
- `onFinish` persists the completed assistant message to the existing `ConversationManager` (IndexedDB), per spec orchestration step 10.

```typescript
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  type UIMessage,
} from 'ai';
import type {
  PipiliContextSnapshot,
  PipiliResponseMetadata,
} from '@open-edu/ai-companion';
import { useCompanion } from './CompanionProvider.js';
import { learningContextToSnapshot } from './context-mapper.js';

export interface PipiliChatState {
  messages: UIMessage<PipiliResponseMetadata>[];
  sendMessage: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  isLoading: boolean; // derived: status === 'submitted' || status === 'streaming'
  error: Error | undefined;
  stop: () => void;
  clearError: () => void;
  setMessages: (messages: UIMessage<PipiliResponseMetadata>[]) => void;
  clearMessages: () => void;
  conversationId: string;
  requestHint: (level: 1 | 2 | 3 | 4) => Promise<void>;
}

const PipiliChatContext = createContext<PipiliChatState | null>(null);

interface PipiliChatProviderProps {
  children: ReactNode;
  conversationId?: string;
}

export function PipiliChatProvider({
  children,
  conversationId: initialConversationId,
}: PipiliChatProviderProps): JSX.Element {
  const companion = useCompanion();
  const conversationId = useMemo(
    () =>
      initialConversationId ??
      `pipili-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    [initialConversationId],
  );

  // We snapshot the latest LearningContext in a ref so the transport (created
  // once) always reads current values at request time without re-creating.
  const contextRef = useRef(companion.context);
  contextRef.current = companion.context;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/pipili/chat',
        // prepareSendMessagesRequest lets us inject conversationId + a fresh
        // context snapshot into the POST body on EVERY send (and regenerate).
        prepareSendMessagesRequest: ({ id, messages }) => {
          const contextSnapshot = learningContextToSnapshot(contextRef.current);
          return {
            body: {
              conversationId: id,
              messages,
              context: contextSnapshot,
            },
          };
        },
      }),
    [], // transport is stable; reads live context via contextRef
  );

  const {
    messages,
    sendMessage: chatSend,
    regenerate,
    status,
    error,
    stop,
    clearError,
    setMessages,
  } = useChat<UIMessage<PipiliResponseMetadata>>({
    id: conversationId,
    transport,
    onError: (err) => {
      // Surface to telemetry only — never log provider internals.
      console.error('Pipili chat error (category only):', err?.name);
    },
    onFinish: ({ message }) => {
      // Spec orchestration step 10: persist completed assistant message
      // through the EXISTING conversation storage path (IndexedDB-backed
      // ConversationManager). Only persist when status is 'ready' (an
      // interrupted/aborted stream must not be persisted as complete).
      if (status === 'ready') {
        const text = (message.parts ?? [])
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('');
        if (text) {
          companion.persistAssistantMessage({
            id: message.id,
            text,
            metadata: message.metadata as PipiliResponseMetadata | undefined,
          });
        }
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const sendMessage = useCallback(
    async (text: string) => {
      // Single send path. We deliberately do NOT call the old
      // companion.sendMessage() — that would also hit /api/llm/chat (the
      // legacy non-streaming endpoint) and double-fire. The migrated UI
      // streams exclusively via /api/pipili/chat.
      await chatSend({ text });
    },
    [chatSend],
  );

  const clearMessages = useCallback(() => {
    // Reset local UI messages AND the persisted conversation, keeping ids stable.
    setMessages([]);
    companion.clearConversation();
  }, [setMessages, companion]);

  const requestHint = useCallback(
    async (level: 1 | 2 | 3 | 4) => {
      // Hint requests are sent as normal user turns; the server routes the
      // createProgressiveHint tool when it detects a hint request. Using a
      // human-readable prefix keeps the transcript legible and lets the
      // server's hint detector parse it.
      await chatSend({ text: `I'd like hint level ${level}, please.` });
    },
    [chatSend],
  );

  const value: PipiliChatState = {
    messages,
    sendMessage,
    regenerate,
    status,
    isLoading,
    error,
    stop,
    clearError,
    setMessages,
    clearMessages,
    conversationId,
    requestHint,
  };

  return (
    <PipiliChatContext.Provider value={value}>
      {children}
    </PipiliChatContext.Provider>
  );
}

export function usePipiliChat(): PipiliChatState {
  const ctx = useContext(PipiliChatContext);
  if (!ctx) {
    throw new Error('usePipiliChat must be used within PipiliChatProvider');
  }
  return ctx;
}
```

> **Why `useChat<UIMessage<PipiliResponseMetadata>>`:** the generic parameter types `message.metadata` so downstream renderers get typed `PipiliResponseMetadata` rather than `unknown`. The server emits this metadata via `toUIMessageStream`'s `messageMetadata` callback (see Phase 4.5, step 12).

### Step 6.1b — Create `src/ai/context-mapper.ts`

**File:** `apps/learner/src/ai/context-mapper.ts`

This maps the existing `LearningContext` (from `@open-edu/ai-companion`, populated by `ContextBridge`) into the richer `PipiliContextSnapshot` the server expects. This is the concrete bridge called by `PipiliChatProvider` on every request — **no more empty stub**.

```typescript
import type {
  LearningContext,
  PipiliContextSnapshot,
  PageContext,
  LessonContext,
  CourseContext,
  LearnerProfile,
} from '@open-edu/ai-companion';

export function learningContextToSnapshot(ctx: LearningContext): PipiliContextSnapshot {
  const snapshot: PipiliContextSnapshot = {};

  if (ctx.lessonId && ctx.lessonTitle) {
    snapshot.lesson = {
      id: ctx.lessonId,
      title: ctx.lessonTitle,
      objectives: [], // ContextBridge does not currently capture these;
      topics: [], // left empty — the server can enrich via tools.
    } satisfies LessonContext;
  }

  if (ctx.courseId && ctx.courseTitle) {
    snapshot.course = {
      id: ctx.courseId,
      title: ctx.courseTitle,
      description: '', // not present in LearningContext today
      subject: '', // derivable from manifest on server; left blank here
      level: '', // same
      language: ctx.learnerPreferences?.language ?? 'en',
    } satisfies CourseContext;
  }

  if (ctx.pageContent || ctx.selectedText) {
    snapshot.page = {
      id: ctx.sectionId ?? ctx.lessonId ?? 'unknown',
      title: ctx.lessonTitle ?? 'Current page',
      content: ctx.selectedText
        ? `Selection: ${ctx.selectedText}\n\nPage: ${ctx.pageContent ?? ''}`
        : (ctx.pageContent ?? ''),
      nodeType: 'page',
    } satisfies PageContext;
  }

  if (ctx.learnerPreferences) {
    snapshot.learner = {
      language: ctx.learnerPreferences.language ?? 'en',
      readingLevel: ctx.learnerPreferences.readingLevel ?? 'secondary',
    } satisfies LearnerProfile;
  }

  // Notes & history are filled by server-side tools (searchNotes, etc.)
  // — the client does not need to ship the full notes corpus on every turn.
  return snapshot;
}
```

> **Note:** `CompanionProvider` must expose (a) the current `LearningContext` (so the mapper can read it), and (b) a `persistAssistantMessage(payload)` method (so `onFinish` can write to the IndexedDB `ConversationManager`). If either is missing, add it to `CompanionProvider` during Phase 6 (see Step 6.6). Do not round-trip through the legacy `AIProviderImpl` — that path is removed in Phase 9.

### Step 6.2 — Update `CompanionPanel.tsx` for streaming

**File:** `apps/learner/src/ai/CompanionPanel.tsx`

Modify to use `usePipiliChat()` for streaming messages. Key changes from the v4 plan:

1. Import `usePipiliChat` instead of relying on `useCompanion` for message display.
2. Render each `UIMessage` via the new `PipiliMessage` component, which iterates `message.parts` (v7 `UIMessage` has **no `content` string**).
3. Read `message.metadata` (typed `PipiliResponseMetadata`) for citations, hint level, mode, and suggested next steps — these arrive as AI SDK message metadata, not as JSON in text.
4. Show `Stop` while `status === 'streaming' | 'submitted'`; show `Retry` (calling `regenerate`) only when `status === 'error' | 'ready'`.
5. Use `status`, not `isLoading`, for primary state gating (we still expose `isLoading` for legacy panels).

```tsx
// In render (illustrative additions — wire into the existing panel scaffold):

const { messages, sendMessage, status, isLoading, error, stop, regenerate, clearError } =
  usePipiliChat();

// Render messages via parts, not content:
{
  messages.map((message) => (
    <PipiliMessage
      key={message.id}
      role={message.role === 'assistant' ? 'assistant' : 'user'}
      parts={message.parts}
      metadata={message.metadata}
      isStreaming={isLoading && message.role === 'assistant' && message.id === messages.at(-1)?.id}
    />
  ));
}

// Stop button (only while actively streaming):
{
  (status === 'streaming' || status === 'submitted') && (
    <button
      type="button"
      onClick={stop}
      className={cn('...', 'text-on-primary')}
      data-testid="pipili-stop"
      aria-label={t('pipili.stop')}
    >
      {t('pipili.stop')}
    </button>
  );
}

// Retry button (error or ready — regenerate the last assistant message):
{
  (error || status === 'ready') && messages.length > 0 && (
    <button
      type="button"
      onClick={() => {
        clearError();
        void regenerate();
      }}
      className={cn('...', 'text-on-surface')}
      data-testid="pipili-retry"
      aria-label={t('pipili.retry')}
    >
      {t('pipili.retry')}
    </button>
  );
}
```

> **Accessibility & i18n:** all button labels must go through `t()` (Phase 8 keys). Stop/Retry must have `aria-label`. axe-core audit in Phase 7 covers these states.

### Step 6.3 — Create `src/ai/PipiliMessage.tsx`

**File:** `apps/learner/src/ai/PipiliMessage.tsx`

A message renderer that handles v7 `UIMessage.parts` (text, reasoning, tool invocations) **plus** the `PipiliResponseMetadata` attached as message metadata. It renders:

- Streamed text parts (partial during streaming — the last text part grows in place).
- Citations from `metadata.citations`.
- Hint level indicator from `metadata.hintLevel`.
- Mode badge from `metadata.mode` (optional).
- Suggested next steps from `metadata.suggestedNextSteps` (only when not streaming).

```tsx
import React from 'react';
import type { UIMessage, UIMessagePart } from 'ai';
import type { PipiliMode, PipiliResponseMetadata } from '@open-edu/ai-companion';
import { TutorMessage, Citation as CitationCmp, cn } from '@open-edu/design-system';

export interface PipiliMessageProps {
  role: 'user' | 'assistant' | 'system';
  parts: UIMessagePart[];
  metadata?: PipiliResponseMetadata;
  isStreaming?: boolean;
}

export function PipiliMessage({
  role,
  parts,
  metadata,
  isStreaming,
}: PipiliMessageProps): JSX.Element {
  // Concatenate the text parts. (Tool-invocation/reasoning parts can be
  // rendered later — MVP only needs text.) During streaming the final text
  // part is incomplete; we show it as-is with a streaming caret.
  const textParts = parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text');
  const visibleText = textParts.map((p) => p.text).join('');

  return (
    <div className="space-y-2" data-testid="pipili-message">
      <TutorMessage role={role === 'assistant' ? 'ai' : 'user'}>
        <span className={cn(isStreaming && 'opacity-95')}>
          {visibleText}
          {isStreaming && (
            <span
              aria-hidden="true"
              className="inline-block h-4 w-1.5 animate-pulse bg-current align-middle"
            />
          )}
        </span>
      </TutorMessage>

      {metadata?.hintLevel && (
        <div className="text-muted ml-8 text-xs" data-testid="pipili-hint-level">
          Hint Level {metadata.hintLevel}/4
        </div>
      )}

      {metadata?.mode && metadata.mode !== 'tutor' && (
        <div className="text-muted ml-8 text-xs italic" data-testid="pipili-mode">
          {metadata.mode}
        </div>
      )}

      {metadata?.citations && metadata.citations.length > 0 && (
        <div className="ml-8 space-y-1" data-testid="pipili-citations">
          {metadata.citations.map((c, i) => (
            <CitationCmp key={`${c.referenceId ?? i}`} source={c.source}>
              {c.text}
            </CitationCmp>
          ))}
        </div>
      )}

      {metadata?.suggestedNextSteps && metadata.suggestedNextSteps.length > 0 && !isStreaming && (
        <div className="ml-8 mt-2" data-testid="pipili-next-steps">
          <span className="text-xs font-medium">Next steps:</span>
          <ul className="text-muted list-disc pl-4 text-xs">
            {metadata.suggestedNextSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
PipiliMessage.displayName = 'PipiliMessage';
```

> **Why `parts` not `content`:** v7 `UIMessage` exposes a `parts: UIMessagePart[]` array. The `content` string field does not exist on `UIMessage` in v7 (it is only on the deprecated v3/v4 message shape). Rendering from `parts` is what makes streaming visual: the last text part grows chunk-by-chunk without the component re-keying.

### Step 6.4 — Create `src/ai/HintControls.tsx`

**File:** `apps/learner/src/ai/HintControls.tsx`

```typescript
import React from 'react';
import { cn } from '@open-edu/design-system';
import type { HintLevel } from '@open-edu/ai-companion';

export interface HintControlsProps {
  currentLevel: HintLevel;
  onRequestLevel: (level: HintLevel) => void;
  disabled?: boolean;
  assessmentActive?: boolean;
  className?: string;
}

const HINT_LABELS: Record<HintLevel, string> = {
  1: 'Give me a hint',
  2: 'More specific hint',
  3: 'Walk me through it',
  4: 'Show full explanation',
};

const HINT_DESCRIPTIONS: Record<HintLevel, string> = {
  1: 'Point me in the right direction',
  2: 'Tell me the approach',
  3: 'Step-by-step guidance',
  4: 'Show me the complete solution',
};

export function HintControls({
  currentLevel,
  onRequestLevel,
  disabled = false,
  assessmentActive = false,
  className,
}: HintControlsProps): JSX.Element {
  const maxLevel = assessmentActive ? 3 : 4;
  const buttons: HintLevel[] = [1, 2, 3, 4];

  return (
    <div
      className={cn('flex flex-wrap gap-1', className)}
      data-testid="hint-controls"
    >
      {buttons.map((level) => {
        const isAvailable = level <= maxLevel;
        const isNext = level === Math.min(currentLevel + 1, maxLevel);

        return (
          <button
            key={level}
            onClick={() => isAvailable && onRequestLevel(level)}
            disabled={disabled || !isAvailable}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              isAvailable
                ? 'bg-surface-container text-on-surface hover:bg-surface-container-hover'
                : 'cursor-not-allowed opacity-40',
              isNext && 'ring-1 ring-primary',
            )}
            title={HINT_DESCRIPTIONS[level]}
            data-testid={`hint-level-${level}`}
          >
            {HINT_LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}
HintControls.displayName = 'HintControls';
```

### Step 6.5 — Update `CourseRightSidebar.tsx` for streaming

**File:** `apps/learner/src/CourseRightSidebar.tsx`

Integrate `usePipiliChat` in the Pipili tab:

- Replace `useCompanion()` message reading with `usePipiliChat()` messages
- Add `HintControls` below the chat input
- Show streaming cursor during `isLoading`
- Add stop/retry buttons

### Step 6.6a — Extend `CompanionProvider` to expose context + persist hook

**File:** `apps/learner/src/ai/CompanionProvider.tsx`

`PipiliChatProvider` needs two things from the existing companion context that may not currently be exposed:

1. **`context: LearningContext`** — the full live context snapshot (already maintained by the internal `ContextManager`). Expose it as a context value so `PipiliChatProvider` can read it via `useCompanion().context` instead of re-subscribing.
2. **`persistAssistantMessage({ id, text, metadata })`** — a method that writes the completed assistant message to the existing IndexedDB-backed `ConversationManager` (`addMessage`). Do NOT route through `AIProviderImpl` — that path is removed in Phase 9.

Update `CompanionContextValue` to add:

```typescript
context: LearningContext;
persistAssistantMessage: (msg: {
  id: string;
  text: string;
  metadata?: PipiliResponseMetadata;
}) => void;
```

Implementation: forward `contextManager.getCurrentContext()` into the provider state (the provider already subscribes to context changes — reuse the same subscription), and have `persistAssistantMessage` call `conversationManager.addMessage(currentSessionId, { id, role: 'ai', text, timestamp: Date.now(), citations: metadata?.citations })`. Keep `send()`/`search()`/`clearConversation()` backward-compatible during migration.

### Step 6.6b — Update `AppShell.tsx` to wire PipiliChatProvider

**File:** `apps/learner/src/AppShell.tsx`

Wrap the relevant section with `PipiliChatProvider` (inside `CompanionProvider`):

```typescript
import { PipiliChatProvider } from './ai/PipiliChatProvider.js';

// Inside CompanionProvider:
<PipiliChatProvider>
  {/* existing children */}
</PipiliChatProvider>
```

`PipiliChatProvider` must be a descendant of `CompanionProvider` (it calls `useCompanion()`) and an ancestor of `CompanionPanel` / `CourseRightSidebar` (they call `usePipiliChat()`). Place it directly inside `CompanionProvider` in `AppShell`, surrounding `CourseRuntime` and the floating UI.

---

## Phase 7: UI Tests

### Step 7.1 — Update `CompanionPanel.test.tsx`

**File:** `apps/learner/src/ai/CompanionPanel.test.tsx`

Add test cases (use `renderHook` + a `MockUIMessageStreamID`/`simulateReadableStream` to drive `useChat`; assert against `status`, not `isLoading`):

1. Streaming: while `status === 'streaming'`, the streaming caret is visible on the in-flight assistant message
2. Stop button is visible only when `status === 'streaming' || 'submitted'`
3. Clicking Stop calls `stop()` and the stream halts (status transitions to `ready`)
4. Error state: error copy is shown when `status === 'error'`; Retry button visible
5. Clicking Retry calls `regenerate()` (not `retry`) and clears the error
6. Citations rendered when assistant message `metadata.citations` is present
7. Next steps rendered when assistant message `metadata.suggestedNextSteps` is present
8. Metadata is rendered from `message.metadata` (NOT from JSON parsed out of visible text) — assert there is no ` ``` ` block in text content
9. axe-core audit passes for panel in states: ready, submitted, streaming, error
10. Session restoration: mount PipiliChatProvider with a `conversationId`, send a message, unmount, remount with the same id — the persisted assistant message is restored by `ConversationManager` (mock the IndexedDB store)

### Step 7.2 — Create `src/ai/__tests__/PipiliMessage.test.tsx`

**File:** `apps/learner/src/ai/__tests__/PipiliMessage.test.tsx`

Test cases (build `UIMessage`-shaped props with `parts: [{ type: 'text', text }]`):

1. Renders user message text parts
2. Renders assistant message text parts
3. Shows streaming caret when `isStreaming` is true
4. Does not show caret when `isStreaming` is false
5. Renders citations when `metadata.citations` provided
6. Renders nothing for citations when `metadata.citations` is empty
7. Renders hint level indicator when `metadata.hintLevel` is set
8. Renders suggested next steps when provided
9. Does not render next steps during streaming
10. axe-core audit passes

### Step 7.3 — Create `src/ai/__tests__/HintControls.test.tsx`

**File:** `apps/learner/src/ai/__tests__/HintControls.test.tsx`

Test cases:

1. Renders all 4 hint level buttons
2. Button for currentLevel + 1 has highlight ring
3. Level 4 is disabled when assessmentActive is true
4. Disabled prop disables all buttons
5. Clicking available button calls onRequestLevel with correct level
6. Clicking disabled button does not call onRequestLevel
7. axe-core audit passes

### Step 7.4 — Create `src/ai/__tests__/context-mapper.test.ts`

**File:** `apps/learner/src/ai/__tests__/context-mapper.test.ts`

Test cases for `learningContextToSnapshot` (the bridge that fixes Open Question #2):

1. Empty `LearningContext` → empty snapshot (no page/lesson/course keys)
2. `lessonId` + `lessonTitle` → snapshot.lesson populated with empty objectives/topics
3. `courseId` + `courseTitle` → snapshot.course populated; language falls back to 'en'
4. `selectedText` present → snapshot.page.content starts with `Selection:`
5. `learnerPreferences.language` flows into both `snapshot.learner.language` AND `snapshot.course.language`
6. `pageContent` only (no selection) → snapshot.page.content equals pageContent directly
7. Notes/history are NOT shipped from the client (left to server tools)

---

## Phase 8: i18n

### Step 8.1 — Add Pipili i18n keys

**File:** `packages/i18n/locales/en/learner.json`

Add to existing `ai` or create new `pipili` namespace keys:

```json
"pipili.title": "Pipili AI Companion",
"pipili.thinking": "Pipili is thinking...",
"pipili.stop": "Stop",
"pipili.retry": "Retry",
"pipili.error.generic": "Something went wrong. Please try again.",
"pipili.error.validation": "Invalid request. Please check your input.",
"pipili.error.missing_config": "AI companion is not configured.",
"pipili.error.rate_limited": "You're sending messages too quickly. Please wait a moment.",
"pipili.error.timeout": "The request timed out. Please try again.",
"pipili.error.auth": "AI companion authentication failed.",
"pipili.error.stream_interrupted": "Response stream was interrupted.",
"pipili.error.no_context": "I cannot find that information in the current course.",
"pipili.hint.level_1": "Give me a hint",
"pipili.hint.level_2": "More specific hint",
"pipili.hint.level_3": "Walk me through it",
"pipili.hint.level_4": "Show full explanation",
"pipili.hint.assessment_warning": "Hints are limited during assessments.",
"pipili.hint.effort_required": "Please attempt the problem before requesting a full explanation.",
"pipili.mode.tutor": "Tutor",
"pipili.mode.coach": "Coach",
"pipili.mode.reflection": "Reflection",
"pipili.mode.navigator": "Navigator",
"pipili.mode.accessibility": "Accessibility",
"pipili.next_steps": "Next steps",
"pipili.citation.lesson": "From lesson",
"pipili.citation.course": "From course",
"pipili.citation.note": "From your notes",
"pipili.citation.glossary": "From glossary",
"pipili.assessment.active": "Assessment in progress"
```

---

## Phase 9: Migration & Cleanup

### Step 9.1 — Keep old proxy as fallback (Phase 9)

**File:** `apps/learner/vite.config.ts`

Do NOT remove `llmProxyHandler` immediately. Keep `/api/llm/chat` running alongside `/api/pipili/chat` during migration. Add a feature flag:

```typescript
// Feature flag: set VITE_USE_PIPILI=true to use new endpoint
const USE_PIPILI = process.env.VITE_USE_PIPILI === 'true';
```

### Step 9.2 — Update `Pipili.tsx` mascot component

**File:** `apps/learner/src/components/Pipili.tsx`

Replace any references to `useCompanion` or the old AI provider with `usePipiliChat()` where applicable. The lazy loading behavior (dynamic import of `CompanionPanel`) remains, but the panel now uses the new streaming backend.

### Step 9.3 — Remove prompt-building from `AIProviderImpl`

**File:** `apps/learner/src/ai/AIProviderImpl.ts`

Mark as deprecated with a JSDoc comment. The `AIProviderImpl` is replaced by the server-side Pipili orchestration. Keep the file but add:

```typescript
/**
 * @deprecated Use server-side Pipili orchestration via usePipiliChat() instead.
 * This provider will be removed once the migration to the Pipili endpoint is complete.
 */
```

### Step 9.4 — Regenerate dev-server Tailwind CSS

Run after any runtime component CSS changes:

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

---

## Phase 10: V2 Extension Seams (Interfaces Only, No Implementation)

### Step 10.1 — Add provider interfaces to `@open-edu/ai-companion`

**File:** `packages/ai-companion/src/pipili/v2-seams.ts`

```typescript
/**
 * V2 extension seams. Define interfaces only; do NOT implement in MVP.
 */

export interface ConceptGraphProvider {
  getPrerequisites(conceptId: string): Promise<string[]>;
  getRelatedConcepts(conceptId: string): Promise<string[]>;
  getConceptPath(from: string, to: string): Promise<string[]>;
}

export interface MasteryProvider {
  getMasteryScore(learnerId: string, conceptId: string): Promise<number>;
  getMisconceptions(learnerId: string): Promise<string[]>;
  getInterventionHistory(learnerId: string): Promise<unknown[]>;
}

export interface LearningPlanService {
  generateStudyPlan(
    learnerId: string,
    goals: string[],
  ): Promise<{ steps: unknown[]; timeline: string }>;
  updateProgress(learnerId: string, planId: string, progress: unknown): Promise<void>;
}

export interface InterventionPolicy {
  shouldIntervene(learnerId: string, telemetryEvent: unknown): Promise<boolean>;
  getSuggestion(learnerId: string, context: unknown): Promise<string>;
}

export interface TeacherReadModel {
  getClassProgress(classId: string): Promise<unknown>;
  getLearnerInsights(learnerId: string): Promise<unknown>;
}

export interface ParentReadModel {
  getLearnerSummary(learnerId: string, consentVerified: boolean): Promise<unknown>;
}
```

---

## Implementation Order

| Order | Phase    | Description                   | Dependencies |
| ----- | -------- | ----------------------------- | ------------ |
| 1     | Phase 1  | Install dependencies          | None         |
| 2     | Phase 2  | llm-config model factory      | Phase 1      |
| 3     | Phase 3  | ai-companion Pipili contracts | Phase 1      |
| 4     | Phase 4  | Server-side Pipili endpoint   | Phase 2, 3   |
| 5     | Phase 5  | Server-side tests             | Phase 4      |
| 6     | Phase 6  | Learner UI streaming chat     | Phase 3, 4   |
| 7     | Phase 7  | UI tests                      | Phase 6      |
| 8     | Phase 8  | i18n keys                     | Phase 4, 6   |
| 9     | Phase 9  | Migration & cleanup           | Phase 4-7    |
| 10    | Phase 10 | V2 seams (interfaces only)    | Phase 3      |

---

## Verification Commands

After each phase or at completion, run:

```bash
pnpm install                          # Refresh lockfile after dependency changes
pnpm typecheck                        # Verify all packages compile
pnpm lint                             # Lint (includes i18n hardcoded string check)
pnpm test                             # Run all tests
pnpm --filter @open-edu/llm-config test       # Run llm-config tests
pnpm --filter @open-edu/ai-companion test     # Run ai-companion tests
pnpm --filter @open-edu/learner test          # Run learner app tests
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css  # Regenerate Tailwind if needed
```

---

## Open Questions / Notes

1. **Model IDs verify:** The fast/escalation model IDs in `model-factory.ts` use GPT-4o-mini and Gemini 2.0 Flash. Confirm the actual model IDs supported by the installed AI SDK provider package versions (the AI SDK v7 providers occasionally rename model constants); covered by a capability test (Phase 2.3, case 11–14).
2. **Notes service integration:** The `searchNotes` and `getRelevantNotes` tool implementations currently return empty arrays. They must be wired into the existing `@open-edu/storage` notes boundary during Phase 4 (the tool execute bodies are stubbed deliberately; the implementation agent should import the notes storage module and scope queries to the active `courseId`/`learnerId`).
3. **`CompanionProvider` additions:** `PipiliChatProvider` requires (a) the current `LearningContext` and (b) a `persistAssistantMessage({ id, text, metadata })` method on `useCompanion()`. If `CompanionProvider` does not currently expose these, add them during Step 6.6 (do NOT route through `AIProviderImpl`).
4. **Mock model for tests:** The server handler tests (Phase 5.1) need a `MockLanguageModelV1` that yields fixed text deltas. Use AI SDK's `MockUIMessageStreamID` / `simulateReadableStream` helpers (v7 ships these for exactly this purpose) rather than stubbing `streamText`.
5. **Dev-server Tailwind:** Any CSS changes in runtime components must be followed by the Tailwind regeneration command.

> **Resolved during this revision (no longer open):**
>
> - Context bridge stub → replaced by `learningContextToSnapshot` (Step 6.1b).
> - Metadata-as-JSON-in-text spec violation → replaced by server-derived metadata delivered via `toUIMessageStream`'s `messageMetadata` callback (Step 4.5 step 12).
> - `useChat` transport uncertainty → resolved: use `DefaultChatTransport` + `prepareSendMessagesRequest` (Step 6.1).
> - `require()` in ESM → replaced by static `import` (Step 2.1).
> - Double-fire on `sendMessage` → single send path to `/api/pipili/chat` (Step 6.1).
> - `UIMessage.content` vs `parts` → renderers iterate `parts` (Step 6.3).
