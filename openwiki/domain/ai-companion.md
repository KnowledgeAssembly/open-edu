---
type: Domain Guide
title: AI Companion
description: Canonical guide to the AI Learning Companion services package, including search, dictionary, conversation, provider interfaces, and the Pipili AI tutoring subsystem.
tags: [openwiki, domain, ai, learner, pipili]
---

# AI Companion

`packages/ai-companion` provides the search, dictionary, conversation, and provider interfaces used by the learner app's AI companion feature, plus the **Pipili subsystem** for context-aware AI tutoring.

## What it provides

- **SearchManager** — two-level progressive search (exact + fuzzy) for terms and concepts
- **DictionaryService** — term definition lookup with category and related terms
- **ConversationManager** — chat history management with context tracking
- **CacheService** — generic TTL-based caching
- **ContextManager** — learning context for personalized AI responses
- **Provider interfaces** — `AIProvider`, `DictionaryProvider`, `ContextProvider`, `CacheProvider`
- `DictionaryLoader` and the package data files it reads, which keep dictionary content separate from search behavior
- **Pipili subsystem** (`src/pipili/`) — context-aware AI tutoring with streaming responses

## Pipili Subsystem

The Pipili subsystem provides context normalization, hint progression, and V2 extension seams:

### Context Normalization & Bounding (`context-utils.ts`)

Assembles learning context from multiple sources with priority-based bounding:

- **Priority order:** page > widget > assessment > lesson > module > course > notes > learner
- Token-aware bounding to fit context within LLM limits
- `BoundedContext` type with `BoundedContextEntry[]` and `ContextSource` metadata

### Hint Progression Engine (`hint-utils.ts`)

Graduated hint levels from subtle nudges to full answers:

| Level      | Description                                |
| ---------- | ------------------------------------------ |
| `nudge`    | Subtle direction without giving answer     |
| `scaffold` | Guided questions breaking down the problem |
| `answer`   | Full explanation with steps                |

### Pipili Types (`types.ts`)

Core context types for the tutoring system:

| Type                    | Description                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `PipiliRequest`         | Chat request with conversationId, messages, and context snapshot                            |
| `PipiliContextSnapshot` | Full context with optional page, widget, lesson, module, course, notes, assessment, learner |
| `PageContext`           | Current page id, title, content, nodeType                                                   |
| `WidgetContext`         | Widget id, type, state, question, answer, userResponse                                      |
| `AssessmentContext`     | Active assessment state with attempt tracking                                               |
| `LearnerProfile`        | Language, reading level, accessibility profile (`autism`, `adhd`, `dyslexia`)               |
| `LearningHistory`       | Completed lessons, recent pages, strengths, weak concepts                                   |

### V2 Extension Seams (`v2-seams.ts`)

Interfaces for future capability expansion, allowing new tools and context sources without breaking existing consumers.

## How it integrates with the learner app

The learner app wires the AI companion through:

1. `CompanionProvider` in `apps/learner/src/ai/` — initializes SearchManager, ConversationManager, and connects to the LLM proxy
2. `CompanionPanel` — UI component for chat, search, and dictionary lookup
3. `WordTapHandler` — double-tap word lookup using DictionaryService
4. `TextSelectionToolbar` — selected text actions using AI provider
5. **PipiliChatProvider** — wraps `useChat` from `@ai-sdk/react` for streaming Pipili chat
6. **PipiliMessage** — renders `UIMessage.parts` with markdown, tool calls, and citations
7. **HintControls** — UI for requesting graduated hints (nudge → scaffold → answer)
8. **Server-side Pipili endpoint** (`apps/learner/src/pipili/`) — POST handler with Zod validation, context bounding, assessment policy, 7-tool registry, model tier routing

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
- To change Pipili context/hints: modify `packages/ai-companion/src/pipili/context-utils.ts` or `hint-utils.ts`
- To add Pipili tools: modify `apps/learner/src/pipili/tools.ts`
- To change Pipili server behavior: modify `apps/learner/src/pipili/handler.ts`
- The learner app consumes this package through `apps/learner/src/ai/CompanionProvider.tsx`, `TextSelectionToolbar`, `WordTapHandler`, and `apps/learner/src/pipili/`
- The package is pure TypeScript — no build step required
- Tests live alongside source files as `*.test.ts`
