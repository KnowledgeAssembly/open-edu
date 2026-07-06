# Card Inconsistencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 card inconsistencies across the monorepo — create ProgressCard and BundleCard components, update BundleOverview to use Card, rename runtime Card → KnowledgeCard, and update all consumers.

**Architecture:** Four independent work streams (3 design-system additions, 1 runtime rename) followed by learner app consumer updates. All changes are additive or rename-only — no visual changes.

**Tech Stack:** TypeScript, React 18, Tailwind CSS, Vitest, design-system primitives

**Spec:** `docs/superpowers/specs/2026-07-06-card-inconsistencies-design.md`

---

## File Map

### New files

- `packages/design-system/src/learning/BundleCard.tsx`
- `packages/design-system/src/learning/ProgressCard.tsx`
- `packages/design-system/src/learning/__tests__/BundleCard.test.tsx`
- `packages/design-system/src/learning/__tests__/ProgressCard.test.tsx`

### Renamed files

- `packages/runtime/src/components/Card.tsx` → `KnowledgeCard.tsx`
- `packages/runtime/src/components/CardGrid.tsx` → `KnowledgeCardGrid.tsx`
- `packages/runtime/src/components/CardViewer.tsx` → `KnowledgeCardViewer.tsx`
- `packages/runtime/src/components/CardUnlockedToast.tsx` → `KnowledgeCardUnlockedToast.tsx`

### Modified files

- `packages/design-system/src/index.ts` — add BundleCard, ProgressCard exports
- `packages/design-system/src/learning/BundleOverview.tsx` — wrap module items in Card
- `packages/runtime/src/index.ts` — update export names
- `apps/learner/src/CatalogPage.tsx` — use BundleCard instead of inline Card
- `apps/learner/src/ProgressDashboard.tsx` — use ProgressCard instead of hand-rolled div
- `apps/learner/src/CollectionBinderPage.tsx` — update imports for renamed components
- `apps/learner/src/CourseRuntime.tsx` — update import for renamed CardUnlockedToast

### Unchanged

- `packages/design-system/src/learning/CourseCard.tsx` — kept as semantic `<article>`

---

### Task 1: Create BundleCard component and its test

**Files:**

- Create: `packages/design-system/src/learning/BundleCard.tsx`
- Create: `packages/design-system/src/learning/__tests__/BundleCard.test.tsx`
- Modify: `packages/design-system/src/index.ts` (add export)

- [ ] **Step 1: Create BundleCard component**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../primitives/card.js';
import { Badge } from '../primitives/badge.js';
import { Progress } from '../primitives/progress.js';
import type { JSX } from 'react';

export interface BundleCardProps {
  title: string;
  description?: string;
  moduleCount: number;
  activityCount: number;
  completedModules: number;
  totalModules: number;
  isStarted: boolean;
  onStart: () => void;
}

export function BundleCard({
  title,
  description,
  moduleCount,
  activityCount,
  completedModules,
  totalModules,
  isStarted,
  onStart,
}: BundleCardProps): JSX.Element {
  const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <Card data-testid="bundle-card" className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="secondary">Bundle</Badge>
          <CardTitle className="text-h4 font-display truncate">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
        {!description && <CardDescription>{moduleCount} modules</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="text-on-surface-variant flex gap-4 text-xs">
          <span>{moduleCount} modules</span>
          <span>{activityCount} activities</span>
        </div>
        {isStarted && (
          <div className="mt-2">
            <Progress value={percent} className="h-2" />
            <span className="text-on-surface-variant mt-1 block text-xs">
              {completedModules} of {totalModules} complete
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

BundleCard.displayName = 'BundleCard';
```

- [ ] **Step 2: Create BundleCard test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BundleCard } from '../BundleCard.js';
import type { BundleCardProps } from '../BundleCard.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

function makeProps(overrides: Partial<BundleCardProps> = {}): BundleCardProps {
  return {
    title: 'Level B Math',
    description: 'A comprehensive math bundle',
    moduleCount: 3,
    activityCount: 24,
    completedModules: 1,
    totalModules: 3,
    isStarted: true,
    onStart: vi.fn(),
    ...overrides,
  };
}

describe('BundleCard', () => {
  it('renders title', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('Level B Math')).toBeInTheDocument();
  });

  it('renders Bundle badge', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('Bundle')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('A comprehensive math bundle')).toBeInTheDocument();
  });

  it('shows module count fallback when no description', () => {
    render(<BundleCard {...makeProps({ description: undefined })} />);
    expect(screen.getByText('3 modules')).toBeInTheDocument();
  });

  it('shows module and activity counts', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('3 modules')).toBeInTheDocument();
    expect(screen.getByText('24 activities')).toBeInTheDocument();
  });

  it('shows progress bar when started', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('1 of 3 complete')).toBeInTheDocument();
  });

  it('hides progress bar when not started', () => {
    render(<BundleCard {...makeProps({ isStarted: false })} />);
    expect(screen.queryByText('1 of 3 complete')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<BundleCard {...makeProps()} />);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @open-edu/design-system test -- src/learning/__tests__/BundleCard.test.tsx
```

Expected: FAIL — component not found (export not added yet)

- [ ] **Step 4: Add export to design-system index.ts**

In `packages/design-system/src/index.ts`, add after the `ConceptCard` export block (around line 246):

```tsx
export { BundleCard } from './learning/BundleCard.js';
export type { BundleCardProps } from './learning/BundleCard.js';
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @open-edu/design-system test -- src/learning/__tests__/BundleCard.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/learning/BundleCard.tsx \
  packages/design-system/src/learning/__tests__/BundleCard.test.tsx \
  packages/design-system/src/index.ts
git commit -m "feat(design-system): add BundleCard component"
```

---

### Task 2: Create ProgressCard component and its test

**Files:**

- Create: `packages/design-system/src/learning/ProgressCard.tsx`
- Create: `packages/design-system/src/learning/__tests__/ProgressCard.test.tsx`
- Modify: `packages/design-system/src/index.ts` (add export)

- [ ] **Step 1: Create ProgressCard component**

Read the current ProgressDashboard visual layout at `apps/learner/src/ProgressDashboard.tsx:148-205` to match exactly.

```tsx
import { Button } from '../primitives/button.js';
import { Badge } from '../primitives/badge.js';
import { Progress } from '../primitives/progress.js';
import { Card } from '../primitives/card.js';
import { BundleModuleIndicator } from '../patterns/BundleModuleIndicator.js';
import type { BundleModuleStatus } from '../patterns/BundleModuleIndicator.js';
import { cn } from '../lib/utils.js';
import { CheckCircle2 } from 'lucide-react';
import type { JSX } from 'react';

export interface ProgressCardProps {
  title: string;
  status: 'in-progress' | 'completed';
  currentSteps: number;
  totalSteps: number;
  percent: number;
  lastTitle: string;
  lastStudied: string;
  badgeCount: number;
  onContinue: () => void;
  onReview?: () => void;
}

export function ProgressCard({
  title,
  status,
  currentSteps,
  totalSteps,
  percent,
  lastTitle,
  lastStudied,
  badgeCount,
  onContinue,
  onReview,
}: ProgressCardProps): JSX.Element {
  const isCompleted = status === 'completed';
  const moduleStatus: BundleModuleStatus = isCompleted ? 'completed' : 'in-progress';

  return (
    <div
      className={cn(
        'bg-surface-container-lowest border-outline-variant p-md relative flex flex-col gap-4 rounded-xl border sm:flex-row sm:items-start',
        isCompleted && 'opacity-80',
      )}
      data-testid="progress-card"
    >
      <div className="flex flex-shrink-0 items-center gap-3" aria-hidden="true">
        <BundleModuleIndicator status={moduleStatus} completionPercent={percent} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-h3 font-display text-on-surface">{title}</h2>
          </div>
          <div className="gap-md flex flex-shrink-0 items-center">
            {isCompleted ? (
              <Badge variant="secondary">
                Completed <CheckCircle2 className="ml-1 inline h-3 w-3" />
              </Badge>
            ) : (
              <Button size="sm" onClick={onContinue}>
                Continue
              </Button>
            )}
          </div>
        </div>
        <div className="gap-md mt-sm text-on-surface-variant flex flex-wrap items-center text-sm">
          <span>
            {currentSteps} of {totalSteps} steps
          </span>
          <span>Last: {lastTitle}</span>
          {lastStudied && <span className="text-on-surface-variant/70">{lastStudied}</span>}
          {badgeCount > 0 && (
            <span className="text-tertiary font-medium">
              {badgeCount} badge{badgeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="mt-sm w-full">
          <Progress value={percent} className="h-2" />
        </div>
        <div className="mt-sm flex items-center gap-3">
          {isCompleted && onReview && (
            <Button variant="outline" size="sm" onClick={onReview}>
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

ProgressCard.displayName = 'ProgressCard';
```

Note: The component uses the same DOM structure as the current ProgressDashboard inline implementation rather than wrapping with `Card` primitive, because:

1. Progress cards use `rounded-xl` (Card uses `rounded-lg`)
2. Progress cards use `bg-surface-container-lowest border-outline-variant` with a `flex flex-row` layout that doesn't fit Card's vertical stacking structure
3. The `BundleModuleIndicator` sits outside the main content flow on the left side

- [ ] **Step 2: Create ProgressCard test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressCard } from '../ProgressCard.js';
import type { ProgressCardProps } from '../ProgressCard.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

function makeProps(overrides: Partial<ProgressCardProps> = {}): ProgressCardProps {
  return {
    title: 'Intro to JavaScript',
    status: 'in-progress',
    currentSteps: 3,
    totalSteps: 8,
    percent: 37,
    lastTitle: 'Variables',
    lastStudied: '2 hours ago',
    badgeCount: 0,
    onContinue: vi.fn(),
    ...overrides,
  };
}

describe('ProgressCard', () => {
  it('renders title', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByText('Intro to JavaScript')).toBeInTheDocument();
  });

  it('shows Continue button for in-progress', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Continue');
  });

  it('shows Completed badge when completed', () => {
    render(<ProgressCard {...makeProps({ status: 'completed' })} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows Review button when completed with onReview', () => {
    render(<ProgressCard {...makeProps({ status: 'completed', onReview: vi.fn() })} />);
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('shows step count', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByText('3 of 8 steps')).toBeInTheDocument();
  });

  it('shows last title', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByText('Last: Variables')).toBeInTheDocument();
  });

  it('shows last studied time', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('shows badge count when present', () => {
    render(<ProgressCard {...makeProps({ badgeCount: 3 })} />);
    expect(screen.getByText('3 badges')).toBeInTheDocument();
  });

  it('calls onContinue when Continue clicked', () => {
    const onContinue = vi.fn();
    render(<ProgressCard {...makeProps({ onContinue })} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('calls onReview when Review clicked', () => {
    const onReview = vi.fn();
    render(<ProgressCard {...makeProps({ status: 'completed', onReview })} />);
    fireEvent.click(screen.getByText('Review'));
    expect(onReview).toHaveBeenCalledOnce();
  });

  it('applies opacity for completed status', () => {
    const { container } = render(<ProgressCard {...makeProps({ status: 'completed' })} />);
    expect(container.firstChild).toHaveClass('opacity-80');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<ProgressCard {...makeProps()} />);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @open-edu/design-system test -- src/learning/__tests__/ProgressCard.test.tsx
```

Expected: FAIL — component not found

- [ ] **Step 4: Add export to design-system index.ts**

In `packages/design-system/src/index.ts`, add after the `BundleCard` export:

```tsx
export { ProgressCard } from './learning/ProgressCard.js';
export type { ProgressCardProps } from './learning/ProgressCard.js';
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @open-edu/design-system test -- src/learning/__tests__/ProgressCard.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/learning/ProgressCard.tsx \
  packages/design-system/src/learning/__tests__/ProgressCard.test.tsx \
  packages/design-system/src/index.ts
git commit -m "feat(design-system): add ProgressCard component"
```

---

### Task 3: Update BundleOverview to use Card primitive for module items

**Files:**

- Modify: `packages/design-system/src/learning/BundleOverview.tsx`

- [ ] **Step 1: Update BundleOverview.tsx module items**

Add Card import at the top:

```tsx
import { Card } from '../primitives/card.js';
```

Replace each module `<li>` block (current around line 117-222):

**Before** (the `<li>` element):

```tsx
<li
  key={mod.id}
  aria-labelledby={`module-title-${mod.id}`}
  className={cn(
    'border-outline-variant p-md list-none rounded-xl border transition-colors',
    mod.status === 'locked' && 'opacity-40',
    mod.status === 'unlocked' && 'opacity-60',
  )}
  data-testid="module-card"
  data-status={mod.status}
>
```

**After:**

```tsx
<li
  key={mod.id}
  aria-labelledby={`module-title-${mod.id}`}
  className="list-none"
>
  <Card
    className={cn(
      'p-md rounded-xl shadow-none transition-colors',
      mod.status === 'locked' && 'opacity-40',
      mod.status === 'unlocked' && 'opacity-60',
    )}
    data-testid="module-card"
    data-status={mod.status}
  >
```

And close the Card tag after the `</li>` — the inner content stays unchanged.

The closing `</li>` becomes `</Card></li>`.

- [ ] **Step 2: Run BundleOverview tests to verify**

```bash
pnpm --filter @open-edu/design-system test -- src/learning/__tests__/BundleOverview.test.tsx
```

Expected: PASS (all test IDs and content unchanged)

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter @open-edu/design-system exec tsc --noEmit
```

Expected: clean exit

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/learning/BundleOverview.tsx
git commit -m "feat(design-system): wrap BundleOverview module items in Card primitive"
```

---

### Task 4: Rename runtime Card → KnowledgeCard

**Files:**

- Rename: `packages/runtime/src/components/Card.tsx` → `KnowledgeCard.tsx`
- Rename: `packages/runtime/src/components/CardGrid.tsx` → `KnowledgeCardGrid.tsx`
- Rename: `packages/runtime/src/components/CardViewer.tsx` → `KnowledgeCardViewer.tsx`
- Rename: `packages/runtime/src/components/CardUnlockedToast.tsx` → `KnowledgeCardUnlockedToast.tsx`
- Modify: `packages/runtime/src/components/KnowledgeCardGrid.tsx` (update internal import)
- Modify: `packages/runtime/src/index.ts` (update export names)

- [ ] **Step 1: Rename Card.tsx → KnowledgeCard.tsx**

```bash
mv packages/runtime/src/components/Card.tsx packages/runtime/src/components/KnowledgeCard.tsx
```

Update the component name inside the file:

```tsx
export function KnowledgeCard({ ... }: CardProps): JSX.Element {
```

And the interface:

```tsx
export interface KnowledgeCardProps {
```

And `displayName`:

```tsx
KnowledgeCard.displayName = 'KnowledgeCard';
```

- [ ] **Step 2: Rename CardGrid.tsx → KnowledgeCardGrid.tsx**

```bash
mv packages/runtime/src/components/CardGrid.tsx packages/runtime/src/components/KnowledgeCardGrid.tsx
```

Update inside:

- `import { Card }` → `import { KnowledgeCard }`
- `./Card.js` → `./KnowledgeCard.js`
- `export interface CardGridProps` → `export interface KnowledgeCardGridProps`
- `export interface CardGridItem` → `export interface KnowledgeCardGridItem`
- `export function CardGrid` → `export function KnowledgeCardGrid`
- Component usage: `<Card` → `<KnowledgeCard`

- [ ] **Step 3: Rename CardViewer.tsx → KnowledgeCardViewer.tsx**

```bash
mv packages/runtime/src/components/CardViewer.tsx packages/runtime/src/components/KnowledgeCardViewer.tsx
```

Update inside:

- `export interface CardViewerProps` → `export interface KnowledgeCardViewerProps`
- `export function CardViewer` → `export function KnowledgeCardViewer`
- `CardViewer.displayName` → `KnowledgeCardViewer.displayName`

- [ ] **Step 4: Rename CardUnlockedToast.tsx → KnowledgeCardUnlockedToast.tsx**

```bash
mv packages/runtime/src/components/CardUnlockedToast.tsx packages/runtime/src/components/KnowledgeCardUnlockedToast.tsx
```

Update inside:

- `export interface CardUnlockedToastProps` → `export interface KnowledgeCardUnlockedToastProps`
- `export function CardUnlockedToast` → `export function KnowledgeCardUnlockedToast`
- `CardUnlockedToast.displayName` → `KnowledgeCardUnlockedToast.displayName`

- [ ] **Step 5: Update runtime index.ts exports**

In `packages/runtime/src/index.ts`:

Replace:

```tsx
export { Card } from './components/Card.js';
export type { CardProps } from './components/Card.js';
export { CardGrid } from './components/CardGrid.js';
export type { CardGridProps, CardGridItem } from './components/CardGrid.js';
export { CardViewer } from './components/CardViewer.js';
export type { CardViewerProps } from './components/CardViewer.js';
export { CardUnlockedToast } from './components/CardUnlockedToast.js';
export type { CardUnlockedToastProps } from './components/CardUnlockedToast.js';
```

With:

```tsx
export { KnowledgeCard } from './components/KnowledgeCard.js';
export type { KnowledgeCardProps } from './components/KnowledgeCard.js';
export { KnowledgeCardGrid } from './components/KnowledgeCardGrid.js';
export type {
  KnowledgeCardGridProps,
  KnowledgeCardGridItem,
} from './components/KnowledgeCardGrid.js';
export { KnowledgeCardViewer } from './components/KnowledgeCardViewer.js';
export type { KnowledgeCardViewerProps } from './components/KnowledgeCardViewer.js';
export { KnowledgeCardUnlockedToast } from './components/KnowledgeCardUnlockedToast.js';
export type { KnowledgeCardUnlockedToastProps } from './components/KnowledgeCardUnlockedToast.js';
```

- [ ] **Step 6: Run typecheck**

```bash
pnpm --filter @open-edu/runtime exec tsc --noEmit
```

Expected: clean exit

- [ ] **Step 7: Run runtime tests**

```bash
pnpm --filter @open-edu/runtime test
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/runtime/src/components/KnowledgeCard.tsx \
  packages/runtime/src/components/KnowledgeCardGrid.tsx \
  packages/runtime/src/components/KnowledgeCardViewer.tsx \
  packages/runtime/src/components/KnowledgeCardUnlockedToast.tsx \
  packages/runtime/src/index.ts
git rm packages/runtime/src/components/Card.tsx \
  packages/runtime/src/components/CardGrid.tsx \
  packages/runtime/src/components/CardViewer.tsx \
  packages/runtime/src/components/CardUnlockedToast.tsx
git commit -m "refactor(runtime): rename Card to KnowledgeCard"
```

---

### Task 5: Update learner app consumers (CatalogPage, ProgressDashboard)

**Files:**

- Modify: `apps/learner/src/CatalogPage.tsx`
- Modify: `apps/learner/src/ProgressDashboard.tsx`

- [ ] **Step 1: Update CatalogPage to use BundleCard**

In `apps/learner/src/CatalogPage.tsx`, add `BundleCard` to the import from `@open-edu/design-system`:

```tsx
import {
  BundleCard,
  BundleCardWithModule,
  ...
} from '@open-edu/design-system';
```

Replace the inline bundle card (lines 177-213, the `<BundleCardWithModule>...<Card>...</Card>...</BundleCardWithModule>`) with:

```tsx
<BundleCardWithModule
  key={bundle.manifest.id}
  completedModules={completedModules}
  totalModules={bundle.moduleCount}
>
  <BundleCard
    title={bundle.manifest.title}
    description={bundle.manifest.description}
    moduleCount={bundle.moduleCount}
    activityCount={bundle.totalNodeCount}
    completedModules={completedModules}
    totalModules={bundle.moduleCount}
    isStarted={prog !== undefined}
    onStart={() => onStartBundle?.(bundle.manifest.id)}
  />
</BundleCardWithModule>
```

Remove unused imports: `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from the `@open-edu/design-system` import (but only if they're not used elsewhere in the file — the file might use these elsewhere). Actually, check the file — Card, CardContent, etc. are only used in the bundle card section that we're replacing, so they can be removed.

- [ ] **Step 2: Update ProgressDashboard to use ProgressCard**

In `apps/learner/src/ProgressDashboard.tsx`, add `ProgressCard` to the import from `@open-edu/design-system`:

```tsx
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  StatsSummary,
  BundleModuleIndicator,
  SectionDivider,
  ProgressCard,
} from '@open-edu/design-system';
```

Replace the hand-rolled div (lines 149-205, the `<div className={cn(...)}>` block) with:

```tsx
<ProgressCard
  title={title}
  status={isCompleted ? 'completed' : 'in-progress'}
  currentSteps={snap.visitedNodes.length}
  totalSteps={totalNodes}
  percent={percent}
  lastTitle={lastTitle}
  lastStudied={lastStudied}
  badgeCount={badgeCount}
  onContinue={() => onNavigate({ view: 'course', packageId })}
  onReview={isCompleted ? () => onNavigate({ view: 'course', packageId }) : undefined}
/>
```

Remove unused imports: `cn`, `BundleModuleIndicator`, `BundleModuleStatus` from the import (check if `BundleModuleStatus` type is still needed).

- [ ] **Step 3: Run learner tests**

```bash
pnpm --filter @open-edu/learner test
```

Expected: PASS

- [ ] **Step 4: Run typecheck**

```bash
pnpm --filter @open-edu/learner exec tsc --noEmit
```

Expected: clean exit

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/CatalogPage.tsx apps/learner/src/ProgressDashboard.tsx
git commit -m "feat(learner): use BundleCard and ProgressCard from design-system"
```

---

### Task 6: Update learner app consumers (CourseRuntime, CollectionBinderPage)

**Files:**

- Modify: `apps/learner/src/CourseRuntime.tsx`
- Modify: `apps/learner/src/CollectionBinderPage.tsx`

- [ ] **Step 1: Update CourseRuntime.tsx**

Replace:

```tsx
import { CardUnlockedToast } from '@open-edu/runtime';
```

With:

```tsx
import { KnowledgeCardUnlockedToast } from '@open-edu/runtime';
```

Then update the JSX usage:

```tsx
<KnowledgeCardUnlockedToast ... />
```

- [ ] **Step 2: Update CollectionBinderPage.tsx**

Replace:

```tsx
import { CardGrid, CardViewer, ProgressRing } from '@open-edu/runtime';
import type { CardGridItem } from '@open-edu/runtime';
```

With:

```tsx
import { KnowledgeCardGrid, KnowledgeCardViewer, ProgressRing } from '@open-edu/runtime';
import type { KnowledgeCardGridItem } from '@open-edu/runtime';
```

Then update the JSX usages:

- `<CardGrid` → `<KnowledgeCardGrid`
- `<CardViewer` → `<KnowledgeCardViewer`

- [ ] **Step 3: Run learner tests**

```bash
pnpm --filter @open-edu/learner test
```

Expected: PASS

- [ ] **Step 4: Run typecheck**

```bash
pnpm --filter @open-edu/learner exec tsc --noEmit
```

Expected: clean exit

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/CourseRuntime.tsx apps/learner/src/CollectionBinderPage.tsx
git commit -m "refactor(learner): update imports for KnowledgeCard rename"
```

---

### Task 7: Full verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: ALL tests pass

- [ ] **Step 2: Run typecheck across affected packages**

```bash
pnpm --filter @open-edu/design-system exec tsc --noEmit
pnpm --filter @open-edu/runtime exec tsc --noEmit
pnpm --filter @open-edu/learner exec tsc --noEmit
```

Expected: all clean

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: no new errors

- [ ] **Step 4: Run format check**

```bash
pnpm format:check
```

Expected: no formatting issues
