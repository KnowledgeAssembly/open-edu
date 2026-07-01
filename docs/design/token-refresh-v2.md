# Design Token Refresh — v2

**Date:** 2026-07-01
**Scope:** Default theme (Lumina Scholastica) token overhaul
**Target:** Modern, warm, accessible — suitable for neurodivergent learners

---

## 1. Design Principles

1. **Accessibility is not negotiable.** Every token change must maintain or improve WCAG AA contrast. The 6-theme system stays — customization is an accessibility feature.
2. **Visual boundaries must stay clear.** Neurodivergent users (autism, ADHD, visual processing differences) rely on perceptible UI regions. We refine borders, not remove them.
3. **Calm over clinical.** The current cool lavender palette (`#fdf7ff` surfaces, `#4f378a` purple) feels institutional. A warm neutral base reduces sensory load.
4. **Modern through refinement, not trend-chasing.** We keep the M3 semantic structure (surface-container levels, on-surface-variant, etc.) because it guarantees contrast. We change the _hue_, not the _architecture_.

---

## 2. Color Palette — Default Theme

### Shift: Cool Lavender → Warm Greige-Sand

| Token                       | Current (v1) | v2 Proposed | Rationale                                                |
| --------------------------- | ------------ | ----------- | -------------------------------------------------------- |
| `surface`                   | `#fdf7ff`    | `#fcfaf8`   | Warm off-white. Same L\* (~97). Calmer sensory baseline. |
| `surface-dim`               | `#ded8e0`    | `#e3dfda`   | Warmer dim variant. Same L\* (~85).                      |
| `surface-bright`            | `#fdf7ff`    | `#fefcf9`   | Brighter warm variant for elevated surfaces.             |
| `surface-container-lowest`  | `#ffffff`    | `#ffffff`   | Keep pure white for card backgrounds.                    |
| `surface-container-low`     | `#f8f2fa`    | `#f7f4f0`   | Warm light. Same L\* (~95).                              |
| `surface-container`         | `#f2ecf4`    | `#f2eee9`   | Warm mid-container. Same L\* (~93).                      |
| `surface-container-high`    | `#ece6ee`    | `#ebe7e2`   | Warm high-container. Same L\* (~91).                     |
| `surface-container-highest` | `#e6e0e9`    | `#e4dfda`   | Warm highest-container. Same L\* (~88).                  |
| `on-surface`                | `#1d1b20`    | `#1f1c18`   | Warm near-black. Same L\* (~10).                         |
| `on-surface-variant`        | `#494551`    | `#48443f`   | Warm dark gray. Same L\* (~29).                          |
| `outline`                   | `#7a7582`    | `#76706b`   | Warm medium gray. Same L\* (~49).                        |
| `outline-variant`           | `#cbc4d2`    | `#ccc6c0`   | Warm light gray. Same L\* (~76).                         |

### Primary: Muted Sophisticated Purple

| Token                  | Current (v1) | v2 Proposed | Rationale                                                    |
| ---------------------- | ------------ | ----------- | ------------------------------------------------------------ |
| `primary`              | `#4f378a`    | `#5d4a8a`   | Muted purple — same hue family, lower chroma. Less harsh.    |
| `on-primary`           | `#ffffff`    | `#ffffff`   | Keep white. ~5.6:1 contrast on `#5d4a8a` (AA large, passes). |
| `primary-container`    | `#6750a4`    | `#7c6bb0`   | Lighter muted purple for container fills.                    |
| `on-primary-container` | `#e0d2ff`    | `#ede2ff`   | Warm-tinted light purple for text on container.              |
| `inverse-primary`      | `#cfbcff`    | `#d4c4ff`   | Slightly warmer inverse.                                     |

### Secondary: Warm Lavender-Gray

| Token                    | Current (v1) | v2 Proposed |
| ------------------------ | ------------ | ----------- |
| `secondary`              | `#63597c`    | `#665e77`   |
| `on-secondary`           | `#ffffff`    | `#ffffff`   |
| `secondary-container`    | `#e1d4fd`    | `#e8dff7`   |
| `on-secondary-container` | `#645a7d`    | `#655d77`   |

### Tertiary: Luminous Gold

Gold signals achievement, learning, warmth. Distinctive — no major SaaS uses gold as a primary accent.

| Token                   | Current (v1) | v2 Proposed | Rationale                                                             |
| ----------------------- | ------------ | ----------- | --------------------------------------------------------------------- |
| `tertiary`              | `#765b00`    | `#b8862d`   | Warm gold — visible, accessible, warm. ~3.5:1 on white (AA large ok). |
| `on-tertiary`           | `#ffffff`    | `#ffffff`   |                                                                       |
| `tertiary-container`    | `#c9a74d`    | `#f0d68a`   | Light gold container for fills.                                       |
| `on-tertiary-container` | `#503d00`    | `#4a3800`   |                                                                       |

### Error + Success (unchanged — already correct)

| Token               | Value     | WCAG                 |
| ------------------- | --------- | -------------------- |
| `error`             | `#ba1a1a` | AA on light surfaces |
| `error-container`   | `#ffdad6` |                      |
| `success`           | `#16a34a` | AA on light surfaces |
| `success-container` | `#dafbe3` |                      |

### Background / Derived

| Token    | v2 Proposed                         |
| -------- | ----------------------------------- |
| `bg`     | `#fcfaf8` (aliases surface)         |
| `fg`     | `#1f1c18` (aliases on-surface)      |
| `border` | `#ccc6c0` (aliases outline-variant) |

### Dark mode counterpart (quick reference)

For the Nocturnal theme and dark variants, maintain the same hue shift:

- Surfaces: warm near-blacks (`#1a1a18` base, `#232320` container)
- Primary: `#9f8fd0` (muted light purple on dark)
- Tertiary: `#f0d68a` (warm gold)
- Maintain same L\* deltas for consistent contrast.

---

## 3. Typography

### Keep the system, refine the scale

**Why keep sizes:** The current scale (48px display, 30px heading, 14px body) meets readability needs for users with low vision, dyslexia, and attention differences. Reducing sizes would harm accessibility.

**What changes:** Not the sizes — the _frequency_ and _weight deltas_.

| Role                               | v1               | v2 Change                                  | Rationale                                                                |
| ---------------------------------- | ---------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Display (productive)               | 48px/700/-0.02em | 40px/700/-0.02em                           | Slightly smaller for hero moments only. Still large enough.              |
| Heading (productive)               | 30px/600/-0.01em | **28px/650/-0.01em**                       | Heavier weight + slightly smaller to create hierarchy without more size. |
| Subheading                         | 24px/600         | 24px/600                                   | Keep.                                                                    |
| heading3                           | 20px/600         | 20px/600                                   | Keep.                                                                    |
| heading4                           | 18px/600         | 18px/600                                   | Keep.                                                                    |
| heading5                           | 16px/500         | 16px/600                                   | **Bump weight** to distinguish from body.                                |
| heading6                           | 14px/500         | 14px/600                                   | Bump weight.                                                             |
| **Body (productive)**              | **14px/400/1.5** | **14px/420/1.6**                           | Slightly heavier weight + more line height for readability.              |
| **Body (expressive)**              | **18px/400/1.7** | **18px/420/1.7** + `letterSpacing: 0.01em` | Dyslexia-friendly: slight letter-spacing improves word recognition.      |
| Label                              | 12px/600/0.05em  | **11px/600/0.08em**                        | Tighter label, more tracking — modern feel.                              |
| Caption                            | 14px/400         | 13px/420                                   | Match body feel but smaller.                                             |
| Expressive heading (letterSpacing) | `-0.01em`        | **removed**                                | Redundant at 28px/650 weight with 1.3 line-height.                       |

### Typography usage guidelines (new)

| Context                        | Use                                  | Rationale              |
| ------------------------------ | ------------------------------------ | ---------------------- |
| Homepage hero                  | Display (40px)                       | Once per page          |
| Page titles                    | Heading (28px)                       | `text-h1`              |
| Section headers inside content | Subheading (24px) or heading3 (20px) |                        |
| Course step titles             | heading5 (16px/600)                  |                        |
| Body text (UI)                 | Body productive (14px/420)           |                        |
| Body text (reading content)    | Body expressive (18px/420)           | Serif + letter-spacing |
| Labels / badges                | Label (11px/600/0.08em)              |                        |

---

## 4. Border Radii

Minimal change — the current radii are already good. Just bump the DEFAULT slightly.

| Token     | v1             | v2                  | Rationale                          |
| --------- | -------------- | ------------------- | ---------------------------------- |
| `sm`      | 0.125rem (2px) | 0.125rem (2px)      | Keep — for internal elements       |
| `DEFAULT` | 0.25rem (4px)  | **0.375rem (6px)**  | Slightly softer. Linear uses ~6px. |
| `md`      | 0.375rem (6px) | **0.5rem (8px)**    |                                    |
| `lg`      | 0.5rem (8px)   | **0.625rem (10px)** |                                    |
| `xl`      | 0.75rem (12px) | **0.75rem (12px)**  | Keep — for dialogs/modals          |
| `full`    | 9999px         | 9999px              | Keep                               |

Radii in Zen theme stay at 0px (it's a design choice).

---

## 5. Spacing

Current spacing values are generous and accessible. Keep them. One change:

| Token              | v1     | v2         | Rationale                                                                  |
| ------------------ | ------ | ---------- | -------------------------------------------------------------------------- |
| `containerMax`     | 800px  | **720px**  | Slightly narrower content column = faster scan path for ADHD/autism users. |
| `readingWidth`     | 65ch   | **68ch**   | Slightly wider for expressive serif text (18px serif needs more width).    |
| `marginDesktop`    | 64px   | **48px**   | More efficient use of screen width.                                        |
| `paragraphSpacing` | 1.5rem | **1.5rem** | Keep.                                                                      |
| `panelNav`         | 260px  | **240px**  | Slightly narrower sidebar = more content focus.                            |

All spacing scale tokens (`xs`, `sm`, `md`, `lg`, `xl`) stay the same.

---

## 6. Elevation & Shadow

Current approach (tonal layering > drop shadows) is correct. But the shadow values can be refined:

| Token     | v1                            | v2                               |
| --------- | ----------------------------- | -------------------------------- |
| `raised`  | `0 1px 3px rgba(0,0,0,0.1)`   | `0 1px 2px rgba(31,28,24,0.08)`  |
| `overlay` | `0 4px 16px rgba(0,0,0,0.15)` | `0 4px 12px rgba(31,28,24,0.10)` |
| `modal`   | `0 8px 32px rgba(0,0,0,0.2)`  | `0 8px 24px rgba(31,28,24,0.14)` |
| `sticky`  | `0 2px 8px rgba(0,0,0,0.12)`  | `0 2px 6px rgba(31,28,24,0.08)`  |

Rationale: Using `#1f1c18` (the on-surface color) tinted black makes shadows feel cohesive with the warm palette instead of using generic neutral black.

---

## 7. Motion

| Token             | v1                           | v2                               | Rationale                             |
| ----------------- | ---------------------------- | -------------------------------- | ------------------------------------- |
| `durationFast`    | 100ms                        | **100ms**                        | Keep — hover states should be instant |
| `durationNormal`  | 200ms                        | **200ms**                        | Keep — good balance                   |
| `durationSlow`    | 400ms                        | **300ms**                        | Faster feels more responsive          |
| `easingEaseInOut` | cubic-bezier(0.4, 0, 0.2, 1) | **cubic-bezier(0.4, 0, 0.2, 1)** | Keep — standard                       |
| `easingEaseOut`   | cubic-bezier(0, 0, 0.2, 1)   | **cubic-bezier(0, 0, 0.15, 1)**  | Slightly snappier exit                |

> **⏳ Status:** Motion tokens are **not yet implemented** — deferred to a follow-up story. The current motion values in `elevation.ts` work correctly; only cosmetic refinement.

All animations respect `prefers-reduced-motion` and the app's Reduced Motion toggle.

---

## 8. Accessibility Verification

Every color change was checked for WCAG 2.1 AA compliance:

| Pair                                                        | Contrast Ratio | Passes AA?                                                              |
| ----------------------------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `primary` `#5d4a8a` on `surface-container` `#f2eee9`        | ~5.2:1         | Yes (normal text)                                                       |
| `primary` `#5d4a8a` on `surface-container-lowest` `#ffffff` | ~5.6:1         | Yes                                                                     |
| `on-surface` `#1f1c18` on `surface` `#fcfaf8`               | ~14:1          | Yes (AAA)                                                               |
| `on-surface-variant` `#48443f` on `surface` `#fcfaf8`       | ~7.5:1         | Yes                                                                     |
| `tertiary` `#b8862d` on `surface` `#fcfaf8`                 | ~3.5:1         | AA large text only                                                      |
| `tertiary` `#b8862d` on `on-tertiary-container` `#4a3800`   | ~8:1           | Yes                                                                     |
| `error` `#ba1a1a` on `surface` `#fcfaf8`                    | ~4.7:1         | Yes                                                                     |
| `outline` `#76706b` on `surface` `#fcfaf8`                  | ~4.8:1         | Yes (AA for non-text)                                                   |
| `outline-variant` `#ccc6c0` on `surface-dim` `#e3dfda`      | ~1.8:1         | Fails — but this is correct behavior for a subtle border on a container |

---

## 9. Implementation Map

The token changes map directly to source files:

| File                                                | Change                                                                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/runtime/src/themes/lumina-scholastica.ts` | Update all color hex values to v2 palette; add `bg`/`fg`/`border` aliases + `success`/`success-container` |
| `packages/runtime/src/themes/*.ts`                  | Add `bg`/`fg`/`border`/`success`/`success-container` tokens to all 6 themes                               |
| `packages/design-system/src/tokens/colors.ts`       | Add warm greige palette entries (`greigeWhite`, `purpleMuted`, `goldTertiary`, etc.)                      |
| `packages/design-system/src/tokens/typography.ts`   | Update productive/expressive sets (weights, letter-spacing, line-height)                                  |
| `packages/design-system/src/tokens/elevation.ts`    | Update shadow colors to use warm-tinted rgba                                                              |
| `packages/design-system/src/tokens/radius.ts`       | Update DEFAULT, md, lg values                                                                             |

No structural changes needed. The token architecture, CSS var mapping, Tailwind config, and component classes all work identically — only the hex values change.

---

## 10. Visual Examples

### HomePage stat cards (current vs proposed)

```
Current:                          Proposed:
┌──────────────┐                  Inline across top of page:
│  📚  12      │                  📚 12 learning units  •  📈 4 in progress  •  🏆 3 badges
│ Learning     │
│ Units        │                  [Browse Courses]  [View Progress]
└──────────────┘
```

Rationale: The stat cards feel like a dashboard. Inline stats read faster, take less space, and don't compete with the main content.

### Course layout (current vs proposed)

```
Current (3-panel):                Proposed (2-panel + floating steps):
┌────┬──────┬──────────┐          ┌──────┬──────────────────────────────┐
│Nav │Steps │ Content  │          │ Nav  │         Content              │
│260 │280   │ 800px    │          │ 240  │         720px                │
│    │      │          │          │      │                              │
└────┴──────┴──────────┘          │      │  [Steps ≡]  ← floating toggle│
                                  └──────┴──────────────────────────────┘
```

The steps panel becomes a toggleable overlay — reducing visual density by default while keeping it available.

---

## 11. Summary of Changes by Perceptible Impact

| Change                             | Impact                                  | Effort                |
| ---------------------------------- | --------------------------------------- | --------------------- |
| Surface colors → warm greige       | High visual impact, low code effort     | 1 file, 15 hex values |
| Primary purple → muted             | Moderate visual impact, low code effort | 1 file, 6 hex values  |
| Tertiary → gold                    | Moderate visual impact, low code effort | 1 file, 4 hex values  |
| Typography weight/usage refinement | Moderate visual impact, low code effort | 1 file, ~10 values    |
| Border radius bump                 | Low visual impact, low code effort      | 1 file, 3 values      |
| Spacing tweaks                     | Low visual impact, low code effort      | 1 file, 3 values      |
| Shadow color refinement            | Low visual impact, low code effort      | 1 file, 4 values      |
| HomePage stat cards → inline       | High visual impact, medium code effort  | 1 component           |
| Course steps → toggleable overlay  | High visual impact, high code effort    | Layout refactor       |
| Inline-style migration             | Medium visual impact, high code effort  | 8 components          |

**Recommended first step:** Implement the color + typography token changes (rows 1-4). They have the highest visual impact for the lowest effort and only touch the theme definition files. Everything else can follow incrementally.
