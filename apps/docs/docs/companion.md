---
sidebar_position: 18
---

# AI Companion Contracts (`@open-edu/companion`)

`@open-edu/companion` is the workspace package that owns the **AI companion wire contracts** shared by the Course Creator Studio assistant and the learner-side Pipili integration. It has no UI and no Node-only dependencies.

## What it provides

- `@open-edu/companion/chat` — the single chat message schema (`StudioChatRequestSchema`), size limits (`MAX_CONTEXT_CHARS`, `MAX_MESSAGES`, `MAX_REQUEST_SIZE_BYTES`), and the two converters `toAiSdkMessages` / `fromUIMessage`. The dev-server Studio ships raw messages to `/api/studio/ai/chat` and never re-parses intents; routing is server-owned.
- Top-level package exports — typed contracts for tools, skills, tasks, events, permissions, the agent runtime, requests, context snapshots, and change sets.

## Consumers

- `apps/dev-server` — Studio assistant (`apps/dev-server/src/studio/ai/*`) builds on the contracts for the agent loop and the chat UI.
- `apps/learner` — the learner-side companion pipeline.

## Build ordering

`@open-edu/companion` resolves to `dist/` outputs. After editing `packages/companion/src`, run `pnpm --filter @open-edu/companion build` before dev-server typechecks/tests.
