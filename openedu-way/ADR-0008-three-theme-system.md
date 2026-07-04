# ADR-0008 — Three-Theme System

## Status

Accepted

## Date

2026-07-04

## Context

OpenEdu currently ships six themes:

- `lumina-scholastica`
- `nocturnal`
- `zen`
- `high-focus`
- `forest`
- `sylvan-workspace`

A review against Volume I (Philosophy) and Volume II (Design Language) found that several themes contradict the project's own principles:

- **`nocturnal`** is described as _"glassmorphism and neon accent glows."_ Volume I §"Calm Before Excitement" rejects urgency and visual noise. Volume II §04 _"Color Language"_ says palettes should _"feel calm, trustworthy, welcoming, focused"_ and _"avoid aggressive, distracting, or overwhelming"_ looks.
- **`zen`** uses a pure-neutral primary (`#5d5a54`) and zero-radius corners. Volume II §04 requires _"the same semantic meaning should always use the same color family"_ across themes. The Visual DNA (Stage 3) is built entirely from the **circle** primitive; zero radii contradicts that identity.
- **`high-focus`** treats accessibility as a pickable theme. Volume I §"Accessibility Is Craftsmanship" and Volume II §12 frame accessibility as a foundation, not a feature the learner must opt into.
- **`forest`** and **`sylvan-workspace`** are decorative flavor themes with no distinct semantic job. They duplicate a "warm/organic" feeling and add maintenance surface without adding learner value.

Six themes also violates Volume I §3 _"Simplicity Is Respect"_ and the MVP discipline in `AI_CONTEXT_v2.md`: _"choose the smallest solution that solves the problem."_

Volume I §10 _"Learning Has Rhythm"_ describes alternating curiosity, focus, reflection, and rest. This rhythm is a better organizing principle than decorative mood boards.

## Decision

Reduce the theme system from six themes to **three**.

Each theme maps onto a phase of the learner's rhythm and carries a semantic job rather than a decorative one.

| Theme (user-facing name) | Theme ID             | Semantic job                                                          | Learner rhythm    |
| ------------------------ | -------------------- | --------------------------------------------------------------------- | ----------------- |
| OpenEdu Light (default)  | `lumina-scholastica` | Everyday comfortable learning                                         | Curiosity         |
| OpenEdu Dark             | `nocturnal`          | Deep focus, night sessions, eye-strain reduction                      | Focus             |
| OpenEdu Zen              | `zen`                | Reduced stimulation, contemplative reading, low-arousal accessibility | Reflection / Rest |

Decommission `high-focus`, `forest`, and `sylvan-workspace`.

Theme IDs are preserved to keep existing `localStorage` preferences valid. Only the user-facing `name`, `description`, color tokens, typography, and radii are revised.

### Dark (`nocturnal`) — calm revision

Drop "neon accent glows" and glassmorphism.

Keep the deep neutral surface ramp.

Make `primary` the same purple family as Light (`#5d4a8a` lineage), lightened for dark backgrounds using the existing `primary-fixed-dim` / `inverse-primary` tokens rather than an invented neon accent.

### Zen (`zen`) — mood, not contradiction

Preserve the muted, low-stimulation mood.

Restore consistency with Volume II and Visual DNA:

- **Color:** introduce a desaturated purple as `primary` so semantic meaning survives across themes. Keep surfaces low-saturation and warm.
- **Radii:** restore soft radii matching the circle primitive. Zero radius is removed.
- **Typography:** restore Source Serif 4 to the `expressive` set. Zen is the contemplative-reading theme; serif is the deep-reading voice. Inter remains in the `productive` set.

### Light (`lumina-scholastica`) — minor polish

Already aligned. Confirm `primary-light` (`#7c6bb0`) is used as the Visual DNA satellite color (`--oe-color-primary-light`) so Open Module, Assembly Flow, and Silhouette Assembly render identically across all three themes.

### Accessibility — no longer a theme

Move high-contrast handling to CSS media queries:

- `@media (prefers-contrast: more)`
- `@media (forced-colors: active)`

These overrides live inside `RuntimeThemeProvider` and apply automatically. The learner never chooses accessibility. It just is accessible. This honors Volume I §"Technology Should Disappear."

## Rationale

### Philosophical

- Six decorative choices violate "Simplicity Is Respect" (Volume I §3).
- Accessibility as a theme violates "Accessibility Is Craftsmanship" (Volume I) and Volume II §12.
- Neon and glassmorphism violate "Calm Before Excitement" (Volume I §2).
- Zero radius contradicts the circle Visual DNA.
- Mapping themes to learner rhythm honors "Learning Has Rhythm" (Volume I §10).

### Design

- Cross-theme color consistency (Volume II §04) requires the same primary family in all themes.
- Three semantic jobs (everyday / focus / rest) is meaning-driven, not mood-driven.
- Removes maintenance surface: four fewer theme files, four fewer ThemeSelector cards, simpler a11y test matrix.

### Practical

- Preserved theme IDs keep existing `localStorage` values valid. No migration script needed.
- The learner a11y test matrix shrinks from 6 themes × N pages to 3 themes × N pages.
- Storybook theme picker shrinks from 6 entries to 3.

## Alternatives Considered

### Keep six themes, fix inconsistencies

Re-paint `nocturnal` and `zen` in place but retain all six.

Rejected: still violates MVP discipline and "Simplicity Is Respect." Decorative flavor themes (`forest`, `sylvan-workspace`) carry no semantic job.

### Collapse to two themes (light + dark)

Remove Zen as well.

Rejected: Zen's low-stimulation, contemplative-reading job is real. It serves learners who need reduced arousal (a population OpenEdu explicitly serves: autism-reading, calm-technology values). Two themes would force every reduced-stimulation learner into the light theme with no escape.

### Collapse to three but rename theme IDs

Rename `lumina-scholastica` → `open-edu-light`, etc.

Rejected: breaks persisted `localStorage` preferences for existing users. MVP discipline says choose the smallest solution. User-facing names can carry the new branding without breaking stored IDs.

### Use `prefers-color-scheme` for light/dark, keep only Zen pickable

Let the OS preference drive light/dark automatically.

Rejected: removes learner agency (Volume I §6 _"Guide, Never Push"_ — the learner remains in control). Some learners want dark in daylight or light at night. Three explicit choices plus automatic media-query overrides for accessibility gives both agency and defaults.

## Consequences

### Benefits

- One clear default. Two clear alternatives. One semantic job each.
- Visual DNA and color consistency hold across all three themes.
- Accessibility is automatic, not opt-in.
- Smaller test surface, smaller Storybook picker, fewer files to maintain.
- Aligns theme count with MVP discipline.

### Trade-offs

- Learners who currently use `high-focus`, `forest`, or `sylvan-workspace` will fall back to the default theme after this change. Their `localStorage` value will no longer match a valid `ThemeId` and `useThemePreference` will return `defaultThemeId`.
- `high-focus` learners lose the explicit high-contrast option until the `prefers-contrast` / `forced-colors` overrides ship. The implementation plan front-loads these overrides so the gap is brief.
- Visual variety in demos and screenshots is reduced. This is an accepted cost: variety without meaning violates Volume I §3.

## Related Documents

- Volume I — Philosophy (`01-philosophy/00-philosophy.md`, `04-design-principles.md`)
- Volume II — Design Language (`02-design-language/04-color-language.md`, `12-accessibility.md`)
- Visual DNA (`03-visual-dna.md`)
- Design Status (`DESIGN_STATUS.md`)
- Implementation Plan (`docs/superpowers/plans/2026-07-04-three-theme-cutover.md`)
- Supersedes: `docs/superpowers/plans/2026-07-01-theme-v2-all-themes.md` (six-theme plan)

---

_"Three themes. Three jobs. One identity."_
