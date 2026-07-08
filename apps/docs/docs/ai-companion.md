---
sidebar_position: 15
---

# AI Learning Companion (`@open-edu/ai-companion`)

The AI Learning Companion package provides search, dictionary, conversation, and provider services for the AI companion feature embedded in the learner app.

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
