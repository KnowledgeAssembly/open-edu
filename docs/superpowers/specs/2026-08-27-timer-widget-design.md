# Native Timer Widget Design Spec (`core.timer`)

> **Status:** Draft
> **Date:** 2026-08-27
> **Stage:** 5 — Product Design
> **Type:** Content-node built-in widget (new)
> **Distinct from:** `2026-07-07-break-reminder-design.md` (app-level nag bar + BreakPage). This widget is _authored inside a course workflow_ — a break is a first-class node the teacher places between activities.

---

## Purpose

Add a native **timer** widget to the built-in widget registry that lets authors place a timed break or transition directly inside a course workflow (e.g., "5 minutes to stretch" between lessons). The timer is designed with autism-spectrum learners in mind: it makes abstract time _visual and predictable_, with clear start/end signals and pre-warned transitions.

---

## Decisions (resolved)

| Question                   | Decision                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Widget ID / domain         | `core.timer` — domain-agnostic support tool; no new `support` domain in v1                             |
| Default break length       | Fully **author-controlled**. `ai.generationHints` suggest but never enforce age-based defaults         |
| Audio assets               | **Not required for v1** — no built-in chime, no `resolveAsset()` sound path. Cues are visual/text only |
| Warnings telemetry on skip | **Record** — skipped warnings still emit telemetry with the skip reason/method                         |

---

## Goals

- Authors can place a timed break/transition as a normal workflow node.
- Time is represented **visually** (ring / bar / blocks) so elapsed/remaining time is concrete, not abstract.
- Transitions are **predictable**: clear start, pre-warned near-end, calm completion.
- No startling audio, no flashing, honors `prefers-reduced-motion`.

### Non-goals (v1)

- Meditation audio, guided breathing, or sensory stories.
- App-level scheduling / periodic reminders (covered by `break-reminder-design`).
- Built-in sound effects or sound file resolution.
- A new `support` widget domain.

---

## Widget Contract

| Field             | Value                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `core.timer`                                                                                                              |
| `name`            | `Timer`                                                                                                                   |
| `description`     | `Visual countdown/count-up timer for breaks and transitions`                                                              |
| `domain`          | `core`                                                                                                                    |
| `status`          | `stable`                                                                                                                  |
| `learningIntents` | `[Observe, Reflect]` — a break is _not_ scored practice                                                                   |
| `icon`            | `timer`                                                                                                                   |
| `keywords`        | `['timer', 'break', 'countdown', 'transition', 'pause', 'self-regulation']`                                               |
| node shape        | `{ "type": "exercise", "widget": "core.timer", "config": { … } }` (matches `callout` / `audio-player` non-scored pattern) |

---

## Config Schema (Zod)

```ts
export const configSchema = z.object({
  duration: z.number().int().min(5).max(3600).default(120), // seconds
  mode: z.enum(['countdown', 'countup']).default('countdown'),
  label: z.string().max(256).optional(), // "Time for a break"
  completeMessage: z.string().max(256).optional(), // "Ready to continue?"
  visual: z.enum(['ring', 'bar', 'blocks']).default('ring'), // visual time representation
  showDigital: z.boolean().default(true),
  autoStart: z.boolean().default(true), // break auto-runs (observe pattern)
  allowPause: z.boolean().default(true),
  allowSkip: z.boolean().default(true), // end early (break shouldn't trap)
  warnings: z
    .array(
      z.object({
        atSeconds: z.number().int().min(0),
        message: z.string().max(256).optional(),
      }),
    )
    .default([]),
  colorZones: z.boolean().default(true), // green→amber→red, no flashing
  interactive: z.boolean().default(false), // false = pure observe/auto-complete
});

export type TimerConfig = z.infer<typeof configSchema>;
```

> No audio fields in v1. Cues are visual/text only; audio is a future enhancement.

---

## Behavior & Modes

1. **Break / observe mode** (`interactive: false`, default): renders the visual countdown, honors `autoStart`, and calls `complete()` (score omitted) when the timer reaches zero → workflow routes to the next node automatically. `allowSkip` still shows an "End break now" button.
2. **Interactive mode** (`interactive: true`): pause / resume / restart / skip controls (Button primitives + keyboard).
3. **Transition warnings**: at each `warnings[].atSeconds`, show `message` in an `aria-live="polite"` region. Critical for ASD predictability ("2 minutes left — finish up").
4. **Count-up** (`mode: 'countup'`): quiet focus/reading blocks with no forced end.
5. **State restoration**: persist `{ remaining, startedAt, phase }` via `storedState` so returning to the node resumes rather than restarts (matches the widget-answer-persistence pattern).

### Completion & Routing

- Natural completion (countdown reaches zero) → `complete()` with no score.
- Skip → `complete()` with no score, plus a `widget.interaction` event recording the skip.
- Routing is standard: `workflow.json` `onComplete` maps the timer node to its successor (see `examples/widget-showcase/workflow.json`).

---

## Visual Design (autism-first)

- **Visual time is primary** — a shrinking **ring** (SVG `stroke-dashoffset`), horizontal **bar**, or **discrete blocks**; digits are secondary and optional (`showDigital`).
- **Color zones** (green → amber → red) via `--oe-*` tokens only; **no flashing/blinking**; honor `prefers-reduced-motion`.
- Large touch targets, minimal on-screen text, optional pictographic "break" icon.
- Completion is a calm "All done" state — no alarm, no motion flourish.

---

## Accessibility

- `role="timer"` + `aria-live`; **throttled announcements** (start, each warning, completion — never every second).
- Full keyboard: Space = pause/resume, R = restart, Esc = skip.
- `capabilities`: `supportsKeyboard`, `supportsScreenReader`, `supportsTouch`, `supportsMouse`, `supportsAnalytics`, `supportsAccessibility`, `supportsOffline`, `supportsObserveMode`.
- `accessibility` flags: `highContrast`, `keyboardOnly`, `screenReader`, `tts`, `reducedMotion`, `focusManagement`, `ariaSupport`.
- **i18n**: all user-facing strings via `t()` + new keys in `packages/i18n/locales/en/` (per AGENTS.md rule 5 — this is new code and must not hardcode).

---

## Telemetry, Rewards, AI

### Analytics

`trackCompletionTime`, `trackAttempts`. Emit `widget.interaction` events:

| Event              | Payload                                        |
| ------------------ | ---------------------------------------------- |
| `start`            | `mode`, `duration`, `autoStart`                |
| `pause` / `resume` | `elapsed`                                      |
| `warning`          | `atSeconds`, `remaining`                       |
| `complete`         | `method: 'natural' \| 'skipped'`, `elapsed`    |
| `skip`             | `elapsed`, `warningsSeen`, `warningsSkipped[]` |

**Skip-before-warning rule:** when a student skips before a warning fires, the skipped warning is still recorded in telemetry (via `warningsSkipped[]` on the `skip` event).

### Rewards

Minimal — no XP, no confetti (a break must not be gamified). Optional soft `positiveMessage` only.

### AI Metadata

```
difficulty: 'easy'
bloomsLevel: 'remember'
cognitiveLoad: 'low'
readingLevel: 'pre-reader'
recommendedAge: [3, 18]
subjectTags: ['wellness', 'self-regulation', 'transitions']
learningObjectives:
  - 'Use a visual timer to understand elapsed and remaining time'
  - 'Transition calmly between activities'
generationHints:
  - 'Keep break length short and concrete (1-5 minutes) for young or spectrum learners'
  - 'Add a warning ~30-60s before the end to support predictable transitions'
  - 'Provide a clear label and a calm completeMessage'
exampleConfigs:
  - { duration: 120, mode: 'countdown', label: 'Time for a stretch break', visual: 'ring' }
  - { duration: 300, mode: 'countdown', warnings: [{ atSeconds: 60, message: 'One minute left' }] }
  - { duration: 0, mode: 'countup', label: 'Quiet reading time', interactive: true }
```

---

## File Map

### New files

| File                                                 | Purpose                                           |
| ---------------------------------------------------- | ------------------------------------------------- |
| `packages/widgets/src/builtins/Timer/Timer.tsx`      | Component + `configSchema` + `WidgetDefinitionV2` |
| `packages/widgets/src/builtins/Timer/Timer.test.tsx` | Vitest unit tests                                 |

### Modified files

| File                                                | Change                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/widgets/src/builtins/index.ts`            | `export { timer }`                                                 |
| `packages/widgets/src/registry.ts`                  | Add `timer` to `BUILTIN_WIDGETS`                                   |
| `packages/widgets/src/metadata/learning-intents.ts` | `'core.timer': [LearningIntent.Observe, LearningIntent.Reflect]`   |
| `packages/widgets/src/widget-catalog-source.ts`     | Add `WidgetCatalogEntry` + `guide`                                 |
| `packages/core/src/widget-catalog-data.json`        | Regenerated via `pnpm --filter @open-edu/widgets generate:catalog` |
| `packages/i18n/locales/en/*.json`                   | Timer strings                                                      |
| `examples/widget-showcase/nodes/timer.json`         | Demo node                                                          |
| `examples/widget-showcase/workflow.json`            | Routing entry                                                      |

The Course Creator Studio picks up the widget automatically from the regenerated catalog.

---

## Verification

- `pnpm --filter @open-edu/widgets test` passes (schema, countdown, warnings, skip, pause, restore)
- `pnpm lint` — no errors (incl. `lint:hardcoded-strings`)
- `pnpm typecheck` — no errors
- `pnpm format:check` — clean
- axe-core audit passes for all timer states (running, warning, complete, interactive)
- Manual: authored break node auto-completes and routes; skip advances; state resumes on re-entry
- Catalog regenerated; widget appears in Studio picker + showcase

---

## Acceptance Criteria

- [ ] Break node auto-completes and routes to the next node on timer end.
- [ ] Visual ring/bar/blocks updates without animation when `prefers-reduced-motion` is set.
- [ ] Warnings announce predictably; completion is calm (no alarm, no flashing).
- [ ] `aria-live` announcements are throttled; axe-core passes.
- [ ] Skipping a break still advances the workflow and records skipped warnings in telemetry.
- [ ] Timer state resumes (not restarts) on re-entry to the node.
- [ ] All strings via `t()`; `pnpm lint:hardcoded-strings` clean.
- [ ] Catalog regenerates; widget appears in Studio widget picker + showcase.
