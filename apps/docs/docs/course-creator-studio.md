---
sidebar_position: 4
---

# Course Creator Studio

**OpenEdu Course Creator Studio** is the authoring companion to the learner app. It lives in `apps/dev-server` (`@open-edu/dev-server`) and evolved from the original local Vite preview + inspector + file editor into a single product with two modes. Both modes edit the **same on-disk OpenEdu packages** — mode is presentation, not a format fork.

| Mode                  | Audience                               | Experience                                                                                                                        |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Creator** (default) | Teachers / tutors                      | Template gallery → Outline → activity editors → Preview → Share. Plain-language validation, no DevTools.                          |
| **Developer**         | Framework contributors / power authors | File tree, Markdown/JSON editors, manifest/workflow/rewards/cards editors, Telemetry / Logs / Rewards / A11y / Bundle inspectors. |

## Quick Start

```bash
# Start the Studio for a specific package (port 4000)
pnpm --filter @open-edu/cli build
node packages/cli/dist/cli.js dev ./examples/hello-world
```

Or via `edu` after installing the CLI:

```bash
edu dev ./my-package
```

The Studio opens in **Creator mode** by default. The Creator/Developer toggle is in the top bar and persists to `localStorage`. Set `OPEN_EDU_STUDIO_WORKSPACE` to a folder of courses to enable the course library (defaults to the parent of the opened package):

```bash
OPEN_EDU_STUDIO_WORKSPACE=~/courses edu dev ./examples/hello-world
```

## Creator mode

A non-technical teacher can start from a **template** or **AI draft**, edit through plain-language screens, preview as a learner, and leave with a shareable `.oep` — without CLI, file-path wrestling, or schema jargon.

### Home / Library

- **Template gallery** — reading lesson, lesson + quiz, practice warm-up, and short-unit starters
- **AI draft** — paste notes or a lesson outline; Studio generates a full draft with a quality checklist
- **Recent courses** — reopen recently worked-on packages
- **My courses** — a local course library with open / duplicate / rename / archive / import-folder actions, plus **units** (bundle 2–5 courses into one shareable unit)

### Outline

The course spine. Add lessons, quizzes, and practice activities, then reorder. Activity order drives the linear `workflow.json` automatically — no hand-editing routing files.

### Activity editors

- **Lesson** — Markdown body with coaching if a heading is missing
- **Quiz** — MCQ form that enforces at least one correct answer
- **Practice** — a curated widget picker with schema-driven settings forms and a **live preview**

### Guided flow, rewards & cards

- **Learning path** — simple score-based branching ("If score is at least… then go to…")
- **Rewards & cards** — completion badges, quiz-pass badges, and knowledge cards via plain forms

### Preview

The full learner runtime (`@open-edu/runtime`) with no DevTools in Creator mode.

### Share

Runs a **Ready check** (title, at least one activity, quiz correct answers, lesson headings, package validity), exports a `.oep` file, and shows copyable "how students open it" instructions plus a classroom note.

## Developer mode

The original dev-server power tools: a file tree with Markdown/JSON editors, editors for the manifest, workflow, rewards, and cards, asset upload, widget preview, validate-on-write, and the inspector panels (Telemetry, Logs, Rewards, Accessibility via axe-core, Bundle). See [Dev Server internals](./dev-server) for details.

## Architecture

The Studio UI is a façade over the package model. It talks to a thin `StudioAPI` (`apps/dev-server/src/studio/studioApi.ts`) implemented by a **local adapter** — Vite middleware for `/api/package/*` (file read/write, outline, validate, assets, export `.oep`) and `/api/studio/*` (AI generate/status, library scan/open/duplicate/rename/archive/import, unit creation/export) — so a hosted cloud Studio can reuse the same UX later.

- AI drafting runs **server-side**: LLM → `course-spec.json` → `@open-edu/course-compiler`. API keys stay in the server process (`OPEN_EDU_STUDIO_LLM_*` or existing llm-config env vars) and templates remain the offline fallback.
- The design spec (`docs/superpowers/specs/2026-08-05-course-creator-studio-design.md`) tracks the phased roadmap, including Phase 5 hosted Studio (auth + cloud storage).
