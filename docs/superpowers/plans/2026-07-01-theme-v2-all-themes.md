# All-Theme V2 Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Epic 32 v2 design token refresh from Lumina Scholastica to all 5 remaining themes (Forest, High Focus, Nocturnal, Sylvan Workspace, Zen).

**Architecture:** Each theme is a self-contained file in `packages/runtime/src/themes/`. Changes are token/hex value swaps within each file. Universal typography/spacing/radii changes are applied identically across themes; color palettes are theme-specific per design spec.

**Tech Stack:** TypeScript, theme definitions, Tailwind CSS tokens

**Reference:** `docs/design/token-refresh-v2.md` Section 12

---

### Task 1: Apply universal typography changes to all 5 themes

**Files:** Modify each theme file's `typography` section.

Changes per theme:

- Body productive: `fontWeight: '400'` → `'420'`, `lineHeight: '1.5'` → `'1.6'`
- Body expressive: `fontWeight: '400'` → `'420'`, add `letterSpacing: '0.01em'`
- Heading productive: `fontWeight: '600'` → `'650'`
- heading5: `fontWeight: '500'` → `'600'`
- heading6: `fontWeight: '500'` → `'600'`
- Label: `fontSize: '12px'` → `'11px'`, `letterSpacing: '0.04em'` or `'0.05em'` → `'0.08em'`
- Caption: `fontSize: '14px'`, `fontWeight: '400'` → `'13px'`, `'420'`
- Expressive heading: remove `letterSpacing` property if present

- [ ] **Update `forest.ts` typography** — Apply all 8 changes listed above

- [ ] **Update `high-focus.ts` typography** — Same changes

- [ ] **Update `nocturnal.ts` typography** — Same changes

- [ ] **Update `sylvan-workspace.ts` typography** — Same changes

- [ ] **Update `zen.ts` typography** — Same changes

- [ ] **Run tests** — `pnpm test --filter design-system --filter runtime` to verify typography token validation passes

- [ ] **Commit**

  ```bash
  git add packages/runtime/src/themes/forest.ts packages/runtime/src/themes/high-focus.ts packages/runtime/src/themes/nocturnal.ts packages/runtime/src/themes/sylvan-workspace.ts packages/runtime/src/themes/zen.ts
  git commit -m "feat(themes): apply v2 typography (420 body, 650 heading, refined labels) to all 5 themes"
  ```

---

### Task 2: Apply universal spacing changes to all 5 themes

**Files:** Modify each theme file's `spacing` section.

| Token         | Change                | Applies to                                                                              |
| ------------- | --------------------- | --------------------------------------------------------------------------------------- |
| containerMax  | `'800px'` → `'720px'` | All 5 themes                                                                            |
| marginDesktop | → `'48px'`            | Forest (56→48), High Focus (64→48), Sylvan (64→48). Zen already 48, Nocturnal stays 24. |
| panelNav      | `'260px'` → `'240px'` | Forest only (Zen already 240, others don't have it)                                     |
| readingWidth  | `'65ch'` → `'68ch'`   | All 5 themes                                                                            |

- [ ] **Update `forest.ts` spacing** — containerMax 720, marginDesktop 48, panelNav 240, readingWidth 68ch

- [ ] **Update `high-focus.ts` spacing** — containerMax 720, marginDesktop 48, readingWidth 68ch

- [ ] **Update `nocturnal.ts` spacing** — containerMax 720, marginDesktop 24 (keep), readingWidth 68ch

- [ ] **Update `sylvan-workspace.ts` spacing** — containerMax 720, marginDesktop 48, readingWidth 68ch

- [ ] **Update `zen.ts` spacing** — containerMax 720, marginDesktop 48 (already), readingWidth 68ch

- [ ] **Run tests** — verify spacing token validation passes

- [ ] **Commit**

  ```bash
  git add packages/runtime/src/themes/forest.ts packages/runtime/src/themes/high-focus.ts packages/runtime/src/themes/nocturnal.ts packages/runtime/src/themes/sylvan-workspace.ts packages/runtime/src/themes/zen.ts
  git commit -m "feat(themes): apply v2 spacing (720px container, 48px margin, 68ch reading) to all 5 themes"
  ```

---

### Task 3: Apply radius changes to all themes (except Zen)

**Files:** Modify each theme file's `radii` section.

Apply +0.125rem bump to DEFAULT, md, lg for Forest, High Focus, Nocturnal, Sylvan.

- [ ] **Update `forest.ts` radii** — DEFAULT 0.5→0.625, md 0.75→0.875, lg 1.0→1.125

- [ ] **Update `high-focus.ts` radii** — DEFAULT 0.25→0.375, md 0.375→0.5, lg 0.5→0.625

- [ ] **Update `nocturnal.ts` radii** — DEFAULT 0.5→0.625, md 0.75→0.875, lg 1.0→1.125

- [ ] **Update `sylvan-workspace.ts` radii** — DEFAULT 0.25→0.375, md 0.375→0.5, lg 0.5→0.625

- [ ] **Zen stays at 0px** — deliberate design choice, no change

- [ ] **Run tests**

- [ ] **Commit**

  ```bash
  git add packages/runtime/src/themes/forest.ts packages/runtime/src/themes/high-focus.ts packages/runtime/src/themes/nocturnal.ts packages/runtime/src/themes/sylvan-workspace.ts
  git commit -m "feat(themes): apply v2 radii bump (+0.125rem) to Forest, High Focus, Nocturnal, Sylvan"
  ```

---

### Task 4: Update color palette — Forest (lighter & airier)

**Files:** `packages/runtime/src/themes/forest.ts`

- [ ] Convert all `palette.*` references to inline hex values
- [ ] Replace all 55+ color hex values with v2 lighter/slightly warmer greens and browns

Key v2 values:

```
surface: '#faf8f5'
'surface-dim': '#e5e2dc'
'surface-bright': '#ffffff'
'surface-container-lowest': '#ffffff'
'surface-container-low': '#f5f2ec'
'surface-container': '#f0ede6'
'surface-container-high': '#eae6df'
'surface-container-highest': '#e5e0d9'
'on-surface': '#1c1a17'
'on-surface-variant': '#4a463f'
'inverse-surface': '#322f2c'
'inverse-on-surface': '#f5f2ec'
outline: '#7a7670'
'outline-variant': '#cbc6be'
'surface-tint': '#3a5a38'
primary: '#3a5a38'
'on-primary': '#ffffff'
'primary-container': '#b8d4b4'
'on-primary-container': '#1a3a18'
'inverse-primary': '#b8d4b4'
secondary: '#5e6d56'
'on-secondary': '#ffffff'
'secondary-container': '#d6e4cc'
'on-secondary-container': '#2a3d24'
tertiary: '#7a6b4a'
'on-tertiary': '#ffffff'
'tertiary-container': '#ddd0b0'
'on-tertiary-container': '#3a2e14'
error: '#ba1a1a'
'on-error': '#ffffff'
'error-container': '#ffdad6'
'on-error-container': '#93000a'
'primary-fixed': '#d4eccf'
'primary-fixed-dim': '#b8d4b4'
'on-primary-fixed': '#0a2a08'
'on-primary-fixed-variant': '#2a4a28'
'secondary-fixed': '#d6e4cc'
'secondary-fixed-dim': '#bac8b0'
'on-secondary-fixed': '#1a2d14'
'on-secondary-fixed-variant': '#3a4d34'
'tertiary-fixed': '#ddd0b0'
'tertiary-fixed-dim': '#c4b494'
'on-tertiary-fixed': '#2a1e0a'
'on-tertiary-fixed-variant': '#4a3a1a'
background: '#faf8f5'
'on-background': '#1c1a17'
'surface-variant': '#e5e0d9'
bg: '#faf8f5'
fg: '#1c1a17'
border: '#cbc6be'
success: '#16a34a'
'success-container': '#dafbe3'
```

- [ ] Remove `import { palette }` from import line (should only import `ThemeDefinition`)
- [ ] Run `pnpm test --filter runtime`
- [ ] Commit

  ```bash
  git add packages/runtime/src/themes/forest.ts
  git commit -m "feat(forest): v2 color refresh — lighter muted greens, warmer earth tones"
  ```

---

### Task 5: Update color palette — High Focus (softer high-contrast)

**Files:** `packages/runtime/src/themes/high-focus.ts`

- [ ] Convert all `palette.*` references to inline hex values
- [ ] Replace color values with softer blue primary, warmer surfaces, maintain AAA contrast

Key v2 values:

```
surface: '#fcfaf7'
'surface-dim': '#dedbd8'
'surface-bright': '#fcfaf7'
'surface-container-lowest': '#ffffff'
'surface-container-low': '#f6f4f0'
'surface-container': '#f0ede9'
'surface-container-high': '#eae7e3'
'surface-container-highest': '#e5e2de'
'on-surface': '#1c1b1a'
'on-surface-variant': '#484642'
'inverse-surface': '#31302e'
'inverse-on-surface': '#f4f2ef'
outline: '#757370'
'outline-variant': '#c6c3be'
'surface-tint': '#1a5acc'
primary: '#003d8a'
'on-primary': '#ffffff'
'primary-container': '#1a5acc'
'on-primary-container': '#d4e2ff'
'inverse-primary': '#b5c8ff'
secondary: '#1a7a50'
'on-secondary': '#ffffff'
'secondary-container': '#b8ecc8'
'on-secondary-container': '#0a4a28'
tertiary: '#7a2a10'
'on-tertiary': '#ffffff'
'tertiary-container': '#b8603a'
'on-tertiary-container': '#ffd4c4'
error: '#ba1a1a'
'on-error': '#ffffff'
'error-container': '#ffdad6'
'on-error-container': '#93000a'
'primary-fixed': '#dce5ff'
'primary-fixed-dim': '#b5c8ff'
'on-primary-fixed': '#001a4a'
'on-primary-fixed-variant': '#00307a'
'secondary-fixed': '#b8ecc8'
'secondary-fixed-dim': '#82d0a0'
'on-secondary-fixed': '#002a14'
'on-secondary-fixed-variant': '#0a5a30'
'tertiary-fixed': '#ffd4c4'
'tertiary-fixed-dim': '#ffb098'
'on-tertiary-fixed': '#3a0a00'
'on-tertiary-fixed-variant': '#6a2010'
background: '#fcfaf7'
'on-background': '#1c1b1a'
'surface-variant': '#e5e2de'
bg: '#fcfaf7'
fg: '#1c1b1a'
border: '#c6c3be'
success: '#16a34a'
'success-container': '#dafbe3'
```

- [ ] Remove `import { palette }` from import line
- [ ] Run tests
- [ ] Commit

  ```bash
  git add packages/runtime/src/themes/high-focus.ts
  git commit -m "feat(high-focus): v2 color refresh — softer blue primary, warmer surfaces, AAA maintained"
  ```

---

### Task 6: Update color palette — Nocturnal (softer neon accents)

**Files:** `packages/runtime/src/themes/nocturnal.ts`

Nocturnal already uses inline hex values (no palette imports).

- [ ] Replace secondary (teal) with less saturated `#5adfd0` (v1: `#46f5e0`)
- [ ] Replace tertiary (yellow) with less saturated `#c4bc50` (v1: `#d4ca38`)
- [ ] Adjust tertiary-container and on-tertiary-container accordingly
- [ ] Run tests
- [ ] Commit

  ```bash
  git add packages/runtime/src/themes/nocturnal.ts
  git commit -m "feat(nocturnal): v2 color refresh — softer neon accents (teal, yellow)"
  ```

---

### Task 7: Update color palette — Sylvan Workspace (muted organic)

**Files:** `packages/runtime/src/themes/sylvan-workspace.ts`

- [ ] Convert `palette.*` references to inline hex values
- [ ] Replace color values with muted earth tones

Key v2 values:

```
surface: '#faf8f4'
'surface-dim': '#e4e1dc'
'surface-bright': '#fefcf8'
'surface-container-lowest': '#ffffff'
'surface-container-low': '#f4f2ec'
'surface-container': '#efede6'
'surface-container-high': '#e9e6df'
'surface-container-highest': '#e4e0d9'
'on-surface': '#1c1b17'
'on-surface-variant': '#494640'
'inverse-surface': '#31302c'
'inverse-on-surface': '#f4f2ee'
outline: '#76736e'
'outline-variant': '#c6c2bc'
'surface-tint': '#1a301a'
primary: '#1a301a'
'on-primary': '#ffffff'
'primary-container': '#c4dcc4'
'on-primary-container': '#0a1a0a'
'inverse-primary': '#b4d4b4'
secondary: '#5e6e5a'
'on-secondary': '#ffffff'
'secondary-container': '#d5e4d1'
'on-secondary-container': '#2a3d24'
tertiary: '#3a2a1a'
'on-tertiary': '#ffffff'
'tertiary-container': '#6a5a4a'
'on-tertiary-container': '#d4c4b0'
error: '#ba1a1a'
'on-error': '#ffffff'
'error-container': '#ffdad6'
'on-error-container': '#93000a'
'primary-fixed': '#c4dcc4'
'primary-fixed-dim': '#a4c4a4'
'on-primary-fixed': '#0a1a0a'
'on-primary-fixed-variant': '#2a402a'
'secondary-fixed': '#d5e4d1'
'secondary-fixed-dim': '#b8c8b4'
'on-secondary-fixed': '#1a2d14'
'on-secondary-fixed-variant': '#3a4d34'
'tertiary-fixed': '#e4d4c0'
'tertiary-fixed-dim': '#c4b4a0'
'on-tertiary-fixed': '#2a1a0a'
'on-tertiary-fixed-variant': '#4a3a2a'
background: '#faf8f4'
'on-background': '#1c1b17'
'surface-variant': '#e4e0d9'
bg: '#faf8f4'
fg: '#1c1b17'
border: '#c6c2bc'
success: '#16a34a'
'success-container': '#dafbe3'
```

- [ ] Remove `import { palette }` from import line
- [ ] Run tests
- [ ] Commit

  ```bash
  git add packages/runtime/src/themes/sylvan-workspace.ts
  git commit -m "feat(sylvan-workspace): v2 color refresh — muted organic earth tones"
  ```

---

### Task 8: Update color palette — Zen (softer neutral)

**Files:** `packages/runtime/src/themes/zen.ts`

- [ ] Convert all `palette.*` references to inline hex values
- [ ] Replace color values with warmer, slightly softer neutrals

Key v2 values:

```
surface: '#fcfaf8'
'surface-dim': '#e2dfdc'
'surface-bright': '#fefcf8'
'surface-container-lowest': '#ffffff'
'surface-container-low': '#f6f4f0'
'surface-container': '#f0eeea'
'surface-container-high': '#eae7e3'
'surface-container-highest': '#e4e1dd'
'on-surface': '#1f1c1a'
'on-surface-variant': '#484642'
'inverse-surface': '#32302e'
'inverse-on-surface': '#f4f2ef'
outline: '#75736e'
'outline-variant': '#c6c3bd'
'surface-tint': '#5d5a54'
primary: '#5d5a54'
'on-primary': '#ffffff'
'primary-container': '#c6c2bc'
'on-primary-container': '#1c1a16'
'inverse-primary': '#c6c2bc'
secondary: '#726e68'
'on-secondary': '#ffffff'
'secondary-container': '#d4d0c8'
'on-secondary-container': '#2a2824'
tertiary: '#727070'
'on-tertiary': '#ffffff'
'tertiary-container': '#cccaca'
'on-tertiary-container': '#2a2a28'
error: '#ba1a1a'
'on-error': '#ffffff'
'error-container': '#ffdad6'
'on-error-container': '#93000a'
'primary-fixed': '#e8e4de'
'primary-fixed-dim': '#c6c2bc'
'on-primary-fixed': '#1c1a16'
'on-primary-fixed-variant': '#4a4842'
'secondary-fixed': '#d4d0c8'
'secondary-fixed-dim': '#b8b4ac'
'on-secondary-fixed': '#22201c'
'on-secondary-fixed-variant': '#3a3832'
'tertiary-fixed': '#e0dedc'
'tertiary-fixed-dim': '#c4c2c0'
'on-tertiary-fixed': '#2a2a28'
'on-tertiary-fixed-variant': '#4a4848'
background: '#fcfaf8'
'on-background': '#1f1c1a'
'surface-variant': '#e4e1dd'
bg: '#fcfaf8'
fg: '#1f1c1a'
border: '#c6c3bd'
success: '#16a34a'
'success-container': '#dafbe3'
```

- [ ] Remove `import { palette }` from import line
- [ ] Run tests
- [ ] Commit

  ```bash
  git add packages/runtime/src/themes/zen.ts
  git commit -m "feat(zen): v2 color refresh — softer neutral stone tones"
  ```

---

### Task 9: Final verification

- [ ] Run `pnpm test` — all packages must pass
- [ ] Run `pnpm lint` — 0 errors
- [ ] Run `pnpm typecheck` — all packages pass
- [ ] Run `pnpm format:check` — clean
- [ ] Push to PR

  ```bash
  git push origin feat/design-token-refresh-v2
  ```
