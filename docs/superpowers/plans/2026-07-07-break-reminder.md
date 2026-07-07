# Break Reminder & App Banner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a break reminder system (15/30/60 min timer + dedicated break page) and a generic AppBanner primitive reusable for future app-level messages.

**Architecture:** Four independent work streams — (1) AppBanner primitive in design-system, (2) Break timer engine in learner, (3) BreakNagBar + BreakPage UI in learner, (4) AppShell/Settings integration in learner.

**Spec:** `docs/superpowers/specs/2026-07-07-break-reminder-design.md`

**Design explorations:** `scratch/design-explorations/nag-bar-top-banner.html`, `scratch/design-explorations/break-page.html`, `scratch/design-explorations/break-settings.html`

---

## File Map

### New files

- `packages/design-system/src/primitives/app-banner.tsx`
- `packages/design-system/src/primitives/__tests__/app-banner.test.tsx`
- `apps/learner/src/breakTimerStorage.ts`
- `apps/learner/src/__tests__/breakTimerStorage.test.ts`
- `apps/learner/src/useBreakTimer.ts`
- `apps/learner/src/__tests__/useBreakTimer.test.ts`
- `apps/learner/src/BreakNagBar.tsx`
- `apps/learner/src/__tests__/BreakNagBar.test.tsx`
- `apps/learner/src/BreakPage.tsx`
- `apps/learner/src/__tests__/BreakPage.test.tsx`

### Modified files

- `packages/design-system/src/index.ts`
- `apps/learner/src/AppShell.tsx`
- `apps/learner/src/SettingsPage.tsx`

---

## Epics and Stories

### Epic 35: Break Reminder & App Banner System

**Stories:**

| #    | Story                   | Files                                                                  | Dependencies |
| ---- | ----------------------- | ---------------------------------------------------------------------- | ------------ |
| 35.1 | AppBanner Primitive     | `packages/design-system/src/primitives/app-banner.tsx`, index.ts, test | None         |
| 35.2 | Break Timer Engine      | `breakTimerStorage.ts`, `useBreakTimer.ts`, tests                      | None         |
| 35.3 | Break Reminder UI       | `BreakNagBar.tsx`, `BreakPage.tsx`, tests                              | 35.1, 35.2   |
| 35.4 | Learner App Integration | `AppShell.tsx`, `SettingsPage.tsx`                                     | 35.2, 35.3   |

---

## Story Details

### Story 35.1: AppBanner Primitive

**Goal:** Create a generic, reusable AppBanner component in `@open-edu/design-system` that can be used for break reminders and future app-level messages.

**Files to create:**

- `packages/design-system/src/primitives/app-banner.tsx`

**Files to modify:**

- `packages/design-system/src/index.ts` — add AppBanner to exports

**Component API:**

```tsx
export type AppBannerVariant = 'info' | 'warning' | 'break';

export interface AppBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AppBannerVariant;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
}
```

**Behavior:**

- `variant` controls styling:
  - `info`: `bg-surface-container text-on-surface` (default)
  - `warning`: `bg-tertiary-container text-on-tertiary-container`
  - `break`: `bg-primary-fixed text-primary`
- Layout: flex row, icon | message (flex-1) | actions | dismiss X button
- If `onDismiss` is provided, render an X close button (Lucide `X` icon) that calls `onDismiss` on click
- `icon` slot rendered left (64px fixed width for alignment)
- `actions` slot rendered right (buttons or other controls)
- The main content area (between icon and actions) renders `children`
- ARIA: `role="status"`, `aria-live="polite"`
- Animation: slide down from top on mount (CSS animation `nag-slide-down` 300ms ease-out)

**Token usage:**

- Background: `bg-surface-container` / `bg-tertiary-container` / `bg-primary-fixed` (per variant)
- Text: `text-on-surface` / `text-on-tertiary-container` / `text-primary` (per variant)
- Border: `border-b border-outline-variant`
- Close button: `text-on-surface-variant hover:text-on-surface`
- All via Tailwind token classes — never hardcoded hex

**shadcn/ui compliance:**

- `React.forwardRef<HTMLDivElement, AppBannerProps>`
- `AppBanner.displayName = 'AppBanner'`
- `cva()` for variant styles
- `cn()` for className merging
- Named exports: `export { AppBanner, appBannerVariants, type AppBannerVariant }`

**CSS animation (add to `packages/design-system/src/index.css`):**

```css
@keyframes banner-slide-down {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Add `animate-banner-slide-down` to tailwindAnimationExtensions in `packages/design-system/src/tokens/tailwind.ts`, and add `banner-slide-down` keyframes to `packages/design-system/src/index.css`.

**Tests (`packages/design-system/src/primitives/__tests__/app-banner.test.tsx`):**

1. Renders children correctly
2. Renders with `info` variant and applies correct class
3. Renders with `warning` variant and applies correct class
4. Renders with `break` variant and applies correct class
5. Renders icon in icon slot
6. Renders actions in actions slot
7. Shows dismiss button when `onDismiss` is provided
8. Calls `onDismiss` when X is clicked
9. Has no accessibility violations (axe-core via `checkAccessibility`)
10. Sets displayName
11. Forwards ref

**Verification:**

- `pnpm --filter @open-edu/design-system test` passes
- `pnpm --filter @open-edu/design-system typecheck` passes (if available)

---

### Story 35.2: Break Timer Engine

**Goal:** Create the localStorage utility and React hook that manages the break timer lifecycle.

**Files to create:**

- `apps/learner/src/breakTimerStorage.ts`
- `apps/learner/src/__tests__/breakTimerStorage.test.ts`
- `apps/learner/src/useBreakTimer.ts`
- `apps/learner/src/__tests__/useBreakTimer.test.ts`

#### `breakTimerStorage.ts`

```ts
export interface BreakTimerSettings {
  mode: 'off' | '15' | '30' | '60';
}

const STORAGE_KEY = 'oe-break-timer-settings';

export function loadBreakTimerSettings(): BreakTimerSettings;
export function saveBreakTimerSettings(settings: BreakTimerSettings): void;
export function clearBreakTimerSettings(): void;
```

- Default settings: `{ mode: 'off' }`
- Handle malformed JSON gracefully (return defaults)
- Use `safeJsonParse` pattern (try/catch)

#### `useBreakTimer.ts`

```ts
export function useBreakTimer(): {
  isTriggered: boolean;
  mode: BreakTimerSettings['mode'];
  setMode: (mode: BreakTimerSettings['mode']) => void;
  dismiss: () => void;
};
```

**Behavior:**

- On mount, read settings from localStorage via `loadBreakTimerSettings()`
- When `mode === 'off'`, do nothing
- When `mode` is `'15'`, `'30'`, or `'60'`, start a 10-second interval that checks elapsed time
- Track `startTime` (set when mode is set or when component mounts with a mode)
- When elapsed time >= configured minutes _ 60 _ 1000, set `isTriggered = true`
- `dismiss()` resets `isTriggered = false` and restarts the timer (new `startTime`)
- `setMode(newMode)` saves to localStorage, resets timer, and restarts if not 'off'
- Clean up interval on unmount
- Use `useRef` for interval ID to avoid stale closures
- Use `useState` for `isTriggered` and `mode`

**Edge cases:**

- Tab hidden/throttled — `setInterval` may slow down in background tabs. Acceptable drift of up to ~30s.
- Mode change while timer is running — reset `startTime` and restart interval
- Dismiss while timer is running — reset `startTime`, keep interval running

**Tests (`breakTimerStorage.test.ts`):**

1. Returns default mode 'off' when no saved data
2. Saves and loads '15' mode correctly
3. Saves and loads '30' mode correctly
4. Saves and loads '60' mode correctly
5. Returns default on malformed JSON
6. Returns default on corrupt data (wrong shape)
7. `clearBreakTimerSettings` removes the key

**Tests (`useBreakTimer.test.ts`):**

Use Vitest fake timers (`vi.useFakeTimers()`):

1. Returns `isTriggered: false` and `mode: 'off'` initially
2. When mode is '15', fires after 15 minutes
3. When mode is '30', fires after 30 minutes
4. `dismiss()` resets `isTriggered` to false
5. `setMode('off')` stops the timer
6. Mode change resets the timer
7. Cleanup clears interval on unmount
8. localStorage is called with correct keys

**Verification:**

- `pnpm --filter @open-edu/learner test` passes
- `pnpm --filter @open-edu/learner typecheck` passes

---

### Story 35.3: Break Reminder UI

**Goal:** Create the BreakNagBar and BreakPage components.

**Files to create:**

- `apps/learner/src/BreakNagBar.tsx`
- `apps/learner/src/__tests__/BreakNagBar.test.tsx`
- `apps/learner/src/BreakPage.tsx`
- `apps/learner/src/__tests__/BreakPage.test.tsx`

#### `BreakNagBar.tsx`

```tsx
export interface BreakNagBarProps {
  onTakeBreak: () => void;
  onIgnore: () => void;
}
```

- Uses `AppBanner` from `@open-edu/design-system` with `variant="break"`
- Renders Pipili (curious mood, 28px) in the `icon` slot
- Message: `<strong>Time for a break!</strong> You've been learning for {minutes} minutes. Stand up, stretch, and rest your eyes.`
- Actions slot: "Take Break" (Button variant="default") + "Ignore" (Button variant="ghost")
- Passes `onDismiss` as `onIgnore`

**Pipili rendering (inline SVG for BreakNagBar):**

- Pipili head: SVG circle (fill `text-primary` / `--oe-color-primary`) with two white eye dots
- Curious mood: head rotated -12deg, eyes rotated +12deg
- Size: 28px

**Styling:**

- No hardcoded tokens. All through AppBanner's variant classes.
- Buttons use design system Button component from `@open-edu/design-system`

#### `BreakPage.tsx`

```tsx
export interface BreakPageProps {
  onBackToLearning: () => void;
}
```

**Full-page layout:**

- `min-h-screen flex flex-col items-center justify-center`
- Assembly flow SVG pattern at top and bottom (decorative)
- Pipili (content mood, 80px) with orbital ring
- Serif heading: "Time to recharge" (font using `font-display` or `font-headline-lg` from design tokens)
- Body text in expressive/reading font size
- Suggestion chips (4 pill buttons, non-interactive):
  - Drink water (dot: `bg-primary-light`)
  - Stretch (dot: `bg-success`)
  - Rest eyes (dot: `bg-tertiary`)
  - Breathe (dot: `bg-secondary`)
- Timer countdown ring (SVG circle with `stroke-dasharray`, showing 2:00 — decorative only, no live countdown needed for MVP)
- "Back to Learning" primary button calling `onBackToLearning`

**Orbital ring SVG:**

- `120x120` viewBox
- Circle at center (60, 60), radius 50, `stroke="text-primary-light"`, `stroke-dasharray="4 3"`, opacity 0.2
- 3 satellite dots at positions around the right side (similar to OpenModule)
- Calm float animation: `animate-orbit-float` (already defined in design-system)

**Pipili rendering (inline SVG for BreakPage):**

- Same structure as nag bar but 80px and `content` mood
- Content mood: `scale(1.1)` with `transform-origin: center`

**Tests (`BreakNagBar.test.tsx`):**

1. Renders the AppBanner with break variant
2. Renders Pipili in the icon slot
3. Renders "Take Break" and "Ignore" buttons
4. Clicking "Take Break" calls `onTakeBreak`
5. Clicking "Ignore" calls `onIgnore`
6. Has no accessibility violations (axe-core)

**Tests (`BreakPage.test.tsx`):**

1. Renders Pipili (content mood)
2. Renders "Time to recharge" heading
3. Renders suggestion chips (Drink water, Stretch, Rest eyes, Breathe)
4. Renders "Back to Learning" button
5. Clicking "Back to Learning" calls `onBackToLearning`
6. Has no accessibility violations (axe-core)

**Verification:**

- `pnpm --filter @open-edu/learner test` passes
- `pnpm --filter @open-edu/learner typecheck` passes

---

### Story 35.4: Learner App Integration

**Goal:** Wire the break timer system into AppShell and SettingsPage.

**Files to modify:**

- `apps/learner/src/AppShell.tsx`
- `apps/learner/src/SettingsPage.tsx`

#### AppShell Changes

1. Import `useBreakTimer` from `./useBreakTimer`
2. Import `BreakNagBar` from `./BreakNagBar`
3. Add a new `AppView` variant: `{ view: 'break' }` (routed to BreakPage)
4. In the shell, render `<BreakNagBar>` when timer is triggered AND view is not already 'break'
   - Position: inside the shell layout, before the main content area
   - `onTakeBreak`: navigate to break view
   - `onIgnore`: call `dismiss()` on the timer
5. Add break view rendering in the view switch:
   - `<BreakPage onBackToLearning={() => navigate to previous view}>`
6. When entering break view, pass the previous view so "Back to Learning" can restore it

**State to add:**

- `previousView: AppView | null` — stored when navigating to break view
- `handleTakeBreak()` — saves current view, sets `view` to `{ view: 'break' }`
- `handleBackToLearning()` — restores `previousView`

**Edge case:** If the timer fires while the user is already on the break page (e.g., they dismissed and timer re-fired), don't show the nag bar since they're already in break context.

#### SettingsPage Changes

Add a "Wellness & Breaks" section card:

```
Card:
  CardHeader: Pipili icon + "Break Reminder"
  CardContent:
    RadioGroup (from @open-edu/design-system):
      - Off: "No break reminders"
      - 15 min: "Quick learning sprints"
      - 30 min: "Balanced sessions with regular breaks"
      - 60 min: "Deep work sessions"
```

- Consume `useBreakTimer()` for `mode` and `setMode`
- Wrap in a Card with CardHeader/CardContent
- Use design system `RadioGroup` and `RadioGroupItem` primitives
- Pipili (content, 28px) in the card header

**Tests:**

BreakNagBar integration (in AppShell):

- Timer triggers, nag bar renders
- Clicking "Take Break" navigates to break page
- Clicking "Ignore" hides the nag bar
- Nag bar does not render when mode is 'off'

Settings integration:

- Radio group updates the timer mode
- Selecting "Off" disables the timer
- Selected value matches saved mode

**Verification:**

- `pnpm --filter @open-edu/learner test` passes
- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm lint` — no errors
- Manual test: set 1-min timer (for testing), verify flow

---

## Design Spec Reference

See `docs/superpowers/specs/2026-07-07-break-reminder-design.md` for full design details including:

- Visual DNA alignment table
- Component architecture tiers
- User flow diagram
- Token usage rules
- File map

## Verification Checklist

Before marking complete:

- [ ] All unit tests pass: `pnpm test`
- [ ] `pnpm lint` — no errors
- [ ] `pnpm typecheck` — no errors
- [ ] `pnpm format:check` — passes
- [ ] Conventional commit messages: `feat(epic-35): ...`
- [ ] No dead code, debug logs, or temporary edits
- [ ] axe-core audits pass for AppBanner, BreakNagBar, BreakPage
- [ ] Dev-server CSS regenerated if Tailwind classes added to runtime

## Animation keyframes to add

### `packages/design-system/src/index.css`

```css
@keyframes banner-slide-down {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### `packages/design-system/src/tokens/tailwind.ts`

Add to `tailwindAnimationExtensions`:

```ts
'banner-slide-down': 'banner-slide-down 0.3s ease-out',
```
