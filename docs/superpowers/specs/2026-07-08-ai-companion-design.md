# AI Companion — Architecture & Implementation Plan

**Date:** 2026-07-08
**Status:** Draft → Implementation Ready

---

## 1. Architecture Overview

```
apps/learner/
├── CompanionProvider (context: services lifecycle)
├── CompanionPanel (Drawer/Sheet wrapping AIChat)
├── TextSelectionToolbar (floating toolbar)
├── Pipili (floating button → toggle panel)
└── ContextAdapter (bridges RuntimeContext → ContextManager)

packages/ai-companion/  (NEW — pure TS, no React)
├── providers/types.ts   (interfaces)
├── services/
│   ├── DictionaryService
│   ├── SearchManager (two-level progressive)
│   ├── ContextManager
│   ├── ConversationManager
│   └── CacheService
├── search/
│   ├── ExactIndex (Trie)
│   └── FlexSearchIndex
└── index.ts

packages/design-system/src/ai/  (EXISTING — UI only)
├── AIChat (uses ChatMessage interface)
├── AITutorPanel (3-tab sidebar)
├── TutorMessage
├── ThinkingIndicator
├── SuggestedQuestions
└── Citation
```

### Key Decisions

1. **`@open-edu/ai-companion` is pure TypeScript** — no React components, no DOM. All UI stays in `@open-edu/design-system` and `apps/learner`. This keeps services testable and framework-agnostic.

2. **Provider interfaces** — `DictionaryProvider`, `AIProvider`, `ContextProvider`, `ConversationStore`, `CacheProvider`. Every implementation can be swapped. No service depends on a concrete model or vendor.

3. **SearchManager** — two-level progressive search:
   - **Block 1 (synchronous, <50ms):** Exact dictionary lookup via Trie. Returns definition immediately.
   - **Block 2 (parallel, async):** FlexSearch FTS + concept search + course content search + AI cache lookup. Results merge into the response as they arrive.
   - The learner perceives instant feedback while richer context streams in.

4. **No build step** — follows `@open-edu/design-system` pattern: `"main": "./src/index.ts"`. Workspace packages import source directly.

---

## 2. Package Structure

```
packages/ai-companion/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── providers/
│   │   ├── types.ts              # All provider interfaces
│   │   ├── dictionary.ts          # DictionaryProvider interface + types
│   │   └── ai.ts                  # AIProvider interface + types
│   ├── services/
│   │   ├── DictionaryService.ts
│   │   ├── SearchManager.ts
│   │   ├── ContextManager.ts
│   │   ├── ConversationManager.ts
│   │   └── CacheService.ts
│   ├── search/
│   │   ├── ExactIndex.ts          # Trie-based index (exact + prefix)
│   │   └── FlexSearchIndex.ts     # FlexSearch-based FTS index
│   ├── data/
│   │   └── dictionary.json        # Starter academic dictionary (~5-10K words)
│   └── __tests__/
│       ├── ExactIndex.test.ts
│       ├── DictionaryService.test.ts
│       ├── SearchManager.test.ts
│       ├── ContextManager.test.ts
│       └── ConversationManager.test.ts
```

---

## 3. Provider Interfaces

```typescript
// providers/types.ts

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  pronunciations?: { text: string; audioUrl?: string }[];
  partOfSpeech?: string;
  definitions: { definition: string; example?: string }[];
  synonyms?: string[];
  antonyms?: string[];
  relatedWords?: string[];
  translations?: Record<string, string>; // language → translation
}

interface DictionaryProvider {
  lookupWord(word: string): DictionaryEntry | null;
  search(query: string): DictionaryEntry[]; // prefix/fuzzy
  getSuggestions(prefix: string): string[];
}

interface ExplanationRequest {
  text: string;
  context: LearningContext;
  style: 'simple' | 'detailed' | 'child_friendly' | 'autism_friendly' | 'exam';
  readingLevel?: '6-8' | '9-12' | 'secondary' | 'adult' | 'teacher';
}

interface AIProvider {
  explain(request: ExplanationRequest): Promise<Response>;
  ask(question: string, context: LearningContext): Promise<Response>;
  simplify(text: string, level: string): Promise<string>;
}

interface LearningContext {
  courseId?: string;
  courseTitle?: string;
  bundleId?: string;
  chapterId?: string;
  lessonId?: string;
  lessonTitle?: string;
  sectionId?: string;
  pageContent?: string;
  selectedText?: string;
  learnerPreferences?: {
    readingLevel?: string;
    language?: string;
  };
}

interface ContextProvider {
  getCurrentContext(): LearningContext;
  subscribe(callback: (context: LearningContext) => void): () => void;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  citations?: { source: string; text: string }[];
}

interface ConversationStore {
  getHistory(sessionId: string): ConversationMessage[];
  addMessage(sessionId: string, message: ConversationMessage): void;
  createSession(context: LearningContext): string;
  resetSession(sessionId: string): void;
}

interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

interface CacheProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}
```

---

## 4. Two-Level Search Architecture

```
SearchManager.search(query, context)
│
├── Level 1 (synchronous, blocking)
│   └── DictionaryService.lookupExact(query)
│       └── ExactIndex.get(query)
│           ├── Exact match → return entry ← INSTANT
│           ├── Prefix match → return suggestions
│           └── No match → null
│
└── Level 2 (parallel, async, non-blocking)
    ├── DictionaryService.searchFTS(query)     # FlexSearch
    ├── ConceptSearch(query, context)           # Local knowledge base
    ├── CourseSearch(query, context)            # Current course content
    └── CacheService.get(`ai:${query}`)        # Previously cached AI response
        │
        └── Merge results → return enriched entry
```

**Merge strategy:** The first result from Level 1 renders immediately. As Level 2 results arrive, the UI progressively updates (adding related concepts, course references, cached explanations).

---

## 5. Services

### DictionaryService

- **ExactLookup:** Trie-based O(k) lookup. Returns `DictionaryEntry` or null.
- **FTS Search:** FlexSearch with stemmed tokens. Returns ranked matches.
- **Smart search:** Plural forms → singular (`plants` → `plant`), verb forms (`running` → `run`), simple misspellings via edit distance.
- **Data:** Bundled academic dictionary JSON (~10K words). Loaded on first access, not at startup.

### SearchManager

- Orchestrates the two-level search described above.
- Returns `SearchResponse { instant: Entry | null, enriched: Promise<RichResponse> }`.
- The `enriched` promise can be set on the response object for the UI to await.

### ContextManager

- Exposes `getCurrentContext(): LearningContext` and `subscribe()`.
- In the learner app, `CompanionProvider` creates a bridge between `RuntimeContext` (from `@open-edu/runtime`) and `ContextManager`.
- On node change events from the workflow engine, updates course/lesson/page context.

### ConversationManager

- Manages sessions: one session per lesson. Reset on lesson change.
- Stores messages in-memory with IndexedDB persistence.
- When sending a message, automatically attaches current `LearningContext`.
- Exposes `getHistory()`, `addMessage()`, `createSession()`, `resetSession()`.

### CacheService

- Wraps `localStorage` for small entries, `IndexedDB` for larger ones.
- TTL-based expiry. Default TTL: 1 hour for dictionary, 24 hours for AI responses.
- `get/set/delete/clear` with serialization.

---

## 6. Learner App Integration

### CompanionProvider

- Wraps app inside `RuntimeThemeProvider`, `FontSizeProvider`.
- Initializes: `DictionaryService`, `SearchManager`, `ContextManager`, `ConversationManager`, `CacheService`.
- Bridges `RuntimeContext` → `ContextManager`.
- Exposes `useCompanion()` hook returning:
  - `search(query)` → triggers two-level search
  - `ask(question)` → sends to ConversationManager
  - `context` → current LearningContext
  - `messages` → current session messages
  - `panelState` → 'closed' | 'floating' | 'expanded' | 'pinned'

### CompanionPanel

- Uses `Drawer` (mobile) / responsive sheet for desktop.
- Wraps `AIChat` from design-system.
- Wires: `onSend` → `ConversationManager.send()` → `SearchManager` for dictionary queries, `AIProvider` for questions.
- Shows `SuggestedQuestions` when session is new.

### Pipili Update

- Existing bottom-right floating button.
- Add `onClick` → toggles `CompanionPanel`.
- Add unread dot indicator when there are suggested actions or new context.
- Mood reflects companion state: `idle`, `thinking`, `curious`.

### TextSelectionToolbar

- Renders on text selection (via `selectionchange` event).
- Buttons: Explain, Define, Translate, Pronounce, Ask Companion.
- Calls `SearchManager` or opens `CompanionPanel` with pre-filled query.

---

## 7. Data Flow

### Word Lookup Flow

1. User taps word "gravity" in lesson content.
2. `CompanionProvider.handleWordTap("gravity")` called.
3. `SearchManager.search("gravity")` triggers Level 1.
4. ExactIndex returns "gravity" definition → renders inline popover immediately.
5. Parallel Level 2 begins: FTS, course content, concept search, AI cache.
6. As results arrive, popover expands with related concepts, course references.
7. User can click "Ask AI" to get an AI-generated explanation.

### Chat Flow

1. User types "Explain gravity like I'm 10" and presses Send.
2. `AIChat.onSend` → `CompanionPanel.handleSend` → `ConversationManager.send()`.
3. `ConversationManager` attaches `LearningContext`, stores message, returns `Response`.
4. If AIProvider is available → streams response via `AIProvider.explain()`.
5. If offline → `SearchManager.search()` returns dictionary + course content.
6. Response renders in `AIChat` via `TutorMessage`.

---

## 8. Testing Strategy

| Layer                | Test Type             | Coverage                                 |
| -------------------- | --------------------- | ---------------------------------------- |
| ExactIndex           | Unit                  | Exact match, prefix, misspellings, empty |
| DictionaryService    | Unit                  | Lookup, FTS, smart form resolution       |
| SearchManager        | Unit                  | Two-level orchestration, merge logic     |
| ContextManager       | Unit                  | Context snapshot, subscription, update   |
| ConversationManager  | Unit                  | Session lifecycle, history persistence   |
| CacheService         | Unit                  | Set/get/delete/clear, TTL expiry         |
| CompanionProvider    | Integration           | Provider initialization, context bridge  |
| CompanionPanel       | Integration (learner) | Rendering, send flow, suggestions        |
| TextSelectionToolbar | Integration           | Selection detection, button actions      |
| A11y                 | E2E                   | Keyboard nav, screen reader, axe-core    |

---

## 9. Phased Delivery

### Phase 1: Package Scaffold + Provider Interfaces + Search

- Create `@open-edu/ai-companion` package
- Provider interfaces + types
- ExactIndex (Trie) + tests
- FlexSearchIndex wrapper + tests
- `DictionaryService` (exact + FTS) + tests
- Starter dictionary JSON

### Phase 2: Services Layer

- `SearchManager` (two-level) + tests
- `CacheService` + tests
- `ContextManager` + tests
- `ConversationManager` + tests

### Phase 3: Learner App Integration

- `CompanionProvider` + `useCompanion` hook
- `CompanionPanel` (Drawer/Sheet + AIChat)
- Pipili button wiring
- Wiring `RuntimeContext` → ContextManager

### Phase 4: Text Selection + Word Tap

- `TextSelectionToolbar` component
- Word tap handler (container-level click listener)
- Markdown renderer integration (optional)

### Phase 5: AI Provider

- Implement `AIProvider` using `@open-edu/llm-config`
- Prompt templates for explanation styles
- Streaming response support
- Offline fallback chain

---

## 10. Non-Functional Requirements

- **Startup:** <1s (services initialized lazily, not at import time)
- **Dictionary lookup:** <50ms (Trie lookup in memory)
- **Offline explanation:** <150ms (from cache or dictionary)
- **Cloud AI:** <3s (streaming preferred)
- **Initial offline package:** <100MB (dictionary JSON ~5-10MB)
- **Accessibility:** WCAG 2.2 AA
- **Storage:** IndexedDB + localStorage for cache

---

## 11. Success Criteria (from Req Spec)

- ✅ Tap any supported word → view meaning instantly
- ✅ Highlight text → receive explanation
- ✅ Translate words and sentences
- ✅ Hear pronunciation
- ✅ Ask contextual questions
- ✅ Reading-level appropriate explanations
- ✅ Continue contextual conversation within lesson
- ✅ All dictionary features offline
- ✅ Accessible via keyboard, touch, assistive tech
