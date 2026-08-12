---
type: Design Spec
title: Studio Author Assistant — Persistent AI Sidebar
description: Design for consolidating Course Creator Studio AI authoring into a persistent right sidebar (mirroring learner Pipili), with page-context suggestions and free-text chat.
tags: [dev-server, studio, creator-mode, ai, companion, design]
---

# Studio Author Assistant — Design Spec

**Date:** 2026-08-12  
**Status:** Draft for review  
**Source app:** `apps/dev-server` (Course Creator Studio)  
**Learner reference:** Pipili right sidebar (`apps/learner` + `@open-edu/ai-companion`)

**Implementation plans:**

| Phase | Plan                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------ |
| Index | [`../plans/2026-08-12-studio-author-assistant-index.md`](../plans/2026-08-12-studio-author-assistant-index.md)     |
| A     | [`../plans/2026-08-12-studio-author-assistant-phase-a.md`](../plans/2026-08-12-studio-author-assistant-phase-a.md) |
| B     | [`../plans/2026-08-12-studio-author-assistant-phase-b.md`](../plans/2026-08-12-studio-author-assistant-phase-b.md) |
| C     | [`../plans/2026-08-12-studio-author-assistant-phase-c.md`](../plans/2026-08-12-studio-author-assistant-phase-c.md) |
| D     | [`../plans/2026-08-12-studio-author-assistant-phase-d.md`](../plans/2026-08-12-studio-author-assistant-phase-d.md) |

---

## 1. Problem

AI-assisted authoring in Studio is split across views and interaction models:

| Location         | Component      | Pattern                                             |
| ---------------- | -------------- | --------------------------------------------------- |
| Home             | `AiStartPanel` | Inline card, full-course generation                 |
| `ai-review`      | `AiReviewView` | Orphaned full-page review (not in chrome nav)       |
| Outline          | `AiAddDialog`  | Modal for single-activity draft                     |
| Activity editors | `AiEditPanel`  | Right column (lesson/quiz) or 3rd column (practice) |

Pain points:

- No continuity — conversation and intent are lost when navigating
- Inconsistent layout — page content, modal, or sidebar depending on view
- Discoverability — outline AI buried in Add ▾; home AI competes with templates
- Two commit models — course gen writes before review; item add/edit is draft-then-commit
- No free-form dialogue — only preset intents or one-shot prompts

The learner app already solves a similar problem with a persistent right sidebar (`CourseRightSidebar` + `PipiliChat`).

---

## 2. Goals and non-goals

### Goals

1. One persistent AI surface in Creator mode (right sidebar)
2. Page-context suggestions based on `StudioView` and selection
3. Free-text authoring chat
4. Unified draft-then-commit workflow
5. Conversation persistence across navigation within a course
6. Hybrid-ready (local Vite now; hosted Studio later)

### Non-goals (initial release)

- AI in Developer mode
- Bundle authoring AI
- Replacing `EditorCoachingPanel` (non-AI tips)
- Full autonomous multi-file agent loop (human-in-the-loop only)
- Streaming for batch course compile in early phases (Phase D)

---

## 3. North star

> **Pipili for learners, Author Assistant for teachers.**

```text
┌─────────────────────────────────────────────────────────────────┐
│ StudioChrome (breadcrumbs, nav, mode toggle, assistant toggle)  │
├──────────────────────────────────────────────┬──────────────────┤
│                                              │  Author Assistant │
│  Main canvas (view-specific)                 │  (persistent)     │
│  Home | Outline | Editor | Preview | Share   │  Suggestions      │
│                                              │  Chat + drafts    │
│                                              │  Composer         │
└──────────────────────────────────────────────┴──────────────────┘
```

| Learner (Pipili)            | Studio (Author Assistant)                  |
| --------------------------- | ------------------------------------------ |
| Explain selection           | Improve selected text / activity           |
| Suggested learner questions | Contextual authoring chips                 |
| Free-text tutor chat        | Free-text authoring chat                   |
| Hint levels                 | Structured intents (rewrite, add quiz, …)  |
| Reward messages inline      | Draft-applied / validation messages inline |

---

## 4. UX summary

### Shell

- Mount only in Creator mode
- Always-mounted right rail; open/close via width (not unmount)
- Resize with `useResizablePanel`; persist width + open state
- Header sparkles button + `Cmd/Ctrl+Shift+A`
- Collapsed 48px rail with chevron

### Sidebar anatomy

1. Header + AI availability status
2. Context strip (view + course/activity)
3. Page-context suggestion chips
4. Chat thread (with draft cards in later phases)
5. Structured intent row (edit-activity, Phase B+)
6. Free-text composer

### Migration of existing AI UI

| Current               | Target                                        |
| --------------------- | --------------------------------------------- |
| `AiStartPanel`        | Slim CTA → sidebar (Phase C)                  |
| `AiReviewView`        | Removed; review in sidebar (Phase C)          |
| `AiAddDialog`         | Outline “Add with AI” opens sidebar (Phase B) |
| `AiEditPanel`         | Removed; intents in sidebar (Phase B)         |
| `EditorCoachingPanel` | Keep in editor (v1)                           |

### Commit model

All AI mutations are **draft-then-commit**. Course generation write-before-review is fixed in Phase C.

---

## 5. Context model

```typescript
interface StudioContextSnapshot {
  view: StudioView;
  locale: string;
  aiAvailable: boolean;
  course?: {
    id: string;
    title: string;
    activityCount: number;
    outline: Array<{ title: string; kind: string; path: string }>;
  };
  activity?: {
    path: string;
    kind: ActivityKind;
    title?: string;
    contentExcerpt?: string;
    selection?: { start: number; end: number; text: string };
    isDirty: boolean;
    validationIssues?: string[];
  };
}
```

`StudioContextBridge` (null-render) pushes snapshots into `StudioAssistantProvider`, mirroring learner `ContextBridge`.

---

## 6. Architecture summary

```text
StudioApp
└── StudioAssistantProvider
    └── StudioChatProvider
        └── StudioContextBridge
        └── StudioLayout
            ├── StudioChrome (+ AssistantHeaderButton)
            ├── MainViewRouter
            └── StudioRightSidebar
                ├── ContextStrip
                ├── SuggestedQuestions
                ├── StudioAssistantChat
                ├── IntentChipsRow (Phase B+)
                └── Composer
```

**API:**

- Keep: `GET /api/studio/ai/status`, `POST …/generate`, `…/item/add`, `…/item/edit`
- Add: `POST /api/studio/ai/chat` (Phases A–D)
- Add: `POST /api/studio/ai/commit` (Phase C)
- Chat tools wrap existing generate/item endpoints (Phases B–C)

**Do not** import from `apps/learner`. Lift shared chat UI to `@open-edu/design-system` only if Phase D extraction is approved.

---

## 7. Phased roadmap

```text
Phase A → Shell + explain-only chat + suggestions
Phase B → Item drafts + intents; remove AiEditPanel / AiAddDialog
Phase C → Course gen unification; remove ai-review; draft-then-commit
Phase D → Streaming, IDB history, next-steps, polish
```

Each phase is one PR-sized plan with Vitest coverage, i18n, and a11y requirements.

---

## 8. Related docs

- Studio product design: [`2026-08-05-course-creator-studio-design.md`](./2026-08-05-course-creator-studio-design.md)
- Existing AI item add/edit: [`2026-08-10-studio-ai-item-add-edit-design.md`](./2026-08-10-studio-ai-item-add-edit-design.md) / [`…-plan.md`](./2026-08-10-studio-ai-item-add-edit-plan.md)
- Pipili companion: [`2026-07-26-pipili-ai-companion-design.md`](./2026-07-26-pipili-ai-companion-design.md)
- Agentic skill: `skills/openedu-course-authoring/`
