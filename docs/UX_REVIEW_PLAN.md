# OpenEdu Learner App — UX Polish Implementation Plan

> **Audience:** Implementing agent (deepseek-4-flash or similar). Read this entire file before touching any code. Each phase is independently shippable and independently verifiable.

This plan operationalizes the senior-UX review of the learner app. It targets five pillars the review flagged: **fonts, font sizes, layout alignment, theme colors, text alignment** — plus the cross-cutting cleanup (i18n, buttons, sidebar widths) required to make the changes durable.

---

## 0. Repositories, Conventions, Verification

### 0.1 Package manager & monorepo

- Use `pnpm` (not npm/yarn). Never run `npm install`.
- To work on the learner app: `pnpm --filter @open-edu/learner <script>`.
- To work on a package: `pnpm --filter @open-edu/<pkg> <script>`.

### 0.2 Common commands to run after every code change

```bash
pnpm --filter @open-edu/learner test           # vitest run for learner app
pnpm --filter @open-edu/learner typecheck      # tsc --noEmit
pnpm --filter @open-edu/learner lint            # eslint src/
pnpm typecheck                                  # type-check all packages (after shared-package edits)
pnpm test                                       # full test suite (slow — only before finishing)
pnpm lint                                       # includes lint:hardcoded-strings, lint:no-inline-styles, check-tailwind-css
pnpm format                                     # prettier auto-format
pnpm format:check                               # verify formatting
```

### 0.3 Tailwind regeneration (mandatory after runtime runtime class changes)

If you change ANY Tailwind class inside `packages/runtime/src/**` or `packages/design-system/src/**`, regenerate the dev-server pre-baked CSS:

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

### 0.4 i18n conventions

- User-facing strings MUST be looked up via `t('key')` from `@open-edu/i18n`.
- English translations live in `packages/i18n/locales/en/{namespace}.json`. Namespaces available: `runtime`, `learner`, `widgets`, `schemas`.
- The learner app's `t()` accesses two namespaces by default: `learner.*` and `runtime.*`. Use `t('learner.xyz')` or `t('runtime.xyz')`.
- After adding keys to `learner.json`, run `pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js i18n:validate ./locales ./en` if asked — but the dictionaries are imported directly in `apps/learner/src/i18n-dictionaries.ts`, so just keep the JSON in sync.
- Never write raw English inside JSX. The lint script `scripts/lint-no-hardcoded-strings.mjs` (run by `pnpm lint`) scans `apps/learner/src` + `packages/runtime/src/renderers,layout,components` and fails on uppercase JSX text.

### 0.5 Design tokens vocabulary (use these, do NOT invent raw Tailwind scales)

These classes are exposed by `@open-edu/design-system/tokens` (already wired into `apps/learner/tailwind.config.ts`). **Always prefer these over `text-xs`, `text-sm`, `text-lg`, `text-[NNpx]`**.

| Class                                   | What it is                 | Equivalent Tailwind-free size |
| --------------------------------------- | -------------------------- | ----------------------------- |
| `text-display-lg` `font-display`        | hero display               | 40px                          |
| `text-display-sm` `font-display`        | small display (break page) | 32px? (verify in tokens)      |
| `text-h1` `font-display`                | page title                 | 28px                          |
| `text-h2` `font-display`                | section                    | 28px                          |
| `text-h3` `font-display`                | subsection / card title    | 20px                          |
| `text-h4` `font-display`                | 18px                       |
| `text-h5` `font-display`                | 16px                       |
| `text-h6` `font-display`                | 14px                       |
| `text-body-ui` `font-body-md`           | UI chrome text             | 14px                          |
| `text-body-reading` `font-body-reading` | prose reading              | 18px serif                    |
| `text-label`                            | pill / form label          | 11px tracked                  |
| `text-label-caps`                       | eyebrow caps               | 11px uppercase                |
| `text-caption`                          | supporting info            | 13px                          |

Spacing tokens: `p-xs p-sm p-md p-lg p-xl`, `gap-xs gap-sm gap-md gap-lg gap-xl`, `mb-xl`, `mt-md`, etc.

### 0.6 Button primitive (use, don't reinvent)

`@open-edu/design-system` exports a `Button` with `cva` variants. The `apps/learner/src/components/ui/button.tsx` is just a re-export of `Button` and `buttonVariants`. Signature:

```tsx
<Button variant="default | outline | ghost | secondary | destructive | link"
        size="default | sm | lg | icon"
        onClick={...}
        disabled={...}>
  Save
</Button>
```

- Default already renders `bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring`.
- Rely on this; do not hand-roll `bg-primary text-on-primary rounded-lg ...`.

### 0.7 Test conventions (learner app)

- Tests live next to components (e.g., `Foo.tsx` → `Foo.test.tsx`).
- Use `@testing-library/react` + `@testing-library/jest-dom`. Test setup file: `apps/learner/src/test-setup.ts`.
- For visual class assertions, prefer `toHaveClass`/`toHaveAttribute`. Do not screenshot-test.
- For hardcoded-string edits, also check `apps/learner/src/SettingsPage.test.tsx`, `HomePage.test.tsx`, `CatalogPage.test.tsx`, `ProgressDashboard.test.tsx`, `BreakPage.test.tsx`, `CourseRuntime.test.tsx`, `AppShell.test.tsx` — they may assert on former raw strings. Update tests if they break.

### 0.8 Critical: do not commit secrets, debug logs, or temp files

- Remove `console.log` calls you encounter while editing a file you're touching (only if added recently — see Phase 8).
- Do not amend commits; do not push; do not create PRs unless told.

---

## Phase 1 — Font Loading (Critical)

**Goal:** Make the tokens' declared typeface actually render. Today `index.html` loads Noto Sans/Odia/Devanagari from Google Fonts, but tokens declare Inter (productive UI) + Source Serif 4 (expressive reading). The serif reading voice is invisible; the sans chrome falls back to system fonts.

**Approach:** Self-host ALL fonts via Fontsource (no Google Fonts dependency). The learner app is a PWA that must render lessons offline — including localized Hindi/Odia sessions. Every font on Google Fonts has a Fontsource equivalent (`@fontsource/noto-sans`, `@fontsource/noto-sans-devanagari`, `@fontsource/noto-sans-odia` all verified to exist on npm at v5.3.0). This is consistent with the offline-first PWA commitment and avoids any third-party request under GDPR/DPDP.

### 1.1 Self-host primary fonts (Inter + Source Serif 4)

#### Action 1.1.A — Add Fontsource packages

Edit `apps/learner/package.json`. In `dependencies`, add:

```json
"@fontsource/inter": "^5.0.18",
"@fontsource/source-serif-4": "^5.0.18"
```

Run:

```bash
pnpm install
```

#### Action 1.1.B — Import the primary fonts in the app entrypoint

Edit `apps/learner/src/main.tsx`. Add these lines near the top (before `import './index.css';`):

```ts
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
```

### 1.2 Self-host localized fallback fonts (Noto Sans/Serif for Hindi + Odia)

These are the fallback families in the `fontFamilies.notoSans` / `fontFamilies.notoSerif` entries already declared in `packages/design-system/src/tokens/typography.ts:155-158`. Loading them via Fontsource (instead of the current Google Fonts `<link>`) keeps the offline story intact for `hi` and `or` locales.

#### Action 1.2.A — Add Fontsource Noto packages

Edit `apps/learner/package.json`. In `dependencies`, add:

```json
"@fontsource/noto-sans": "^5.3.0",
"@fontsource/noto-sans-devanagari": "^5.3.0",
"@fontsource/noto-sans-odia": "^5.3.0",
"@fontsource/noto-serif": "^5.3.0",
"@fontsource/noto-serif-devanagari": "^5.3.0",
"@fontsource/noto-serif-odia": "^5.3.0"
```

Run:

```bash
pnpm install
```

#### Action 1.2.B — Import the Noto fonts in the app entrypoint

Edit `apps/learner/src/main.tsx`. Add these lines after the primary font imports from 1.1.B (still before `import './index.css';`):

```ts
// Localization fallbacks (Hindi + Odia) — self-hosted for offline PWA.
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/500.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';
import '@fontsource/noto-sans-odia/400.css';
import '@fontsource/noto-sans-odia/500.css';
import '@fontsource/noto-sans-odia/600.css';
import '@fontsource/noto-sans-odia/700.css';
import '@fontsource/noto-serif/400.css';
import '@fontsource/noto-serif/600.css';
import '@fontsource/noto-serif/700.css';
import '@fontsource/noto-serif-devanagari/400.css';
import '@fontsource/noto-serif-devanagari/600.css';
import '@fontsource/noto-serif-devanagari/700.css';
import '@fontsource/noto-serif-odia/400.css';
import '@fontsource/noto-serif-odia/600.css';
import '@fontsource/noto-serif-odia/700.css';
```

(Use only 400/600/700 for serif — serif weights are heavier files and the localized UI rarely needs 500.)

#### Action 1.2.C — Remove the Google Fonts `<link>` tags

Edit `apps/learner/index.html`. Delete these two lines:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+Odia:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

Replace with a comment so future readers know the fonts are bundled, not fetched:

```html
<!-- Fonts (Inter, Source Serif 4, Noto Sans/Serif for hi/or) are self-hosted via @fontsource/* — see src/main.tsx. No Google Fonts request. -->
```

#### Action 1.2.D — Ensure PWA service worker caches the font CSS

The learner app uses `vite-plugin-pwa`. Fontsource CSS files are bundled into the app's CSS chunks by Vite, so they are already part of the hashed asset graph the service worker caches — no extra work needed. Verify by running `pnpm --filter @open-edu/learner build:deploy` and confirming the `dist/assets/` folder contains `inter-*.woff2`, `source-serif-4-*.woff2`, `noto-sans-*.woff2` etc. (Vite emits font files as hashed assets; if they're in `dist/assets/`, the service worker's `assetsInclude` pattern from `vite-plugin-pwa` config already picks them up.)

If the build does NOT emit the WOFF2 files as separate assets (some Fontsource versions inline base64 into CSS), that's also acceptable — the CSS chunk itself is cached by the SW. Either path works offline.

#### Action 1.2.E — (Optional, recommended) Lazy-load Noto fonts by locale

The Noto files (~120 KB gzipped for all six families) bloat the initial bundle even for `en`-only users. To lazy-load:

Create **`apps/learner/src/i18n-fonts.ts`**:

```ts
const loaded = new Set<string>();

export async function loadLocaleFonts(locale: string): Promise<void> {
  if (loaded.has(locale)) return;
  loaded.add(locale);
  if (locale === 'hi') {
    await Promise.all([
      import('@fontsource/noto-sans-devanagari/400.css'),
      import('@fontsource/noto-sans-devanagari/500.css'),
      import('@fontsource/noto-sans-devanagari/600.css'),
      import('@fontsource/noto-sans-devanagari/700.css'),
      import('@fontsource/noto-serif-devanagari/400.css'),
      import('@fontsource/noto-serif-devanagari/600.css'),
      import('@fontsource/noto-serif-devanagari/700.css'),
    ]);
  } else if (locale === 'or') {
    await Promise.all([
      import('@fontsource/noto-sans-odia/400.css'),
      import('@fontsource/noto-sans-odia/500.css'),
      import('@fontsource/noto-sans-odia/600.css'),
      import('@fontsource/noto-sans-odia/700.css'),
      import('@fontsource/noto-serif-odia/400.css'),
      import('@fontsource/noto-serif-odia/600.css'),
      import('@fontsource/noto-serif-odia/700.css'),
    ]);
  }
}
```

In `apps/learner/src/AppShell.tsx`, inside `AppShellInner`, after the `useTranslation()` call, add:

```ts
import { loadLocaleFonts } from './i18n-fonts.js';
// ...
const { t, locale } = useTranslation();
useEffect(() => {
  void loadLocaleFonts(locale);
}, [locale]);
```

Verify `useTranslation` exposes `locale` — inspect `packages/i18n/src` for the hook return type. If it doesn't, the implementation agent should add it (small change: spread the `I18nContext` value into the hook return).

If you adopt 1.2.E, **remove the static `noto-*` imports** from `apps/learner/src/main.tsx` (keep only the base `noto-sans`/`noto-serif` Latin imports, or remove those too if Hindi/Odia are the only non-Latin locales). This keeps the initial `en` bundle lean while preserving offline rendering once a user switches to `hi`/`or` (the dynamic import chunk is itself cached by the service worker after first load).

If implementing 1.2.E adds risk (e.g., `useTranslation` refactor), skip it and keep the static imports from 1.2.B. The bundle is larger but correct. Note the skip in the PR.

#### Action 1.1.D — Normalize non-standard font weights

Edit `packages/design-system/src/tokens/typography.ts`. Replace every occurrenc of `fontWeight: '420'` with `fontWeight: '400'`, and every `fontWeight: '650'` with `fontWeight: '600'`. There are exactly 6 occurrences (productive body, productive heading, expressive body cap, expressive caption, productive caption, expressive caption — verify counts with `grep`):

```bash
grep -n "fontWeight: '420'\|fontWeight: '650'" packages/design-system/src/tokens/typography.ts
```

Also edit `packages/runtime/src/themes/lumina-scholastica.ts`, `packages/runtime/src/themes/nocturnal.ts`, `packages/runtime/src/themes/zen.ts`. Run:

```bash
grep -rn "fontWeight: '420'\|fontWeight: '650'" packages/runtime/src/themes
```

Replace all `'420'` → `'400'` and `'650'` → `'600'` in those files.

### 1.3 Verification

```bash
pnpm --filter @open-edu/learner build:deploy   # if this fails, the font imports are wrong
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/learner typecheck
```

Manually (only if a browser is available): start `pnpm --filter @open-edu/learner dev` and load `http://localhost:4001`. Open DevTools → Network → filter `fontsource`. Confirm Inter + Source Serif 4 (+ Noto, if not lazy-loaded) fonts 200 OK from your own origin. Inspect any `<p class="font-body-reading">` element — Computed font-family should resolve to `"Source Serif 4"`. Switch the locale to `hi` (if 1.2.E is implemented) and confirm Devanagari glyphs render with Noto Sans Devanagari (no tofu □).

### 1.4 Offline verification

After `pnpm --filter @open-edu/learner build:deploy`:

1. `cd apps/learner && pnpm preview` (serves the production build).
2. Open the preview URL in a browser, DevTools → Application → Service Workers → confirm SW registered.
3. DevTools → Network → check "Offline" checkbox.
4. Reload the page. Fonts MUST still render (Inter for UI, Source Serif 4 for prose). No request to `fonts.gstatic.com` should appear in the Network panel (filter `gstatic`).
5. If you implemented 1.2.E: while online, switch locale to `hi`, confirm Noto Sans Devanagari loads; then toggle offline and reload — Hindi glyphs must still render because the SW cached the dynamic import chunk.

### 1.5 Tests to add

Create `apps/learner/src/__tests__/font-loading.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('Fontsource CSS imports', () => {
  it('imports primary fonts (Inter + Source Serif 4)', async () => {
    await import('@fontsource/inter/400.css');
    await import('@fontsource/inter/500.css');
    await import('@fontsource/inter/600.css');
    await import('@fontsource/inter/700.css');
    await import('@fontsource/source-serif-4/400.css');
    await import('@fontsource/source-serif-4/600.css');
    await import('@fontsource/source-serif-4/700.css');
    expect(true).toBe(true);
  });

  it('imports Noto fallback fonts for hi and or locales', async () => {
    await import('@fontsource/noto-sans-devanagari/400.css');
    await import('@fontsource/noto-sans-odia/400.css');
    await import('@fontsource/noto-serif-devanagari/400.css');
    await import('@fontsource/noto-serif-odia/400.css');
    expect(true).toBe(true);
  });
});
```

Confirm this test passes. If CSS-side-effect imports throw under jsdom, configure `vitest` to handle CSS (check `vitest.config.ts` for `css: true` and add if missing — look for `apps/learner/vite.config.ts` `test.css.documents`).

---

## Phase 2 — Ban Raw Tailwind Font Scales (Critical)

**Goal:** Eliminate `text-xs`, `text-sm`, `text-lg`, `text-base`, `text-xl`, `text-2xl`, `text-3xl`, `text-[NNpx]` in production code. Use the design tokens.

### 2.1 Add a lint rule to prevent regression

Create `scripts/lint-no-raw-text-scales.mjs` modeled on `scripts/lint-no-hardcoded-strings.mjs` (same overall structure — read it first).

The script must scan `apps/learner/src` and `packages/runtime/src` for `.tsx` files (exclude `*.test.tsx`, `*.spec.tsx`, `*.stories.tsx`, `*.d.ts`) and fail if the file contains any of these class tokens _as Tailwind utilities_ (in `className="..."` or ``className={`...`}``):

Regex (case-sensitive, word boundary inside `className` attribute):

```
\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b
\btext-\[\d+px\]
```

Skip matches inside `*/10`, `*/15` Tailwind opacity — wait, those don't apply to font sizes. The rule is: any `text-(xs|sm|base|lg|xl|2xl|3xl|4xl)` token or `text-[Npx]` token in a `className` string is a failure.

Add a single allow-list file `scripts/allowlist-raw-text-scales.json` (empty array `[]`).

Hook it into `package.json` scripts so it runs as part of `pnpm lint`:

```diff
 "lint": "pnpm -r run lint && node scripts/lint-no-inline-styles.mjs && node scripts/lint-no-hardcoded-strings.mjs --strict && node scripts/check-tailwind-css.mjs",
+"lint:raw-text-scales": "node scripts/lint-no-raw-text-scales.mjs --strict",
+"lint": "pnpm -r run lint && node scripts/lint-no-inline-styles.mjs && node scripts/lint-no-hardcoded-strings.mjs --strict && node scripts/lint-no-raw-text-scales.mjs --strict && node scripts/check-tailwind-css.mjs",
```

(Replace the existing `lint` line — don't add a second one.)

Run `pnpm lint:raw-text-scales` once to see the initial violation list. **Do not fix until 2.2 is done**, because fixing first means the lint will pass on master and you want it to fail-then-pass as you fix.

### 2.2 Manual fixture-cleanup list (edit each file below)

> Replace the listed raw scale with the suggested token. If a different scale makes more sense locally, prefer the token mapping in §0.5. If unsure, prefer `text-body-ui` for body text and `text-h3 font-display` for card/section titles.
> After EACH file, run `pnpm --filter @open-edu/learner typecheck` to catch broken JSX.

Files and replacements:

**`apps/learner/src/CatalogPage.tsx`**

- Line 145: `text-xs` → `text-caption`. Keep `px-2 py-0.5 rounded-full`.
- Line 153: `text-xs font-semibold` → `text-caption font-semibold`.
- Line 246: `text-sm font-semibold` → `text-body-ui font-semibold`.
- Lines 226, 236 (filter chips & "All" button): change any `px-3` chip that uses default Button sizing — handled in Phase 7; here just rename any raw `text-sm` to `text-body-ui` on inline custom styles. In this file the chips use `<Button size="sm">`, so nothing to do beyond the Sort select below.
- Lines 254–260: SelectTrigger uses default size. Verify no raw `text-xs` inside.

**`apps/learner/src/SettingsPage.tsx`**

- Line 74: `text-sm` → `text-body-ui`.
- Line 92, 122, 138, 167, 176, 185, 194: `text-sm font-medium` → `text-body-ui font-medium`.
- Lines 93, 123, 139, 169, 178, 187, 196: `text-xs` → `text-caption`.
- Line 107: `font-mono text-sm` → `font-mono text-body-ui`.

**`apps/learner/src/CollectionBinderPage.tsx`**

- Line 132: `text-sm` → `text-body-ui`.
- Line 64: `text-6xl` → remove (it's an old emoji hanger). The SVG `h-24 w-24` already drives the icon. Drop `text-6xl opacity-30` wrapper div. **Do not touch the SVG** (will be replaced in Phase 8).

**`apps/learner/src/CourseRightSidebar.tsx`**

- Line 80, 96: `text-sm font-medium` → `text-body-ui font-medium`.
- Line 143: `text-sm` → `text-body-ui`.

**`apps/learner/src/BadgeToast.tsx`** (L87, L90): `text-sm` → `text-body-ui`.

**`apps/learner/src/BreakPage.tsx`**

- Line 41: `text-3xl font-semibold` → `text-display-sm font-display`. (If `text-display-sm` is not a real token, fall back to `text-h1 font-display` — verify by grepping `packages/design-system/src/tokens/tailwind.ts`).
- Line 44: `text-base` → `text-body-ui`.
- Line 52: `text-sm` → `text-body-ui`.
- Line 87: `text-lg` → `text-display-sm font-mono`.

**`apps/learner/src/pages/StorageSettingsPage.tsx`**

- Line 33: `text-2xl font-bold` → `text-h1 font-display`.

**`apps/learner/src/ai/CompanionPanel.tsx`** L83: `text-base font-semibold` → `text-h3 font-display`.

**`apps/learner/src/ai/WordTapHandler.tsx`**: lines 220, 227, 229, 234, 242, 244, 253, 256, 262, 269, 282, 294, 295, 301.

- All `text-sm` → `text-body-ui`.
- All `text-xs` → `text-caption`.
- Line 227 `text-base font-semibold` (the looked-up word header) → `text-h3 font-display`.
- Line 301 `text-xs font-medium` → `text-caption font-medium`.

**`apps/learner/src/ai/TextSelectionToolbar.tsx`** L224: `text-xs font-medium` → `text-caption font-medium`.

**`packages/runtime/src/renderers/QuizRenderer.tsx`**

- Line 73: `text-lg font-bold` → `text-h3 font-display`.
- Line 103: `text-base font-semibold` → handled in Phase 7 (Button migration). For now: `text-base` → `text-body-ui`.

**`packages/runtime/src/renderers/ReflectionRenderer.tsx`**

- Line 49: `text-lg font-semibold` → `text-h3 font-display`.
- Line 61: `text-base` → `text-body-ui`.
- Line 70: `text-base font-semibold` → handled Phase 7.

**`packages/runtime/src/layout/LayoutShell.tsx`**

- Line 58: `text-[1.5rem] font-bold` → `text-h1 font-display`.
- Line 74: `text-base font-semibold` → Phase 7.
- Line 88: `text-base font-semibold` → Phase 7.
- Line 94: `text-body-ui` is already there — verify.

**`packages/runtime/src/layout/Sidebar.tsx`** L21 `text-lg font-bold` → `text-h3 font-display`. L23, L59: `text-xs` → `text-caption`.

**`packages/runtime/src/components/WidgetCanvas.tsx`** L40: `text-xs font-medium uppercase tracking-wider` → `text-label-caps`.

**`packages/runtime/src/components/KnowledgeCard.tsx`**

- L123: `text-xs font-medium uppercase tracking-wider` → `text-label-caps`.
- L128: `text-sm font-semibold` → `text-body-ui font-semibold`.
- L136: `text-xs` → `text-caption`.
- L145, L149, L153: `text-[10px]` → `text-label`.

**`packages/runtime/src/components/KnowledgeCardUnlockedToast.tsx`**

- L114: `text-sm font-semibold` → `text-body-ui font-semibold`.
- L124: `text-sm font-medium` → `text-body-ui font-medium`.
- L127: `text-xs` → `text-caption`.
- L135: `text-xs font-medium` → `text-label font-medium`.

**`packages/runtime/src/components/KnowledgeCardViewer.tsx`**

- L69: `text-sm` → `text-body-ui`.
- L73: `text-sm leading-relaxed` → `text-body-ui leading-relaxed`.
- L79, L82, L86: `text-xs font-medium` → `text-label font-medium`.
- L94: `text-sm leading-relaxed` → `text-body-reading` (serif body — long explanation reads as prose).
- L104: `text-[10px] font-medium` → `text-label font-medium`.
- L114: `text-sm font-semibold` → `text-h4 font-display`.
- L137: `text-xs font-bold` → `text-label font-bold`.
- L149: `text-sm font-medium` → `text-body-ui font-medium`.
- L156: `text-[10px] font-medium` → `text-label font-medium`.
- L161: `text-xs` → `text-caption`.
- L171, L199: `text-sm font-semibold` → `text-h4 font-display`.
- L180, L208: `text-sm` → `text-body-ui`.

**`packages/runtime/src/components/KnowledgeCardGrid.tsx`** L69: `text-sm` → `text-body-ui`.

**`packages/runtime/src/components/ProgressRing.tsx`** L60: `text-xs font-semibold` → `text-label font-semibold`.

**`packages/runtime/src/components/ThemeSelector.tsx`**

- L166: `text-sm font-medium` → `text-body-ui font-medium`.
- L167, L171: `text-xs` → `text-caption`.

**`packages/runtime/src/components/SkillSummary.tsx`** L21: `text-xs ... text-sm` ternary → `'text-caption ...' : 'text-body-ui ...'`. L47: `text-xs` → `text-caption`.

**`packages/runtime/src/components/WidgetErrorFallback.tsx`**

- L22: `text-3xl` → `text-display-sm`.
- L29: `text-sm font-semibold` → `text-body-ui font-semibold`.
- L37: `text-xs` → `text-caption`.
- L41: `text-xs` → `text-caption`.

**`packages/runtime/src/renderers/MarkdownRenderer.tsx`**

- L127, L138, L146: `font-mono text-sm` → `font-mono text-body-ui`.

**`packages/runtime/src/components/CourseOutline.tsx`** L17: `text-base` → `text-body-ui`. L26: `text-xs` → `text-caption`.

### 2.3 Verification

```bash
pnpm lint:raw-text-scales        # should now pass (0 violations)
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/design-system test
pnpm typecheck
# After runtime/design-system class changes:
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

If any test in `apps/learner/src/__tests__/a11y-themes.test.tsx` or `*.a11y.test.tsx` breaks because of changed markup, update the assertion to match the new token class, but do NOT weaken accessibility assertions; prefer using `getByText` rather than `toHaveClass('text-sm')` style checks.

---

## Phase 3 — Sidebar Width & Spacing Reconciliation (High)

**Goal:** Single source of truth for sidebar width; no `flex-[0_0_280px]` constants; `LayoutShell` uses `max-w-reading`.

### 3.1 Set the canonical sidebar width token to 260px

Edit all three theme files (`packages/runtime/src/themes/lumina-scholastica.ts`, `nocturnal.ts`, `zen.ts`). Find:

```ts
panelNav: '240px',
```

Change to:

```ts
panelNav: '260px',
```

### 3.2 Replace raw sidebar width literals with the token

Files to edit:

**`packages/runtime/src/layout/LayoutShell.tsx`** line 109. Find:

```tsx
<div className="border-outline-variant flex-[0_0_280px] overflow-y-auto border-r">
```

Replace:

```tsx
<div className="border-outline-variant w-[var(--oe-space-panel-nav)] overflow-y-auto border-r">
```

(Use `w-` not `flex-[0_0_...]` because the parent is `flex h-full`; `w-` + `shrink-0` is cleaner. Add `shrink-0`.)
Final:

```tsx
<div className="border-outline-variant w-[var(--oe-space-panel-nav)] shrink-0 overflow-y-auto border-r">
```

**`packages/design-system/src/patterns/AppSidebar.tsx`** line 86 already uses `w-[var(--oe-space-panelNav,260px)]`. Leave it but normalize the CSS variable name to `--oe-space-panel-nav` (kebab-case) to match the rest of the codebase. Two edits:

- L86: `w-[var(--oe-space-panelNav,260px)]` → `w-[var(--oe-space-panel-nav)]` (drop the literal fallback; the theme provider always sets it).

**`apps/learner/src/CourseRuntime.tsx`** lines 273–280. Find:

```tsx
<div
  className={cn(
    'flex-shrink-0 overflow-y-auto transition-[width] duration-200',
    sidebarCollapsed ? 'w-16' : 'flex-[0_0_var(--oe-space-panelNav,260px)]',
  )}
>
```

Replace with:

```tsx
<div
  className={cn(
    'shrink-0 overflow-y-auto transition-[width] duration-200',
    sidebarCollapsed ? 'w-16' : 'w-[var(--oe-space-panel-nav)]',
  )}
>
```

Also add a left border for chrome separation. After the line `<div className="relative flex min-w-0 flex-1 flex-col">` (the content wrapper that follows the sidebar), the sidebar wrapper should get `border-r border-outline-variant`. Add to the cn() above: `'shrink-0 overflow-y-auto border-r border-outline-variant transition-[width] duration-200'`.

### 3.3 Replace LayoutShell content max-width

`packages/runtime/src/layout/LayoutShell.tsx` line 53. Find `w-full max-w-[800px]`. Replace with `w-full max-w-reading` (`max-w-reading` is wired in `apps/learner/tailwind.config.ts:50` → `var(--oe-reading-width)` = 68ch).

### 3.4 Replace `gap-6` & `p-[calc(var(--oe-space-md)*1.5)]` literals

`LayoutShell.tsx` line 53. Currently:

```tsx
className =
  'font-body-md text-on-surface bg-surface mx-auto flex min-h-full w-full max-w-reading flex-col gap-6 p-[calc(var(--oe-space-md)*1.5)]';
```

Change to:

```tsx
className =
  'font-body-md text-on-surface bg-surface mx-auto flex min-h-full w-full max-w-reading flex-col gap-lg p-lg';
```

### 3.5 Replace misc `p-6`, `gap-8`, `mb-8`, `px-4`

**`apps/learner/src/CollectionBinderPage.tsx`**

- L91: `mx-auto max-w-6xl p-6` → `mx-auto max-w-6xl p-xl`.
- L114: `gap-8` → `gap-xl`.
- L97 `mb-8` → `mb-xl`.
- Empty-state wrapper L60: `px-4 py-16` → `px-md py-xl`.
- L64 empty state `mb-6` → `mb-lg`.

### 3.6 Remove negative-margin hack in HomePage

**`apps/learner/src/HomePage.tsx`** lines 65–70. Find:

```tsx
<div
  className="pb-md text-caption text-on-surface-variant -mt-md text-center opacity-50"
  aria-hidden="true"
>
  {t('learner.home.assembled_tagline')}
</div>
```

Replace with (left-aligned, no negative margin, no opacity hack):

```tsx
<div className="pb-md text-caption text-on-surface-variant text-left" aria-hidden="true">
  {t('learner.home.assembled_tagline')}
</div>
```

Keep it inside the hero block rhythm; the hero already ends with `mb-xl`, so this becomes the closing element of the `<HeroSection>`. (If removing `-mt-md` leaves too much whitespace, drop the wrapper entirely and append `<p className="text-caption text-on-surface-variant mt-sm">...</p>` inside the HeroSection children right after the CTA row.)

### 3.7 Reduce HomePage width per Reader-shell guidance

`apps/learner/src/HomePage.tsx` line 49. Find `max-w-6xl`. Replace with `max-w-4xl`.

### 3.8 Constrain SettingsPage width

`apps/learner/src/SettingsPage.tsx` line 48. Find `max-w-3xl`. Replace with `max-w-2xl` (form-oriented, per `LAYOUT_PATTERNS.md`).

### 3.9 Verification

```bash
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/design-system test
pnpm typecheck
pnpm format
# Regenerate dev-server tailwind CSS because runtime classes changed:
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

---

## Phase 4 — Theme Color Corrections (Medium)

### 4.1 Add `on-success` and `success-container` tokens

Edit all three theme files: `packages/runtime/src/themes/lumina-scholastica.ts`, `nocturnal.ts`, `zen.ts`.

In `lumina-scholastica.ts`, inside `colors`, after `['success-container']: '#dafbe3',` add:

```ts
['on-success']: '#ffffff',
['on-success-container']: '#003914',
```

For `nocturnal.ts`: pick existing dark theme values consistent with the other dark tokens. Use:

```ts
['on-success']: '#ffffff',
['on-success-container']: '#7fff9e',
```

If `nocturnal.ts` already has `success-container` as something else (check), keep that and only add `on-success` / `on-success-container`.

For `zen.ts`: keep consistent with muted palette:

```ts
['on-success']: '#ffffff',
['on-success-container']: '#2c4a32',
```

Verify each theme still loads with:

```bash
pnpm --filter @open-edu/runtime test
```

The test file `packages/runtime/src/themes/__tests__/theme-definitions.test.ts` may enforce required keys; run it first and add the keys it expects.

### 4.2 Fix the success-foreground mapping

Edit `apps/learner/src/index.css` line 24.
Find:

```css
--success-foreground: var(--oe-color-on-secondary);
```

Replace:

```css
--success-foreground: var(--oe-color-on-success);
```

### 4.3 Fix QuizRenderer success color

Edit `packages/runtime/src/renderers/QuizRenderer.tsx` line 57–64 (`optionBgClass`) and line 111–113 (result banner).

In `optionBgClass`, find:

```ts
if (option.correct) return 'bg-secondary/15';
```

Replace:

```ts
if (option.correct) return 'bg-success-container';
```

In the result banner, find:

```tsx
className={`mt-3 rounded-lg px-4 py-3 font-semibold ${
  score === 100 ? 'text-secondary bg-secondary/15' : 'text-error bg-error/15'
}`}
```

Replace with:

```tsx
className={`mt-3 rounded-lg px-4 py-3 font-semibold ${
  score === 100 ? 'text-on-success-container bg-success-container' : 'text-on-error-container bg-error-container'
}`}
```

(`on-error-container` already exists in `lumina-scholastica.ts`; verify it exists in `nocturnal.ts`/`zen.ts` and add if missing.)

### 4.4 Replace opacity hacks with container tokens

Search:

```bash
grep -rEn "bg-(primary|secondary|tertiary|error|success)/(10|15|50)\b" apps/learner/src packages/runtime/src --include="*.tsx" | head
```

For each match, prefer the corresponding `*-container` token. Specific known hits:

- `apps/learner/src/CourseRightSidebar.tsx` L81, L97: `bg-primary/10 text-primary` → `bg-primary-container text-on-primary-container`.
- `apps/learner/src/HomePage.tsx` L114: `border-primary/10 border-2` → `border-outline-variant border`.
- `packages/runtime/src/components/KnowledgeCardViewer.tsx` L156: `bg-primary/10` → `bg-primary-container`.
- `packages/runtime/src/renderers/QuizRenderer.tsx` (default selected state) L59 `bg-primary/10` → `bg-primary-container`.
- Toast selections in `KnowledgeCardUnlockedToast.tsx` should switch `/15` → `-container` tokens.

Leave `/10` semantics for things that are truly decorative overlays (e.g., `AssemblyFlow` background `opacity-[0.08]`).

### 4.5 KnowledgeCardViewer muted chips

Edit `packages/runtime/src/components/KnowledgeCardViewer.tsx` lines 79, 82, 86. Each `bg-muted text-on-surface-variant` chip becomes `bg-primary-container text-on-primary-container` (status chip). Verify you don't blow contrast in dark mode — `pnpm --filter @open-edu/learner test` and visually if possible.

Line 104 `bg-surface-container-high text-on-surface-variant text-[10px] font-medium` (badge): keep `bg-surface-container-high` (it's a neutral chip) and just change `text-[10px]` → `text-label`.

### 4.6 Tie `theme-color` meta to active theme

Edit `apps/learner/index.html` line 9. Find:

```html
<meta name="theme-color" content="#F5F3EE" />
```

Change to the actual light-theme surface and leave it as the default; we'll update it at runtime:

```html
<meta name="theme-color" content="#fcfaf8" />
```

Create **`apps/learner/src/hooks/useThemeColorMeta.ts`**:

```ts
import { useEffect } from 'react';
import type { ThemeId } from '@open-edu/runtime';

const THEME_COLOR_BY_ID: Record<ThemeId, string> = {
  'lumina-scholastica': '#fcfaf8',
  nocturnal: '#1a1a1a', // verify against nocturnal.ts surface
  zen: '#faf8f3', // verify against zen.ts surface
};

/**
 * Keeps the <meta name="theme-color"> tag in sync with the active theme.
 * This colors the PWA chrome and (on Android) the browser address bar.
 */
export function useThemeColorMeta(themeId: ThemeId): void {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', THEME_COLOR_BY_ID[themeId]);
  }, [themeId]);
}
```

Wire it up in `apps/learner/src/AppShell.tsx` inside `AppShellInner` (around line 162, after `const { t } = useTranslation();`):

```ts
import { useThemeColorMeta } from './hooks/useThemeColorMeta.js';
// ...
useThemeColorMeta(themeId);
```

Confirm the surface hexes in `nocturnal.ts` and `zen.ts` and update `THEME_COLOR_BY_ID` accordingly. Use their `surface` color values.

### 4.7 Remove gradient on PageHeader (optional but recommended)

Edit `packages/design-system/src/patterns/PageHeader.tsx` lines 20–23. Find:

```tsx
'bg-gradient-to-br from-[var(--oe-color-surface-container-low)] to-[var(--oe-color-surface-container)]',
```

Replace with:

```tsx
'bg-surface-container-low border-outline-variant border-b',
```

### 4.8 Verification

```bash
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/design-system test
pnpm typecheck
pnpm format
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

---

## Phase 5 — Reduce-Motion + High-Contrast (Real Implementation)

**Goal:** Either make the Settings toggles do something, or hide them. We will implement them properly to honor `VISUAL_RULES.md` "Reduced motion support" + a11y commitment.

### 5.1 Add CSS that consumes the toggles

Edit `apps/learner/src/index.css`. After the existing `:root` block, append:

```css
@layer base {
  :root {
    --oe-reduced-motion: no-preference;
    --oe-high-contrast: 0;
  }

  .open-edu-runtime[data-reduced-motion='reduce'] *,
  .open-edu-runtime[data-reduced-motion='reduce'] *::before,
  .open-edu-runtime[data-reduced-motion='reduce'] *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }

  .open-edu-runtime[data-high-contrast='1'] {
    --oe-color-outline: #000000;
    --oe-color-outline-variant: #333333;
    --oe-color-on-surface: #000000;
    --oe-color-on-surface-variant: #1f1f1f;
    --oe-color-surface: #ffffff;
    --oe-color-surface-container: #ffffff;
    --oe-color-surface-container-low: #ffffff;
    --oe-color-surface-container-high: #f2f2f2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .open-edu-runtime {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

(Note: we are _not_ applying dark-mode contrast overrides here — high-contrast is most stringent in Light. The user can pair Zen with high-contrast later if desired.)

### 5.2 Drive the data attributes from Settings state

Edit `apps/learner/src/SettingsPage.tsx`. The `useEffect` blocks (lines 36–45) currently set CSS variables on `document.documentElement`. Replace them so they set **data attributes on the RuntimeThemeProvider's wrapper `.open-edu-runtime`** instead.

Find and replace lines 36–45:

```ts
useEffect(() => {
  document.documentElement.style.setProperty(
    '--oe-reduced-motion',
    reducedMotion ? 'reduce' : 'no-preference',
  );
}, [reducedMotion]);

useEffect(() => {
  document.documentElement.style.setProperty('--oe-high-contrast', highContrast ? '1' : '0');
}, [highContrast]);
```

With:

```ts
useEffect(() => {
  const el = document.querySelector('.open-edu-runtime');
  if (el) el.setAttribute('data-reduced-motion', reducedMotion ? 'reduce' : 'no-preference');
}, [reducedMotion]);

useEffect(() => {
  const el = document.querySelector('.open-edu-runtime');
  if (el) el.setAttribute('data-high-contrast', highContrast ? '1' : '0');
}, [highContrast]);
```

### 5.3 Verify provider renders `.open-edu-runtime` class

Inspect `packages/runtime/src/components/RuntimeThemeProvider.tsx` (find with `grep`). Confirm the wrapper element has `className="open-edu-runtime ..."`. If not, add it. If you add a class to a runtime component, regenerate dev-server CSS:

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

### 5.4 Hide-OFF alternative (deferred from review)

The break-reminder toggles are real and stay. No action beyond 5.1–5.3.

### 5.5 Verification

```bash
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/learner typecheck
# Run a11y tests to confirm contrast:
pnpm --filter @open-edu/learner test -- __tests__/a11y-themes.test.tsx
```

If `SettingsPage.test.tsx` snapshots the old effect (testing `documentElement.style`), update the assertion to test `el.getAttribute('data-reduced-motion')`.

---

## Phase 6 — i18n Hardcoded String Removal

**Goal:** Make `pnpm lint` pass on all the strings flagged. The lint scans `apps/learner/src` and `packages/runtime/src/{renderers,layout,components}`.

### 6.1 Run the lint to get the current violation list

```bash
pnpm lint:hardcoded-strings
```

Record every violation in a scratch list. The phases below address known hits; new ones surfaced by the lint get the same treatment.

### 6.2 Add new i18n keys

Edit **`packages/i18n/locales/en/learner.json`**. Add the following keys (insert alphabetically within the existing structure — open the file first and follow its existing organization, usually nested by screen):

```json
"catalog": {
  ...
  "filter_all": "All",
  "sort_newest": "Newest",
  "sort_alphabetical": "Alphabetical",
  "sort_by_aria": "Sort by"
},
"progress": {
  ...
  "eyebrow_label": "Progress",
  "title": "My Progress",
  "subtitle": "Track your learning journey across all courses.",
  "stat_completed": "completed",
  "stat_in_progress": "in progress",
  "stat_badges_earned": "badges earned",
  "empty_heading": "Your learning journey starts here!",
  "empty_description": "Begin a course and your progress will appear here."
},
"collection_binder": {
  ...
  "eyebrow": "Collection",
  "title": "Collection Binder",
  "subtitle_format": "Your museum of knowledge — {unlocked} / {total} cards collected",
  "stat_unlocked": "unlocked",
  "stat_total_cards": "total cards",
  "stat_categories": "categories",
  "empty_description": "No cards yet. Complete lessons to unlock your first Knowledge Card.",
  "card_unlocked_default": "Unlock",
  "card_locked_default": "Locked"
},
"settings": {
  ...
  "aa_decrease_font_aria": "Decrease font size",
  "aa_increase_font_aria": "Increase font size"
},
"break": {
  ...
  "title": "Take a moment",
  "subtitle": "Rest your eyes. Breathe. When you're ready, return to learning.",
  "resume": "Back to learning",
  "timer": "2:00"
},
"storage": {
  ...
  "settings_heading": "Storage"
}
```

Also add to **`packages/i18n/locales/en/runtime.json`**:

```json
"layout": {
  "next": "Next",
  "back": "Back",
  "completed": "You have completed this learning experience.",
  "submit_to_continue": "Submit your answer above to continue"
},
"quiz": { ... existing ... } // nothing new here
```

(Replace the literal `nextLabel = 'Next'`, `backLabel = 'Back'`, `completedLabel = '...'` defaults in `LayoutShell.tsx` — see Phase 6.3.)

### 6.3 Replace hardcoded strings in components

**`apps/learner/src/CatalogPage.tsx`**

- Line 229 button label `All` → `{t('learner.catalog.filter_all')}`.
- Line 257 `<SelectItem value="newest">Newest</SelectItem>` → `<SelectItem value="newest">{t('learner.catalog.sort_newest')}</SelectItem>`.
- Line 259 `Alphabetical` → `{t('learner.catalog.sort_alphabetical')}`.
- Line 253 `aria-label="Sort by"` → `aria-label={t('learner.catalog.sort_by_aria')}`.
- Line 258 `inProgress` is already `t(...)` — leave.

**`apps/learner/src/ProgressDashboard.tsx`**

- Line 101 `eyebrow="Progress"` → `eyebrow={t('learner.progress.eyebrow_label')}`.
- Line 102 `title="My Progress"` → `title={t('learner.progress.title')}`.
- Line 103 `subtitle="Track your learning journey across all courses."` → `subtitle={t('learner.progress.subtitle')}`.
- Line 113 label `'completed'` → `t('learner.progress.stat_completed')`.
- Line 118 label `'in progress'` → `t('learner.progress.stat_in_progress')`.
- Line 123 label `'badges earned'` → `t('learner.progress.stat_badges_earned')`.
- Lines 86–88 `EmptyState` heading/description strings → `{t('learner.progress.empty_heading')}` and `{t('learner.progress.empty_description')}`.
- `relativeTime` strings ("Just now", "minute(s) ago"): replace with `Intl.RelativeTimeFormat('en', { numeric: 'auto' })` (or `useTranslation().locale`). Add a helper `apps/learner/src/i18n-relativetime.ts`:

```ts
const _cache: Record<string, Intl.RelativeTimeFormat> = {};
function getRtf(locale: string): Intl.RelativeTimeFormat {
  if (!_cache[locale]) _cache[locale] = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return _cache[locale];
}
export function relativeTimeHuman(dateStr: string, locale = 'en'): string {
  const dateMs = new Date(dateStr).getTime();
  if (isNaN(dateMs)) return '';
  const diff = dateMs - Date.now();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return getRtf(locale).format(mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return getRtf(locale).format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return getRtf(locale).format(days, 'day');
  return getRtf(locale).format(Math.round(days / 7), 'week');
}
```

Replace `relativeTime()` with `relativeTimeHuman(snap.updatedAt, t.locale || 'en')`. (If `t.locale` is not exposed, use a constant `locale = 'en'` — verify by inspecting `@open-edu/i18n`'s `useTranslation` return type. The `I18nProvider` takes `locale` prop; check whether the hook exposes it.)

**`apps/learner/src/CollectionBinderPage.tsx`**

- L83 `"No cards yet..."` → `{t('learner.collection_binder.empty_description')}`.
- L92 `eyebrow="Collection"` → `eyebrow={t('learner.collection_binder.eyebrow')}`.
- L93 `title="Collection Binder"` → `title={t('learner.collection_binder.title')}`.
- L95 subtitle template string → `{t('learner.collection_binder.subtitle_format', { unlocked: allCardItems.filter((c) => !c.isLocked).length, total: allCardItems.length })}`. (Confirm `t()` signature supports named tokens — see `packages/i18n/src` for `format()`.)

**`apps/learner/src/SettingsPage.tsx`**

- L104 `aria-label="Decrease font size"` → `aria-label={t('learner.settings.aa_decrease_font_aria')}`.
- L112 `aria-label="Increase font size"` → `aria-label={t('learner.settings.aa_increase_font_aria')}`.

**`apps/learner/src/pages/StorageSettingsPage.tsx`**

- L33 `<h1>...</h1>` content (currently `t('learner.storage.settings')`) — verify the `t()` call, but if there's a raw string anywhere else, move it. No-op if already `t(...)`.

**`apps/learner/src/BreakPage.tsx`**

- L41 H1 contents → `{t('learner.break.title')}`.
- L44 subtitle → `{t('learner.break.subtitle')}`.
- L52 button → `{t('learner.break.resume')}`.
- L87 timer block: if hardcoded `2:00`, replace with `{t('learner.break.timer')}`. (Verify the timer still renders with mono styling — see Phase 2.2.)

**`packages/runtime/src/layout/LayoutShell.tsx`**

- L24 default `nextLabel = 'Next'` → remove default; pass `t('runtime.layout.next')` from `LayoutShellWithBack` in `apps/learner/src/CourseRuntime.tsx`.
- L25 `backLabel = 'Back'` → same — `t('runtime.layout.back')`.
- L26 `completedLabel = 'You have completed this learning experience.'` → `t('runtime.layout.completed')`.
- L95 `Submit your answer above to continue` (raw text in JSX) → `{t('runtime.layout.submit_to_continue')}`.

Import `useTranslation` in `LayoutShell.tsx` if it isn't already. Then make `LayoutShellWithBack` pass `nextLabel = {t('runtime.layout.next')}`, etc.

### 6.4 Verification

```bash
pnpm lint:hardcoded-strings                # should pass with 0 violations (eventually --strict)
pnpm lint                                    # full lint
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/runtime test
pnpm typecheck
pnpm format
```

If `pnpm lint:hardcoded-strings` still fails, fix remaining hits from its output by the same pattern. Do not add `eslint-disable` or `// eslint-disable-next-line` comments; the lint script doesn't use ESLint to detect, so that wouldn't work anyway.

---

## Phase 7 — Button Primitive Migration (Medium)

**Goal:** Replace hand-rolled primary/secondary buttons across renderers and layouts with `<Button>` from `@open-edu/design-system`. Stop drift.

### 7.1 Files to migrate and exact edits

**`packages/runtime/src/layout/LayoutShell.tsx`**

Add import at top:

```ts
import { Button } from '@open-edu/design-system';
```

Lines 70–78 (Back button). Find the `<button>` and replace with:

```tsx
<Button
  variant="outline"
  onClick={handleBack}
  disabled={!canGoBack}
  data-testid="layout-shell-back"
>
  {backLabel}
</Button>
```

Lines 85–92 (Next button). Replace with:

```tsx
<Button onClick={() => completeNode()} data-testid="layout-shell-next">
  {nextLabel}
</Button>
```

Line 81 (the `<p role="status" className="text-secondary py-2.5 font-semibold">{completedLabel}</p>`) — change `text-secondary` → `text-on-success-container` (matches Phase 4 success mapping); keep the `<p>` element as-is (not a button).

**`packages/runtime/src/renderers/QuizRenderer.tsx`**

Add import:

```ts
import { Button } from '@open-edu/design-system';
```

Lines 99–106 (Submit). Replace the `<button>` element with:

```tsx
<Button type="button" onClick={handleSubmit} disabled={selectedOptionId === null} className="mt-3">
  {t('runtime.quiz.submit')}
</Button>
```

**`packages/runtime/src/renderers/ReflectionRenderer.tsx`**

Add import for `Button`. Replace the submit `<button>` (L70 area) with `<Button onClick={...} disabled={...}>{t('runtime.reflection.submit')}</Button>`. Verify the i18n key exists; if `runtime.reflection.submit` isn't in `runtime.json`, add it.

**`packages/runtime/src/components/KnowledgeCardViewer.tsx`**

Related-lesson links (`L180`, `L208` are `<button>` styled as links). Replace with:

```tsx
<Button variant="link" size="sm" onClick={...}>{node.title}</Button>
```

(`variant="link"` already gives `text-primary underline-offset-4 hover:underline` — better than the old `hover:text-primary/80` hack.)

### 7.2 Verification

```bash
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/learner test
pnpm typecheck
pnpm lint
pnpm format
# Regenerate dev-server CSS:
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

If any test asserts on raw `className` containing `bg-primary` from the old hand-rolled button, update it to assert on `Button` semantics (`getByRole('button')` + `toHaveTextContent`). Better to assert behavior than class names.

---

## Phase 8 — Miscellaneous Polish

### 8.1 Remove debug logs

**`apps/learner/src/CollectionBinderPage.tsx`** line 54:

```ts
const handleRelatedLessonClick = useCallback((nodeId: string) => {
  console.log('Navigate to:', nodeId);
}, []);
```

Replace the `console.log` with a real (no-op stub) leave-behind:

```ts
const handleRelatedLessonClick = useCallback((_nodeId: string) => {
  // TODO: navigate to lesson node via onNavigate({ view: 'course', packageId: ... })
}, []);
```

Keep the function — don't break the dialog — but stop logging to console.

### 8.2 HomePage stat icons differentiation

**`apps/learner/src/HomePage.tsx`** lines 86, 91, 96. All three stats currently use `<OpenModule size="xs" satellites={3} />`. Differentiate:

- Course count stat: `<OpenModule size="xs" satellites={2} />`
- In-progress stat: `<OpenModule size="xs" satellites={4} />`
- Badge count stat: `<OpenModule size="xs" satellites={5} />`

This keeps the visual DNA (OpenModule orbits) while making the three stats visually distinguishable per `vault.basevariation` from `03-visual-dna.md`.

### 8.3 Three-stat alt visualization

Verify the `Stat` types accept a custom `icon` element — `StatsSummary` props accept `items: { icon?: ReactNode; ... }` per the existing usage, so no API change needed.

### 8.4 Homepage CTA card border

Already addressed in Phase 4.4 (border-primary/10 → border-outline-variant).

### 8.5 CatalogPage button-pill chip consistency

The filter chips and "View all" link use `<Button>` with `rounded-full` and `px-3`. Leave them.

### 8.6 Empty state illustrations — replace generic SVG with Pipili

**`apps/learner/src/CollectionBinderPage.tsx`** lines 64–78. The empty state currently embeds an inline `<svg>` outline book. Replace with `<Pipili>` (from design-system):

```tsx
import { Pipili } from '@open-edu/design-system';
// ...
<div className="max-w-md text-center">
  <Pipili size="md" mood="curious" className="mb-lg mx-auto" />
  <h2 className="text-h2 font-display text-on-surface mb-2">
    {t('learner.collection_binder.title')}
  </h2>
  <p className="text-body-reading text-on-surface-variant">
    {t('learner.collection_binder.empty_description')}
  </p>
</div>;
```

Per `03-visual-dna.md` §3 "Pipili appears during uncertainty (first visit, onboarding, waiting, empty states)". Confirm `Pipili` accepts `size="md"` and `mood="curious"` props (grep `packages/design-system/src/primitives/pipili.tsx`). If `mood="curious"` isn't supported, use `mood="content"`.

### 8.7 CourseRightSidebar tabs → use design-system Tabs

**`apps/learner/src/CourseRightSidebar.tsx`** currently renders two `<button role="tab">` manually. Replace with the shadcn-style `Tabs` from `@open-edu/design-system` (verify it's exported by checking `packages/design-system/src/index.ts` for `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`):

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@open-edu/design-system';
// inside component:
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pipili' | 'notepad')}>
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="pipili">{t('learner.right_sidebar.tab_pipili')}</TabsTrigger>
    <TabsTrigger value="notepad">{t('learner.right_sidebar.tab_notepad')}</TabsTrigger>
  </TabsList>
  <TabsContent value="pipili" className="flex min-h-0 flex-1 flex-col">
    {/* move AIChat here */}
  </TabsContent>
  <TabsContent value="notepad">{/* move notepad content here */}</TabsContent>
</Tabs>;
```

If the design-system doesn't export `Tabs`, skip this refactor (do NOT implement Tabs from scratch — out of scope). Document the skip in the PR.

### 8.8 Responsive sidebar collapse

This is the largest single piece; defer to a follow-up plan if time-constrained. Spec:

- Below 1280px: `CourseRightSidebar` auto-closes.

In `apps/learner/src/CourseRightSidebar.tsx`, add:

```ts
import { useEffect } from 'react';
// ...
useEffect(() => {
  const mq = window.matchMedia('(max-width: 1280px)');
  const handler = (e: MediaQueryListEvent) => {
    if (e.matches) setPanelState('closed');
  };
  mq.addEventListener('change', handler);
  if (mq.matches) setPanelState('closed');
  return () => mq.removeEventListener('change', handler);
}, [setPanelState]);
```

- Below 960px: AppSidebar collapses. Implement in `apps/learner/src/AppShell.tsx` similarly using `useEffect` + `window.matchMedia('(max-width: 960px)')` setting `setSidebarCollapsed(true)` when matches. Also subscribe to change events.

If this is too risky for tests, SKIP it — mark as deferred and create a follow-up TODO in `apps/learner/src/AppShell.tsx` — do not add unfinished disabled code.

### 8.9 KnowledgeCardViewer reading body

Already addressed in Phase 2.2 (L94).

### 8.10 Final cleanup checklist

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

Run the full test suite once more before declaring done. If any test fails:

1. Read the failure output.
2. Update the test to assert the new behavior (new class names, new DOM structure) — do not weaken assertions.
3. Re-run.

---

## Phase 9 — Definition of Done

This plan is complete when ALL of the following are true:

- [ ] `pnpm install` succeeds with new Fontsource deps in `apps/learner/package.json` (Inter, Source Serif 4, Noto Sans/Serif + Devanagari + Odia variants).
- [ ] `apps/learner/src/main.tsx` imports primary fonts (Inter + Source Serif 4) via Fontsource.
- [ ] Noto fonts (Devanagari + Odia) are loaded via Fontsource — either statically in `main.tsx` or lazily via `i18n-fonts.ts` per locale.
- [ ] `apps/learner/index.html` has **no** `<link>` to `fonts.googleapis.com` or `fonts.gstatic.com` (all fonts self-hosted for offline PWA).
- [ ] `pnpm --filter @open-edu/learner build:deploy` emits font WOFF2 files (or inlines them in CSS) in `dist/assets/` — no external font requests at runtime.
- [ ] Offline verification (Phase 1.4) passes: fonts render with service worker offline checkbox enabled.
- [ ] All `fontWeight: '420'` are gone (replaced with `'400'`); all `fontWeight: '650'` are replaced with `'600'`.
- [ ] `pnpm lint:raw-text-scales` exists and passes (0 violations).
- [ ] No `text-xs`, `text-sm`, `text-lg`, `text-base`, `text-xl`, `text-2xl`, `text-3xl`, or `text-[NNpx]` remain in `apps/learner/src` or `packages/runtime/src` production files.
- [ ] All three theme files have `panelNav: '260px'`.
- [ ] `LayoutShell.tsx` sidebar uses `w-[var(--oe-space-panel-nav)]`; no `flex-[0_0_280px]`.
- [ ] `LayoutShell.tsx` content uses `max-w-reading` (not `max-w-[800px]`).
- [ ] `CollectionBinderPage` uses `p-xl`, `gap-xl`, `mb-xl` (no raw `p-6`/`gap-8`/`mb-8`).
- [ ] `HomePage` is `max-w-4xl`; tagline is left-aligned no negative margin.
- [ ] `SettingsPage` is `max-w-2xl`.
- [ ] All theme files have `on-success`, `on-success-container` (dark themes add `on-success-container`).
- [ ] `apps/learner/src/index.css` `--success-foreground` points to `--oe-color-on-success`.
- [ ] `QuizRenderer` "correct" state uses `bg-success-container text-on-success-container`.
- [ ] No `/15` opacity hacks for color-coded states (use container tokens).
- [ ] `index.html` `theme-color` is `#fcfaf8` and updates at runtime via `useThemeColorMeta`.
- [ ] `PageHeader` no longer uses a gradient (uses surface + bottom border).
- [ ] `index.css` has the reduced-motion + high-contrast CSS rules; Settings toggles set data attributes on `.open-edu-runtime`.
- [ ] `pnpm lint:hardcoded-strings --strict` passes (0 violations).
- [ ] New i18n keys added to `learner.json` and `runtime.json`.
- [ ] `relativeTime` formatter uses `Intl.RelativeTimeFormat`.
- [ ] All hand-rolled action buttons in `LayoutShell`, `QuizRenderer`, `ReflectionRenderer`, `KnowledgeCardViewer` use the `Button` primitive.
- [ ] `CollectionBinderPage` empty state uses `<Pipili>` instead of inline SVG.
- [ ] `CollectionBinderPage` `console.log` is gone.
- [ ] `HomePage` stat icons have different satellite counts (2, 4, 5).
- [ ] `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass from a clean state.
- [ ] Dev-server Tailwind CSS regenerated (`apps/dev-server/src/tailwind.css` updated).

---

## Appendix A — File Inventory (modified)

| Phase | File                                                                       | Change                                                |
| ----- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1.1.A | `apps/learner/package.json`                                                | + Fontsource Inter + Source Serif 4 deps              |
| 1.1.B | `apps/learner/src/main.tsx`                                                | + primary font CSS imports                            |
| 1.2.A | `apps/learner/package.json`                                                | + Fontsource Noto Sans/Serif + Devanagari + Odia deps |
| 1.2.B | `apps/learner/src/main.tsx`                                                | + Noto font CSS imports (or removed if 1.2.E adopted) |
| 1.2.C | `apps/learner/index.html`                                                  | remove Google Fonts `<link>` tags                     |
| 1.2.E | `apps/learner/src/i18n-fonts.ts` (new) + `AppShell.tsx`                    | (optional) lazy-load Noto per locale                  |
| 1.1.D | `packages/design-system/src/tokens/typography.ts`                          | fontWeight normalize                                  |
| 1.1.D | `packages/runtime/src/themes/{lumina,nocturnal,zen}.ts`                    | fontWeight normalize                                  |
| 1.5   | `apps/learner/src/__tests__/font-loading.test.ts`                          | new test                                              |
| 2.1   | `scripts/lint-no-raw-text-scales.mjs`                                      | new lint                                              |
| 2.1   | `package.json` (root)                                                      | new lint script + hook into `lint`                    |
| 2.2   | ~25 files across learner + runtime                                         | raw scales → tokens                                   |
| 3     | theme files                                                                | `panelNav: 260px`                                     |
| 3     | `LayoutShell.tsx`, `CourseRuntime.tsx`, `AppSidebar.tsx`                   | width token                                           |
| 3     | `CollectionBinderPage.tsx`, `HomePage.tsx`, `SettingsPage.tsx`             | spacing tokens                                        |
| 4     | theme files + `index.css`                                                  | on-success tokens                                     |
| 4     | `QuizRenderer.tsx`                                                         | success container                                     |
| 4     | `useThemeColorMeta.ts` + `AppShell.tsx`                                    | runtime theme-color                                   |
| 4     | `PageHeader.tsx`                                                           | flat surface                                          |
| 5     | `index.css`                                                                | reduced-motion / high-contrast rules                  |
| 5     | `SettingsPage.tsx`                                                         | data attributes on `.open-edu-runtime`                |
| 6     | `learner.json`, `runtime.json`                                             | new i18n keys                                         |
| 6     | `i18n-relativetime.ts`                                                     | new helper                                            |
| 6     | ~8 component files                                                         | hardcoded strings → `t()`                             |
| 7     | `LayoutShell`, `QuizRenderer`, `ReflectionRenderer`, `KnowledgeCardViewer` | `Button` primitive                                    |
| 8     | `CollectionBinderPage.tsx`                                                 | remove SVG/console.log, use Pipili                    |
| 8     | `HomePage.tsx`                                                             | differentiated stat icons                             |
| 8     | `CourseRightSidebar.tsx`                                                   | (optional) Tabs migration                             |
| 8     | `CourseRightSidebar.tsx` + `AppShell.tsx`                                  | (deferred) responsive collapse                        |

---

## Appendix B — Commands Cheat Sheet

```bash
# quick checks during work:
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/learner typecheck
pnpm --filter @open-edu/learner lint
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/design-system test

# full pre-PR verification:
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

---

## Appendix C — When in Doubt

1. **Read the existing code in the file you're editing** before editing. Mimic its imports, its `cn()` usage, its i18n patterns.
2. **Prefer tokens over raw Tailwind.** If a token doesn't exist, don't invent one — use the closest existing token and document the gap in the PR.
3. **Don't weaken tests.** Update them to assert new behavior if the contract changed; never delete an assertion because it's hard to satisfy.
4. **Don't add comments** unless asked (project rule). The phase instructions in this file are descriptive; the code you write should not include explanatory comments.
5. **Don't commit or push.** Leave changes on disk and report back with the list of modified files.
6. **Run lint, typecheck, tests after each phase.** Don't batch — catch errors early.
7. **If a phase is blocked** (e.g., `Tabs` not exported), skip it, note the skip in your final report, and continue to the next phase.
8. **If you encounter test failures from previous phases** (e.g., a `text-sm` snapshot broken by Phase 2 work on a later phase), update the snapshot as part of that phase's verification — don't let it regress.
