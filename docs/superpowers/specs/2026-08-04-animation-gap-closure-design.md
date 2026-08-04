# OpenEdu Animation Gap Closure — Design Spec

**Date:** 2026-08-04
**Author:** Gap analysis from PR #540 review
**Source docs:** `docs/ANIMATION_SPEC.md`, `docs/ANIMATION_TECHNOLOGY_GUIDE.md`, `docs/animation_implementation_plan.md`
**Baseline:** PR #540 (OAS v0.1 engine, widgets, AI companion)

---

## 1. Context

PR #540 implements the OpenEdu Animation Specification (OAS v0.1) with:

- Zod schemas for animation configs (`@open-edu/schemas`)
- Core animation engine: `useOasAnimation` hook, `DotLottiePlayer`, `OasAnimationWrapper` (`@open-edu/runtime`)
- AI companion (Pipili) dotLottie bindings (`@open-edu/ai-companion`)
- Widget animation support: `science.process-diagram`, `core.timeline`, new `core.process-explainer` (`@open-edu/widgets`)
- Course compiler validation (`@open-edu/course-compiler`)
- OEP distribution regression test (`@open-edu/oep-distribution`)
- Example animated water cycle node

**Identified gaps** from review against `ANIMATION_SPEC.md`, `ANIMATION_TECHNOLOGY_GUIDE.md`, and `animation_implementation_plan.md`:

| #   | Gap                                                            | Severity |
| --- | -------------------------------------------------------------- | -------- |
| 1   | Schema defaults to `lottie` instead of `svg`                   | P0       |
| 2   | No CSS animation engine (Tier 2 progressive enhancement)       | P0       |
| 3   | No rewards integration                                         | P0       |
| 4   | No Canvas engine for algorithm visualization (MVP requirement) | P1       |
| 5   | No axe-core accessibility audits                               | P1       |
| 6   | `controllerRef` mutated during render                          | P1       |
| 7   | No speed playback control                                      | P1       |
| 8   | Catalog hand-edited instead of regenerated                     | P2       |
| 9   | No course-compiler e2e test                                    | P2       |

---

## 2. Architecture Decisions

### 2.1 No Fundamental Architecture Changes

The existing PR architecture is sound and compatible with `ANIMATION_TECHNOLOGY_GUIDE.md`:

- **Widget-centric**: Widgets validate `animation` in schema, runtime wraps via `OasAnimationWrapper`
- **Decoupled**: Schemas → Engine → Consumers (Widgets, AI, Rewards)
- **Technology Guide alignment**: SVG for educational graphics, dotLottie for characters, Canvas for simulations

### 2.2 Key Decision: Schema Default Change

**Change**: `AnimationBackendEnum.default('lottie')` → `.default('svg')`

**Rationale**: Technology Guide states "SVG should be the default choice for educational visuals." The `lottie` default biases lesson authors toward decorative animations for educational content.

**Exception**: Pipili mascot bindings keep `lottie` (decorative/character per guide).

### 2.3 Key Decision: CSS Engine Over framer-motion

**Decision**: Build CSS transition engine, NOT framer-motion.

**Rationale**:

- Algorithm visualization maps to Canvas per guide (not CSS, not framer-motion)
- CSS transitions cover Tier 2 fallback (fade, slide, highlight, pulse)
- framer-motion adds ~15KB for UI choreography not needed in MVP
- `oasDurationToMs` and `oasDurationVar` already provide timing infrastructure

### 2.4 Key Decision: Rewards Integration Location

**Decision**: Add `RewardAnimation` component in `@open-edu/runtime`, NOT in `@open-edu/rewards`.

**Rationale**:

- `@open-edu/rewards` is a pure TypeScript package (no React)
- Animation rendering belongs in the runtime layer
- Rewards package emits events; runtime listens and renders

---

## 3. Component Design

### 3.1 CssAnimationRenderer (`@open-edu/runtime`)

**Purpose**: Map semantic animation effects to CSS transitions for Tier 2 progressive enhancement.

**Location**: `packages/runtime/src/components/CssAnimationRenderer.tsx`

**Props**:

```tsx
interface CssAnimationRendererProps {
  effects: AnimationEffectConfig[];
  children: ReactNode;
  reducedMotion: boolean;
  speed?: number;
  className?: string;
}
```

**Behavior**:

- Wraps children in a container with CSS class-based animations
- Maps effects to Tailwind classes or inline `@keyframes`:
  - `fade` → `animate-fade-in` (opacity 0→1)
  - `slide` → `animate-slide-in` (translateY + opacity)
  - `highlight` → `animate-highlight` (background color pulse)
  - `pulse` → `animate-pulse` (scale 1→1.05→1)
  - `glow` → `animate-glow` (box-shadow pulse)
- Uses `oasDurationVar()` for timing
- Respects `reducedMotion` (instant reveal)
- Applies `speed` multiplier to `animation-duration`

**CSS**: Define keyframes in `packages/runtime/src/styles/animations.css` (imported by runtime).

**CSS Keyframes** (exact definitions):

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
```

**Effect-to-animation mapping**:
| Effect | CSS Animation | Duration |
|---|---|---|
| `fade` | `oas-fade-in` | `normal` (200ms) |
| `slide` | `oas-slide-in` | `normal` (200ms) |
| `highlight` | `oas-highlight` | `slow` (300ms) |
| `pulse` | `oas-pulse` | `fast` (100ms) |
| `glow` | `oas-glow` | `slow` (300ms) |

All other effects (`flow`, `draw`, `orbit`, etc.) fall through to static reveal when CSS backend is used.

### 3.2 CanvasAnimationRenderer (`@open-edu/runtime`)

**Purpose**: Render algorithm visualizations and simulations via HTML Canvas.

**Location**: `packages/runtime/src/components/CanvasAnimationRenderer.tsx`

**Props**:

```tsx
interface CanvasAnimationRendererProps {
  config: AnimationConfig;
  width?: number;
  height?: number;
  reducedMotion: boolean;
  className?: string;
  ariaLabel: string;
}
```

**Behavior**:

- Creates `<canvas>` element with `requestAnimationFrame` loop
- Supports algorithm visualization configs:
  - `sorting` — bar chart sorting visualization
  - `graph-traversal` — node/edge graph traversal
  - `particle` — particle system
- Frame data driven by `config.effects` (target, effect, duration)
- Respects `reducedMotion` (static frame render)
- Provides keyboard controls (play/pause/step)
- ARIA: `role="img"` with `aria-label`, live region for step announcements

**Initial MVP scope**: One algorithm type — `sorting` (bar chart). Extensible via plugin registry.

**Sorting Visualization Config**:

```ts
interface SortingAlgorithmConfig {
  algorithm: 'bubble' | 'selection' | 'insertion';
  data: number[];
  speed: number; // frames per step
  highlightComparisons: boolean;
  highlightSwaps: boolean;
}
```

**Canvas rendering**:

- Each array element → vertical bar (width = canvas.width / data.length)
- Bar height proportional to value (normalized to canvas height)
- Colors: default `--oe-color-primary`, comparing `--oe-color-warning`, swapped `--oe-color-success`
- Frame loop: `requestAnimationFrame` with step delay controlled by `speed`
- Controls: Play, Pause, Step Forward, Reset, Speed (0.5x, 1x, 2x)

**Accessibility**:

- `role="img"` with `aria-label` describing the algorithm
- Live region announces: "Comparing elements at index 3 and 4", "Swapping elements", "Sort complete"
- Keyboard: Tab to controls, Enter/Space to activate

### 3.3 RewardAnimation (`@open-edu/runtime`)

**Purpose**: Render celebration animations when rewards are triggered.

**Location**: `packages/runtime/src/components/RewardAnimation.tsx`

**Props**:

```tsx
interface RewardAnimationProps {
  type: 'badge-unlock' | 'confetti' | 'xp-gain' | 'milestone';
  badgeName?: string;
  xpAmount?: number;
  onComplete?: () => void;
}
```

**Behavior**:

- Uses `OasAnimationWrapper` with `backend: 'lottie'` and effect-specific configs
- Maps reward types to animation configs:
  - `badge-unlock` → `effect: 'badge'`, `trigger: 'lesson-complete'`
  - `confetti` → `effect: 'confetti'`, `trigger: 'lesson-complete'`
  - `xp-gain` → `effect: 'sparkle'`, `trigger: 'answer-correct'`
  - `milestone` → `effect: 'celebrate'`, `trigger: 'lesson-complete'`
- Auto-dismisses after animation completes
- Respects `reducedMotion` (static badge display)

### 3.4 RewardEventBridge (`@open-edu/runtime`)

**Purpose**: Bridge between `@open-edu/rewards` event stream and `RewardAnimation` rendering.

**Location**: `packages/runtime/src/components/RewardEventBridge.tsx`

**Props**:

```tsx
interface RewardEventBridgeProps {
  receipts$: Observable<RewardReceipt>;
}
```

**Behavior**:

- Subscribes to reward receipts from `RewardBroker`
- Maps receipt `actionType` to `RewardAnimation` type:
  - `badge.award` → `type: 'badge-unlock'`, `badgeName: receipt.actionKey`
  - `xp.award` → `type: 'xp-gain'`, `xpAmount: parsed from receipt.detail`
  - `milestone.reached` → `type: 'milestone'`
- Renders `RewardAnimation` component for each triggered reward
- Queues animations if multiple rewards fire simultaneously (max 3 in queue)
- Auto-dismisses each animation after `onComplete`
- Unsubscribes on unmount

**Integration point**: Used in `apps/learner/src/pages/LessonPage.tsx` (or wherever `RewardBroker` is instantiated). Pass `broker.results$` or create a Subject that emits on `onReceipt`.

---

## 4. Implementation Phases

### Phase 1: Schema Fix + CSS Engine (P0)

- Fix `AnimationBackendEnum` default to `svg`
- Create `CssAnimationRenderer` component
- Add CSS keyframes to runtime styles
- Integrate into `OasAnimationWrapper` as fallback
- Tests for CSS renderer + integration

### Phase 2: Accessibility + Bug Fixes (P1)

- Add axe-core audits to all animation component tests
- Fix `controllerRef` mutation (move to `useLayoutEffect`)
- Add speed control to `OasAnimationWrapper` control bar
- Tests for speed control + axe-core

### Phase 3: Rewards Integration (P0)

- Create `RewardAnimation` component
- Create `RewardEventBridge` component
- Add `@open-edu/rewards` dependency to runtime
- Wire reward receipts to animation triggers
- Tests for reward animations

### Phase 4: Canvas Engine (P1 — MVP for algorithm visualization)

- Create `CanvasAnimationRenderer` component
- Implement `sorting` algorithm visualization
- Add canvas controls (play/pause/step/speed)
- Integrate into `OasAnimationWrapper` for `backend: 'canvas'`
- Tests for canvas renderer

### Phase 5: Housekeeping (P2)

- Regenerate `widget-catalog-data.json` via CLI
- Add course-compiler e2e test for animation validation
- Final monorepo verification

---

## 5. File Inventory

### New Files

| File                                                               | Package | Phase |
| ------------------------------------------------------------------ | ------- | ----- |
| `packages/runtime/src/components/CssAnimationRenderer.tsx`         | runtime | 1     |
| `packages/runtime/src/components/CssAnimationRenderer.test.tsx`    | runtime | 1     |
| `packages/runtime/src/styles/animations.css`                       | runtime | 1     |
| `packages/runtime/src/components/CanvasAnimationRenderer.tsx`      | runtime | 4     |
| `packages/runtime/src/components/CanvasAnimationRenderer.test.tsx` | runtime | 4     |
| `packages/runtime/src/components/RewardAnimation.tsx`              | runtime | 3     |
| `packages/runtime/src/components/RewardAnimation.test.tsx`         | runtime | 3     |
| `packages/runtime/src/components/RewardEventBridge.tsx`            | runtime | 3     |
| `packages/runtime/src/components/RewardEventBridge.test.tsx`       | runtime | 3     |
| `packages/runtime/src/components/__tests__/axe-audit.test.ts`      | runtime | 2     |

### Modified Files

| File                                                      | Package         | Phase | Change                                      |
| --------------------------------------------------------- | --------------- | ----- | ------------------------------------------- |
| `packages/schemas/src/animation.ts`                       | schemas         | 1     | Default `lottie` → `svg`                    |
| `packages/runtime/src/components/OasAnimationWrapper.tsx` | runtime         | 1,2,4 | Add CSS/Canvas branches, fix ref, add speed |
| `packages/runtime/src/components/useOasAnimation.ts`      | runtime         | 2     | Add speed state + control                   |
| `packages/runtime/src/index.ts`                           | runtime         | 1,3,4 | Export new components                       |
| `packages/runtime/package.json`                           | runtime         | 3     | Add `@open-edu/rewards` dep                 |
| `packages/i18n/locales/en/runtime.json`                   | i18n            | 2,3   | Add speed + reward i18n keys                |
| `packages/core/src/widget-catalog-data.json`              | core            | 5     | Regenerate via CLI                          |
| `packages/course-compiler/src/e2e.test.ts`                | course-compiler | 5     | Add animation e2e test                      |

---

## 6. Technology Guide Alignment Matrix

| Guide Rule                            | Implementation                                 | Status                       |
| ------------------------------------- | ---------------------------------------------- | ---------------------------- |
| "SVG default for educational visuals" | Schema default → `svg`                         | ✅ Phase 1                   |
| "CSS for UI animation"                | `CssAnimationRenderer`                         | ✅ Phase 1                   |
| "dotLottie for characters/rewards"    | `RewardAnimation` + existing `DotLottiePlayer` | ✅ Phase 3                   |
| "Canvas for simulations"              | `CanvasAnimationRenderer`                      | ✅ Phase 4                   |
| "WebGPU deferred"                     | Schema has it, no implementation               | ✅ Already correct           |
| "Widget-centric architecture"         | `OasAnimationWrapper` wraps widgets            | ✅ Already correct           |
| "Respect prefers-reduced-motion"      | All renderers check `reducedMotion`            | ✅ Already correct + Phase 1 |
| "Pausable animations"                 | Control bar + speed control                    | ✅ Phase 2                   |
| "Text alternatives"                   | Live region announcements                      | ✅ Already correct           |

---

## 7. Testing Strategy

### Unit Tests

- Each new component gets Vitest + @testing-library/react tests
- Canvas tests mock `HTMLCanvasElement` and `requestAnimationFrame`
- CSS tests verify class application and style injection
- Reward tests mock `RewardBroker` receipts

### Accessibility Tests

- axe-core audit in every animation component test
- Keyboard navigation tests for control bars
- Screen reader announcement tests via `LiveRegionProvider`

### Integration Tests

- `OasAnimationWrapper` renders correct backend based on config
- Reward receipts trigger `RewardAnimation` with correct type
- Canvas renderer responds to play/pause/step controls

---

## 8. Risks & Mitigations

| Risk                                        | Mitigation                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Canvas bundle size                          | Lazy-load `CanvasAnimationRenderer` via `React.lazy()`                                 |
| Reward animation conflicts with lesson flow | Queue animations, show one at a time                                                   |
| CSS animations conflict with Tailwind       | Use scoped class names (`oas-animate-*`)                                               |
| Algorithm visualization complexity          | Start with `sorting` only, extensible registry for future types                        |
| `@dotlottie/react-player` deprecation       | Package notes it's superseded by `@lottiefiles/dotlottie-react`; monitor for migration |

---

## 9. Definition of Done

- [ ] `pnpm test && pnpm typecheck && pnpm lint && pnpm format:check` green
- [ ] All new i18n keys valid (`node packages/i18n/src/i18n-keys.test.ts`)
- [ ] axe-core audits pass for all animation components
- [ ] Schema default is `svg` (not `lottie`)
- [ ] CSS engine provides Tier 2 fallback
- [ ] Canvas engine renders sorting visualization
- [ ] Rewards trigger celebration animations
- [ ] Speed control works across all backends
- [ ] `widget-catalog-data.json` regenerated via CLI
- [ ] Course-compiler e2e test for animation validation
- [ ] No circular dependencies introduced
- [ ] Conventional commits per phase
