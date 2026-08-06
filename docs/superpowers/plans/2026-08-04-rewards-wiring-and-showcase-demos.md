# OpenEdu Rewards Wiring + Widget-Showcase SVG & Canvas Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rewards visible in the learner app and dev-server by wiring `RewardBroker` receipts into the `RewardEventBridge` overlay (with a CSS fallback that actually completes, since the lottie reward assets do not exist yet), and add one SVG-backend and one Canvas-backend animation demo node to the widget-showcase example.

**Architecture:** 7 tasks — (1) celebration CSS effects + finite durations + `CssAnimationRenderer`/`OasAnimationWrapper` completion signaling so the reward overlay dismisses after fallback, (2) wire `RewardEventBridge` into `apps/learner/src/CourseRuntime.tsx` via a small receipt-bridge helper, (3) wire `RewardEventBridge` into the dev-server single-package view the same way, (4) add an SVG animation demo node + SMIL-animated SVG asset to widget-showcase, (5) add a Canvas sorting demo node to widget-showcase, (6) full verification. The two demos ride the existing `WidgetRenderer` animation wrapper, and the PR #544 static asset emission (`apps/learner/vite.config.ts` `generateBundle` hook walks each catalog package's `assets/` dir) ships the new SVG automatically. Authoring/delivery of real `assets/rewards/*.lottie` files is intentionally deferred to a follow-up plan (hybrid decision).

**PR scope:** This plan covers two related stories (rewards wiring + showcase demos). Prefer **two PRs** if landing separately is easy (Tasks 1–3, then Tasks 4–5); one PR is acceptable if they ship together. Do not stack onto PR #544 unless intended — cut from `main` or work from `fix/learner-catalog-assets-vercel` only when that branch is the deliberate base.

**Tech Stack:** TypeScript 5.x, React 18, Zod, Tailwind CSS, Vitest, @testing-library/react, RxJS, HTML Canvas, SMIL SVG.

---

## File Structure

### New Files (6)

| File                                                         | Task | Responsibility                                  |
| ------------------------------------------------------------ | ---- | ----------------------------------------------- |
| `apps/learner/src/createRewardReceiptBridge.ts`              | 2    | Subject + `onReceipt` helper for overlay wiring |
| `apps/learner/src/__tests__/RewardBridge.test.tsx`           | 2    | Bridge + learner wiring tests                   |
| `apps/dev-server/src/createRewardReceiptBridge.ts`           | 3    | Same helper for the dev-server app              |
| `examples/widget-showcase/assets/animations/water-cycle.svg` | 4    | Self-contained SMIL-animated SVG asset          |
| `examples/widget-showcase/nodes/svg-animation.json`          | 4    | SVG-backend animation demo node                 |
| `examples/widget-showcase/nodes/canvas-sorting.json`         | 5    | Canvas-backend bubble-sort demo node            |

### Modified Files (13)

| File                                                                      | Task | Change                                               |
| ------------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| `packages/runtime/src/styles/animations.css.ts`                           | 1    | Add finite celebration keyframes + classes           |
| `packages/runtime/src/components/CssAnimationRenderer.tsx`                | 1    | Celebration map + `onComplete` via `animationend`    |
| `packages/runtime/src/components/OasAnimationWrapper.tsx`                 | 1    | Pass `onComplete` into CSS backend + lottie fallback |
| `packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx` | 1    | Celebration + completion tests                       |
| `packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx`  | 1    | Lottie-error fallback calls `onComplete`             |
| `apps/learner/src/CourseRuntime.tsx`                                      | 2    | Single bridge + `<RewardEventBridge>` mount          |
| `apps/learner/package.json`                                               | 2    | Add `rxjs` dependency                                |
| `apps/dev-server/src/DevApp.tsx`                                          | 3    | Bridge + `<RewardEventBridge>` mount                 |
| `apps/dev-server/package.json`                                            | 3    | Add `rxjs` dependency                                |
| `apps/dev-server/src/DevApp.test.tsx`                                     | 3    | Capture `onReceipt` wiring test                      |
| `examples/widget-showcase/workflow.json`                                  | 4,5  | Route the two new demo nodes to `outro.md`           |
| `examples/widget-showcase/validate.test.ts`                               | 4,5  | Update counts + add animation-demo assertions        |
| `apps/learner/src/__tests__/build-output.test.ts`                         | 4    | Assert the SVG asset is emitted                      |

> **Note:** No Tailwind utility classes change, so `apps/dev-server/src/tailwind.css` does **not** need regeneration. Apps resolve `@open-edu/runtime` to its built `dist` (only `@open-edu/telemetry` and `@open-edu/rewards` are aliased to source in `apps/learner/vite.config.ts`), so run `pnpm --filter @open-edu/runtime build` before running app-level tests after Task 1.

---

## Task 1: Celebration CSS effects + completion signaling for the reward fallback

Reward configs in `packages/runtime/src/components/RewardAnimation.tsx` reference 4 lottie assets that do not exist. When `DotLottiePlayer` fires `onError`, `OasAnimationWrapper.tsx` falls back to `CssAnimationRenderer` filtered by `effectToClass`, but (a) the reward effects (`badge`, `confetti`, `sparkle`, `celebrate`) are not in that map, and (b) even after mapping them, `CssAnimationRenderer` never reports completion — so `RewardEventBridge` never advances/`onComplete` and the overlay sticks forever. XP rewards use `sparkle`; an `infinite` sparkle animation would never end even with `animationend`. This task makes the fallback animate **and** dismiss.

**Files:**

- Modify: `packages/runtime/src/styles/animations.css.ts`
- Modify: `packages/runtime/src/components/CssAnimationRenderer.tsx`
- Modify: `packages/runtime/src/components/OasAnimationWrapper.tsx`
- Test: `packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx`
- Test: `packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx`:

```tsx
import { effectToClass } from '../CssAnimationRenderer.js';

describe('CssAnimationRenderer celebration effects', () => {
  const celebrationEffects = ['badge', 'confetti', 'sparkle', 'celebrate'];

  it('exposes celebration effects in effectToClass', () => {
    for (const effect of celebrationEffects) {
      expect(effectToClass[effect]).toBe(`oas-animate-${effect}`);
    }
  });

  it('applies celebration animation classes', () => {
    for (const effect of celebrationEffects) {
      render(
        <CssAnimationRenderer effects={[{ target: 'reward', effect }]} reducedMotion={false}>
          <p>Reward</p>
        </CssAnimationRenderer>,
        { wrapper },
      );
      expect(screen.getByTestId('css-animation-renderer')).toHaveClass(`oas-animate-${effect}`);
    }
  });

  it('calls onComplete after animationend', () => {
    const onComplete = vi.fn();
    render(
      <CssAnimationRenderer
        effects={[{ target: 'reward', effect: 'badge' }]}
        reducedMotion={false}
        onComplete={onComplete}
      >
        <p>Reward</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const el = screen.getByTestId('css-animation-renderer');
    el.dispatchEvent(new Event('animationend'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete immediately when reducedMotion is true', () => {
    const onComplete = vi.fn();
    render(
      <CssAnimationRenderer
        effects={[{ target: 'reward', effect: 'badge' }]}
        reducedMotion
        onComplete={onComplete}
      >
        <p>Reward</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
```

Ensure `vi` is imported from `vitest` at the top of that file if it is not already.

Append to `packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx` (same providers/mocks as existing lottie-error tests):

```tsx
it('calls onComplete when lottie errors and CSS fallback finishes', () => {
  const onComplete = vi.fn();
  render(
    <OasAnimationWrapper
      config={{
        backend: 'lottie',
        src: 'assets/rewards/missing.lottie',
        effects: [{ target: 'badge', effect: 'badge' }],
      }}
      onComplete={onComplete}
    />,
    { wrapper },
  );

  // Existing DotLottie mock / error path: trigger the player error the same way
  // other OasAnimationWrapper tests do (onError callback or error event).
  act(() => {
    screen.getByTestId('mocked-dotlottie-error')?.click?.();
  });
  // If the suite's DotLottie mock exposes onError differently, call that path,
  // then fire animationend on the CSS fallback root:
  const cssRoot = screen.getByTestId('css-animation-renderer');
  cssRoot.dispatchEvent(new Event('animationend'));
  expect(onComplete).toHaveBeenCalled();
});
```

Adapt the error-trigger lines to match the existing `@dotlottie/react-player` mock in that file (it already has a lottie-error → CSS fallback test around the `falls back to CssAnimationRenderer when the lottie player errors with effects` case — reuse that trigger, then assert `onComplete`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/runtime test CssAnimationRenderer`
Expected: FAIL — `effectToClass[effect]` is `undefined` for celebration effects; `onComplete` prop is not accepted / not called.

Run: `pnpm --filter @open-edu/runtime test OasAnimationWrapper`
Expected: FAIL — CSS fallback path does not invoke `onComplete`.

- [ ] **Step 3: Add finite celebration keyframes and classes**

In `packages/runtime/src/styles/animations.css.ts`, add these keyframes after the `oas-glow` block (after line 50) and before the `/* Utility classes ... */` comment:

```css
@keyframes oas-badge {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-8deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.1) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

@keyframes oas-confetti {
  0%,
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
  25% {
    opacity: 0.85;
    transform: translateY(-6px) rotate(45deg);
  }
  75% {
    opacity: 0.95;
    transform: translateY(-2px) rotate(-45deg);
  }
}

@keyframes oas-sparkle {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes oas-celebrate {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.08) rotate(-2deg);
  }
  75% {
    transform: scale(1.08) rotate(2deg);
  }
}
```

Add the utility classes after `.oas-animate-glow` (after line 71). **All celebration classes must be finite** (no `infinite`) so `animationend` can fire and dismiss the reward overlay:

```css
.oas-animate-badge {
  animation: oas-badge var(--oe-motion-duration-slow, 300ms) ease-out both;
}

.oas-animate-confetti {
  animation: oas-confetti 600ms ease-in-out 3;
}

.oas-animate-sparkle {
  animation: oas-sparkle var(--oe-motion-duration-normal, 200ms) ease-in-out 3;
}

.oas-animate-celebrate {
  animation: oas-celebrate var(--oe-motion-duration-slow, 300ms) ease-in-out 2;
}
```

Add the four new classes to the `prefers-reduced-motion` selector list (lines 75-79):

```css
@media (prefers-reduced-motion: reduce) {
  .oas-animate-fade,
  .oas-animate-slide,
  .oas-animate-highlight,
  .oas-animate-pulse,
  .oas-animate-glow,
  .oas-animate-badge,
  .oas-animate-confetti,
  .oas-animate-sparkle,
  .oas-animate-celebrate {
    animation: none;
    opacity: 1;
    transform: none;
    background-color: transparent;
    box-shadow: none;
  }
}
```

- [ ] **Step 4: Extend `effectToClass` / `effectToDuration` and add `onComplete`**

In `packages/runtime/src/components/CssAnimationRenderer.tsx`, update the maps and props:

```ts
export interface CssAnimationRendererProps {
  effects: AnimationEffectConfig[];
  children: ReactNode;
  reducedMotion: boolean;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export const effectToClass: Record<string, string> = {
  fade: 'oas-animate-fade',
  slide: 'oas-animate-slide',
  highlight: 'oas-animate-highlight',
  pulse: 'oas-animate-pulse',
  glow: 'oas-animate-glow',
  badge: 'oas-animate-badge',
  confetti: 'oas-animate-confetti',
  sparkle: 'oas-animate-sparkle',
  celebrate: 'oas-animate-celebrate',
};

const effectToDuration: Record<string, string> = {
  fade: oasDurationVar('normal'),
  slide: oasDurationVar('normal'),
  highlight: oasDurationVar('slow'),
  pulse: oasDurationVar('fast'),
  glow: oasDurationVar('slow'),
  badge: oasDurationVar('slow'),
  confetti: '1800ms', // 600ms × 3 iterations
  sparkle: '600ms', // 200ms × 3 iterations
  celebrate: '600ms', // 300ms × 2 iterations
};
```

Wire completion inside `CssAnimationRenderer` (use a ref so `onComplete` fires once):

```ts
export function CssAnimationRenderer({
  effects,
  children,
  reducedMotion,
  speed = 1,
  className,
  onComplete,
}: CssAnimationRendererProps): JSX.Element {
  useEffect(() => {
    ensureAnimationsCss();
  }, []);

  const completedRef = useRef(false);
  const notifyComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  };

  useEffect(() => {
    completedRef.current = false;
    if (!onComplete) return;
    if (reducedMotion || !effects.some((e) => effectToClass[e.effect])) {
      notifyComplete();
    }
  }, [effects, reducedMotion, onComplete]);

  // ... existing animationStyles / primaryEffect / animationClass logic ...

  return (
    <div
      className={`${animationClass} ${className ?? ''}`.trim()}
      style={animationStyles}
      data-testid="css-animation-renderer"
      onAnimationEnd={onComplete ? () => notifyComplete() : undefined}
    >
      {children}
    </div>
  );
}
```

Import `useRef` from React. Keep the existing `animationStyles` `useMemo` unchanged aside from the extended `effectToDuration` map.

- [ ] **Step 5: Pass `onComplete` from `OasAnimationWrapper` into CSS paths**

In `packages/runtime/src/components/OasAnimationWrapper.tsx`, the controller already calls `onComplete` when status is `completed`. For CSS backend and lottie-error fallback, also drive completion from the renderer so missing lottie files still dismiss the overlay:

CSS backend block — pass:

```tsx
        <CssAnimationRenderer
          effects={resolvedConfig.effects ?? []}
          reducedMotion={reducedMotion}
          speed={resolvedConfig.speed}
          onComplete={() => {
            if (!reducedMotion) onComplete?.();
          }}
        >
```

Lottie error fallback block — same `onComplete` prop:

```tsx
            <CssAnimationRenderer
              effects={resolvedConfig.effects.filter((e) => effectToClass[e.effect])}
              reducedMotion={reducedMotion}
              onComplete={() => {
                if (!reducedMotion) onComplete?.();
              }}
            >
```

When `reducedMotion` is already true, `useOasAnimation` sets status to `completed` and fires `onComplete` — skip the double-call with the `if (!reducedMotion)` guard (or use a once-ref in the wrapper if you prefer one path).

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/runtime test CssAnimationRenderer OasAnimationWrapper`
Expected: PASS (previous unknown-effect `flow` test still uses an unlisted effect; celebration effects are mapped; completion fires).

- [ ] **Step 7: Commit**

```bash
git add packages/runtime/src/styles/animations.css.ts \
  packages/runtime/src/components/CssAnimationRenderer.tsx \
  packages/runtime/src/components/OasAnimationWrapper.tsx \
  packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx \
  packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx
git commit -m "feat(runtime): celebrate CSS fallback with completion for rewards"
```

---

## Task 2: Wire RewardEventBridge into the learner app

`apps/learner/src/CourseRuntime.tsx` already creates a `RewardBroker` per package (`onReceipt` at lines 104-122) and per bundle (lines 232-251), but receipts only feed badge state, not the animation overlay. `RewardBroker` exposes receipts only through its `onReceipt` callback, while `RewardEventBridge` needs an `Observable<RewardReceipt>`. Bridge the two with one shared RxJS `Subject` helper (not two always-mounted bridges).

**Files:**

- Create: `apps/learner/src/createRewardReceiptBridge.ts`
- Modify: `apps/learner/src/CourseRuntime.tsx`
- Modify: `apps/learner/package.json`
- Test: `apps/learner/src/__tests__/RewardBridge.test.tsx`

- [ ] **Step 1: Add `rxjs` to learner dependencies**

In `apps/learner/package.json` `dependencies`, add:

```json
    "rxjs": "^7.8.0",
```

Then run `pnpm install` at the repo root.

- [ ] **Step 2: Write the failing wiring tests**

Create `apps/learner/src/__tests__/RewardBridge.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { RewardEventBridge } from '@open-edu/runtime';
import type { RewardReceipt } from '@open-edu/rewards';
import { createRewardReceiptBridge } from '../createRewardReceiptBridge.js';

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: ({ onEvent }: { onEvent: (name: string) => void }) => (
    <div data-testid="mocked-dotlottie">
      <button data-testid="emit-complete" onClick={() => onEvent('complete')}>
        complete
      </button>
    </div>
  ),
  PlayerEvents: {
    Complete: 'complete',
    Pause: 'pause',
    Ready: 'ready',
    Play: 'play',
    DataReady: 'data_ready',
    Error: 'error',
    Stop: 'stop',
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

function deliveredReceipt(overrides: Partial<RewardReceipt>): RewardReceipt {
  return {
    actionId: 'reward-test',
    actionType: 'badge.award',
    actionKey: 'First Steps',
    dispatchedAt: Date.now(),
    status: 'delivered',
    ...overrides,
  };
}

describe('createRewardReceiptBridge', () => {
  it('forwards onReceipt into RewardEventBridge', async () => {
    const bridge = createRewardReceiptBridge();
    render(<RewardEventBridge receipts$={bridge.receipts$} />, { wrapper });

    expect(screen.queryByTestId('reward-animation')).not.toBeInTheDocument();

    act(() => {
      bridge.onReceipt(deliveredReceipt({}));
    });

    expect(await screen.findByTestId('reward-animation')).toBeInTheDocument();
    expect(screen.getByLabelText('Badge unlocked: First Steps')).toBeInTheDocument();
  });

  it('shows XP gain overlay with the amount', async () => {
    const bridge = createRewardReceiptBridge();
    render(<RewardEventBridge receipts$={bridge.receipts$} />, { wrapper });

    act(() => {
      bridge.onReceipt(deliveredReceipt({ actionType: 'xp.award', detail: '50' }));
    });

    expect(await screen.findByTestId('reward-animation')).toBeInTheDocument();
    expect(screen.getByLabelText('Gained 50 XP')).toBeInTheDocument();
  });

  it('does not show an overlay for non-delivered receipts', () => {
    const bridge = createRewardReceiptBridge();
    render(<RewardEventBridge receipts$={bridge.receipts$} />, { wrapper });

    act(() => {
      bridge.onReceipt(deliveredReceipt({ status: 'skipped', detail: 'Condition not met' }));
    });

    expect(screen.queryByTestId('reward-animation')).not.toBeInTheDocument();
  });
});

describe('CourseRuntime reward wiring', () => {
  it('composes the receipt bridge and RewardEventBridge', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../CourseRuntime.tsx'), 'utf8');
    expect(src).toContain('createRewardReceiptBridge');
    expect(src).toContain('RewardEventBridge');
    expect(src).toMatch(/bridge\.onReceipt\(receipt\)|rewardBridge\.onReceipt\(receipt\)/);
  });
});
```

> These tests fail until the helper exists and `CourseRuntime.tsx` is wired. That is intentional — unlike a pure `RewardEventBridge` contract test (already covered in `@open-edu/runtime`), this guards the app composition.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/runtime build && pnpm --filter @open-edu/learner test RewardBridge`
Expected: FAIL — `createRewardReceiptBridge` module missing / `CourseRuntime` does not yet contain the wiring strings.

- [ ] **Step 4: Implement the bridge helper**

Create `apps/learner/src/createRewardReceiptBridge.ts`:

```ts
import { Subject, type Observable } from 'rxjs';
import type { RewardReceipt } from '@open-edu/rewards';

export interface RewardReceiptBridge {
  receipts$: Observable<RewardReceipt>;
  onReceipt: (receipt: RewardReceipt) => void;
}

export function createRewardReceiptBridge(): RewardReceiptBridge {
  const subject = new Subject<RewardReceipt>();
  return {
    receipts$: subject.asObservable(),
    onReceipt: (receipt) => subject.next(receipt),
  };
}
```

- [ ] **Step 5: Wire CourseRuntime (single bridge for package + bundle brokers)**

In `apps/learner/src/CourseRuntime.tsx`:

1. Update imports:

```tsx
import {
  RuntimeProvider,
  LayoutShell,
  CompletionScreen,
  useRuntime,
  RewardEventBridge,
} from '@open-edu/runtime';
import { createRewardReceiptBridge } from './createRewardReceiptBridge.js';
```

2. After the `cardBrokerRef` declaration (line 94), add one stable bridge:

```tsx
const rewardBridge = useMemo(() => createRewardReceiptBridge(), []);
```

3. In the single-package broker `onReceipt` (line 108), emit before badge handling:

```tsx
          onReceipt: (receipt: RewardReceipt) => {
            rewardBridge.onReceipt(receipt);
            if (receipt.status === 'delivered' && receipt.actionType === 'badge.award') {
```

4. In the bundle broker `onReceipt` (line 237), emit the same way:

```tsx
          onReceipt: (receipt: RewardReceipt) => {
            rewardBridge.onReceipt(receipt);
            if (receipt.status === 'delivered' && receipt.actionType === 'badge.award') {
```

5. Mount a single bridge as the first child inside `RuntimeProvider` (after line 399, before the `children &&` block):

```tsx
<RewardEventBridge receipts$={rewardBridge.receipts$} />
```

> One subject serves both brokers; only one broker is constructed per session, so there is no double-fire.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/learner test RewardBridge`
Expected: PASS (bridge behavior + CourseRuntime composition assertions).

- [ ] **Step 7: Commit**

```bash
git add apps/learner/package.json pnpm-lock.yaml \
  apps/learner/src/createRewardReceiptBridge.ts \
  apps/learner/src/CourseRuntime.tsx \
  apps/learner/src/__tests__/RewardBridge.test.tsx
git commit -m "feat(learner): wire reward receipts into RewardEventBridge overlay"
```

---

## Task 3: Wire RewardEventBridge into the dev-server

`apps/dev-server/src/DevApp.tsx` `SinglePackageDevApp` creates a `RewardBroker` (lines 296-306) with an `onReceipt` callback that only records receipts for the inspector. `BundleDevApp` does not create a `RewardBroker` at all, so only the single-package view needs the bridge.

**Files:**

- Create: `apps/dev-server/src/createRewardReceiptBridge.ts`
- Modify: `apps/dev-server/src/DevApp.tsx`
- Modify: `apps/dev-server/package.json`
- Test: `apps/dev-server/src/DevApp.test.tsx`

- [ ] **Step 1: Add `rxjs` to dev-server dependencies**

In `apps/dev-server/package.json` `dependencies`, add:

```json
    "rxjs": "^7.8.0",
```

Then run `pnpm install` at the repo root.

- [ ] **Step 2: Write the failing wiring test**

Update the virtual package mock in `apps/dev-server/src/DevApp.test.tsx` so rewards are non-null (broker is only created when `pkg.rewards` exists), and capture `onReceipt`:

Near the top of the file, replace `rewards: null` in `mockPackageData` with a minimal rewards config:

```ts
  rewards: {
    triggers: [
      {
        onEvent: 'node_complete',
        rewards: [{ action: 'badge.award', badge: 'First Steps' }],
      },
    ],
  },
```

Add these imports / mock / describe block (keep existing DevApp tests intact). Capture `onReceipt` from a mocked `RewardBroker`:

```tsx
import { act } from '@testing-library/react';
import type { RewardReceipt } from '@open-edu/rewards';

let capturedOnReceipt: ((receipt: RewardReceipt) => void) | undefined;

vi.mock('@open-edu/rewards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@open-edu/rewards')>();
  return {
    ...actual,
    RewardBroker: class {
      constructor(opts: { onReceipt?: (receipt: RewardReceipt) => void }) {
        capturedOnReceipt = opts.onReceipt;
      }
      start() {}
      updateContext() {}
    },
  };
});

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: () => <div data-testid="mocked-dotlottie" />,
  PlayerEvents: {},
}));

describe('DevApp reward overlay wiring', () => {
  it('shows the reward overlay when the broker delivers a badge receipt', async () => {
    render(<DevApp />);
    expect(capturedOnReceipt).toBeTypeOf('function');

    act(() => {
      capturedOnReceipt!({
        actionId: 'reward-test',
        actionType: 'badge.award',
        actionKey: 'First Steps',
        dispatchedAt: Date.now(),
        status: 'delivered',
      });
    });

    expect(await screen.findByTestId('reward-animation')).toBeInTheDocument();
    expect(screen.getByLabelText('Badge unlocked: First Steps')).toBeInTheDocument();
  });
});
```

> Place the `vi.mock('@open-edu/rewards')` **before** the dynamic `await import('./DevApp')` if the current file structure requires it (hoist mocks above the import). If the existing `const { DevApp } = await import('./DevApp')` breaks with the new mock order, convert to a static `import { DevApp } from './DevApp'` after the mocks.

Also add a composition assertion for the helper (same pattern as learner), either in this file or a tiny sibling test:

```ts
import fs from 'fs';
import path from 'path';
import { createRewardReceiptBridge } from './createRewardReceiptBridge.js';

it('DevApp composes createRewardReceiptBridge and RewardEventBridge', () => {
  const src = fs.readFileSync(path.resolve(__dirname, './DevApp.tsx'), 'utf8');
  expect(src).toContain('createRewardReceiptBridge');
  expect(src).toContain('RewardEventBridge');
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/runtime build && pnpm --filter @open-edu/dev-server test`
Expected: FAIL — no overlay on captured receipt / missing helper wiring.

- [ ] **Step 4: Implement the bridge helper**

Create `apps/dev-server/src/createRewardReceiptBridge.ts` with the **same contents** as the learner helper (apps must not import each other's source; duplicate the 15-line module):

```ts
import { Subject, type Observable } from 'rxjs';
import type { RewardReceipt } from '@open-edu/rewards';

export interface RewardReceiptBridge {
  receipts$: Observable<RewardReceipt>;
  onReceipt: (receipt: RewardReceipt) => void;
}

export function createRewardReceiptBridge(): RewardReceiptBridge {
  const subject = new Subject<RewardReceipt>();
  return {
    receipts$: subject.asObservable(),
    onReceipt: (receipt) => subject.next(receipt),
  };
}
```

- [ ] **Step 5: Wire SinglePackageDevApp**

In `apps/dev-server/src/DevApp.tsx`:

1. Update imports:

```tsx
import {
  RuntimeProvider,
  LayoutShell,
  RuntimeThemeProvider,
  BundleOverview,
  RewardEventBridge,
} from '@open-edu/runtime';
import { createRewardReceiptBridge } from './createRewardReceiptBridge.js';
```

2. In `SinglePackageDevApp`, after the `brokerRef` declaration (line 266):

```tsx
const rewardBridge = useMemo(() => createRewardReceiptBridge(), []);
```

3. In the broker `onReceipt` (line 300), emit before recording the inspector receipt:

```tsx
          onReceipt: (receipt) => {
            rewardBridge.onReceipt(receipt);
            setRewardReceipts((prev) => [...prev, receipt]);
          },
```

4. Mount the bridge as the first child inside `RuntimeProvider` (after line 408):

```tsx
<RewardEventBridge receipts$={rewardBridge.receipts$} />
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/dev-server test`
Expected: PASS (existing DevApp tests plus the new reward wiring test).

- [ ] **Step 7: Commit**

```bash
git add apps/dev-server/package.json pnpm-lock.yaml \
  apps/dev-server/src/createRewardReceiptBridge.ts \
  apps/dev-server/src/DevApp.tsx \
  apps/dev-server/src/DevApp.test.tsx
git commit -m "feat(dev-server): wire reward receipts into RewardEventBridge overlay"
```

---

## Task 4: Add an SVG animation demo to widget-showcase

The `svg` backend in `OasAnimationWrapper` renders the configured `src` as an `<img>`. **CSS `@keyframes` inside an SVG do not run when that SVG is loaded via `<img>`** in Chromium/Safari/Firefox. Use **SMIL** (`<animate>` / `<animateTransform>`) so the animation plays in the image context. `WidgetRenderer.tsx:130-137` wraps any node with a `config.animation` in `OasAnimationWrapper`, passing `resolveSrc={resolveAsset}`; for catalog courses `resolveAsset` falls back to `/assets/<path>`, which is served by the dev/preview middleware and emitted to static builds by the PR #544 `generateBundle` hook. So a new file under `examples/widget-showcase/assets/` ships automatically.

**Files:**

- Create: `examples/widget-showcase/assets/animations/water-cycle.svg`
- Create: `examples/widget-showcase/nodes/svg-animation.json`
- Modify: `examples/widget-showcase/workflow.json`
- Modify: `examples/widget-showcase/validate.test.ts`
- Modify: `apps/learner/src/__tests__/build-output.test.ts`

- [ ] **Step 1: Write the failing test (counts for SVG only — 30 nodes)**

In `examples/widget-showcase/validate.test.ts`, update counts for the **SVG node only** in this task (Canvas lands in Task 5). Replace the first test's node count:

```ts
expect(pkg.nodes.length).toBe(30);
```

Replace the exercise-count test:

```ts
const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');
expect(exerciseNodes).toHaveLength(28);
```

Replace the widget-uniqueness test so the new process-explainer demo is excluded from the 1:1 mapping (Canvas path is listed now so Task 5 does not need to rewrite this filter — but Canvas is not created yet, so filtering a missing path is a no-op):

```ts
it('should reference all 27 widget IDs in exercise nodes', async () => {
  const pkg = await loadPackage(resolve(__dirname));
  const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');

  // Animation demo nodes reuse core.process-explainer (animated-water-cycle already does),
  // so exclude them from the one-node-per-widget assertion; the remaining 27 nodes keep
  // a 1:1 mapping with the 27 widget IDs.
  const demoNodes = new Set(['nodes/svg-animation.json', 'nodes/canvas-sorting.json']);
  const usedWidgetIds = exerciseNodes
    .filter((n) => !demoNodes.has(n.relativePath))
    .map((n) => (n.node as any).widget)
    .sort();
  const expectedIds = [...WIDGET_IDS].sort();
  expect(usedWidgetIds).toEqual(expectedIds);
});
```

Add a new test for the SVG demo node:

```ts
it('should have a valid SVG animation demo node', async () => {
  const pkg = await loadPackage(resolve(__dirname));
  const node = pkg.nodes.find((n) => n.relativePath === 'nodes/svg-animation.json');
  expect(node).toBeDefined();
  const cfg = (node!.node as any).config as { animation?: { backend?: string; src?: string } };
  expect(cfg.animation?.backend).toBe('svg');
  expect(cfg.animation?.src).toBe('assets/animations/water-cycle.svg');
  expect(fs.existsSync(resolve(__dirname, 'assets/animations/water-cycle.svg'))).toBe(true);
});
```

Add the missing `fs` import at the top of the test file:

```ts
import fs from 'fs';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/example-widget-showcase test`
Expected: FAIL — node count is still 29, `nodes/svg-animation.json` is not found, and `water-cycle.svg` does not exist.

- [ ] **Step 3: Create the SMIL-animated SVG asset**

Create `examples/widget-showcase/assets/animations/water-cycle.svg`. Use SMIL only (no CSS `@keyframes`) so animation runs under `<img>`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="Animated water cycle">
  <!-- Sky / ground (literal fills are fine in content SVG assets) -->
  <rect width="400" height="300" fill="#eaf6ff" />
  <rect y="230" width="400" height="70" fill="#bfe3c0" />

  <!-- Sun with SMIL pulse -->
  <g>
    <circle cx="70" cy="60" r="26" fill="#ffd54f">
      <animateTransform attributeName="transform" type="scale" values="1;1.15;1" dur="3s" repeatCount="indefinite" additive="sum" />
    </circle>
    <circle cx="70" cy="60" r="18" fill="#ffc107" />
  </g>

  <!-- Evaporation arrows -->
  <g stroke="#1e88e5" stroke-width="3" fill="none">
    <path d="M150 205 q10 -12 0 -24">
      <animate attributeName="opacity" values="0.35;1;0.35" dur="3s" repeatCount="indefinite" />
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -10;0 0" dur="3s" repeatCount="indefinite" />
    </path>
    <path d="M175 205 q10 -12 0 -24">
      <animate attributeName="opacity" values="0.35;1;0.35" dur="3s" begin="0.6s" repeatCount="indefinite" />
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -10;0 0" dur="3s" begin="0.6s" repeatCount="indefinite" />
    </path>
    <path d="M200 205 q10 -12 0 -24">
      <animate attributeName="opacity" values="0.35;1;0.35" dur="3s" begin="1.2s" repeatCount="indefinite" />
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -10;0 0" dur="3s" begin="1.2s" repeatCount="indefinite" />
    </path>
  </g>

  <!-- Lake -->
  <path d="M100 215 q100 -20 200 0 l0 25 l-200 0 Z" fill="#42a5f5" />

  <!-- Cloud drift -->
  <g>
    <animateTransform attributeName="transform" type="translate" values="-10 0;10 0;-10 0" dur="8s" repeatCount="indefinite" />
    <ellipse cx="220" cy="95" rx="55" ry="28" fill="#ffffff" />
    <ellipse cx="190" cy="108" rx="30" ry="20" fill="#eceff1" />
    <ellipse cx="252" cy="108" rx="30" ry="20" fill="#eceff1" />
  </g>

  <!-- Rain drops -->
  <g fill="#42a5f5">
    <path d="M200 130 l4 10 l-8 0 Z">
      <animateTransform attributeName="transform" type="translate" values="0 0;0 60" dur="2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
    </path>
    <path d="M225 135 l4 10 l-8 0 Z">
      <animateTransform attributeName="transform" type="translate" values="0 0;0 60" dur="2s" begin="0.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
    </path>
    <path d="M250 130 l4 10 l-8 0 Z">
      <animateTransform attributeName="transform" type="translate" values="0 0;0 60" dur="2s" begin="1s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;0" dur="2s" begin="1s" repeatCount="indefinite" />
    </path>
  </g>
</svg>
```

> Note: SMIL in `<img>` does not honor `prefers-reduced-motion`. The node sets `reducedMotion: "static-pose"` for the OAS wrapper chrome; true reduced-motion SVG would require an inline/`<object>` backend change deferred to a follow-up.

- [ ] **Step 4: Create the SVG demo node**

Create `examples/widget-showcase/nodes/svg-animation.json`. Do **not** invent unused step `effects` for the SVG backend (the `<img>` path ignores them); keep a minimal animation config:

```json
{
  "type": "exercise",
  "title": "Animated SVG Water Cycle",
  "widget": "core.process-explainer",
  "config": {
    "title": "The Water Cycle (SVG Animation)",
    "stepByStep": true,
    "interactive": true,
    "steps": [
      {
        "id": "evaporation",
        "title": "Evaporation",
        "description": "Sun heats water, turning it into vapor",
        "icon": "☀️"
      },
      {
        "id": "condensation",
        "title": "Condensation",
        "description": "Water vapor cools and forms clouds",
        "icon": "☁️"
      },
      {
        "id": "precipitation",
        "title": "Precipitation",
        "description": "Water falls as rain, snow, or hail",
        "icon": "🌧️"
      },
      {
        "id": "collection",
        "title": "Collection",
        "description": "Water gathers in oceans, lakes, and rivers",
        "icon": "🌊"
      }
    ],
    "animation": {
      "backend": "svg",
      "src": "assets/animations/water-cycle.svg",
      "trigger": "load",
      "reducedMotion": "static-pose"
    }
  }
}
```

- [ ] **Step 5: Route the node in the workflow**

In `examples/widget-showcase/workflow.json`, change the `animated-water-cycle.json` route so the SVG demo precedes `outro.md` (`loadPackage` throws `WorkflowRouteError` on dangling targets, so every route must resolve to an existing node — do **not** reference `canvas-sorting.json` yet):

```json
    "nodes/animated-water-cycle.json": {
      "onComplete": "nodes/svg-animation.json"
    },
    "nodes/svg-animation.json": {
      "onComplete": "nodes/outro.md"
    },
    "nodes/outro.md": {
      "onComplete": "COMPLETED"
    },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @open-edu/example-widget-showcase test`
Expected: PASS — **30** nodes / **28** exercises; SVG assertions green; Canvas node not present yet.

- [ ] **Step 7: Assert the SVG ships in static builds**

In `apps/learner/src/__tests__/build-output.test.ts`, add the SVG to the expected emitted files list (line 35):

```ts
      'assets/animations/water-cycle.lottie',
      'assets/animations/water-cycle.svg',
```

- [ ] **Step 8: Commit**

```bash
git add examples/widget-showcase/assets/animations/water-cycle.svg \
  examples/widget-showcase/nodes/svg-animation.json \
  examples/widget-showcase/workflow.json \
  examples/widget-showcase/validate.test.ts \
  apps/learner/src/__tests__/build-output.test.ts
git commit -m "feat(examples): add SVG animation demo to widget-showcase"
```

---

## Task 5: Add a Canvas animation demo to widget-showcase

The `canvas` backend renders `CanvasAnimationRenderer`, which derives the sort algorithm from `config.effects[0].effect` (`flow` → bubble, `connect` → selection, else insertion) and the bar values from each effect's `step` (`CanvasAnimationRenderer.tsx:92-105`). No asset file is needed. `AnimationEffectConfigSchema` requires `target` + `effect` on every effect (`compare` is a valid `AnimationEffectEnum`), and `AnimationConfigSchema` applies defaults for `backend`/`trigger`/`reducedMotion`.

**Files:**

- Create: `examples/widget-showcase/nodes/canvas-sorting.json`
- Modify: `examples/widget-showcase/workflow.json` (reroute svg → canvas → outro)
- Modify: `examples/widget-showcase/validate.test.ts`

- [ ] **Step 1: Write the failing test (bump counts to 31 / 29)**

In `examples/widget-showcase/validate.test.ts`, bump the counts from Task 4 and add the Canvas assertions:

```ts
expect(pkg.nodes.length).toBe(31);
```

```ts
const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');
expect(exerciseNodes).toHaveLength(29);
```

```ts
it('should have a valid Canvas animation demo node', async () => {
  const pkg = await loadPackage(resolve(__dirname));
  const node = pkg.nodes.find((n) => n.relativePath === 'nodes/canvas-sorting.json');
  expect(node).toBeDefined();
  const cfg = (node!.node as any).config as {
    animation?: { backend?: string; effects?: Array<{ step?: number; effect?: string }> };
  };
  expect(cfg.animation?.backend).toBe('canvas');
  expect(cfg.animation?.effects?.[0]?.effect).toBe('flow');
  const values = cfg.animation?.effects?.map((e) => e.step).filter((s) => s !== undefined);
  expect(values).toEqual([30, 50, 20, 80, 40, 60]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/example-widget-showcase test`
Expected: FAIL — counts still 30/28; `nodes/canvas-sorting.json` is not found.

- [ ] **Step 3: Create the Canvas demo node**

Create `examples/widget-showcase/nodes/canvas-sorting.json`:

```json
{
  "type": "exercise",
  "title": "Bubble Sort Visualization",
  "widget": "core.process-explainer",
  "config": {
    "title": "Bubble Sort (Canvas Animation)",
    "stepByStep": true,
    "interactive": true,
    "steps": [
      {
        "id": "compare",
        "title": "Compare",
        "description": "Adjacent bars are compared; the active pair is highlighted",
        "icon": "🔍"
      },
      {
        "id": "swap",
        "title": "Swap",
        "description": "Out-of-order bars swap so larger values bubble right",
        "icon": "🔁"
      },
      {
        "id": "pass",
        "title": "Pass",
        "description": "Repeat passes until a full pass makes no swaps",
        "icon": "↻"
      },
      {
        "id": "sorted",
        "title": "Sorted",
        "description": "The array is fully sorted after the final pass",
        "icon": "✅"
      }
    ],
    "animation": {
      "backend": "canvas",
      "trigger": "load",
      "reducedMotion": "instant",
      "effects": [
        { "step": 30, "target": "bar-0", "effect": "flow" },
        { "step": 50, "target": "bar-1", "effect": "compare" },
        { "step": 20, "target": "bar-2", "effect": "compare" },
        { "step": 80, "target": "bar-3", "effect": "compare" },
        { "step": 40, "target": "bar-4", "effect": "compare" },
        { "step": 60, "target": "bar-5", "effect": "compare" }
      ]
    }
  }
}
```

- [ ] **Step 4: Reroute the workflow to thread the Canvas node between SVG and outro**

In `examples/widget-showcase/workflow.json`, replace the Task 4 SVG → outro route:

```json
    "nodes/svg-animation.json": {
      "onComplete": "nodes/outro.md"
    },
```

with:

```json
    "nodes/svg-animation.json": {
      "onComplete": "nodes/canvas-sorting.json"
    },
    "nodes/canvas-sorting.json": {
      "onComplete": "nodes/outro.md"
    },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @open-edu/example-widget-showcase test`
Expected: PASS — **31** nodes / **29** exercises; SVG + Canvas assertions; workflow reaches `COMPLETED` via `outro.md`.

- [ ] **Step 6: Commit**

```bash
git add examples/widget-showcase/nodes/canvas-sorting.json \
  examples/widget-showcase/workflow.json \
  examples/widget-showcase/validate.test.ts
git commit -m "feat(examples): add Canvas bubble-sort animation demo to widget-showcase"
```

---

## Task 6: Final verification and housekeeping

**Files:**

- No new files.

- [ ] **Step 1: Rebuild the runtime package**

Run: `pnpm --filter @open-edu/runtime build`
Expected: `packages/runtime/dist` contains the Task 1 celebration CSS, completion signaling, and `RewardEventBridge` exports.

- [ ] **Step 2: Run the targeted test suites**

```bash
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/widgets test
pnpm --filter @open-edu/example-widget-showcase test
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/dev-server test
```

Expected: PASS across all suites.

- [ ] **Step 3: Run the monorepo checks**

```bash
pnpm lint
pnpm typecheck
pnpm format:check
```

Expected: No errors. If `pnpm format:check` reports the new files, run `pnpm format` and create a **new** commit (do not amend unless hooks auto-modified files on a commit you just authored in this session).

- [ ] **Step 4: Verify the SVG ships in the learner static build**

```bash
pnpm --filter @open-edu/learner build:deploy
ls apps/learner/dist/assets/animations/
```

Expected: `water-cycle.svg` is present next to `water-cycle.lottie`. This is covered automatically by the `generateBundle` hook from PR #544.

- [ ] **Step 5: Manual smoke checks (browser)**

1. Start the dev-server against widget-showcase:
   `OPEN_EDU_PACKAGE_DIR=../../examples/widget-showcase pnpm --filter @open-edu/dev-server dev`
   - Navigate to the end of the course: the SVG demo shows the SMIL-animated water-cycle `<img>` (`data-testid="oas-svg-backend"`) with moving sun/cloud/rain, and the Canvas demo shows the sorting bars (`data-testid="canvas-animation-renderer"`) with Play/Pause/Step/Reset controls.
2. Rewards smoke (widget-showcase has **no** `rewards.json` — use a course that does):
   `OPEN_EDU_PACKAGE_DIR=../../examples/living-vs-nonliving pnpm --filter @open-edu/dev-server dev`
   - Complete a node / course path that awards a badge and confirm the overlay (`role="status"`, `data-testid="reward-animation"`) appears, animates via the CSS fallback, and **dismisses** after the finite celebration animation.
   - Also spot-check the learner app (`pnpm --filter @open-edu/learner dev`) with `living-vs-nonliving` (or `adaptive-study` / `level-b-math`) the same way.
   - Confirm `prefers-reduced-motion: reduce` shows a static pose and still clears the overlay.
3. Asset URL: with the learner app serving widget-showcase assets, verify `http://localhost:4001/assets/animations/water-cycle.svg` returns the SVG.

- [ ] **Step 6: Commit any remaining changes (only if needed)**

```bash
git status
```

If there are leftover formatting or lockfile fixes:

```bash
git add <explicit-paths>
git commit -m "chore: verify rewards wiring and showcase animation demos"
```

Do **not** use `git add -A`. If `git status` is clean, skip this commit.

---

## Spec Coverage Check

| Requirement                                                            | Task |
| ---------------------------------------------------------------------- | ---- |
| Reward receipt → overlay animation in learner app                      | 2    |
| Reward receipt → overlay animation in dev-server                       | 3    |
| Rewards render without the (nonexistent) lottie assets (CSS fallback)  | 1    |
| CSS fallback dismisses overlay (`onComplete` / finite animations)      | 1    |
| Reward animation accessible (`role="status"`, aria-live, i18n labels)  | 2,3  |
| widget-showcase demonstrates an SVG-backend animation (SMIL under img) | 4    |
| widget-showcase demonstrates a Canvas-backend animation                | 5    |
| Demo assets ship in static builds (ties into PR #544)                  | 4,6  |
| Wiring tests fail until app composition lands                          | 2,3  |
| All stories produce tests; lint/typecheck/format clean                 | 1-6  |

## Execution Notes for the Agent

- Work from the `fix/learner-catalog-assets-vercel` branch or a fresh `feat/rewards-wiring` branch cut from `main` — do not stack onto PR #544 unless intended. Prefer two PRs (Tasks 1–3 vs 4–5) when practical.
- Task 1 changes only affect apps after `pnpm --filter @open-edu/runtime build` (apps resolve `@open-edu/runtime` from its `dist`).
- The `RewardAnimation` lottie configs must stay as-is (hybrid decision); the CSS fallback is the reward visual until a follow-up plan authors `assets/rewards/*.lottie`.
- Celebration CSS must stay **finite** (`sparkle` included) so `animationend` can dismiss the overlay.
- SVG demo must use **SMIL**, not CSS-in-SVG — the runtime SVG backend is `<img>`.
- `examples/widget-showcase/validate.test.ts` counts: Task 4 → 30/28; Task 5 → 31/29 (27 unique widget IDs excluding the 2 new process-explainer demo nodes). Keep them in sync when adding future demo nodes.
- Rewards smoke uses `living-vs-nonliving` / `adaptive-study` / `level-b-math` — **not** widget-showcase.
- The `virtual:edu-data` catalog and PR #544 asset hook pick up new `examples/widget-showcase/assets/` files automatically — no vite config change needed for the SVG.
