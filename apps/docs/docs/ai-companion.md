---
sidebar_position: 15
---

# AI Learning Companion (`@open-edu/ai-companion`)

The AI Learning Companion package provides search, dictionary, conversation, and provider services for the AI companion feature embedded in the learner app. It also includes the **Pipili subsystem** — a context-aware AI tutoring system with streaming chat, hint progression, and tool-augmented responses.

## Overview

`@open-edu/ai-companion` is a pure TypeScript package with no build step. It defines provider interfaces and implements core services that the learner app's `CompanionProvider` and `CompanionPanel` use for AI-powered features.

## Core Services

### SearchManager

Two-level progressive search combining exact-index and flexsearch:

- **ExactIndex** — instant lookup for known terms and dictionary entries
- **FlexSearchIndex** — fuzzy search for broader discovery
- Returns `SearchResponse` with `InstantResult[]` and `EnrichedResult[]`

```typescript
import { SearchManager } from '@open-edu/ai-companion';

const search = new SearchManager(dictionaryService);
const results = await search.search('linear equation');
// { instant: [...], enriched: [...] }
```

### DictionaryService

Manages dictionary entries and provides lookup by term, category, or ID:

```typescript
import { DictionaryService, DictionaryLoader } from '@open-edu/ai-companion';

const loader = new DictionaryLoader();
const entries = await loader.loadFromJson('/path/to/dictionary.json');
const service = new DictionaryService(entries);
const entry = service.getEntry('variable');
```

### ConversationManager

Manages chat conversations with context tracking and history:

```typescript
import { ConversationManager } from '@open-edu/ai-companion';

const manager = new ConversationManager({ maxHistory: 50 });
manager.addMessage({ role: 'user', content: 'Explain variables' });
const history = manager.getHistory();
```

### CacheService

Generic caching with TTL support:

```typescript
import { CacheService } from '@open-edu/ai-companion';

const cache = new CacheService<string>({ ttlMs: 60_000 });
cache.set('key', 'value');
const value = cache.get('key');
```

### ContextManager

Manages learning context for personalized AI responses:

```typescript
import { ContextManager } from '@open-edu/ai-companion';

const context = new ContextManager();
context.setContext({ currentNodeId: 'lesson-3', packageId: 'math-101' });
```

## Key Types

| Type                  | Description                                      |
| --------------------- | ------------------------------------------------ |
| `DictionaryEntry`     | Term definition with category, examples, related |
| `LearningContext`     | Current learning state for contextual AI         |
| `AIProvider`          | Interface for LLM provider integration           |
| `ConversationMessage` | Message with role, content, and metadata         |
| `SearchResponse`      | Combined instant + enriched search results       |

## Provider Interfaces

The package defines provider abstractions that the learner app implements:

- `DictionaryProvider` — lookup terms, fetch definitions
- `AIProvider` — send prompts, receive responses
- `ContextProvider` — provide current learning context
- `CacheProvider` — optional caching layer

## Learner App Integration

The learner app wires these services through:

- **CompanionProvider** — React context that initializes SearchManager, ConversationManager, and connects to the LLM proxy
- **CompanionPanel** — UI for chat, search, and dictionary lookup
- **WordTapHandler** — double-tap word lookup using DictionaryService

```typescript
// In the learner app, services are wired in ai/AIProviderImpl.ts
// which reads VITE_LLM_PROXY_URL for the backend proxy
```

## Design Reference

For the full design specification, see `docs/superpowers/specs/2026-07-08-ai-companion-design.md` in the repository root.

## Pipili Subsystem

The Pipili subsystem (`src/pipili/`) provides context-aware AI tutoring with streaming responses:

### Context Normalization & Bounding

Assembles learning context from multiple sources with priority-based bounding:

```typescript
import { boundContext, CONTEXT_PRIORITY } from '@open-edu/ai-companion';

const bounded = boundContext(rawContext, { maxTokens: 4000 });
// Priority: page > widget > assessment > lesson > module > course > notes > learner
```

### Hint Progression Engine

Graduated hint levels from subtle nudges to full answers:

```typescript
import { resolveHintLevel, HINT_INSTRUCTIONS } from '@open-edu/ai-companion';

const level = resolveHintLevel(attemptCount); // 'nudge' | 'scaffold' | 'answer'
const instructions = HINT_INSTRUCTIONS[level];
```

### Context Types

| Type                    | Description                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `PipiliContextSnapshot` | Full context state with optional page, widget, lesson, module, course, notes, assessment, learner fields |
| `PageContext`           | Current page id, title, content, nodeType                                                                |
| `WidgetContext`         | Widget id, type, state, question, answer, userResponse                                                   |
| `AssessmentContext`     | Active assessment state with attempt tracking                                                            |
| `LearnerProfile`        | Language, reading level, accessibility profile                                                           |
| `LearningHistory`       | Completed lessons, recent pages, strengths, weak concepts                                                |

### V2 Extension Seams

The `v2-seams.ts` module defines interfaces for future capability expansion, allowing new tools and context sources to be added without breaking existing consumers.
