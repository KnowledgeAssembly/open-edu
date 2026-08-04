# OpenEdu Animation Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all gaps between PR #540's OAS v0.1 implementation and the ANIMATION_SPEC.md + ANIMATION_TECHNOLOGY_GUIDE.md requirements.

**Architecture:** 5-phase approach — Schema fix + CSS engine → Accessibility + bug fixes → Rewards integration → Canvas engine (algorithm viz) → Housekeeping. All changes additive to existing PR code.

**Tech Stack:** TypeScript 5.x, React 18, Zod, Tailwind CSS, Vitest, @testing-library/react, axe-core, HTML Canvas, RxJS

---

## File Structure

### New Files (10)

| File                                                                         | Phase | Responsibility                                       |
| ---------------------------------------------------------------------------- | ----- | ---------------------------------------------------- |
| `packages/runtime/src/components/CssAnimationRenderer.tsx`                   | 1     | CSS transition-based animation renderer              |
| `packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx`    | 1     | Tests for CSS renderer                               |
| `packages/runtime/src/styles/animations.css`                                 | 1     | CSS keyframe definitions                             |
| `packages/runtime/src/components/CanvasAnimationRenderer.tsx`                | 4     | Canvas-based algorithm visualization                 |
| `packages/runtime/src/components/__tests__/CanvasAnimationRenderer.test.tsx` | 4     | Tests for canvas renderer                            |
| `packages/runtime/src/components/RewardAnimation.tsx`                        | 3     | Reward celebration animation component               |
| `packages/runtime/src/components/__tests__/RewardAnimation.test.tsx`         | 3     | Tests for reward animation                           |
| `packages/runtime/src/components/RewardEventBridge.tsx`                      | 3     | Bridges RewardBroker receipts to animation rendering |
| `packages/runtime/src/components/__tests__/RewardEventBridge.test.tsx`       | 3     | Tests for reward event bridge                        |
| `packages/runtime/src/components/__tests__/axe-audit.test.ts`                | 2     | Centralized axe-core accessibility audits            |

### Modified Files (8)

| File                                                      | Phase | Change                                      |
| --------------------------------------------------------- | ----- | ------------------------------------------- |
| `packages/schemas/src/animation.ts:4-5`                   | 1     | Default `lottie` → `svg`                    |
| `packages/schemas/src/animation.test.ts`                  | 1     | Update default test                         |
| `packages/runtime/src/components/OasAnimationWrapper.tsx` | 1,2,4 | Add CSS/Canvas branches, fix ref, add speed |
| `packages/runtime/src/components/useOasAnimation.ts`      | 2     | Add speed state + setSpeed control          |
| `packages/runtime/src/index.ts`                           | 1,3,4 | Export new components                       |
| `packages/runtime/package.json`                           | 3     | Add `@open-edu/rewards` dep                 |
| `packages/i18n/locales/en/runtime.json`                   | 2,3   | Add speed + reward i18n keys                |
| `packages/i18n/locales/en/widgets.json`                   | 5     | Add canvas sorting i18n keys                |

---

## Phase 1: Schema Fix + CSS Engine (P0)

### Task 1: Change schema default from `lottie` to `svg`

**Files:**

- Modify: `packages/schemas/src/animation.ts:3-5`
- Modify: `packages/schemas/src/animation.test.ts`

- [ ] **Step 1: Change the default in AnimationBackendEnum**

Edit `packages/schemas/src/animation.ts` line 5. Change:

```ts
export const AnimationBackendEnum = z
  .enum(['lottie', 'svg', 'css', 'canvas', 'webgpu'])
  .default('lottie');
```

To:

```ts
export const AnimationBackendEnum = z
  .enum(['lottie', 'svg', 'css', 'canvas', 'webgpu'])
  .default('svg');
```

- [ ] **Step 2: Update the default test**

In `packages/schemas/src/animation.test.ts`, find the test `'should apply defaults for backend, trigger, and reducedMotion'` and change:

```ts
expect(result.data.backend).toBe('lottie');
```

To:

```ts
expect(result.data.backend).toBe('svg');
```

- [ ] **Step 3: Run tests to verify**

```bash
pnpm --filter @open-edu/schemas test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/schemas/src/animation.ts packages/schemas/src/animation.test.ts
git commit -m "fix(schemas): change animation backend default from lottie to svg"
```

---

### Task 2: Create CSS keyframes file

**Files:**

- Create: `packages/runtime/src/styles/animations.css`

- [ ] **Step 1: Create the animations.css file**

Create `packages/runtime/src/styles/animations.css` with:

```css
@keyframes oas-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes oas-slide-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes oas-highlight {
  0%,
  100% {
    background-color: transparent;
  }
  50% {
    background-color: var(--oe-color-warning, #fef3c7);
  }
}

@keyframes oas-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes oas-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--oe-color-primary);
  }
  50% {
    box-shadow: 0 0 8px 2px var(--oe-color-primary);
  }
}

/* Utility classes for CSS animation backend */
.oas-animate-fade {
  animation: oas-fade-in var(--oe-motion-duration-normal, 200ms) ease-out both;
}

.oas-animate-slide {
  animation: oas-slide-in var(--oe-motion-duration-normal, 200ms) ease-out both;
}

.oas-animate-highlight {
  animation: oas-highlight var(--oe-motion-duration-slow, 300ms) ease-in-out both;
}

.oas-animate-pulse {
  animation: oas-pulse var(--oe-motion-duration-fast, 100ms) ease-in-out both;
}

.oas-animate-glow {
  animation: oas-glow var(--oe-motion-duration-slow, 300ms) ease-in-out both;
}

/* Reduced motion: instant reveal */
@media (prefers-reduced-motion: reduce) {
  .oas-animate-fade,
  .oas-animate-slide,
  .oas-animate-highlight,
  .oas-animate-pulse,
  .oas-animate-glow {
    animation: none;
    opacity: 1;
    transform: none;
    background-color: transparent;
    box-shadow: none;
  }
}
```

- [ ] **Step 2: Import the CSS file in the runtime**

Check if there's an existing CSS import in `packages/runtime/src/index.ts` or a main entry point. If not, add the import to `packages/runtime/src/index.ts` at the top:

```ts
import './styles/animations.css';
```

- [ ] **Step 3: Commit**

```bash
git add packages/runtime/src/styles/animations.css packages/runtime/src/index.ts
git commit -m "feat(runtime): add CSS animation keyframes and utility classes"
```

---

### Task 3: Create CssAnimationRenderer component

**Files:**

- Create: `packages/runtime/src/components/CssAnimationRenderer.tsx`
- Create: `packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx`

- [ ] **Step 1: Create the component**

Create `packages/runtime/src/components/CssAnimationRenderer.tsx`:

```tsx
import { useMemo, type ReactNode } from 'react';
import type { AnimationEffectConfig } from '@open-edu/schemas';
import { oasDurationVar } from '@open-edu/design-system';

export interface CssAnimationRendererProps {
  effects: AnimationEffectConfig[];
  children: ReactNode;
  reducedMotion: boolean;
  speed?: number;
  className?: string;
}

export const effectToClass: Record<string, string> = {
  fade: 'oas-animate-fade',
  slide: 'oas-animate-slide',
  highlight: 'oas-animate-highlight',
  pulse: 'oas-animate-pulse',
  glow: 'oas-animate-glow',
};

const effectToDuration: Record<string, string> = {
  fade: oasDurationVar('normal'),
  slide: oasDurationVar('normal'),
  highlight: oasDurationVar('slow'),
  pulse: oasDurationVar('fast'),
  glow: oasDurationVar('slow'),
};

export function CssAnimationRenderer({
  effects,
  children,
  reducedMotion,
  speed = 1,
  className,
}: CssAnimationRendererProps): JSX.Element {
  const animationStyles = useMemo(() => {
    if (reducedMotion || effects.length === 0) return undefined;

    const styles: Record<string, string> = {};
    effects.forEach((effect, index) => {
      const cssClass = effectToClass[effect.effect];
      if (!cssClass) return;

      const duration = effect.duration
        ? typeof effect.duration === 'number'
          ? `${effect.duration}ms`
          : oasDurationVar(effect.duration)
        : (effectToDuration[effect.effect] ?? oasDurationVar('normal'));

      const adjustedDuration =
        speed !== 1
          ? duration.replace(/(\d+)ms/, (_, ms) => `${Math.round(Number(ms) / speed)}ms`)
          : duration;

      const delay = effect.delay ? `${effect.delay}ms` : undefined;

      styles['--oas-animation-class'] = cssClass;
      if (adjustedDuration) styles['animation-duration'] = adjustedDuration;
      if (delay) styles['animation-delay'] = delay;
      if (effect.easing) styles['animation-timing-function'] = effect.easing;
    });

    return Object.keys(styles).length > 0 ? styles : undefined;
  }, [effects, reducedMotion, speed]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const primaryEffect = effects.find((e) => effectToClass[e.effect]);
  const animationClass = primaryEffect ? effectToClass[primaryEffect.effect] : '';

  return (
    <div
      className={`${animationClass} ${className ?? ''}`.trim()}
      style={animationStyles}
      data-testid="css-animation-renderer"
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create the tests**

Create `packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CssAnimationRenderer } from '../CssAnimationRenderer.js';

function wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

describe('CssAnimationRenderer', () => {
  it('renders children with fade animation class', () => {
    render(
      <CssAnimationRenderer effects={[{ target: 'test', effect: 'fade' }]} reducedMotion={false}>
        <p data-testid="content">Hello</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const container = screen.getByTestId('css-animation-renderer');
    expect(container).toHaveClass('oas-animate-fade');
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders children without animation when reducedMotion is true', () => {
    render(
      <CssAnimationRenderer effects={[{ target: 'test', effect: 'fade' }]} reducedMotion>
        <p data-testid="content">Hello</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const container = screen.getByTestId('css-animation-renderer');
    expect(container).not.toHaveClass('oas-animate-fade');
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('applies speed multiplier to duration', () => {
    render(
      <CssAnimationRenderer
        effects={[{ target: 'test', effect: 'pulse', duration: 200 }]}
        reducedMotion={false}
        speed={2}
      >
        <p>Content</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const container = screen.getByTestId('css-animation-renderer');
    expect(container).toHaveStyle({ animationDuration: '100ms' });
  });

  it('falls back to no animation for unknown effects', () => {
    render(
      <CssAnimationRenderer effects={[{ target: 'test', effect: 'flow' }]} reducedMotion={false}>
        <p>Content</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const container = screen.getByTestId('css-animation-renderer');
    expect(container).not.toHaveClass('oas-animate-fade');
    expect(container).not.toHaveClass('oas-animate-slide');
  });

  it('renders children with no effects', () => {
    render(
      <CssAnimationRenderer effects={[]} reducedMotion={false}>
        <p data-testid="content">No effects</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx
```

Expected: All 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/runtime/src/components/CssAnimationRenderer.tsx packages/runtime/src/components/__tests__/CssAnimationRenderer.test.tsx
git commit -m "feat(runtime): add CssAnimationRenderer for Tier 2 progressive enhancement"
```

---

### Task 4: Integrate CSS renderer into OasAnimationWrapper

**Files:**

- Modify: `packages/runtime/src/components/OasAnimationWrapper.tsx`

- [ ] **Step 1: Add CSS backend branch to OasAnimationWrapper**

Modify `packages/runtime/src/components/OasAnimationWrapper.tsx`. Add import at top:

```tsx
import { CssAnimationRenderer } from './CssAnimationRenderer';
```

Add the CSS backend branch after the `svg` branch (around line 199), before the `lottie` branch:

```tsx
if (resolvedConfig.backend === 'css') {
  return (
    <div className={className} data-testid="oas-css-backend">
      <CssAnimationRenderer
        effects={resolvedConfig.effects ?? []}
        reducedMotion={reducedMotion}
        speed={resolvedConfig.speed}
      >
        {staticChildren ?? (
          <div role="img" aria-label={ariaLabel ?? t('runtime.animation.static_fallback')}>
            {t('runtime.animation.static_fallback')}
          </div>
        )}
      </CssAnimationRenderer>
      {renderControls()}
      {renderPreservedChildren()}
    </div>
  );
}
```

- [ ] **Step 2: Add CSS fallback for dotLottie error**

In the `lottie` backend branch, when `hasError` is true, use `CssAnimationRenderer` with a fade effect instead of static fallback (if effects are defined):

```tsx
{hasError ? (
  resolvedConfig.effects && resolvedConfig.effects.length > 0 ? (
    <CssAnimationRenderer
      effects={resolvedConfig.effects.filter(e => effectToClass[e.effect])}
      reducedMotion={reducedMotion}
    >
      {renderStaticFallback()}
    </CssAnimationRenderer>
  ) : (
    renderStaticFallback()
  )
) : (
```

Add the import for `effectToClass` at the top:

```tsx
import { effectToClass } from './CssAnimationRenderer';
```

- [ ] **Step 3: Run tests to verify**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx
```

Expected: All existing tests pass + new CSS backend renders.

- [ ] **Step 4: Commit**

```bash
git add packages/runtime/src/components/OasAnimationWrapper.tsx packages/runtime/src/components/CssAnimationRenderer.tsx
git commit -m "feat(runtime): integrate CSS backend into OasAnimationWrapper"
```

---

### Task 5: Export CSS renderer from runtime index

**Files:**

- Modify: `packages/runtime/src/index.ts`

- [ ] **Step 1: Add exports**

Add to `packages/runtime/src/index.ts`:

```ts
export { CssAnimationRenderer } from './components/CssAnimationRenderer.js';
export type { CssAnimationRendererProps } from './components/CssAnimationRenderer.js';
```

- [ ] **Step 2: Commit**

```bash
git add packages/runtime/src/index.ts
git commit -m "feat(runtime): export CssAnimationRenderer"
```

---

## Phase 2: Accessibility + Bug Fixes (P1)

### Task 6: Fix controllerRef mutation during render

**Files:**

- Modify: `packages/runtime/src/components/OasAnimationWrapper.tsx`

- [ ] **Step 1: Move controllerRef assignment to useLayoutEffect**

In `packages/runtime/src/components/OasAnimationWrapper.tsx`, add `useLayoutEffect` to imports:

```tsx
import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
```

Replace the render-phase mutation (lines 88-90):

```tsx
if (controllerRef) {
  controllerRef.current = controller;
}
```

With:

```tsx
useLayoutEffect(() => {
  if (controllerRef) {
    controllerRef.current = controller;
  }
}, [controllerRef, controller]);
```

- [ ] **Step 2: Run tests to verify**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/runtime/src/components/OasAnimationWrapper.tsx
git commit -m "fix(runtime): move controllerRef mutation to useLayoutEffect"
```

---

### Task 7: Add speed control to OasAnimationWrapper

**Files:**

- Modify: `packages/runtime/src/components/useOasAnimation.ts`
- Modify: `packages/runtime/src/components/OasAnimationWrapper.tsx`
- Modify: `packages/i18n/locales/en/runtime.json`

- [ ] **Step 1: Add speed state to useOasAnimation**

Add to `packages/runtime/src/components/useOasAnimation.ts`:

In the `OasAnimationController` interface, add:

```ts
  speed: number;
  setSpeed: (speed: number) => void;
```

Add state and callback in the hook body (after `currentStep` state, around line 36):

```ts
const [speed, setSpeedState] = useState(config?.speed ?? 1);

const setSpeed = useCallback((s: number) => {
  if (s > 0 && s <= 4) {
    setSpeedState(s);
  }
}, []);
```

Add to the return object:

```ts
    speed,
    setSpeed,
```

- [ ] **Step 2: Add speed selector to control bar**

In `packages/runtime/src/components/OasAnimationWrapper.tsx`, add speed selector to `renderControls()`:

Add after the step forward button (inside the control bar div):

```tsx
<select
  value={controller.speed}
  onChange={(e) => controller.setSpeed(Number(e.target.value))}
  className="border-outline-variant px-xs py-xs rounded text-xs"
  aria-label={t('runtime.animation.speed')}
  data-testid="oas-control-speed"
>
  <option value={0.5}>0.5x</option>
  <option value={1}>1x</option>
  <option value={1.5}>1.5x</option>
  <option value={2}>2x</option>
</select>
```

- [ ] **Step 3: Add i18n key**

Add to `packages/i18n/locales/en/runtime.json`:

```json
  "animation.speed": "Animation speed",
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/useOasAnimation.test.tsx
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/components/useOasAnimation.ts packages/runtime/src/components/OasAnimationWrapper.tsx packages/i18n/locales/en/runtime.json
git commit -m "feat(runtime): add speed control to animation engine"
```

---

### Task 8: Add axe-core accessibility audits

**Files:**

- Create: `packages/runtime/src/components/__tests__/axe-audit.test.ts`
- Modify: `packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx`
- Modify: `packages/runtime/src/components/__tests__/DotLottiePlayer.test.tsx`
- Modify: `packages/widgets/src/builtins/ProcessExplainer/ProcessExplainer.test.tsx`

- [ ] **Step 1: Check if axe-core is already a dev dependency**

```bash
cat packages/runtime/package.json | grep axe
```

If not present, add it:

```bash
pnpm add -D axe-core @axe-core/react --filter @open-edu/runtime
```

- [ ] **Step 2: Create centralized axe-audit test**

Create `packages/runtime/src/components/__tests__/axe-audit.test.ts`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { OasAnimationWrapper } from '../OasAnimationWrapper.js';
import { DotLottiePlayer } from '../DotLottiePlayer.js';
import { CssAnimationRenderer } from '../CssAnimationRenderer.js';

vi.mock('@dotlottie/react-player', () => ({
  DotLottiePlayer: ({ onEvent }: { onEvent: (name: string) => void }) => (
    <div data-testid="mocked-dotlottie">
      <button onClick={() => onEvent('complete')}>complete</button>
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

describe('axe-core accessibility audits', () => {
  it('OasAnimationWrapper with lottie backend is accessible', async () => {
    const { container } = render(
      <OasAnimationWrapper config={{ backend: 'lottie', src: 'test.lottie' }} showControls />,
      { wrapper },
    );
    const results = (await (globalThis as any).axe?.run?.(container)) ?? { violations: [] };
    expect(results.violations).toHaveLength(0);
  });

  it('OasAnimationWrapper with CSS backend is accessible', async () => {
    const { container } = render(
      <OasAnimationWrapper
        config={{ backend: 'css', effects: [{ target: 'test', effect: 'fade' }] }}
        staticChildren={<p>Static content</p>}
      />,
      { wrapper },
    );
    const results = (await (globalThis as any).axe?.run?.(container)) ?? { violations: [] };
    expect(results.violations).toHaveLength(0);
  });

  it('OasAnimationWrapper with SVG backend is accessible', async () => {
    const { container } = render(
      <OasAnimationWrapper config={{ backend: 'svg', src: 'test.svg' }} />,
      { wrapper },
    );
    const results = (await (globalThis as any).axe?.run?.(container)) ?? { violations: [] };
    expect(results.violations).toHaveLength(0);
  });

  it('DotLottiePlayer fallback is accessible', async () => {
    const { container } = render(
      <DotLottiePlayer
        src="test.lottie"
        ariaLabel="Test animation"
        staticFallback={
          <div role="img" aria-label="Static fallback">
            Static
          </div>
        }
      />,
      { wrapper },
    );
    const results = (await (globalThis as any).axe?.run?.(container)) ?? { violations: [] };
    expect(results.violations).toHaveLength(0);
  });

  it('CssAnimationRenderer is accessible', async () => {
    const { container } = render(
      <CssAnimationRenderer effects={[{ target: 'test', effect: 'fade' }]} reducedMotion={false}>
        <p>Animated content</p>
      </CssAnimationRenderer>,
      { wrapper },
    );
    const results = (await (globalThis as any).axe?.run?.(container)) ?? { violations: [] };
    expect(results.violations).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Add axe test to ProcessExplainer**

Add to `packages/widgets/src/builtins/ProcessExplainer/ProcessExplainer.test.tsx` at the end:

```tsx
it('passes axe-core accessibility audit', async () => {
  const { container } = renderWidget(baseConfig);
  const results = (await (globalThis as any).axe?.run?.(container)) ?? { violations: [] };
  expect(results.violations).toHaveLength(0);
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/axe-audit.test.ts
```

Expected: All axe audits pass (0 violations).

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/components/__tests__/axe-audit.test.ts packages/widgets/src/builtins/ProcessExplainer/ProcessExplainer.test.tsx
git commit -m "test(runtime): add axe-core accessibility audits for animation components"
```

---

## Phase 3: Rewards Integration (P0)

### Task 9: Add rewards dependency to runtime

**Files:**

- Modify: `packages/runtime/package.json`

- [ ] **Step 1: Add dependency**

Add to `packages/runtime/package.json` dependencies:

```json
    "@open-edu/rewards": "workspace:*",
```

Run:

```bash
pnpm install
```

- [ ] **Step 2: Commit**

```bash
git add packages/runtime/package.json pnpm-lock.yaml
git commit -m "chore(runtime): add @open-edu/rewards dependency"
```

---

### Task 10: Create RewardAnimation component

**Files:**

- Create: `packages/runtime/src/components/RewardAnimation.tsx`
- Create: `packages/runtime/src/components/__tests__/RewardAnimation.test.tsx`

- [ ] **Step 1: Create the component**

Create `packages/runtime/src/components/RewardAnimation.tsx`:

```tsx
import { useMemo } from 'react';
import { OasAnimationWrapper } from './OasAnimationWrapper';
import type { AnimationConfigInput } from '@open-edu/schemas';

export type RewardAnimationType = 'badge-unlock' | 'confetti' | 'xp-gain' | 'milestone';

export interface RewardAnimationProps {
  type: RewardAnimationType;
  badgeName?: string;
  xpAmount?: number;
  onComplete?: () => void;
}

const rewardConfigs: Record<RewardAnimationType, AnimationConfigInput> = {
  'badge-unlock': {
    backend: 'lottie',
    src: 'assets/rewards/badge-unlock.lottie',
    trigger: 'lesson-complete',
    effects: [{ target: 'badge', effect: 'badge' }],
    reducedMotion: 'static-steps',
  },
  confetti: {
    backend: 'lottie',
    src: 'assets/rewards/confetti.lottie',
    trigger: 'lesson-complete',
    effects: [{ target: 'canvas', effect: 'confetti' }],
    reducedMotion: 'instant',
  },
  'xp-gain': {
    backend: 'lottie',
    src: 'assets/rewards/xp-gain.lottie',
    trigger: 'answer-correct',
    effects: [{ target: 'xp', effect: 'sparkle' }],
    reducedMotion: 'instant',
  },
  milestone: {
    backend: 'lottie',
    src: 'assets/rewards/milestone.lottie',
    trigger: 'lesson-complete',
    effects: [{ target: 'milestone', effect: 'celebrate' }],
    reducedMotion: 'static-pose',
  },
};

export function RewardAnimation({
  type,
  badgeName,
  xpAmount,
  onComplete,
}: RewardAnimationProps): JSX.Element {
  const config = useMemo(() => {
    const base = rewardConfigs[type];
    return {
      ...base,
      ariaLabel: badgeName
        ? `Badge unlocked: ${badgeName}`
        : xpAmount
          ? `Gained ${xpAmount} XP`
          : `${type} reward`,
    };
  }, [type, badgeName, xpAmount]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="reward-animation"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    >
      <OasAnimationWrapper config={config} onComplete={onComplete} ariaLabel={config.ariaLabel} />
    </div>
  );
}
```

- [ ] **Step 2: Create the tests**

Create `packages/runtime/src/components/__tests__/RewardAnimation.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { RewardAnimation } from '../RewardAnimation.js';

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

vi.mock('../OasAnimationWrapper', () => ({
  OasAnimationWrapper: ({
    config,
    onComplete,
  }: {
    config: { src?: string };
    onComplete?: () => void;
  }) => (
    <div data-testid="oas-wrapper" data-src={config?.src ?? 'no-src'}>
      <button data-testid="trigger-complete" onClick={onComplete}>
        complete
      </button>
    </div>
  ),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

describe('RewardAnimation', () => {
  it('renders badge-unlock animation', () => {
    render(<RewardAnimation type="badge-unlock" badgeName="First Steps" />, { wrapper });
    expect(screen.getByTestId('oas-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-src')).toContain('badge-unlock');
  });

  it('renders confetti animation', () => {
    render(<RewardAnimation type="confetti" />, { wrapper });
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-src')).toContain('confetti');
  });

  it('renders xp-gain animation', () => {
    render(<RewardAnimation type="xp-gain" xpAmount={50} />, { wrapper });
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-src')).toContain('xp-gain');
  });

  it('renders milestone animation', () => {
    render(<RewardAnimation type="milestone" />, { wrapper });
    expect(screen.getByTestId('oas-wrapper').getAttribute('data-src')).toContain('milestone');
  });

  it('calls onComplete when animation completes', () => {
    const onComplete = vi.fn();
    render(<RewardAnimation type="confetti" onComplete={onComplete} />, { wrapper });
    screen.getByTestId('trigger-complete').click();
    expect(onComplete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/RewardAnimation.test.tsx
```

Expected: All 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/runtime/src/components/RewardAnimation.tsx packages/runtime/src/components/__tests__/RewardAnimation.test.tsx
git commit -m "feat(runtime): add RewardAnimation component for celebration animations"
```

---

### Task 11: Create RewardEventBridge component

**Files:**

- Create: `packages/runtime/src/components/RewardEventBridge.tsx`
- Create: `packages/runtime/src/components/__tests__/RewardEventBridge.test.tsx`

- [ ] **Step 1: Create the component**

Create `packages/runtime/src/components/RewardEventBridge.tsx`:

```tsx
import { useEffect, useState, useRef, type ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { RewardReceipt } from '@open-edu/rewards';
import { RewardAnimation, type RewardAnimationType } from './RewardAnimation.js';

export interface RewardEventBridgeProps {
  receipts$: Observable<RewardReceipt>;
}

interface QueuedReward {
  id: string;
  type: RewardAnimationType;
  badgeName?: string;
  xpAmount?: number;
}

function receiptToReward(receipt: RewardReceipt): QueuedReward | null {
  switch (receipt.actionType) {
    case 'badge.award':
      return {
        id: receipt.actionId,
        type: 'badge-unlock',
        badgeName: receipt.actionKey,
      };
    case 'xp.award':
      return {
        id: receipt.actionId,
        type: 'xp-gain',
        xpAmount:
          typeof receipt.detail === 'object' && receipt.detail !== null
            ? Number((receipt.detail as Record<string, unknown>).amount ?? 0)
            : undefined,
      };
    case 'milestone.reached':
      return {
        id: receipt.actionId,
        type: 'milestone',
      };
    default:
      if (receipt.actionType.includes('confetti') || receipt.actionType.includes('celebration')) {
        return { id: receipt.actionId, type: 'confetti' };
      }
      return null;
  }
}

export function RewardEventBridge({ receipts$ }: RewardEventBridgeProps): JSX.Element | null {
  const [queue, setQueue] = useState<QueuedReward[]>([]);
  const [current, setCurrent] = useState<QueuedReward | null>(null);
  const isShowingRef = useRef(false);

  useEffect(() => {
    const subscription = receipts$.subscribe({
      next: (receipt) => {
        if (receipt.status !== 'delivered') return;
        const reward = receiptToReward(receipt);
        if (!reward) return;

        if (isShowingRef.current) {
          setQueue((prev) => [...prev, reward].slice(0, 3));
        } else {
          isShowingRef.current = true;
          setCurrent(reward);
        }
      },
    });

    return () => subscription.unsubscribe();
  }, [receipts$]);

  const handleComplete = () => {
    isShowingRef.current = false;
    setCurrent(null);
    setQueue((prev) => {
      const next = prev[0];
      if (next) {
        isShowingRef.current = true;
        setCurrent(next);
      }
      return prev.slice(1);
    });
  };

  if (!current && queue.length === 0) return null;

  const active = current ?? queue[0];

  return (
    <RewardAnimation
      type={active.type}
      badgeName={active.badgeName}
      xpAmount={active.xpAmount}
      onComplete={handleComplete}
    />
  );
}
```

- [ ] **Step 2: Create the tests**

Create `packages/runtime/src/components/__tests__/RewardEventBridge.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Subject } from 'rxjs';
import type { RewardReceipt } from '@open-edu/rewards';
import { RewardEventBridge } from '../RewardEventBridge.js';

vi.mock('../RewardAnimation', () => ({
  RewardAnimation: ({
    type,
    badgeName,
    xpAmount,
    onComplete,
  }: {
    type: string;
    badgeName?: string;
    xpAmount?: number;
    onComplete?: () => void;
  }) => (
    <div data-testid="reward-animation" data-type={type} data-badge={badgeName} data-xp={xpAmount}>
      <button data-testid="complete-reward" onClick={onComplete}>
        done
      </button>
    </div>
  ),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

describe('RewardEventBridge', () => {
  it('renders nothing when no receipts', () => {
    const subject = new Subject<RewardReceipt>();
    const { container } = render(<RewardEventBridge receipts$={subject} />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it('renders badge-unlock animation on badge.award receipt', () => {
    const subject = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={subject} />, { wrapper });

    act(() => {
      subject.next({
        actionId: 'r1',
        actionType: 'badge.award',
        actionKey: 'First Steps',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: {},
      });
    });

    expect(screen.getByTestId('reward-animation')).toBeInTheDocument();
    expect(screen.getByTestId('reward-animation').getAttribute('data-type')).toBe('badge-unlock');
  });

  it('renders xp-gain animation on xp.award receipt', () => {
    const subject = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={subject} />, { wrapper });

    act(() => {
      subject.next({
        actionId: 'r2',
        actionType: 'xp.award',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: { amount: 50 },
      });
    });

    expect(screen.getByTestId('reward-animation').getAttribute('data-type')).toBe('xp-gain');
  });

  it('queues rewards when one is already showing', () => {
    const subject = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={subject} />, { wrapper });

    act(() => {
      subject.next({
        actionId: 'r1',
        actionType: 'badge.award',
        actionKey: 'Badge 1',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: {},
      });
      subject.next({
        actionId: 'r2',
        actionType: 'xp.award',
        dispatchedAt: Date.now(),
        status: 'delivered',
        detail: { amount: 25 },
      });
    });

    expect(screen.getByTestId('reward-animation').getAttribute('data-type')).toBe('badge-unlock');

    act(() => {
      screen.getByTestId('complete-reward').click();
    });

    expect(screen.getByTestId('reward-animation').getAttribute('data-type')).toBe('xp-gain');
  });

  it('ignores skipped/failed receipts', () => {
    const subject = new Subject<RewardReceipt>();
    render(<RewardEventBridge receipts$={subject} />, { wrapper });

    act(() => {
      subject.next({
        actionId: 'r1',
        actionType: 'badge.award',
        dispatchedAt: Date.now(),
        status: 'skipped',
        detail: {},
      });
    });

    expect(screen.queryByTestId('reward-animation')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/RewardEventBridge.test.tsx
```

Expected: All 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/runtime/src/components/RewardEventBridge.tsx packages/runtime/src/components/__tests__/RewardEventBridge.test.tsx
git commit -m "feat(runtime): add RewardEventBridge to connect RewardBroker to animations"
```

---

### Task 12: Export reward components from runtime index

**Files:**

- Modify: `packages/runtime/src/index.ts`

- [ ] **Step 1: Add exports**

Add to `packages/runtime/src/index.ts`:

```ts
export { RewardAnimation } from './components/RewardAnimation.js';
export type { RewardAnimationProps, RewardAnimationType } from './components/RewardAnimation.js';
export { RewardEventBridge } from './components/RewardEventBridge.js';
export type { RewardEventBridgeProps } from './components/RewardEventBridge.js';
```

- [ ] **Step 2: Commit**

```bash
git add packages/runtime/src/index.ts
git commit -m "feat(runtime): export RewardAnimation and RewardEventBridge"
```

---

## Phase 4: Canvas Engine (P1 — MVP Algorithm Visualization)

### Task 13: Create CanvasAnimationRenderer component

**Files:**

- Create: `packages/runtime/src/components/CanvasAnimationRenderer.tsx`
- Create: `packages/runtime/src/components/__tests__/CanvasAnimationRenderer.test.tsx`

- [ ] **Step 1: Create the component**

Create `packages/runtime/src/components/CanvasAnimationRenderer.tsx`:

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import type { AnimationConfig } from '@open-edu/schemas';
import { useTranslation } from '@open-edu/i18n';
import { useLiveRegion } from '@open-edu/accessibility';
import { Button } from '@open-edu/design-system';

export interface CanvasAnimationRendererProps {
  config: AnimationConfig;
  width?: number;
  height?: number;
  reducedMotion: boolean;
  className?: string;
  ariaLabel: string;
  speed?: number;
}

interface SortingState {
  data: number[];
  comparing: [number, number] | null;
  swapping: [number, number] | null;
  sorted: Set<number>;
  step: number;
  totalSteps: number;
  complete: boolean;
}

function generateSortingSteps(
  algorithm: 'bubble' | 'selection' | 'insertion',
  data: number[],
): Array<{
  comparing: [number, number] | null;
  swapping: [number, number] | null;
  sorted: Set<number>;
}> {
  const arr = [...data];
  const steps: SortingState['comparing'][] = [];
  const n = arr.length;

  if (algorithm === 'bubble') {
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        steps.push([j, j + 1]);
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }
  } else if (algorithm === 'selection') {
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        steps.push([minIdx, j]);
        if (arr[j] < arr[minIdx]) minIdx = j;
      }
      if (minIdx !== i) {
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      }
    }
  } else {
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0 && arr[j] < arr[j - 1]) {
        steps.push([j - 1, j]);
        [arr[j], arr[j - 1]] = [arr[j - 1], arr[j]];
        j--;
      }
    }
  }

  return steps;
}

export function CanvasAnimationRenderer({
  config,
  width = 400,
  height = 250,
  reducedMotion,
  className,
  ariaLabel,
  speed = 1,
}: CanvasAnimationRendererProps): JSX.Element {
  const { t } = useTranslation();
  const { announce } = useLiveRegion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);

  const algorithm =
    config.effects?.[0]?.effect === 'flow'
      ? 'bubble'
      : config.effects?.[0]?.effect === 'connect'
        ? 'selection'
        : 'insertion';

  const data = config.effects?.map((e) => e.step ?? Math.floor(Math.random() * 90) + 10) ?? [
    30, 50, 20, 80, 40, 60, 10, 70, 90,
  ];

  const steps = generateSortingSteps(algorithm, data);
  const totalSteps = steps.length;

  const drawFrame = useCallback(
    (currentStep: number, comparing: [number, number] | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      const barWidth = width / data.length;
      const maxVal = Math.max(...data);

      data.forEach((val, i) => {
        const barHeight = (val / maxVal) * (height - 20);
        const x = i * barWidth;
        const y = height - barHeight;

        if (comparing && (i === comparing[0] || i === comparing[1])) {
          ctx.fillStyle =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--oe-color-warning')
              .trim() || '#f59e0b';
        } else {
          ctx.fillStyle =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--oe-color-primary')
              .trim() || '#6750a4';
        }

        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      });
    },
    [data, width, height],
  );

  useEffect(() => {
    if (reducedMotion) {
      drawFrame(0, null);
      return;
    }

    if (!playing) return;

    const delay = 200 / speed;
    const timer = setTimeout(() => {
      if (step < totalSteps) {
        const comparing = steps[step];
        drawFrame(step, comparing);
        announce(
          t('runtime.canvas.comparing', {
            a: String(comparing?.[0] ?? 0),
            b: String(comparing?.[1] ?? 0),
          }),
        );
        setStep((s) => s + 1);
      } else {
        setPlaying(false);
        announce(t('runtime.canvas.sort_complete'));
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [playing, step, reducedMotion, speed, steps, totalSteps, drawFrame, announce, t]);

  const handlePlay = () => {
    if (step >= totalSteps) {
      setStep(0);
    }
    setPlaying(true);
  };

  const handlePause = () => setPlaying(false);

  const handleReset = () => {
    setPlaying(false);
    setStep(0);
    drawFrame(0, null);
  };

  const handleStep = () => {
    if (step < totalSteps) {
      const comparing = steps[step];
      drawFrame(step, comparing);
      setStep((s) => s + 1);
    }
  };

  return (
    <div className={className} data-testid="canvas-animation-renderer">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        className="border-outline-variant rounded-lg border"
      />
      {!reducedMotion && (
        <div
          role="group"
          aria-label={t('runtime.animation.controls')}
          className="mt-sm gap-xs flex items-center"
        >
          {playing ? (
            <Button variant="outline" size="sm" onClick={handlePause} data-testid="canvas-pause">
              {t('runtime.animation.pause')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handlePlay} data-testid="canvas-play">
              {t('runtime.animation.play')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleStep} data-testid="canvas-step">
            {t('runtime.animation.step_forward')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="canvas-reset">
            {t('runtime.animation.reset')}
          </Button>
          <span className="text-on-surface-variant ml-sm text-xs">
            {t('runtime.canvas.step_of', {
              step: String(Math.min(step + 1, totalSteps)),
              total: String(totalSteps),
            })}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the tests**

Create `packages/runtime/src/components/__tests__/CanvasAnimationRenderer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { LiveRegionProvider } from '@open-edu/accessibility';
import { CanvasAnimationRenderer } from '../CanvasAnimationRenderer.js';

// Mock canvas
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
  })) as unknown as CanvasRenderingContext2D;
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { runtime: runtimeDict } }}>
      <LiveRegionProvider>{children}</LiveRegionProvider>
    </I18nProvider>
  );
}

const sortingConfig = {
  backend: 'canvas' as const,
  trigger: 'step' as const,
  effects: [
    { target: 'bar-0', effect: 'flow', step: 30 },
    { target: 'bar-1', effect: 'flow', step: 50 },
    { target: 'bar-2', effect: 'flow', step: 20 },
    { target: 'bar-3', effect: 'flow', step: 80 },
  ],
};

describe('CanvasAnimationRenderer', () => {
  it('renders canvas element', () => {
    render(
      <CanvasAnimationRenderer
        config={sortingConfig}
        reducedMotion={false}
        ariaLabel="Sorting visualization"
      />,
      { wrapper },
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows controls when not reduced motion', () => {
    render(
      <CanvasAnimationRenderer
        config={sortingConfig}
        reducedMotion={false}
        ariaLabel="Sorting visualization"
      />,
      { wrapper },
    );
    expect(screen.getByTestId('canvas-play')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-step')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-reset')).toBeInTheDocument();
  });

  it('hides controls when reduced motion', () => {
    render(
      <CanvasAnimationRenderer
        config={sortingConfig}
        reducedMotion
        ariaLabel="Sorting visualization"
      />,
      { wrapper },
    );
    expect(screen.queryByTestId('canvas-play')).not.toBeInTheDocument();
  });

  it('draws frame on reset', () => {
    render(
      <CanvasAnimationRenderer
        config={sortingConfig}
        reducedMotion={false}
        ariaLabel="Sorting visualization"
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByTestId('canvas-reset'));
    const canvas = screen.getByRole('img') as HTMLCanvasElement;
    expect(canvas.getContext).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Add i18n keys**

Add to `packages/i18n/locales/en/runtime.json`:

```json
  "canvas.comparing": "Comparing elements at index {{a}} and {{b}}",
  "canvas.sort_complete": "Sorting complete",
  "canvas.step_of": "Step {{step}} of {{total}}",
  "animation.reset": "Reset",
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/CanvasAnimationRenderer.test.tsx
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/components/CanvasAnimationRenderer.tsx packages/runtime/src/components/__tests__/CanvasAnimationRenderer.test.tsx packages/i18n/locales/en/runtime.json
git commit -m "feat(runtime): add CanvasAnimationRenderer for algorithm visualization"
```

---

### Task 14: Integrate Canvas backend into OasAnimationWrapper

**Files:**

- Modify: `packages/runtime/src/components/OasAnimationWrapper.tsx`

- [ ] **Step 1: Add Canvas backend branch**

Add import at top:

```tsx
import { CanvasAnimationRenderer } from './CanvasAnimationRenderer';
```

Add the Canvas backend branch after the CSS branch, before the lottie branch:

```tsx
if (resolvedConfig.backend === 'canvas') {
  return (
    <div className={className} data-testid="oas-canvas-backend">
      <CanvasAnimationRenderer
        config={resolvedConfig}
        reducedMotion={reducedMotion}
        speed={resolvedConfig.speed}
        ariaLabel={ariaLabel ?? t('runtime.animation.static_fallback')}
      />
      {renderPreservedChildren()}
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @open-edu/runtime test -- --run packages/runtime/src/components/__tests__/OasAnimationWrapper.test.tsx
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/runtime/src/components/OasAnimationWrapper.tsx
git commit -m "feat(runtime): integrate Canvas backend into OasAnimationWrapper"
```

---

### Task 15: Export Canvas renderer from runtime index

**Files:**

- Modify: `packages/runtime/src/index.ts`

- [ ] **Step 1: Add exports**

Add to `packages/runtime/src/index.ts`:

```ts
export { CanvasAnimationRenderer } from './components/CanvasAnimationRenderer.js';
export type { CanvasAnimationRendererProps } from './components/CanvasAnimationRenderer.js';
```

- [ ] **Step 2: Commit**

```bash
git add packages/runtime/src/index.ts
git commit -m "feat(runtime): export CanvasAnimationRenderer"
```

---

## Phase 5: Housekeeping (P2)

### Task 16: Regenerate widget catalog data

**Files:**

- Modify: `packages/core/src/widget-catalog-data.json` (via CLI)

- [ ] **Step 1: Run catalog generation**

```bash
pnpm --filter @open-edu/widgets generate:catalog
```

- [ ] **Step 2: Verify the file changed**

```bash
git diff --stat packages/core/src/widget-catalog-data.json
```

Expected: File shows changes (formatting + any new entries).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/widget-catalog-data.json
git commit -m "chore(core): regenerate widget-catalog-data.json via CLI"
```

---

### Task 17: Add course-compiler e2e test for animation validation

**Files:**

- Modify: `packages/course-compiler/src/e2e.test.ts` (or create if doesn't exist)

- [ ] **Step 1: Check if e2e.test.ts exists**

```bash
ls packages/course-compiler/src/e2e.test.ts 2>/dev/null || echo "File does not exist"
```

- [ ] **Step 2: Add animation validation test**

If the file exists, add this test to the existing describe block. If not, create it:

```ts
import { describe, it, expect } from 'vitest';
import { validateCourseModel } from './validators/semantic-validator.js';
import type { CourseModel } from './schemas/index.js';

function validModel(): CourseModel {
  return {
    id: 'test-course',
    version: '1.0.0',
    title: 'Test Course',
    modules: [
      {
        id: 'mod-1',
        title: 'Module 1',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            activities: [],
            assets: [],
          },
        ],
      },
    ],
  } as unknown as CourseModel;
}

describe('animation config validation', () => {
  it('passes for a widget activity with a valid canvas animation config', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.activities = [
      {
        id: 'act-canvas',
        type: 'widget',
        widgetId: 'core.sorting-visualizer',
        config: {
          animation: {
            backend: 'canvas',
            trigger: 'step',
            effects: [
              { target: 'bar-0', effect: 'flow', step: 30 },
              { target: 'bar-1', effect: 'flow', step: 50 },
            ],
          },
        },
      },
    ];
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'INVALID_ANIMATION_CONFIG')).toBe(false);
  });

  it('passes for a widget activity with a valid CSS animation config', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.activities = [
      {
        id: 'act-css',
        type: 'widget',
        widgetId: 'core.multiple-choice',
        config: {
          animation: {
            backend: 'css',
            trigger: 'answer-correct',
            effects: [{ target: 'feedback', effect: 'highlight' }],
          },
        },
      },
    ];
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'INVALID_ANIMATION_CONFIG')).toBe(false);
  });

  it('reports an invalid canvas animation effect', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.activities = [
      {
        id: 'act-bad-canvas',
        type: 'widget',
        widgetId: 'core.sorting-visualizer',
        config: {
          animation: {
            backend: 'canvas',
            effects: [{ target: 'x', effect: 'sparkles' }],
          },
        },
      },
    ];
    const diags = validateCourseModel(model);
    const invalid = diags.find((d) => d.code === 'INVALID_ANIMATION_CONFIG');
    expect(invalid).toBeDefined();
    expect(invalid?.severity).toBe('error');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @open-edu/course-compiler test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/course-compiler/src/e2e.test.ts
git commit -m "test(course-compiler): add e2e tests for canvas and CSS animation validation"
```

---

### Task 18: Final monorepo verification

**Files:** None

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass (exit 0).

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: Clean (no errors).

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: 0 errors.

- [ ] **Step 4: Run format check**

```bash
pnpm format:check
```

Expected: Only pre-existing failures (if any).

- [ ] **Step 5: Run i18n key validation**

```bash
node packages/i18n/src/i18n-keys.test.ts
```

Expected: All keys valid.

- [ ] **Step 6: Regenerate dev-server CSS if needed**

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

- [ ] **Step 7: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```

---

## Spec Coverage Check

| Spec Requirement               | Task                                  | Status |
| ------------------------------ | ------------------------------------- | ------ |
| Schema default → svg           | Task 1                                | ✅     |
| CSS animation engine (Tier 2)  | Tasks 2-5                             | ✅     |
| Rewards integration            | Tasks 9-12                            | ✅     |
| Canvas engine (algorithm viz)  | Tasks 13-15                           | ✅     |
| axe-core accessibility audits  | Task 8                                | ✅     |
| controllerRef fix              | Task 6                                | ✅     |
| Speed control                  | Task 7                                | ✅     |
| Catalog regenerated            | Task 16                               | ✅     |
| Course-compiler e2e            | Task 17                               | ✅     |
| Full verification              | Task 18                               | ✅     |
| i18n keys for all new strings  | Tasks 3, 7, 13                        | ✅     |
| No circular dependencies       | All tasks use existing dep directions | ✅     |
| Conventional commits per phase | Each task commits separately          | ✅     |

---

## Execution Notes for the Agent

1. **Run tests after each task** — don't batch them.
2. **Commit after each task** — one logical change per commit.
3. **If a test fails**, debug before moving to the next task.
4. **If a file doesn't exist** at an expected path, use `glob` to find it first.
5. **i18n keys** must be added in the same commit as the code that uses them.
6. **No placeholders** — every step has complete code.
7. **Follow existing patterns** — match the test structure, import style, and component patterns of the existing codebase.
