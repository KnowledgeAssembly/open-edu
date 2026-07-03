# Design Implementation Status

> Living document tracking the OpenEdu design journey from philosophy to implementation.
> Last updated: 2026-07-03

---

## Design Pyramid — Current Position

```
Stage 1: Philosophy           ██████████████████████████  COMPLETE
Stage 2: Design Language      ██████████████████████████  COMPLETE
Stage 3: Visual DNA           ██████████████████████████  COMPLETE
Stage 4: Design System        ████████░░░░░░░░░░░░░░░░░  IN PROGRESS
Stage 5: Product Design       ░░░░░░░░░░░░░░░░░░░░░░░░░  NOT STARTED
Stage 6: Engineering          ████████████░░░░░░░░░░░░░  IN PROGRESS
```

**Current focus:** Design System token wiring + styling standardization

---

## Stage 1 — Philosophy ✅ COMPLETE

All 7 Volume I documents are written and finalized.

| Document | Status | Notes |
|----------|--------|-------|
| 00-philosophy.md | ✅ | Core motto: "Learning is assembled, not delivered" |
| 01-project-pipili.md | ✅ | Pipili = design philosophy, not mascot |
| 02-open-modules.md | ✅ | Fundamental building blocks, never complete |
| 03-the-companion.md | ✅ | Pipili as quiet companion, communicates via motion |
| 04-design-principles.md | ✅ | 15 core principles |
| 05-temporal-design.md | ✅ | Time as a design material |
| 06-motion-language.md | ✅ | 5 motion types, vocabulary of preferred/avoided animations |

---

## Stage 2 — Design Language ✅ COMPLETE

All 14 Volume II documents are written and finalized.

| Document | Status | Notes |
|----------|--------|-------|
| 01-geometry.md | ✅ | Geometric foundation principles |
| 02-construction-system.md | ✅ | How primitives combine |
| 03-logo-philosophy.md | ✅ | Logo principles (assembled, not drawn) |
| 04-color-language.md | ✅ | Color principles (meaning before identity) |
| 05-typography.md | ✅ | Typography principles (readability first) |
| 06-iconography.md | ✅ | Icon principles |
| 07-illustration.md | ✅ | Illustration principles |
| 08-companion-design.md | ✅ | Pipili visual design principles |
| 09-layout.md | ✅ | Layout principles |
| 10-components.md | ✅ | Component principles |
| 11-interaction-patterns.md | ✅ | Pattern principles |
| 12-accessibility.md | ✅ | Accessibility as core principle |
| 13-design-tokens.md | ✅ | Token system principles |
| 14-motion.md | ✅ | Motion implementation principles |

---

## Stage 3 — Visual DNA ✅ COMPLETE

> "Before designing a screen, ensure these exist: Geometric Primitive, Open Module, Pipili, Logo, Pattern Language, Illustration Language, Color System, Typography."

**Design spec:** `docs/superpowers/specs/2026-07-03-visual-dna-design.md`

### Finalized Decisions

| Visual DNA Element | Status | Decision |
|--------------------|--------|----------|
| **Geometric Primitive** | ✅ FINALIZED | Circle-based primitive — simple, connectable, scalable, animatable, recognizable without color. Component at `packages/design-system/src/primitives/geo-primitive.tsx` |
| **Open Module** | ✅ FINALIZED | Orbital Cluster — circle core + 2–6 satellite circles on dashed orbit, clustered with intentional gaps. Spec: `docs/superpowers/specs/2026-07-03-visual-dna-design.md` §1 |
| **Pipili** | ✅ FINALIZED | Quiet companion character, built from same geometric language. Component at `packages/design-system/src/primitives/pipili.tsx` |
| **Logo** | ✅ FINALIZED | Assembled from primitives, not drawn. Works in monochrome, high contrast, light/dark themes, favicon sizes. Component at `packages/design-system/src/primitives/openedu-logo.tsx` |
| **Pattern Language** | ✅ FINALIZED | Assembly Flow — single dashed path connecting circle nodes, 3 density variants (dense/medium/minimal). Spec: `docs/superpowers/specs/2026-07-03-visual-dna-design.md` §2 |
| **Illustration Language** | ✅ FINALIZED | Silhouette Assembly — circle head + rounded torso, 5 proportions × 5 palettes for diversity. Spec: `docs/superpowers/specs/2026-07-03-visual-dna-design.md` §3 |
| **Color System** | ✅ FINALIZED | 80+ swatches, 59 semantic roles defined in `colors.ts`. Token values validated against Visual DNA palettes. |
| **Typography** | ✅ FINALIZED | Inter (productive) + Source Serif 4 (expressive), 11 roles each. Defined in `typography.ts`. |

---

## Stage 4 — Design System 🟡 IN PROGRESS

### Track 2a: Token Completeness

| Token Category | File Exists | Values Defined | Tests | Tailwind Wired | Flatten to CSS Vars | Status |
|---------------|-------------|----------------|-------|-----------------|---------------------|--------|
| Colors | ✅ `colors.ts` | ✅ 80+ swatches, 59 semantic roles | ✅ | ✅ | ✅ | **COMPLETE** |
| Typography | ✅ `typography.ts` | ✅ 2 sets × 11 roles | ✅ | ✅ | ✅ | **COMPLETE** |
| Spacing | ✅ `spacing.ts` | ✅ 10-step scale | ✅ | ✅ | ✅ | **COMPLETE** |
| Radius | ✅ `radius.ts` | ✅ 6 values | ✅ | ✅ | ✅ | **COMPLETE** |
| Elevation | ✅ `elevation.ts` | ✅ 5 levels | ✅ | 🔲 | ✅ | **NEEDS TAILWIND** |
| Motion | ✅ `motion.ts` | ✅ 6 tokens + hooks | ✅ | ✅ | ✅ | **COMPLETE** |
| Sizing | ✅ `sizing.ts` | ✅ icon/height/width scales | ✅ | 🔲 (exported, not imported) | 🔲 | **NEEDS WIRING** |
| Opacity | ✅ `opacity.ts` | ✅ 12-step scale | ✅ | 🔲 (exported, not imported) | 🔲 | **NEEDS WIRING** |
| Borders | ✅ `borders.ts` | ✅ width + style scales | ✅ | 🔲 (exported, not imported) | 🔲 | **NEEDS WIRING** |
| Focus | ✅ `focus.ts` | ✅ 4 ring tokens | ✅ | 🔲 (exported, not imported) | 🔲 | **NEEDS WIRING** |
| Icons | ✅ `icons.ts` | ✅ 6 sizes + 3 strokes | ✅ | 🔲 (exported, not imported) | 🔲 | **NEEDS WIRING** |
| Layout | ✅ `layout.ts` | ✅ 11 layout tokens | ✅ | 🔲 (exported, not imported) | 🔲 | **NEEDS WIRING** |
| Breakpoints | ✅ `breakpoints.ts` | ✅ 5 breakpoints | ✅ | 🔲 | 🔲 | **MINOR GAP** |
| Z-Index | ✅ `z-index.ts` | ✅ 6 semantic layers | ✅ | 🔲 | 🔲 | **MINOR GAP** |

**Key gap:** `tailwind.ts` does not import the new token extensions (sizing, opacity, borders, focus, icons, layout). They are exported from their respective files but not aggregated.

**Key gap:** `flattenTheme()` does not emit CSS vars for sizing, opacity, borders, focus, icons, layout, z-index, or elevation. These tokens are only available as JS constants, not runtime CSS custom properties.

### Track 2b: Styling Standardization

| Component | File | Inline Styles | Hardcoded Colors | Status |
|-----------|------|---------------|------------------|--------|
| ThemeSelector | `packages/runtime/src/components/ThemeSelector.tsx` | 3 (popover position, border color, swatch bg) | No (uses `--oe-color-primary`) | **NEEDS MIGRATION** — popover position + border logic to Tailwind |
| SkillSummary | `packages/runtime/src/components/SkillSummary.tsx` | 1 (dot sizing + color) | YES — `getMasteryColor()` returns raw hex (`#9ca3af`, `#3b82f6`, `#8b5cf6`, `#10b981`) | **NEEDS MIGRATION** — fix `getMasteryColor` to return CSS vars |
| ReadingRuler | `packages/runtime/src/components/ReadingRuler.tsx` | 1 (highlight bg + border) | YES — raw RGBA (`rgba(255,255,150,0.25)`, `rgba(255,200,0,0.5)`) | **NEEDS MIGRATION** — replace with `--oe-*` tokens |
| ProgressRing | `packages/runtime/src/components/ProgressRing.tsx` | 1 (dynamic size) | Minor — `stroke-amber-400` not themed | **LOW PRIORITY** — dynamic size is acceptable |
| WidgetCanvas | `packages/runtime/src/components/WidgetCanvas.tsx` | 1 (dynamic minHeight) | No | **LOW PRIORITY** — dynamic size is acceptable |
| ConfettiBurst | `packages/design-system/src/effects/ConfettiBurst.tsx` | Animation only | No — uses `var(--oe-color-*)` | ✅ **PROPERLY THEMED** |
| GlowPulse | `packages/design-system/src/effects/GlowPulse.tsx` | Animation only | No — uses `var(--oe-color-primary)` | ✅ **PROPERLY THEMED** |
| Module | `packages/design-system/src/learning/Module.tsx` | Rotation only | No — uses `var(--oe-color-primary)` | ✅ **PROPERLY THEMED** |
| CourseTree | `packages/design-system/src/patterns/CourseTree.tsx` | Rotation only | No — uses `var(--oe-radius)`, `var(--oe-color-primary)` | ✅ **PROPERLY THEMED** |

### Track 2c: Cleanup

| Task | Status | Notes |
|------|--------|-------|
| Remove duplicate `cn()` from learner app | ✅ DONE | `apps/learner/src/lib/utils.ts` does not exist — all packages import from `@open-edu/design-system` |
| Delete `ThemedButton` from widgets | ✅ DONE | `packages/widgets/src/themed-button.tsx` does not exist — zero source references remain |
| Reduced motion in CompletionScreen | ✅ DONE | Uses `useReducedMotion()` hook, conditionally skips confetti |

### Figma Integration (Track 3)

| Task | Status | Notes |
|------|--------|-------|
| Token export script | ✅ EXISTS | `packages/design-system/scripts/export-tokens.ts` — exports all tokens to `dist/tokens.json` |
| `export:tokens` in package.json | ✅ EXISTS | `tsx scripts/export-tokens.ts` |

---

## Stage 5 — Product Design 🔲 NOT STARTED

| Product | Status | Notes |
|---------|--------|-------|
| Learner App | 🔲 | Depends on Stages 3–4 completion |
| Authoring App | 🔲 | |
| Website | 🔲 | |
| AI Experiences | 🔲 | |
| Reward Engine | 🔲 | |

---

## Stage 6 — Engineering 🟡 IN PROGRESS

Engineering is running in parallel with design (as it should for an MVP), but the Design Pyramid discipline says engineering should faithfully implement the design system, not redefine it.

| Area | Status | Notes |
|------|--------|-------|
| Token infrastructure | 🟡 | 15 token files exist, but wiring gaps remain (see Stage 4) |
| Component library | ✅ | 25 primitives in `packages/design-system/src/primitives/` |
| Theme system | ✅ | 6 themes with `ThemeDefinition`, `RuntimeThemeProvider`, CSS var flattening |
| Tailwind integration | 🟡 | Core tokens wired; sizing/opacity/borders/focus/icons/layout not yet imported |
| Widget system | ✅ | 14 built-in widgets, ThemedButton migrated to design-system Button |
| Accessibility | 🟡 | Components exist, but full axe-core audit pending |
| Tests | 🟡 | Token tests exist; component tests exist; full suite not verified |

---

## Implementation Plan Task Status

Mapped from `docs/superpowers/plans/2026-07-03-design-system-implementation.md`

### Phase 2a: Token Completeness

| Task | Description | Status |
|------|-------------|--------|
| Task 1 | Sizing tokens | ✅ File exists, values defined, tests written. **Tailwind wiring pending.** |
| Task 2 | Opacity tokens | ✅ File exists, values defined, tests written. **Tailwind wiring pending.** |
| Task 3 | Border tokens | ✅ File exists, values defined, tests written. **Tailwind wiring pending.** |
| Task 4 | Focus tokens | ✅ File exists, values defined, tests written. **Tailwind wiring pending.** |
| Task 5 | Icon tokens | ✅ File exists, values defined, tests written. **Tailwind wiring pending.** |
| Task 6 | Layout tokens | ✅ File exists, values defined, tests written. **Tailwind wiring pending.** |
| Task 7 | Wire tokens into Tailwind + ThemeDefinition | 🔲 **NOT DONE** — `tailwind.ts` doesn't import new extensions; `ThemeDefinition` doesn't include them |

### Phase 2b: Styling Standardization

| Task | Description | Status |
|------|-------------|--------|
| Task 8 | Migrate ThemeSelector inline styles | 🔲 **NOT DONE** — 3 inline styles remain |
| Task 9 | Migrate SkillSummary inline styles | 🔲 **NOT DONE** — hardcoded hex in `getMasteryColor()` |
| Task 10 | Migrate ReadingRuler inline styles | 🔲 **NOT DONE** — hardcoded RGBA colors |
| Task 11 | Migrate ProgressRing + WidgetCanvas | 🟡 **MINOR** — dynamic sizing only, acceptable |
| Task 12 | Remove duplicate `cn()` | ✅ **ALREADY DONE** — file doesn't exist |
| Task 13 | Replace hardcoded colors in DS components | ✅ **ALREADY DONE** — ConfettiBurst, GlowPulse, Module, CourseTree all use CSS vars |
| Task 14 | Reduced motion in CompletionScreen | ✅ **ALREADY DONE** — uses `useReducedMotion()` |
| Task 15 | Migrate ThemedButton consumers | ✅ **ALREADY DONE** — ThemedButton deleted, zero references |

### Track 1: Visual DNA

| Task | Description | Status |
|------|-------------|--------|
| Task 16 | Create Geometric Primitive component | ✅ **DONE** — `geo-primitive.tsx` exists with SVG circle, stories, tests |
| Task 17 | Create Visual DNA Storybook stories | ✅ **DONE** — `geo-primitive.stories.tsx` exists |

### Track 3: Figma Integration

| Task | Description | Status |
|------|-------------|--------|
| Task 18 | Create token export pipeline | ✅ **DONE** — `export-tokens.ts` exists, `export:tokens` script in package.json |

---

## Remaining Work — Priority Order

### High Priority (Design System completion)

1. **Task 7: Wire new tokens into Tailwind + ThemeDefinition**
   - Import `tailwindSizingExtensions`, `tailwindOpacityExtensions`, `tailwindBorderWidthExtensions`, `tailwindIconSizeExtensions`, `tailwindLayoutExtensions` into `tailwind.ts`
   - Optionally extend `ThemeDefinition` with elevation/sizing/opacity fields
   - Extend `flattenTheme()` to emit CSS vars for sizing, opacity, borders, focus, icons, layout

2. **Task 10: Migrate ReadingRuler inline styles**
   - Replace hardcoded `rgba(255,255,150,0.25)` and `rgba(255,200,0,0.5)` with `--oe-*` tokens
   - Add `--oe-color-reading-ruler` and `--oe-color-reading-ruler-border` tokens

3. **Task 9: Migrate SkillSummary inline styles**
   - Fix `getMasteryColor()` in `packages/runtime/src/context/skills.ts` to return CSS variable references instead of raw hex

4. **Task 8: Migrate ThemeSelector inline styles**
   - Convert popover position and border color logic to Tailwind classes

### Medium Priority (polish)

5. **Color palette validation** — Validate token values in `colors.ts` against finalized Visual DNA
6. **Typography final selection** — Confirm Inter + Source Serif 4 or alternatives

### Low Priority (future)

7. **Full axe-core audit** — Run accessibility audit on all components
8. **Full test suite verification** — `pnpm test && pnpm lint && pnpm typecheck`

---

## Summary

| Metric | Count |
|--------|-------|
| Token categories defined | 14/14 |
| Token categories wired to Tailwind | 7/14 |
| Token categories flattened to CSS vars | 6/14 |
| Components needing style migration | 3 (ThemeSelector, SkillSummary, ReadingRuler) |
| Components already properly themed | 4 (ConfettiBurst, GlowPulse, Module, CourseTree) |
| Visual DNA elements finalized | 6/6 (GeoPrimitive, Open Module, Pipili, Logo, Pattern Language, Illustration Language) |
| Visual DNA elements TODO | 0 |
| Design Pyramid stages complete | 3/6 (Philosophy, Design Language, Visual DNA) |
| Implementation plan tasks done | 10/18 |
| Implementation plan tasks remaining | 8 |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-03 | Visual DNA finalized: Geometric Primitive (circle), Pipili, Logo | Aligns with openedu-way philosophy — simplicity, assembly, calm technology |
| 2026-07-03 | Visual DNA finalized: Open Module (Orbital Cluster) | Variable satellites (2–6) with intentional gaps express "never complete" |
| 2026-07-03 | Visual DNA finalized: Pattern Language (Assembly Flow) | Single dashed path with circle nodes — calm, scales from backgrounds to dividers |
| 2026-07-03 | Visual DNA finalized: Illustration Language (Silhouette Assembly) | 5 proportions × 5 palettes — dignity through variation, no facial features |
| 2026-07-03 | ThemedButton deleted, all widgets migrated to design-system Button | Eliminates duplication, consolidates component library |
| 2026-07-03 | Duplicate `cn()` removed from learner app | Single source of truth in design-system |
| 2026-07-03 | Reduced motion support added to CompletionScreen | Accessibility requirement per Volume II §12 |
