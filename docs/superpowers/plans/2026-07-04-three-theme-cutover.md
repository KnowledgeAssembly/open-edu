# Three-Theme Cutover — Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the OpenEdu theme system from six themes to three — OpenEdu Light, OpenEdu Dark, OpenEdu Zen — aligned to `openedu-way` philosophy (ADR-0008). Move accessibility from a pickable theme to automatic CSS media-query overrides.

**ADR:** `openedu-way/ADR-0008-three-theme-system.md`

**Architecture:** Three sequential phases. Phase 1 ships the automatic accessibility overrides first so `high-focus` learners are not left without high contrast. Phase 2 collapses the theme registry and rewrites the three remaining theme definitions. Phase 3 updates UI, tests, Storybook, and docs, then verifies.

**Tech Stack:** TypeScript, React 18, Tailwind CSS 3.x, Vitest, Playwright, axe-core, Storybook

---

## File Map

### New Files to Create

| File                                                                    | Purpose                                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/runtime/src/theme/a11y-overrides.css.ts`                      | CSS string for `prefers-contrast` / `forced-colors` overrides        |
| `packages/runtime/src/themes/__tests__/cross-theme-consistency.test.ts` | Asserts primary family + radii consistency across all three themes   |
| `packages/runtime/src/components/__tests__/a11y-media-queries.test.tsx` | Asserts the overrides `<style>` tag is injected with correct content |
| `docs/design/three-theme-cutover.md`                                    | Design notes (token deltas) supporting ADR-0008                      |

### Files to Modify

| File                                                                      | Change                                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/design-system/src/theme/types.ts`                               | Trim `ThemeId` union to 3 values                                                  |
| `packages/runtime/src/themes/index.ts`                                    | Drop 3 imports, drop 3 registry entries, drop 3 `themeIds`, keep `defaultThemeId` |
| `packages/runtime/src/themes/nocturnal.ts`                                | Calm revision: purple primary, no neon, no glassmorphism                          |
| `packages/runtime/src/themes/zen.ts`                                      | Desaturated purple primary, soft radii, Source Serif in `expressive`              |
| `packages/runtime/src/themes/lumina-scholastica.ts`                       | Polish only: confirm `primary-light` carries Visual DNA satellite color           |
| `packages/runtime/src/theme.tsx`                                          | Inject `a11y-overrides.css.ts` style tag into `RuntimeThemeProvider`              |
| `packages/runtime/src/components/ThemeSelector.tsx`                       | Reduce `themeInfo` to 3 entries with new names/descriptions/swatches              |
| `packages/runtime/src/themes/__tests__/theme-definitions.test.ts`         | Drop 3 theme imports; assert 3 themes; add cross-theme primary-family assertions  |
| `packages/runtime/src/themes/__tests__/registry.test.ts`                  | Assert 3 themes, not 6                                                            |
| `packages/runtime/src/components/__tests__/ThemeSelector.test.tsx`        | Drop `high-focus`/`sylvan-workspace` cases; add Zen radii assertion               |
| `packages/runtime/src/components/__tests__/RuntimeThemeProvider.test.tsx` | Drop `high-focus` case; add `<style>` injection assertion                         |
| `packages/runtime/src/components/__tests__/useThemePreference.test.ts`    | Drop `high-focus` case; add invalid-id fallback assertion                         |
| `apps/learner/src/__tests__/a11y-themes.test.tsx`                         | Iterates `themeIds` automatically — no edit needed beyond removing hardcases      |
| `apps/learner/src/SettingsPage.test.tsx`                                  | Replace `high-focus` click with `zen` click                                       |
| `packages/runtime/src/components/useThemePreference.ts`                   | No code change needed (already falls back to `defaultThemeId` on invalid id)      |
| `packages/design-system/.storybook/preview.tsx`                           | Reduce `themeMap` and toolbar items to 3                                          |
| `tests/e2e/theme-switching.spec.ts`                                       | Drop High Focus + Sylvan cases; add Zen case; fix `expectedThemes` array          |
| `apps/docs/docs/runtime.md`                                               | Update theme table to 3 themes; update `themeIds` example output                  |
| `apps/docs/docs/architecture.md`                                          | Update "6 themes" → "3 themes"; update theme table                                |
| `apps/docs/docs/intro.md`                                                 | Update "6 themes" listing to 3                                                    |
| `apps/docs/docs/testing.md`                                               | Update theme matrix counts (6 → 3); update `THEMES` array                         |
| `README.md`                                                               | Update theme table to 3 themes                                                    |
| `AGENTS.md`                                                               | Update "6-theme system" references to "3-theme system"                            |
| `openedu-way/DESIGN_STATUS.md`                                            | Update Stage 6 theme row; add ADR-0008 to decision log                            |

### Files to Delete

| File                                              | Reason                    |
| ------------------------------------------------- | ------------------------- |
| `packages/runtime/src/themes/high-focus.ts`       | Decommissioned — ADR-0008 |
| `packages/runtime/src/themes/forest.ts`           | Decommissioned — ADR-0008 |
| `packages/runtime/src/themes/sylvan-workspace.ts` | Decommissioned — ADR-0008 |

---

## Phase 1 — Automatic Accessibility Overrides

**Why first:** `high-focus` learners must not lose high contrast, even briefly, between Phase 2 and the overrides shipping. Ship automatic overrides first so the gap is zero.

### Task 1.1 — Author the overrides CSS

- [ ] Create `packages/runtime/src/theme/a11y-overrides.css.ts`
- [ ] Export a single `const a11yOverridesCss: string` containing:
  - `@media (prefers-contrast: more)` block — increase `--oe-color-outline` contrast, thicken `--oe-border-width-*`, boost `--oe-focus-ring-width`
  - `@media (forced-colors: active)` block — map `--oe-color-*` semantic roles to `CanvasText`, `Canvas`, `Highlight`, etc. using `<system-color>` keywords
- [ ] Reference tokens by CSS variable name only — no hex values
- [ ] Add unit test in `a11y-media-queries.test.tsx` asserting the string contains both media queries and references `CanvasText` and `--oe-color-outline`

### Task 1.2 — Inject overrides via RuntimeThemeProvider

- [ ] In `packages/runtime/src/theme.tsx`, import `a11yOverridesCss`
- [ ] Render `<style dangerouslySetInnerHTML={{ __html: a11yOverridesCss }} />` once inside the provider wrapper (memoized so it renders once, not per child)
- [ ] Update `RuntimeThemeProvider.test.tsx` — assert the `<style>` tag is present in the rendered tree and contains `@media (prefers-contrast`
- [ ] Run: `pnpm --filter @open-edu/runtime test`

### Task 1.3 — Verify accessibility posture

- [ ] Run `pnpm test` to confirm no regressions
- [ ] Manually verify in learner app: with OS "Increase contrast" enabled, surfaces and outlines respond automatically
- [ ] Commit: `feat(runtime): automatic a11y contrast overrides via prefers-contrast + forced-colors`

---

## Phase 2 — Collapse the Three Themes

### Task 2.1 — Trim the `ThemeId` union

- [ ] Edit `packages/design-system/src/theme/types.ts` — reduce `ThemeId` to `'lumina-scholastica' | 'nocturnal' | 'zen'`
- [ ] Run `pnpm typecheck` to surface all callers that need updates (expected: registry, ThemeSelector, tests, README)
- [ ] Do not fix callers yet — do that in Task 2.3+

### Task 2.2 — Update the registry

- [ ] Edit `packages/runtime/src/themes/index.ts`:
  - Remove imports of `highFocus`, `sylvanWorkspace`, `forest`
  - Remove their entries from `themeRegistry` and `themeIds`
  - Keep `defaultThemeId = 'lumina-scholastica'`
  - Keep `DEFAULT_THEME = luminaScholastica`
- [ ] Delete `high-focus.ts`, `forest.ts`, `sylvan-workspace.ts`
- [ ] Run: `pnpm typecheck` (expected errors remain in tests + ThemeSelector — fixed next)

### Task 2.3 — Rewrite `nocturnal.ts` (OpenEdu Dark, calm)

- [ ] Update `name` → `'OpenEdu Dark'`
- [ ] Update `description` → `'Calm dark theme for deep focus, night sessions, and eye-strain reduction.'` (drop "glassmorphism" and "neon")
- [ ] Color deltas (use the existing `primary-fixed-dim` / `inverse-primary` lightened purples from `lumina-scholastica` as the dark-mode primary family):
  - `primary` → `'#d4c4ff'` (was the existing `primary-fixed-dim` — same purple family as Light, lightened)
  - `on-primary` → `'#2a104d'` (was the existing `on-primary-fixed`)
  - `primary-container` → `'#5d4a8a'` (the Light `primary` value)
  - `on-primary-container` → `'#ede2ff'`
  - `inverse-primary` → `'#5d4a8a'`
  - `accent` → `'#d4c8e8'` (drop neon `#46f5e0`)
  - Keep the existing deep neutral surface ramp
- [ ] Keep typography as-is (already Inter `productive`, Source Serif 4 `expressive`)
- [ ] Keep spacing and radii as-is
- [ ] Add Storybook toolbar `dark` mapping remains valid

### Task 2.4 — Rewrite `zen.ts` (OpenEdu Zen, consistent)

- [ ] Update `name` → `'OpenEdu Zen'`
- [ ] Update `description` → `'Reduced-stimulation theme for contemplative reading and low-arousal accessibility.'`
- [ ] **Color deltas** — introduce desaturated purple primary:
  - `primary` → `'#8a8294'` (desaturated purple-grey, same family lineage)
  - `on-primary` → `'#ffffff'`
  - `primary-container` → `'#d4cfdc'`
  - `on-primary-container` → `'#2a2630'`
  - `inverse-primary` → `'#d4cfdc'`
  - `primary-light` → `'#a89fb2'`
  - `accent` → `'#726e68'` (keep existing muted secondary as accent feel)
  - Keep existing muted warm neutral surfaces
- [ ] **Radii deltas** — restore soft radii matching Visual DNA:
  - `sm: '0.25rem'`, `DEFAULT: '0.375rem'`, `md: '0.5rem'`, `lg: '0.625rem'`, `xl: '0.75rem'`, `full: '9999px'`
  - (Remove the all-zero radii)
- [ ] **Typography deltas** — restore Source Serif 4 to `expressive`:
  - `expressive.display.fontFamily` → `'"Source Serif 4", Georgia, ui-serif, serif'` (matching Lumina)
  - `expressive.heading.fontFamily` → `'"Source Serif 4", ...'`
  - `expressive.subheading.fontFamily` → `'"Source Serif 4", ...'`
  - `expressive.body.fontFamily` → `'"Source Serif 4", ...'`
  - `expressive.body.fontSize` → `'17px'`, `lineHeight: '1.7'`, `letterSpacing: '0.01em'`
  - Update all `expressive.heading3..6` fonts to Source Serif for consistency
  - Keep `label` and `caption` and `code` as Inter / JetBrains Mono (matches Lumina's split)
  - Keep `productive` set as-unstyled (Inter throughout) — Zen's productive voice stays quiet
- [ ] Lower the calmness by reducing `motion` token intensity (if motion tokens per-theme exist; else skip — keep MVP scope)

### Task 2.5 — Polish `lumina-scholastica.ts` (OpenEdu Light)

- [ ] Update `name` → `'OpenEdu Light'`
- [ ] Update `description` → `'Default calm theme for everyday learning.'`
- [ ] Confirm `primary-light` = `'#7c6bb0'` matches the Visual DNA satellite color used by `Open Module`, `Assembly Flow`, `Silhouette Assembly`. If any Visual DNA component hardcodes a different value, fix the component to read `--oe-color-primary-light`.
- [ ] No other token changes
- [ ] Run: `pnpm --filter @open-edu/runtime test`

### Task 2.6 — Add cross-theme consistency test

- [ ] Create `packages/runtime/src/themes/__tests__/cross-theme-consistency.test.ts`
- [ ] Assert all three themes:
  - Have `primary` values within the same hue family (use a helper converting hex → HSL and asserting `hue` within ±20° of `#5d4a8a`'s hue ≈ 258°)
  - Have `radii.sm` !== `'0px'` (Zen specifically: assert no zero radii)
  - Share the same `spacing.containerMax`, `readingWidth`, `paragraphSpacing` values
  - Have `primary-light` defined
- [ ] Commit: `feat(themes): collapse to 3 themes — Light, Dark, Zen (ADR-0008)`

---

## Phase 3 — UI, Tests, Docs, Verification

### Task 3.1 — Update ThemeSelector

- [ ] Edit `packages/runtime/src/components/ThemeSelector.tsx` `themeInfo` array:
  - Reduce to 3 entries
  - `lumina-scholastica` → name `'OpenEdu Light'`, description `'Default calm learning'`, swatches `['#fcfaf8', '#5d4a8a', '#1f1c18', '#7c6bb0']`
  - `nocturnal` → name `'OpenEdu Dark'`, description `'Calm dark for deep focus'`, swatches `['#151219', '#d4c4ff', '#221e25', '#5d4a8a']`
  - `zen` → name `'OpenEdu Zen'`, description `'Reduced stimulation, quiet reading'`, swatches `['#fcfaf8', '#8a8294', '#1f1c1a', '#d4cfdc']`
- [ ] Set `grid-cols-3` on the popover grid (was `grid-cols-2`) so all three fit in one row
- [ ] Update `ThemeSelector.test.tsx`:
  - Drop `high-focus` and `sylvan-workspace` cases
  - Add a case that clicks `zen` and asserts `onThemeChange` called with `'zen'`
  - Add a case that renders with `currentThemeId="zen"` and asserts `aria-selected` on the Zen card
- [ ] Run: `pnpm --filter @open-edu/runtime test`

### Task 3.2 — Update remaining unit tests

- [ ] `theme-definitions.test.ts` — drop 3 imports + 3 map entries; the `describe.each` loop now runs for 3 themes; add a case `'nocturnal primary is in Light purple family'` (assert `nocturnal.colors.primary` hex is within hue ±20° of `luminaScholastica.colors.primary`)
- [ ] `registry.test.ts` — assert 3 themes, expected IDs `[ 'lumina-scholastica', 'nocturnal', 'zen' ]`; drop the `high-focus`/`sylvan-workspace`/`forest` `toHaveProperty` lines
- [ ] `RuntimeThemeProvider.test.tsx` — replace `themeId="high-focus"` case with `themeId="zen"`; assert `data-theme="zen"`; keep `nocturnal` case; keep the new `<style>` injection assertion from Task 1.2
- [ ] `useThemePreference.test.ts` — drop `high-focus` set/get cases; add a case where `localStorage` contains `'forest'` (now invalid) and assert the hook falls back to `defaultThemeId`; add a case where `localStorage` contains `'zen'` and assert it returns `'zen'`
- [ ] `apps/learner/src/SettingsPage.test.tsx` — replace the `high-focus` click with `zen` click and assert `onThemeChange` called with `'zen'`

### Task 3.3 — Update Storybook preview

- [ ] Edit `packages/design-system/.storybook/preview.tsx`:
  - `themeMap` → `{ 'lumina-scholastica': 'light', nocturnal: 'dark', zen: 'light' }`
  - Toolbar `items` → 3 entries with new titles (`OpenEdu Light`, `OpenEdu Dark`, `OpenEdu Zen`)
- [ ] Run: `pnpm --filter @open-edu/design-system storybook --smoke` (if available) or skip with a note

### Task 3.4 — Update Playwright E2E

- [ ] Edit `tests/e2e/theme-switching.spec.ts`:
  - Delete the `'switching to High Focus'` test
  - Delete the `'switching to Sylvan Workspace'` test
  - Add a `'switching to Zen applies correct data-theme'` test mirroring the existing nocturnal one
  - In `'all theme cards are present in popover'`, change `expectedThemes` to `[ 'lumina-scholastica', 'nocturnal', 'zen' ]`
- [ ] Run: `pnpm --filter @open-edu/learner dev` in background, then `pnpm test:e2e -- theme-switching`

### Task 3.5 — Update docs and README

- [ ] `apps/docs/docs/runtime.md` — reduce theme table to 3 rows; update `themeIds` example output to `['lumina-scholastica', 'nocturnal', 'zen']`; update ThemeSelector description "6 themes" → "3 themes"
- [ ] `apps/docs/docs/architecture.md` — change "6 themes" → "3 themes" in the package role table; reduce theme table to 3 rows
- [ ] `apps/docs/docs/intro.md` — change "6 themes" sentence to "3 themes (OpenEdu Light, OpenEdu Dark, OpenEdu Zen)"
- [ ] `apps/docs/docs/testing.md` — change "6 themes" references to "3 themes"; update the `THEMES` array constant; update the per-theme accessibility matrix counts
- [ ] `README.md` — reduce theme table to 3 rows; update the opening Features count if it says "6 themes"
- [ ] `AGENTS.md` — change any "6-theme system" reference to "3-theme system (Light, Dark, Zen)"; do not otherwise edit the monorepo structure description

### Task 3.6 — Update openedu-way DESIGN_STATUS

- [ ] `openedu-way/DESIGN_STATUS.md`:
  - Stage 6 theme row: `6 themes` → `3 themes (Light, Dark, Zen)`
  - Summary: update "Themes defined" count to `3/3`
  - Decision Log: append row `2026-07-04 | Collapse 6 → 3 themes (ADR-0008) | Aligns with Vol I §3 Simplicity, Vol II §04 color consistency, Vol I §10 learning rhythm`

### Task 3.7 — Regenerate dev-server Tailwind CSS

- [ ] Run: `pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css`
- [ ] Commit the regenerated `src/tailwind.css` alongside the theme changes

### Task 3.8 — Final verification

- [ ] `pnpm install` (re-links workspace deps)
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e -- theme-switching`
- [ ] Start learner app, smoke-test all three themes; verify rows of three in the popover; verify localStorage migration of an old `'forest'` value falls back to Light
- [ ] Final commit: `docs: update theme docs, README, AGENTS for 3-theme system (ADR-0008)`

---

## Migration Notes

### User-facing `localStorage`

`useThemePreference.ts` already falls back to `defaultThemeId` when `localStorage` holds an invalid id. No migration script is required.

After cutover:

- Users with `'lumina-scholastica'` stored → unchanged
- Users with `'nocturnal'` stored → unchanged (theme looks calmer but same id)
- Users with `'zen'` stored → unchanged (theme looks warmer/consistent but same id)
- Users with `'high-focus'`, `'forest'`, or `'sylvan-workspace'` stored → silently fall back to Light (`lumina-scholastica`)

### Accessibility

Until Phase 1 ships, `high-focus` learners rely on the soon-to-be-deleted theme. Phase 1 must land before Phase 2 in the same release. Do not ship Phase 2 alone.

### Visual DNA parity

All three themes must render Open Module, Assembly Flow, and Silhouette Assembly identically because `--oe-color-primary` and `--oe-color-primary-light` carry the same family values across all three. The cross-theme consistency test (Task 2.6) enforces this.

---

## Out of Scope

- Renaming theme IDs (e.g. `lumina-scholastica` → `open-edu-light`). Deferred — see ADR-0008 "Alternatives Considered."
- Per-theme motion token variation. Defer until motion tokens are per-theme capable.
- Figma token export regeneration. The export script outputs whatever tokens exist; no change needed, but a re-export should accompany the release.

---

## References

- ADR: `openedu-way/ADR-0008-three-theme-system.md`
- Supersedes: `docs/superpowers/plans/2026-07-01-theme-v2-all-themes.md`
- Vol I: `openedu-way/01-philosophy/04-design-principles.md` (§2 Calm, §3 Simplicity, §6 Guide, §10 Rhythm)
- Vol II: `openedu-way/02-design-language/04-color-language.md`, `12-accessibility.md`
- Visual DNA: `openedu-way/03-visual-dna.md`
- Design status: `openedu-way/DESIGN_STATUS.md`
