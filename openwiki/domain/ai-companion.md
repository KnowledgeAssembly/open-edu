# AI Companion

`packages/ai-companion` provides the search, dictionary, conversation, and provider interfaces used by the learner app's AI companion feature.

## What it provides

- **SearchManager** — two-level progressive search (exact + fuzzy) for terms and concepts
- **DictionaryService** — term definition lookup with category and related terms
- **ConversationManager** — chat history management with context tracking
- **CacheService** — generic TTL-based caching
- **ContextManager** — learning context for personalized AI responses
- **Provider interfaces** — `AIProvider`, `DictionaryProvider`, `ContextProvider`, `CacheProvider`

## How it integrates with the learner app

The learner app wires the AI companion through:

1. `CompanionProvider` in `apps/learner/src/ai/` — initializes SearchManager, ConversationManager, and connects to the LLM proxy
2. `CompanionPanel` — UI component for chat, search, and dictionary lookup
3. `WordTapHandler` — double-tap word lookup using DictionaryService
4. `TextSelectionToolbar` — selected text actions using AI provider

The LLM proxy URL is configured via `VITE_LLM_PROXY_URL` environment variable, falling back to `/api/llm/chat`.

## Key service architecture

### SearchManager (two-level index)

- **ExactIndex** — instant lookup for known terms using a trie-like structure
- **FlexSearchIndex** — fuzzy search using flexsearch library for broader discovery
- Results are combined into instant + enriched result sets

### DictionaryService

- Loads entries via `DictionaryLoader` from JSON sources
- Provides lookup by term, category, or ID
- Entries include definitions, examples, related terms, and difficulty level

### ConversationManager

- Maintains conversation history with configurable max history size
- Supports adding messages with role (user/assistant/system) and content
- Can serialize/deserialize history for persistence

## Where to find the design spec

Full design specification at `docs/superpowers/specs/2026-07-08-ai-companion-design.md`.

## Change guidance

- To add a new service: create in `packages/ai-companion/src/services/` and export from `src/index.ts`
- To add a provider interface: define in `packages/ai-companion/src/providers/types.ts`
- To change search behavior: modify `SearchManager` or individual index implementations in `packages/ai-companion/src/search/`
- The package is pure TypeScript — no build step required
- Tests live alongside source files as `*.test.ts`
