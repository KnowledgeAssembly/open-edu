# Break Reminder & App Banner Design Spec

> **Status:** Draft
> **Date:** 2026-07-07
> **Stage:** 5 — Product Design
> **Depends on:** Stage 3 (Visual DNA), Stage 4 (Design System)

---

## Purpose

Add a break reminder system to the Learner App that promotes healthy learning habits, with a generic AppBanner component reusable for future app-level messages.

---

## User Flow

```
Timer expires (15/30/60 min)
  │
  ├──► AppBanner appears at top of page (non-blocking)
  │     ├── "Take Break" ──► Navigate to BreakPage
  │     └── "Ignore"     ──► Dismiss banner, timer resets
  │
  BreakPage (full page, calming)
  │     ├── Pipili content mood + orbital ring
  │     ├── Suggestion chips (drink water, stretch, etc.)
  │     ├── 2:00 countdown ring (visual anchor, no enforcement)
  │     └── "Back to Learning" ──► Return to previous view
```

---

## Component Architecture

### Tier 1: AppBanner (Primitive)

**Location:** `packages/design-system/src/primitives/app-banner.tsx`

Generic banner component for app-level messages. Not break-specific.

```tsx
export type AppBannerVariant = 'info' | 'warning' | 'break';

export interface AppBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AppBannerVariant;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
}
```

- `variant` affects background/border color (info = surface-container, warning = tertiary-container, break = primary-fixed)
- `icon` slot for Pipili or other avatar
- `actions` slot for CTA buttons (rendered right-aligned)
- `onDismiss` renders an X button if provided
- `role="status"`, `aria-live="polite"`
- Follows shadcn/ui pattern: `forwardRef`, `displayName`, `cva`

### Tier 2: BreakNagBar (Learner App)

**Location:** `apps/learner/src/BreakNagBar.tsx`

Composes AppBanner with break-specific content:

- Pipili (curious mood) in the icon slot
- "Time for a break!" message
- "Take Break" (primary Button) + "Ignore" (ghost Button) in actions slot

### Tier 2: BreakPage (Learner App)

**Location:** `apps/learner/src/BreakPage.tsx`

Full-page calming break experience:

- Pipili (content mood, 80px)
- Orbital ring (OpenModule visual language)
- Assembly flow decorative pattern (top + bottom)
- Serif title: "Time to recharge"
- Subtitle with encouragement
- Suggestion chips: Drink water, Stretch, Rest eyes, Breathe
- 2:00 countdown ring (decorative, SVG ring with stroke-dashoffset animation)
- "Back to Learning" primary Button
- Removes all learning UI for transition clarity

### Break Timer Engine

**Location:**

- `apps/learner/src/breakTimerStorage.ts` — localStorage utility
- `apps/learner/src/useBreakTimer.ts` — React hook

```ts
interface BreakTimerSettings {
  mode: 'off' | '15' | '30' | '60';
}

interface BreakTimerState {
  isTriggered: boolean;
  mode: BreakTimerSettings['mode'];
  setMode: (mode: BreakTimerSettings['mode']) => void;
  dismiss: () => void;
  reset: () => void;
}
```

- `useBreakTimer` reads settings from localStorage on mount
- Uses `setInterval` to check elapsed time every 10s (drift-tolerant)
- Exposes `isTriggered`, `dismiss()`, `reset()`
- Cleans up interval on unmount
- Persists `lastTriggeredAt` timestamp in localStorage

### Settings Integration

Add "Wellness & Breaks" section to `SettingsPage.tsx`:

- Radio group with 4 options: Off / 15 min / 30 min / 60 min
- Description text for each option
- Uses design system RadioGroup primitive

---

## Visual DNA Alignment

| Element           | Usage                                                       |
| ----------------- | ----------------------------------------------------------- |
| **Circle**        | Pipili eyes, orbital ring, suggestion chip dots, timer ring |
| **Open Module**   | Orbital ring around Pipili on BreakPage                     |
| **Pipili**        | Companion in BreakNagBar (curious) and BreakPage (content)  |
| **Assembly Flow** | Decorative SVG paths on BreakPage (top + bottom)            |
| **Token System**  | All colors via `--oe-*` CSS variables                       |

---

## File Map

### New files

| File                                                                  | Purpose                     |
| --------------------------------------------------------------------- | --------------------------- |
| `packages/design-system/src/primitives/app-banner.tsx`                | Generic AppBanner primitive |
| `packages/design-system/src/primitives/__tests__/app-banner.test.tsx` | AppBanner tests             |
| `apps/learner/src/breakTimerStorage.ts`                               | localStorage utility        |
| `apps/learner/src/__tests__/breakTimerStorage.test.ts`                | Storage tests               |
| `apps/learner/src/useBreakTimer.ts`                                   | Break timer React hook      |
| `apps/learner/src/__tests__/useBreakTimer.test.ts`                    | Hook tests                  |
| `apps/learner/src/BreakNagBar.tsx`                                    | Break nag bar component     |
| `apps/learner/src/__tests__/BreakNagBar.test.tsx`                     | Nag bar tests               |
| `apps/learner/src/BreakPage.tsx`                                      | Break page component        |
| `apps/learner/src/__tests__/BreakPage.test.tsx`                       | Break page tests            |

### Modified files

| File                                  | Change                                    |
| ------------------------------------- | ----------------------------------------- |
| `packages/design-system/src/index.ts` | Export AppBanner                          |
| `apps/learner/src/AppShell.tsx`       | Integrate BreakNagBar + BreakPage routing |
| `apps/learner/src/SettingsPage.tsx`   | Add Wellness & Breaks section             |

---

## Verification

- `pnpm --filter @open-edu/design-system test` passes
- `pnpm --filter @open-edu/learner test` passes
- `pnpm lint` — no errors
- `pnpm typecheck` — no errors
- axe-core audit passes for AppBanner, BreakNagBar, BreakPage
- Manual: set 1-min timer, verify nag bar appears, navigate to break page, return
