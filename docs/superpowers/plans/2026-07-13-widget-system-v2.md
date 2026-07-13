# Widget System v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the widget registry into a production-quality plugin ecosystem with learning-intent classification, domain namespacing, rich metadata, and full backward compatibility — without changing any existing widget behavior.

**Architecture:** Extend `WidgetDefinition` with optional metadata fields (capabilities, accessibility, analytics, reward, AI, learning intents). Add alias resolution to the registry so old `open-edu.*` IDs resolve to new `core.*` / `math.*` / etc. IDs. Update all 15 builtin widgets with new IDs, metadata, and domain tags. Add stub definitions for 6 future widgets. Provide migration utilities. All changes are additive — existing courses compile unchanged.

**Tech Stack:** TypeScript 5.x, Zod 3.x, Vitest 1.x, React 18.x

---

## File Map

### New Files to Create

| File                                                               | Purpose                                         |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| `packages/widgets/src/metadata/learning-intents.ts`                | Learning intent enum + widget-to-intent mapping |
| `packages/widgets/src/metadata/capabilities.ts`                    | Widget capability flags type                    |
| `packages/widgets/src/metadata/accessibility.ts`                   | Accessibility metadata type                     |
| `packages/widgets/src/metadata/analytics.ts`                       | Analytics metadata type                         |
| `packages/widgets/src/metadata/reward.ts`                          | Reward metadata type                            |
| `packages/widgets/src/metadata/ai.ts`                              | AI generation metadata type                     |
| `packages/widgets/src/metadata/index.ts`                           | Barrel export for all metadata types            |
| `packages/widgets/src/domains.ts`                                  | Domain constants + alias map + migration utils  |
| `packages/widgets/src/metadata/__tests__/learning-intents.test.ts` | Tests for learning intents                      |
| `packages/widgets/src/metadata/__tests__/capabilities.test.ts`     | Tests for capabilities                          |
| `packages/widgets/src/metadata/__tests__/accessibility.test.ts`    | Tests for accessibility metadata                |
| `packages/widgets/src/metadata/__tests__/analytics.test.ts`        | Tests for analytics metadata                    |
| `packages/widgets/src/metadata/__tests__/reward.test.ts`           | Tests for reward metadata                       |
| `packages/widgets/src/metadata/__tests__/ai.test.ts`               | Tests for AI metadata                           |
| `packages/widgets/src/__tests__/domains.test.ts`                   | Tests for alias map + migration                 |
| `packages/widgets/src/__tests__/registry-alias.test.ts`            | Tests for registry alias resolution             |
| `packages/widgets/src/builtins/Callout/Callout.tsx`                | Stub renderer for core.callout                  |
| `packages/widgets/src/builtins/ImageCompare/ImageCompare.tsx`      | Stub renderer for core.image-compare            |
| `packages/widgets/src/builtins/Hotspot/Hotspot.tsx`                | Stub renderer for core.hotspot                  |
| `packages/widgets/src/builtins/Timeline/Timeline.tsx`              | Stub renderer for core.timeline                 |
| `packages/widgets/src/builtins/LabelDiagram/LabelDiagram.tsx`      | Stub renderer for science.label-diagram         |
| `packages/widgets/src/builtins/ImageLabel/ImageLabel.tsx`          | Stub renderer for science.image-label           |
| `packages/widgets/src/builtins/Callout/Callout.test.tsx`           | Test for callout stub                           |
| `packages/widgets/src/builtins/ImageCompare/ImageCompare.test.tsx` | Test for image-compare stub                     |
| `packages/widgets/src/builtins/Hotspot/Hotspot.test.tsx`           | Test for hotspot stub                           |
| `packages/widgets/src/builtins/Timeline/Timeline.test.tsx`         | Test for timeline stub                          |
| `packages/widgets/src/builtins/LabelDiagram/LabelDiagram.test.tsx` | Test for label-diagram stub                     |
| `packages/widgets/src/builtins/ImageLabel/ImageLabel.test.tsx`     | Test for image-label stub                       |

### Files to Modify

| File                                                                       | Change                                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/widgets/src/types.ts`                                            | Extend `WidgetDefinition` with metadata fields, add `WidgetDefinitionV2`   |
| `packages/widgets/src/registry.ts`                                         | Add alias resolution, domain filtering, search methods to `WidgetRegistry` |
| `packages/widgets/src/index.ts`                                            | Export new types, domains, metadata, migration utils                       |
| `packages/widgets/src/builtins/MultipleChoice/MultipleChoice.tsx`          | Update IDs to `core.multiple-choice`, add metadata                         |
| `packages/widgets/src/builtins/VisualCounting/VisualCounting.tsx`          | Update ID to `core.visual-counting`, add metadata                          |
| `packages/widgets/src/builtins/Matching/Matching.tsx`                      | Update ID to `core.matching`, add metadata                                 |
| `packages/widgets/src/builtins/DragDrop/DragDrop.tsx`                      | Update ID to `core.drag-drop`, add metadata                                |
| `packages/widgets/src/builtins/Sequencing/Sequencing.tsx`                  | Update ID to `core.sequencing`, add metadata                               |
| `packages/widgets/src/builtins/FillBlank/FillBlank.tsx`                    | Update ID to `core.fill-blank`, add metadata                               |
| `packages/widgets/src/builtins/StoryQuestion/StoryQuestion.tsx`            | Update ID to `core.story-question`, add metadata                           |
| `packages/widgets/src/builtins/RealWorld/RealWorld.tsx`                    | Update ID to `core.real-world`, add metadata                               |
| `packages/widgets/src/builtins/FractionVisual/FractionVisual.tsx`          | Update ID to `math.fraction-visual`, add metadata                          |
| `packages/widgets/src/builtins/PlaceValueChart/PlaceValueChart.tsx`        | Update ID to `math.place-value-chart`, add metadata                        |
| `packages/widgets/src/builtins/GridArea/GridArea.tsx`                      | Update ID to `math.grid-area`, add metadata                                |
| `packages/widgets/src/builtins/ChartReader/ChartReader.tsx`                | Update ID to `core.chart-reader`, add metadata                             |
| `packages/widgets/src/builtins/ClockTime/ClockTime.tsx`                    | Update ID to `math.clock-time`, add metadata                               |
| `packages/widgets/src/builtins/MeasurementScale/MeasurementScale.tsx`      | Update ID to `math.measurement-scale`, add metadata                        |
| `packages/widgets/src/builtins/MultipleChoice/MultipleChoice.test.tsx`     | Update test IDs                                                            |
| `packages/widgets/src/builtins/Matching/Matching.test.tsx`                 | Update test IDs                                                            |
| `packages/widgets/src/builtins/VisualCounting/VisualCounting.test.tsx`     | Update test IDs                                                            |
| `packages/widgets/src/builtins/DragDrop/DragDrop.test.tsx`                 | Update test IDs                                                            |
| `packages/widgets/src/builtins/Sequencing/Sequencing.test.tsx`             | Update test IDs                                                            |
| `packages/widgets/src/builtins/FillBlank/FillBlank.test.tsx`               | Update test IDs                                                            |
| `packages/widgets/src/builtins/StoryQuestion/StoryQuestion.test.tsx`       | Update test IDs                                                            |
| `packages/widgets/src/builtins/RealWorld/RealWorld.test.tsx`               | Update test IDs                                                            |
| `packages/widgets/src/builtins/FractionVisual/FractionVisual.test.tsx`     | Update test IDs                                                            |
| `packages/widgets/src/builtins/PlaceValueChart/PlaceValueChart.test.tsx`   | Update test IDs                                                            |
| `packages/widgets/src/builtins/GridArea/GridArea.test.tsx`                 | Update test IDs                                                            |
| `packages/widgets/src/builtins/ChartReader/ChartReader.test.tsx`           | Update test IDs                                                            |
| `packages/widgets/src/builtins/ClockTime/ClockTime.test.tsx`               | Update test IDs                                                            |
| `packages/widgets/src/builtins/MeasurementScale/MeasurementScale.test.tsx` | Update test IDs                                                            |
| `packages/widgets/src/builtins/index.ts`                                   | Add new stub widget exports                                                |
| `packages/runtime/src/renderers/WidgetRenderer.tsx`                        | Use alias-aware registry lookup                                            |
| `packages/runtime/src/components/WidgetCanvas.tsx`                         | Update `formatWidgetName` for new ID format                                |

---

## Task 1: Learning Intent Types

**Files:**

- Create: `packages/widgets/src/metadata/learning-intents.ts`
- Create: `packages/widgets/src/metadata/__tests__/learning-intents.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/widgets/src/metadata/__tests__/learning-intents.test.ts
import { describe, it, expect } from 'vitest';
import {
  LearningIntent,
  WIDGET_LEARNING_INTENTS,
  getLearningIntentsForWidget,
  getWidgetsByLearningIntent,
} from '../learning-intents';

describe('LearningIntent', () => {
  it('defines all8 learning intents', () => {
    const intents = Object.values(LearningIntent);
    expect(intents).toContain('assess');
    expect(intents).toContain('practice');
    expect(intents).toContain('observe');
    expect(intents).toContain('compare');
    expect(intents).toContain('explore');
    expect(intents).toContain('create');
    expect(intents).toContain('reflect');
    expect(intents).toContain('apply');
    expect(intents).toHaveLength(8);
  });

  it('maps matching widget to practice and compare intents', () => {
    const intents = getLearningIntentsForWidget('core.matching');
    expect(intents).toContain('practice');
    expect(intents).toContain('compare');
  });

  it('maps multiple-choice widget to assess intent', () => {
    const intents = getLearningIntentsForWidget('core.multiple-choice');
    expect(intents).toContain('assess');
  });

  it('returns empty array for unknown widget', () => {
    const intents = getLearningIntentsForWidget('unknown.widget');
    expect(intents).toEqual([]);
  });

  it('finds all widgets for a given intent', () => {
    const widgets = getWidgetsByLearningIntent('assess');
    expect(widgets).toContain('core.multiple-choice');
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('supports multiple intents per widget', () => {
    const intents = getLearningIntentsForWidget('core.drag-drop');
    expect(intents.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test -- metadata/__tests__/learning-intents`
Expected: FAIL with module not found

- [ ] **Step 3: Write the implementation**

```typescript
// packages/widgets/src/metadata/learning-intents.ts

export enum LearningIntent {
  Assess = 'assess',
  Practice = 'practice',
  Observe = 'observe',
  Compare = 'compare',
  Explore = 'explore',
  Create = 'create',
  Reflect = 'reflect',
  Apply = 'apply',
}

export const WIDGET_LEARNING_INTENTS: Record<string, LearningIntent[]> = {
  'core.matching': [LearningIntent.Practice, LearningIntent.Compare],
  'core.multiple-choice': [LearningIntent.Assess],
  'core.multiple-choice-practice': [LearningIntent.Practice],
  'core.visual-counting': [LearningIntent.Observe, LearningIntent.Practice],
  'core.drag-drop': [LearningIntent.Practice, LearningIntent.Compare],
  'core.sequencing': [LearningIntent.Practice, LearningIntent.Apply],
  'core.fill-blank': [LearningIntent.Assess, LearningIntent.Practice],
  'core.story-question': [LearningIntent.Assess, LearningIntent.Reflect],
  'core.real-world': [LearningIntent.Apply, LearningIntent.Explore],
  'math.fraction-visual': [LearningIntent.Observe, LearningIntent.Explore],
  'math.place-value-chart': [LearningIntent.Observe, LearningIntent.Practice],
  'math.grid-area': [LearningIntent.Practice, LearningIntent.Apply],
  'core.chart-reader': [LearningIntent.Observe, LearningIntent.Apply],
  'math.clock-time': [LearningIntent.Practice, LearningIntent.Apply],
  'math.measurement-scale': [LearningIntent.Practice, LearningIntent.Apply],
};

export function getLearningIntentsForWidget(widgetId: string): LearningIntent[] {
  return WIDGET_LEARNING_INTENTS[widgetId] ?? [];
}

export function getWidgetsByLearningIntent(intent: LearningIntent): string[] {
  return Object.entries(WIDGET_LEARNING_INTENTS)
    .filter(([, intents]) => intents.includes(intent))
    .map(([id]) => id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-edu/widgets test -- metadata/__tests__/learning-intents`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/metadata/learning-intents.ts packages/widgets/src/metadata/__tests__/learning-intents.test.ts
git commit -m "feat(widgets): add learning intent classification types and mappings"
```

---

## Task 2: Capability, Accessibility, Analytics, Reward, AI Metadata Types

**Files:**

- Create: `packages/widgets/src/metadata/capabilities.ts`
- Create: `packages/widgets/src/metadata/accessibility.ts`
- Create: `packages/widgets/src/metadata/analytics.ts`
- Create: `packages/widgets/src/metadata/reward.ts`
- Create: `packages/widgets/src/metadata/ai.ts`
- Create: `packages/widgets/src/metadata/index.ts`
- Create: `packages/widgets/src/metadata/__tests__/capabilities.test.ts`
- Create: `packages/widgets/src/metadata/__tests__/accessibility.test.ts`
- Create: `packages/widgets/src/metadata/__tests__/analytics.test.ts`
- Create: `packages/widgets/src/metadata/__tests__/reward.test.ts`
- Create: `packages/widgets/src/metadata/__tests__/ai.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/widgets/src/metadata/__tests__/capabilities.test.ts
import { describe, it, expect } from 'vitest';
import type { WidgetCapabilities } from '../capabilities';

describe('WidgetCapabilities', () => {
  it('has all capability flags as optional booleans', () => {
    const caps: WidgetCapabilities = {};
    expect(caps.supportsKeyboard).toBeUndefined();
    expect(caps.supportsScreenReader).toBeUndefined();
    expect(caps.supportsHints).toBeUndefined();
    expect(caps.supportsRetry).toBeUndefined();
    expect(caps.supportsScoring).toBeUndefined();
    expect(caps.supportsTouch).toBeUndefined();
    expect(caps.supportsMouse).toBeUndefined();
    expect(caps.supportsAnalytics).toBeUndefined();
    expect(caps.supportsRewards).toBeUndefined();
    expect(caps.supportsAccessibility).toBeUndefined();
    expect(caps.supportsAnimation).toBeUndefined();
    expect(caps.supportsLocalization).toBeUndefined();
  });

  it('allows setting capabilities', () => {
    const caps: WidgetCapabilities = {
      supportsKeyboard: true,
      supportsScreenReader: true,
      supportsHints: false,
      supportsRetry: true,
      supportsScoring: true,
      supportsTouch: true,
      supportsMouse: true,
      supportsAnalytics: true,
      supportsRewards: true,
      supportsAccessibility: true,
      supportsAnimation: false,
      supportsLocalization: true,
    };
    expect(caps.supportsKeyboard).toBe(true);
    expect(caps.supportsAnimation).toBe(false);
  });
});
```

```typescript
// packages/widgets/src/metadata/__tests__/accessibility.test.ts
import { describe, it, expect } from 'vitest';
import type { AccessibilityMetadata } from '../accessibility';

describe('AccessibilityMetadata', () => {
  it('has all accessibility fields as optional booleans', () => {
    const a11y: AccessibilityMetadata = {};
    expect(a11y.highContrast).toBeUndefined();
    expect(a11y.keyboardOnly).toBeUndefined();
    expect(a11y.screenReader).toBeUndefined();
    expect(a11y.tts).toBeUndefined();
    expect(a11y.captions).toBeUndefined();
    expect(a11y.signLanguageReady).toBeUndefined();
    expect(a11y.easyLanguage).toBeUndefined();
    expect(a11y.reducedMotion).toBeUndefined();
    expect(a11y.audioDescription).toBeUndefined();
    expect(a11y.focusManagement).toBeUndefined();
    expect(a11y.ariaSupport).toBeUndefined();
  });

  it('allows partial accessibility declarations', () => {
    const a11y: AccessibilityMetadata = {
      highContrast: true,
      keyboardOnly: true,
      screenReader: true,
    };
    expect(a11y.highContrast).toBe(true);
    expect(a11y.tts).toBeUndefined();
  });
});
```

```typescript
// packages/widgets/src/metadata/__tests__/analytics.test.ts
import { describe, it, expect } from 'vitest';
import type { AnalyticsMetadata } from '../analytics';

describe('AnalyticsMetadata', () => {
  it('has all analytics fields as optional booleans', () => {
    const analytics: AnalyticsMetadata = {};
    expect(analytics.trackAttempts).toBeUndefined();
    expect(analytics.trackHints).toBeUndefined();
    expect(analytics.trackRetries).toBeUndefined();
    expect(analytics.trackMistakes).toBeUndefined();
    expect(analytics.trackCompletionTime).toBeUndefined();
    expect(analytics.trackSuccessRate).toBeUndefined();
    expect(analytics.trackConfidence).toBeUndefined();
    expect(analytics.trackInteractions).toBeUndefined();
  });

  it('allows partial analytics declarations', () => {
    const analytics: AnalyticsMetadata = {
      trackAttempts: true,
      trackCompletionTime: true,
      trackSuccessRate: true,
    };
    expect(analytics.trackAttempts).toBe(true);
    expect(analytics.trackHints).toBeUndefined();
  });
});
```

```typescript
// packages/widgets/src/metadata/__tests__/reward.test.ts
import { describe, it, expect } from 'vitest';
import type { RewardMetadata } from '../reward';

describe('RewardMetadata', () => {
  it('has all reward fields as optional', () => {
    const reward: RewardMetadata = {};
    expect(reward.completionXP).toBeUndefined();
    expect(reward.achievement).toBeUndefined();
    expect(reward.badge).toBeUndefined();
    expect(reward.celebrationAnimation).toBeUndefined();
    expect(reward.collectibleCard).toBeUndefined();
    expect(reward.confetti).toBeUndefined();
    expect(reward.positiveMessage).toBeUndefined();
  });

  it('allows partial reward declarations', () => {
    const reward: RewardMetadata = {
      completionXP: 10,
      confetti: true,
      positiveMessage: 'Great job!',
    };
    expect(reward.completionXP).toBe(10);
    expect(reward.confetti).toBe(true);
    expect(reward.positiveMessage).toBe('Great job!');
  });
});
```

```typescript
// packages/widgets/src/metadata/__tests__/ai.test.ts
import { describe, it, expect } from 'vitest';
import type { AIMetadata } from '../ai';

describe('AIMetadata', () => {
  it('has all AI metadata fields as optional', () => {
    const ai: AIMetadata = {};
    expect(ai.difficulty).toBeUndefined();
    expect(ai.estimatedMinutes).toBeUndefined();
    expect(ai.bloomsLevel).toBeUndefined();
    expect(ai.cognitiveLoad).toBeUndefined();
    expect(ai.recommendedAge).toBeUndefined();
    expect(ai.readingLevel).toBeUndefined();
    expect(ai.subjectTags).toBeUndefined();
    expect(ai.learningObjectives).toBeUndefined();
    expect(ai.commonMisconceptions).toBeUndefined();
    expect(ai.authoringPrompt).toBeUndefined();
    expect(ai.generationHints).toBeUndefined();
    expect(ai.exampleConfigs).toBeUndefined();
  });

  it('allows full AI metadata declaration', () => {
    const ai: AIMetadata = {
      difficulty: 'medium',
      estimatedMinutes: 5,
      bloomsLevel: 'apply',
      cognitiveLoad: 'moderate',
      recommendedAge: [8, 12],
      readingLevel: 'grade-4',
      subjectTags: ['math', 'arithmetic'],
      learningObjectives: ['Identify matching pairs'],
      commonMisconceptions: ['Confusing similar items'],
      authoringPrompt: 'Create a matching exercise with 4-6 pairs',
      generationHints: ['Use simple vocabulary', 'Include visual cues'],
      exampleConfigs: [{ pairs: [{ left: 'A', right: '1' }] }],
    };
    expect(ai.difficulty).toBe('medium');
    expect(ai.recommendedAge).toEqual([8, 12]);
    expect(ai.exampleConfigs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @open-edu/widgets test -- metadata/__tests__`
Expected: FAIL with module not found

- [ ] **Step 3: Write the implementations**

```typescript
// packages/widgets/src/metadata/capabilities.ts

export interface WidgetCapabilities {
  supportsObserveMode?: boolean;
  supportsKeyboard?: boolean;
  supportsScreenReader?: boolean;
  supportsHints?: boolean;
  supportsRetry?: boolean;
  supportsScoring?: boolean;
  supportsVoice?: boolean;
  supportsOffline?: boolean;
  supportsPrinting?: boolean;
  supportsTouch?: boolean;
  supportsMouse?: boolean;
  supportsAnalytics?: boolean;
  supportsRewards?: boolean;
  supportsAccessibility?: boolean;
  supportsAnimation?: boolean;
  supportsLocalization?: boolean;
}
```

```typescript
// packages/widgets/src/metadata/accessibility.ts

export interface AccessibilityMetadata {
  highContrast?: boolean;
  keyboardOnly?: boolean;
  screenReader?: boolean;
  tts?: boolean;
  captions?: boolean;
  signLanguageReady?: boolean;
  easyLanguage?: boolean;
  reducedMotion?: boolean;
  audioDescription?: boolean;
  focusManagement?: boolean;
  ariaSupport?: boolean;
}
```

```typescript
// packages/widgets/src/metadata/analytics.ts

export interface AnalyticsMetadata {
  trackAttempts?: boolean;
  trackHints?: boolean;
  trackRetries?: boolean;
  trackMistakes?: boolean;
  trackCompletionTime?: boolean;
  trackSuccessRate?: boolean;
  trackConfidence?: boolean;
  trackInteractions?: boolean;
}
```

```typescript
// packages/widgets/src/metadata/reward.ts

export interface RewardMetadata {
  completionXP?: number;
  achievement?: string;
  badge?: string;
  celebrationAnimation?: boolean;
  collectibleCard?: boolean;
  confetti?: boolean;
  positiveMessage?: string;
}
```

```typescript
// packages/widgets/src/metadata/ai.ts

export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type CognitiveLoad = 'low' | 'moderate' | 'high';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'adaptive';

export interface AIMetadata {
  difficulty?: DifficultyLevel;
  estimatedMinutes?: number;
  bloomsLevel?: BloomsLevel;
  cognitiveLoad?: CognitiveLoad;
  recommendedAge?: [number, number];
  readingLevel?: string;
  subjectTags?: string[];
  learningObjectives?: string[];
  commonMisconceptions?: string[];
  authoringPrompt?: string;
  generationHints?: string[];
  exampleConfigs?: Record<string, unknown>[];
}
```

```typescript
// packages/widgets/src/metadata/index.ts

export type { WidgetCapabilities } from './capabilities';
export type { AccessibilityMetadata } from './accessibility';
export type { AnalyticsMetadata } from './analytics';
export type { RewardMetadata } from './reward';
export type { AIMetadata, BloomsLevel, CognitiveLoad, DifficultyLevel } from './ai';
export {
  LearningIntent,
  WIDGET_LEARNING_INTENTS,
  getLearningIntentsForWidget,
  getWidgetsByLearningIntent,
} from './learning-intents';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-edu/widgets test -- metadata/__tests__`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/metadata/
git commit -m "feat(widgets): add metadata types for capabilities, accessibility, analytics, reward, and AI"
```

---

## Task 3: Extend WidgetDefinition Type

**Files:**

- Modify: `packages/widgets/src/types.ts`
- Modify: `packages/widgets/src/__tests__/types.test.ts` (create if not exists)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/widgets/src/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import type { WidgetDefinition, WidgetDefinitionV2 } from '../types';

describe('WidgetDefinition', () => {
  it('accepts a minimal v1 definition', () => {
    const def: WidgetDefinition = {
      id: 'test.widget',
      render: () => null,
    };
    expect(def.id).toBe('test.widget');
  });

  it('accepts a full v2 definition with all metadata', () => {
    const def: WidgetDefinitionV2 = {
      id: 'core.matching',
      version: '1.0.0',
      name: 'Matching',
      description: 'Match pairs of items',
      domain: 'core',
      learningIntents: ['practice', 'compare'],
      capabilities: {
        supportsKeyboard: true,
        supportsScreenReader: true,
        supportsHints: true,
        supportsRetry: true,
        supportsScoring: true,
        supportsTouch: true,
        supportsMouse: true,
        supportsAnalytics: true,
        supportsRewards: true,
        supportsAccessibility: true,
      },
      accessibility: {
        highContrast: true,
        keyboardOnly: true,
        screenReader: true,
        focusManagement: true,
        ariaSupport: true,
      },
      analytics: {
        trackAttempts: true,
        trackCompletionTime: true,
        trackSuccessRate: true,
      },
      reward: {
        completionXP: 10,
        confetti: true,
      },
      ai: {
        difficulty: 'medium',
        estimatedMinutes: 5,
        bloomsLevel: 'practice',
        cognitiveLoad: 'moderate',
        subjectTags: ['general'],
      },
      schema: {},
      renderer: null,
      icon: 'puzzle',
      keywords: ['match', 'pairs'],
      status: 'stable',
      render: () => null,
    };
    expect(def.domain).toBe('core');
    expect(def.learningIntents).toContain('practice');
    expect(def.capabilities?.supportsKeyboard).toBe(true);
    expect(def.accessibility?.screenReader).toBe(true);
    expect(def.ai?.difficulty).toBe('medium');
  });

  it('v2 definition is assignable to WidgetDefinition', () => {
    const v2: WidgetDefinitionV2 = {
      id: 'core.test',
      name: 'Test',
      description: 'Test widget',
      domain: 'core',
      learningIntents: [],
      capabilities: {},
      accessibility: {},
      analytics: {},
      reward: {},
      ai: {},
      status: 'stable',
      render: () => null,
    };
    const def: WidgetDefinition = v2;
    expect(def.id).toBe('core.test');
  });

  it('supports deprecated widget metadata', () => {
    const def: WidgetDefinitionV2 = {
      id: 'open-edu.old-widget',
      name: 'Old Widget',
      description: 'Deprecated',
      domain: 'core',
      learningIntents: [],
      capabilities: {},
      accessibility: {},
      analytics: {},
      reward: {},
      ai: {},
      status: 'deprecated',
      deprecated: true,
      replacement: 'core.new-widget',
      render: () => null,
    };
    expect(def.deprecated).toBe(true);
    expect(def.replacement).toBe('core.new-widget');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test -- __tests__/types`
Expected: FAIL (WidgetDefinitionV2 does not exist)

- [ ] **Step 3: Write the implementation**

```typescript
// packages/widgets/src/types.ts
import type { ReactNode } from 'react';
import type { WidgetCapabilities } from './metadata/capabilities';
import type { AccessibilityMetadata } from './metadata/accessibility';
import type { AnalyticsMetadata } from './metadata/analytics';
import type { RewardMetadata } from './metadata/reward';
import type { AIMetadata } from './metadata/ai';
import type { LearningIntent } from './metadata/learning-intents';

export interface WidgetRenderProps<TState = unknown> {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: TState) => void;
  storedState?: TState;
}

export interface WidgetDefinition {
  id: string;
  version?: string;
  render: (props: WidgetRenderProps) => ReactNode;
}

export interface WidgetDefinitionV2 extends WidgetDefinition {
  name: string;
  description: string;
  domain: string;
  learningIntents: LearningIntent[];
  capabilities: WidgetCapabilities;
  accessibility: AccessibilityMetadata;
  analytics: AnalyticsMetadata;
  reward: RewardMetadata;
  ai: AIMetadata;
  schema?: Record<string, unknown>;
  renderer?: unknown;
  validator?: unknown;
  icon?: string;
  keywords?: string[];
  status: 'stable' | 'experimental' | 'deprecated';
  deprecated?: boolean;
  replacement?: string;
}

export interface RemoteWidgetManifest {
  id: string;
  version: string;
  url: string;
  integrity?: string;
  apiVersion: string;
  fallback?: string;
  permissions?: string[];
}

export interface RemoteWidgetRegistration {
  manifest: RemoteWidgetManifest;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

export interface WidgetRegistry {
  register: (definition: WidgetDefinition) => void;
  get: (id: string) => WidgetDefinition | undefined;
  has: (id: string) => boolean;
  registerAlias: (aliasId: string, targetId: string) => void;
  resolveAlias: (id: string) => string;
  getAll: () => WidgetDefinition[];
  getByDomain: (domain: string) => WidgetDefinition[];
  search: (query: string) => WidgetDefinition[];
  registerRemote: (manifest: RemoteWidgetManifest) => void;
  getRemoteRegistration: (manifest: RemoteWidgetManifest) => RemoteWidgetRegistration | undefined;
  updateRemoteStatus: (
    manifest: RemoteWidgetManifest,
    status: RemoteWidgetRegistration['status'],
    error?: string,
  ) => void;
}

export class WidgetRegistrationError extends Error {
  constructor(widgetId: string) {
    super(`Widget "${widgetId}" is already registered`);
    this.name = 'WidgetRegistrationError';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-edu/widgets test -- __tests__/types`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/types.ts packages/widgets/src/__tests__/types.test.ts
git commit -m "feat(widgets): extend WidgetDefinition with V2 metadata fields and registry methods"
```

---

## Task 4: Widget Domains & Alias Map

**Files:**

- Create: `packages/widgets/src/domains.ts`
- Create: `packages/widgets/src/__tests__/domains.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/widgets/src/__tests__/domains.test.ts
import { describe, it, expect } from 'vitest';
import {
  WidgetDomain,
  WIDGET_ALIAS_MAP,
  resolveWidgetId,
  migrateWidgetId,
  getDomainPrefix,
} from '../domains';

describe('Widget Domains', () => {
  it('defines all domain constants', () => {
    expect(WidgetDomain.Core).toBe('core');
    expect(WidgetDomain.Math).toBe('math');
    expect(WidgetDomain.Language).toBe('language');
    expect(WidgetDomain.Science).toBe('science');
    expect(WidgetDomain.Social).toBe('social');
  });

  it('maps all legacy IDs to new IDs', () => {
    expect(WIDGET_ALIAS_MAP['open-edu.matching']).toBe('core.matching');
    expect(WIDGET_ALIAS_MAP['open-edu.multiple-choice']).toBe('core.multiple-choice');
    expect(WIDGET_ALIAS_MAP['open-edu.multiple-choice-practice']).toBe('core.multiple-choice');
    expect(WIDGET_ALIAS_MAP['open-edu.visual-counting']).toBe('core.visual-counting');
    expect(WIDGET_ALIAS_MAP['open-edu.drag-drop']).toBe('core.drag-drop');
    expect(WIDGET_ALIAS_MAP['open-edu.sequencing']).toBe('core.sequencing');
    expect(WIDGET_ALIAS_MAP['open-edu.fill-blank']).toBe('core.fill-blank');
    expect(WIDGET_ALIAS_MAP['open-edu.story-question']).toBe('core.story-question');
    expect(WIDGET_ALIAS_MAP['open-edu.real-world']).toBe('core.real-world');
    expect(WIDGET_ALIAS_MAP['open-edu.fraction-visual']).toBe('math.fraction-visual');
    expect(WIDGET_ALIAS_MAP['open-edu.place-value-chart']).toBe('math.place-value-chart');
    expect(WIDGET_ALIAS_MAP['open-edu.grid-area']).toBe('math.grid-area');
    expect(WIDGET_ALIAS_MAP['open-edu.chart-reader']).toBe('core.chart-reader');
    expect(WIDGET_ALIAS_MAP['open-edu.clock-time']).toBe('math.clock-time');
    expect(WIDGET_ALIAS_MAP['open-edu.measurement-scale']).toBe('math.measurement-scale');
  });

  it('resolveWidgetId returns new ID for legacy input', () => {
    expect(resolveWidgetId('open-edu.matching')).toBe('core.matching');
    expect(resolveWidgetId('open-edu.multiple-choice')).toBe('core.multiple-choice');
  });

  it('resolveWidgetId returns ID unchanged if not in alias map', () => {
    expect(resolveWidgetId('core.matching')).toBe('core.matching');
    expect(resolveWidgetId('unknown.widget')).toBe('unknown.widget');
  });

  it('migrateWidgetId returns migration info', () => {
    const result = migrateWidgetId('open-edu.matching');
    expect(result.oldId).toBe('open-edu.matching');
    expect(result.newId).toBe('core.matching');
    expect(result.migrated).toBe(true);
  });

  it('migrateWidgetId returns non-migrated for unknown IDs', () => {
    const result = migrateWidgetId('core.matching');
    expect(result.oldId).toBe('core.matching');
    expect(result.newId).toBe('core.matching');
    expect(result.migrated).toBe(false);
  });

  it('getDomainPrefix extracts domain from widget ID', () => {
    expect(getDomainPrefix('core.matching')).toBe('core');
    expect(getDomainPrefix('math.fraction-visual')).toBe('math');
    expect(getDomainPrefix('science.label-diagram')).toBe('science');
    expect(getDomainPrefix('unknown')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test -- __tests__/domains`
Expected: FAIL with module not found

- [ ] **Step 3: Write the implementation**

```typescript
// packages/widgets/src/domains.ts

export enum WidgetDomain {
  Core = 'core',
  Math = 'math',
  Language = 'language',
  Science = 'science',
  Social = 'social',
}

export const WIDGET_ALIAS_MAP: Record<string, string> = {
  'open-edu.matching': 'core.matching',
  'open-edu.multiple-choice': 'core.multiple-choice',
  'open-edu.multiple-choice-practice': 'core.multiple-choice',
  'open-edu.visual-counting': 'core.visual-counting',
  'open-edu.drag-drop': 'core.drag-drop',
  'open-edu.sequencing': 'core.sequencing',
  'open-edu.fill-blank': 'core.fill-blank',
  'open-edu.story-question': 'core.story-question',
  'open-edu.real-world': 'core.real-world',
  'open-edu.fraction-visual': 'math.fraction-visual',
  'open-edu.place-value-chart': 'math.place-value-chart',
  'open-edu.grid-area': 'math.grid-area',
  'open-edu.chart-reader': 'core.chart-reader',
  'open-edu.clock-time': 'math.clock-time',
  'open-edu.measurement-scale': 'math.measurement-scale',
};

export function resolveWidgetId(id: string): string {
  return WIDGET_ALIAS_MAP[id] ?? id;
}

export function migrateWidgetId(id: string): {
  oldId: string;
  newId: string;
  migrated: boolean;
} {
  const newId = resolveWidgetId(id);
  return {
    oldId: id,
    newId,
    migrated: id !== newId,
  };
}

export function getDomainPrefix(widgetId: string): string {
  const dotIndex = widgetId.indexOf('.');
  if (dotIndex === -1) return '';
  return widgetId.substring(0, dotIndex);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-edu/widgets test -- __tests__/domains`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/domains.ts packages/widgets/src/__tests__/domains.test.ts
git commit -m "feat(widgets): add widget domain constants and alias migration map"
```

---

## Task 5: Registry Refactor with Alias Resolution

**Files:**

- Modify: `packages/widgets/src/registry.ts`
- Create: `packages/widgets/src/__tests__/registry-alias.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/widgets/src/__tests__/registry-alias.test.ts
import { describe, it, expect } from 'vitest';
import { createWidgetRegistry, registerAllBuiltins } from '../registry';
import type { WidgetDefinition, WidgetDefinitionV2 } from '../types';

function makeWidget(id: string, overrides?: Partial<WidgetDefinition>): WidgetDefinition {
  return {
    id,
    render: () => null,
    ...overrides,
  };
}

function makeWidgetV2(id: string, overrides?: Partial<WidgetDefinitionV2>): WidgetDefinitionV2 {
  return {
    id,
    name: id,
    description: `Widget ${id}`,
    domain: id.split('.')[0],
    learningIntents: [],
    capabilities: {},
    accessibility: {},
    analytics: {},
    reward: {},
    ai: {},
    status: 'stable',
    render: () => null,
    ...overrides,
  };
}

describe('WidgetRegistry alias resolution', () => {
  it('resolves legacy ID to new ID via alias', () => {
    const registry = createWidgetRegistry();
    registry.register(makeWidget('core.matching'));
    registry.registerAlias('open-edu.matching', 'core.matching');

    expect(registry.has('core.matching')).toBe(true);
    expect(registry.has('open-edu.matching')).toBe(true);
    expect(registry.get('open-edu.matching')?.id).toBe('core.matching');
  });

  it('resolveAlias returns original ID if no alias exists', () => {
    const registry = createWidgetRegistry();
    expect(registry.resolveAlias('core.matching')).toBe('core.matching');
    expect(registry.resolveAlias('unknown.widget')).toBe('unknown.widget');
  });

  it('resolveAlias returns aliased ID', () => {
    const registry = createWidgetRegistry();
    registry.registerAlias('open-edu.matching', 'core.matching');
    expect(registry.resolveAlias('open-edu.matching')).toBe('core.matching');
  });

  it('get returns widget for both old and new IDs', () => {
    const registry = createWidgetRegistry();
    const widget = makeWidgetV2('core.matching', { domain: 'core', name: 'Matching' });
    registry.register(widget);
    registry.registerAlias('open-edu.matching', 'core.matching');

    expect(registry.get('core.matching')).toBe(widget);
    expect(registry.get('open-edu.matching')).toBe(widget);
  });

  it('getAll returns all registered widgets', () => {
    const registry = createWidgetRegistry();
    registry.register(makeWidget('core.matching'));
    registry.register(makeWidget('core.multiple-choice'));
    registry.register(makeWidget('math.fraction-visual'));

    const all = registry.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((w) => w.id)).toContain('core.matching');
    expect(all.map((w) => w.id)).toContain('math.fraction-visual');
  });

  it('getByDomain filters widgets by domain prefix', () => {
    const registry = createWidgetRegistry();
    registry.register(makeWidget('core.matching'));
    registry.register(makeWidget('core.multiple-choice'));
    registry.register(makeWidget('math.fraction-visual'));
    registry.register(makeWidget('math.clock-time'));

    const coreWidgets = registry.getByDomain('core');
    expect(coreWidgets).toHaveLength(2);
    expect(coreWidgets.map((w) => w.id)).toContain('core.matching');

    const mathWidgets = registry.getByDomain('math');
    expect(mathWidgets).toHaveLength(2);
    expect(mathWidgets.map((w) => w.id)).toContain('math.fraction-visual');
  });

  it('search finds widgets by name, description, or keywords', () => {
    const registry = createWidgetRegistry();
    registry.register(
      makeWidgetV2('core.matching', {
        name: 'Matching',
        description: 'Match pairs of items together',
        keywords: ['match', 'pairs', 'connect'],
      }),
    );
    registry.register(
      makeWidgetV2('core.multiple-choice', {
        name: 'Multiple Choice',
        description: 'Select the correct answer from options',
        keywords: ['quiz', 'test', 'select'],
      }),
    );

    expect(registry.search('matching')).toHaveLength(1);
    expect(registry.search('match')).toHaveLength(1);
    expect(registry.search('pairs')).toHaveLength(1);
    expect(registry.search('quiz')).toHaveLength(1);
    expect(registry.search('nonexistent')).toHaveLength(0);
  });

  it('search is case-insensitive', () => {
    const registry = createWidgetRegistry();
    registry.register(
      makeWidgetV2('core.matching', {
        name: 'Matching',
        description: 'Match pairs',
        keywords: ['match'],
      }),
    );

    expect(registry.search('MATCHING')).toHaveLength(1);
    expect(registry.search('Matching')).toHaveLength(1);
    expect(registry.search('matching')).toHaveLength(1);
  });

  it('throws on duplicate registration', () => {
    const registry = createWidgetRegistry();
    registry.register(makeWidget('core.matching'));
    expect(() => registry.register(makeWidget('core.matching'))).toThrow('already registered');
  });

  it('registers builtin widgets with alias resolution', () => {
    const registry = createWidgetRegistry();
    registerAllBuiltins(registry);

    expect(registry.has('core.matching')).toBe(true);
    expect(registry.has('open-edu.matching')).toBe(true);
    expect(registry.has('core.multiple-choice')).toBe(true);
    expect(registry.has('open-edu.multiple-choice')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test -- __tests__/registry-alias`
Expected: FAIL (new methods don't exist on registry)

- [ ] **Step 3: Write the implementation**

```typescript
// packages/widgets/src/registry.ts
import type {
  WidgetDefinition,
  WidgetDefinitionV2,
  WidgetRegistry,
  RemoteWidgetManifest,
  RemoteWidgetRegistration,
} from './types';
import { WidgetRegistrationError } from './types';
import { resolveWidgetId, WIDGET_ALIAS_MAP } from './domains';
import {
  multipleChoicePractice,
  visualCounting,
  multipleChoice,
  matching,
  dragDrop,
  sequencing,
  fillBlank,
  storyQuestion,
  realWorld,
  fractionVisual,
  placeValueChart,
  gridArea,
  chartReader,
  clockTime,
  measurementScale,
} from './builtins';

export function createWidgetRegistry(): WidgetRegistry {
  const widgets = new Map<string, WidgetDefinition>();
  const aliases = new Map<string, string>();
  const remoteWidgets = new Map<string, RemoteWidgetRegistration>();

  function resolveAndLookup(id: string): WidgetDefinition | undefined {
    const resolved = aliases.get(id) ?? id;
    return widgets.get(resolved);
  }

  return {
    register(definition: WidgetDefinition) {
      if (widgets.has(definition.id)) {
        throw new WidgetRegistrationError(definition.id);
      }
      widgets.set(definition.id, definition);
    },
    get(id: string) {
      return resolveAndLookup(id);
    },
    has(id: string) {
      return resolveAndLookup(id) !== undefined;
    },
    registerAlias(aliasId: string, targetId: string) {
      aliases.set(aliasId, targetId);
    },
    resolveAlias(id: string) {
      return aliases.get(id) ?? id;
    },
    getAll() {
      return Array.from(widgets.values());
    },
    getByDomain(domain: string) {
      return Array.from(widgets.values()).filter((w) => {
        const dotIndex = w.id.indexOf('.');
        if (dotIndex === -1) return false;
        return w.id.substring(0, dotIndex) === domain;
      });
    },
    search(query: string) {
      const lower = query.toLowerCase();
      return Array.from(widgets.values()).filter((w) => {
        if (w.id.toLowerCase().includes(lower)) return true;
        const v2 = w as WidgetDefinitionV2;
        if (v2.name?.toLowerCase().includes(lower)) return true;
        if (v2.description?.toLowerCase().includes(lower)) return true;
        if (v2.keywords?.some((k) => k.toLowerCase().includes(lower))) return true;
        return false;
      });
    },
    registerRemote(manifest: RemoteWidgetManifest) {
      const key = `${manifest.id}@${manifest.version}`;
      if (remoteWidgets.has(key)) {
        return;
      }
      remoteWidgets.set(key, { manifest, status: 'pending' });
    },
    getRemoteRegistration(manifest: RemoteWidgetManifest): RemoteWidgetRegistration | undefined {
      return remoteWidgets.get(`${manifest.id}@${manifest.version}`);
    },
    updateRemoteStatus(
      manifest: RemoteWidgetManifest,
      status: RemoteWidgetRegistration['status'],
      error?: string,
    ) {
      const key = `${manifest.id}@${manifest.version}`;
      const existing = remoteWidgets.get(key);
      if (existing) {
        existing.status = status;
        existing.error = error;
      }
    },
  };
}

const BUILTIN_WIDGETS: WidgetDefinition[] = [
  multipleChoicePractice,
  visualCounting,
  multipleChoice,
  matching,
  dragDrop,
  sequencing,
  fillBlank,
  storyQuestion,
  realWorld,
  fractionVisual,
  placeValueChart,
  gridArea,
  chartReader,
  clockTime,
  measurementScale,
];

export function registerAllBuiltins(registry: WidgetRegistry): void {
  for (const widget of BUILTIN_WIDGETS) {
    registry.register(widget);
  }
  for (const [aliasId, targetId] of Object.entries(WIDGET_ALIAS_MAP)) {
    registry.registerAlias(aliasId, targetId);
  }
}

export function createDefaultRegistry(): WidgetRegistry {
  const registry = createWidgetRegistry();
  registerAllBuiltins(registry);
  return registry;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-edu/widgets test -- __tests__/registry-alias`
Expected: PASS

- [ ] **Step 5: Run all existing widget tests to ensure no regressions**

Run: `pnpm --filter @open-edu/widgets test`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add packages/widgets/src/registry.ts packages/widgets/src/__tests__/registry-alias.test.ts
git commit -m "feat(widgets): add alias resolution, domain filtering, and search to registry"
```

---

## Task 6: Update Existing Widgets (Batch 1 — Core Domain)

**Files:**

- Modify: `packages/widgets/src/builtins/MultipleChoice/MultipleChoice.tsx` (lines 442-455)
- Modify: `packages/widgets/src/builtins/Matching/Matching.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/DragDrop/DragDrop.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/Sequencing/Sequencing.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/FillBlank/FillBlank.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/VisualCounting/VisualCounting.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/StoryQuestion/StoryQuestion.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/RealWorld/RealWorld.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/ChartReader/ChartReader.tsx` (last ~10 lines)

- [ ] **Step 1: Update MultipleChoice widget definition**

In `packages/widgets/src/builtins/MultipleChoice/MultipleChoice.tsx`, replace lines 442-455:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const MultipleChoiceWidget: WidgetDefinitionV2 = {
  id: 'core.multiple-choice',
  version: '1.0.0',
  name: 'Multiple Choice',
  description: 'Select the correct answer from a list of options',
  domain: 'core',
  learningIntents: [LearningIntent.Assess],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackMistakes: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
    positiveMessage: 'Correct!',
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 3,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    subjectTags: ['general'],
    authoringPrompt: 'Create a multiple-choice question with 3-4 options and one correct answer',
  },
  icon: 'circle-check',
  keywords: ['quiz', 'test', 'select', 'options', 'choice'],
  status: 'stable',
  render: MultipleChoiceComponent,
};

const LegacyChoiceWidget: WidgetDefinitionV2 = {
  ...MultipleChoiceWidget,
  id: 'open-edu.multiple-choice-practice',
  name: 'Multiple Choice (Practice)',
  status: 'deprecated',
  deprecated: true,
  replacement: 'core.multiple-choice',
  learningIntents: [LearningIntent.Practice],
};

export { MultipleChoiceWidget as multipleChoice };
export { LegacyChoiceWidget as multipleChoicePractice };
export default MultipleChoiceWidget;
```

- [ ] **Step 2: Update Matching widget definition**

At the end of `packages/widgets/src/builtins/Matching/Matching.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const MatchingWidget: WidgetDefinitionV2 = {
  id: 'core.matching',
  version: '1.0.0',
  name: 'Matching',
  description: 'Match pairs of items by dragging or selecting',
  domain: 'core',
  learningIntents: [LearningIntent.Practice, LearningIntent.Compare],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackMistakes: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 3,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    subjectTags: ['general'],
    authoringPrompt: 'Create a matching exercise with 4-6 pairs',
  },
  icon: 'puzzle',
  keywords: ['match', 'pairs', 'connect', 'drag'],
  status: 'stable',
  render: MatchingComponent,
};

export { MatchingWidget as matching };
export default MatchingWidget;
```

- [ ] **Step 3: Update DragDrop widget definition**

At the end of `packages/widgets/src/builtins/DragDrop/DragDrop.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const DragDropWidget: WidgetDefinitionV2 = {
  id: 'core.drag-drop',
  version: '1.0.0',
  name: 'Drag & Drop',
  description: 'Drag items to correct locations or categories',
  domain: 'core',
  learningIntents: [LearningIntent.Practice, LearningIntent.Compare],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 5,
    bloomsLevel: 'apply',
    cognitiveLoad: 'moderate',
    subjectTags: ['general'],
    authoringPrompt: 'Create a drag-and-drop categorization exercise',
  },
  icon: 'move',
  keywords: ['drag', 'drop', 'sort', 'categorize'],
  status: 'stable',
  render: DragDropComponent,
};

export { DragDropWidget as dragDrop };
export default DragDropWidget;
```

- [ ] **Step 4: Update Sequencing widget definition**

At the end of `packages/widgets/src/builtins/Sequencing/Sequencing.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const SequencingWidget: WidgetDefinitionV2 = {
  id: 'core.sequencing',
  version: '1.0.0',
  name: 'Sequencing',
  description: 'Arrange items in the correct order',
  domain: 'core',
  learningIntents: [LearningIntent.Practice, LearningIntent.Apply],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 5,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    subjectTags: ['general'],
    authoringPrompt: 'Create a sequencing exercise with 4-6 steps in logical order',
  },
  icon: 'list-ordered',
  keywords: ['sequence', 'order', 'steps', 'sort', '排列'],
  status: 'stable',
  render: SequencingComponent,
};

export { SequencingWidget as sequencing };
export default SequencingWidget;
```

- [ ] **Step 5: Update FillBlank widget definition**

At the end of `packages/widgets/src/builtins/FillBlank/FillBlank.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const FillBlankWidget: WidgetDefinitionV2 = {
  id: 'core.fill-blank',
  version: '1.0.0',
  name: 'Fill in the Blank',
  description: 'Complete sentences or equations by filling in missing parts',
  domain: 'core',
  learningIntents: [LearningIntent.Assess, LearningIntent.Practice],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackMistakes: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 3,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    subjectTags: ['general', 'language', 'math'],
    authoringPrompt: 'Create a fill-in-the-blank exercise with 3-5 blanks',
  },
  icon: 'text-cursor-input',
  keywords: ['fill', 'blank', 'complete', 'gap', '填空'],
  status: 'stable',
  render: FillBlankComponent,
};

export { FillBlankWidget as fillBlank };
export default FillBlankWidget;
```

- [ ] **Step 6: Update VisualCounting widget definition**

At the end of `packages/widgets/src/builtins/VisualCounting/VisualCounting.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const VisualCountingWidget: WidgetDefinitionV2 = {
  id: 'core.visual-counting',
  version: '1.0.0',
  name: 'Visual Counting',
  description: 'Count visual objects and identify quantities',
  domain: 'core',
  learningIntents: [LearningIntent.Observe, LearningIntent.Practice],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 2,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    subjectTags: ['math', 'counting'],
    authoringPrompt: 'Create a visual counting exercise with clear images',
  },
  icon: 'hash',
  keywords: ['count', 'visual', 'number', 'quantity', '数数'],
  status: 'stable',
  render: VisualCountingComponent,
};

export { VisualCountingWidget as visualCounting };
export default VisualCountingWidget;
```

- [ ] **Step 7: Update StoryQuestion widget definition**

At the end of `packages/widgets/src/builtins/StoryQuestion/StoryQuestion.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const StoryQuestionWidget: WidgetDefinitionV2 = {
  id: 'core.story-question',
  version: '1.0.0',
  name: 'Story Question',
  description: 'Reading comprehension with story-based questions',
  domain: 'core',
  learningIntents: [LearningIntent.Assess, LearningIntent.Reflect],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    captions: true,
    easyLanguage: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 5,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    subjectTags: ['language', 'reading'],
    authoringPrompt: 'Create a story-based comprehension question',
  },
  icon: 'book-open',
  keywords: ['story', 'reading', 'comprehension', 'question', '阅读'],
  status: 'stable',
  render: StoryQuestionComponent,
};

export { StoryQuestionWidget as storyQuestion };
export default StoryQuestionWidget;
```

- [ ] **Step 8: Update RealWorld widget definition**

At the end of `packages/widgets/src/builtins/RealWorld/RealWorld.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const RealWorldWidget: WidgetDefinitionV2 = {
  id: 'core.real-world',
  version: '1.0.0',
  name: 'Real World',
  description: 'Apply learning to real-world scenarios and contexts',
  domain: 'core',
  learningIntents: [LearningIntent.Apply, LearningIntent.Explore],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 5,
    bloomsLevel: 'apply',
    cognitiveLoad: 'moderate',
    subjectTags: ['general'],
    authoringPrompt: 'Create a real-world application scenario',
  },
  icon: 'globe',
  keywords: ['real', 'world', 'application', 'scenario', '实际'],
  status: 'stable',
  render: RealWorldComponent,
};

export { RealWorldWidget as realWorld };
export default RealWorldWidget;
```

- [ ] **Step 9: Update ChartReader widget definition**

At the end of `packages/widgets/src/builtins/ChartReader/ChartReader.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const ChartReaderWidget: WidgetDefinitionV2 = {
  id: 'core.chart-reader',
  version: '1.0.0',
  name: 'Chart Reader',
  description: 'Read and interpret charts, graphs, and data visualizations',
  domain: 'core',
  learningIntents: [LearningIntent.Observe, LearningIntent.Apply],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 4,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    subjectTags: ['math', 'data'],
    authoringPrompt: 'Create a chart-reading exercise with bar or line charts',
  },
  icon: 'bar-chart-2',
  keywords: ['chart', 'graph', 'data', 'read', '图表'],
  status: 'stable',
  render: ChartReaderComponent,
};

export { ChartReaderWidget as chartReader };
export default ChartReaderWidget;
```

- [ ] **Step 10: Run all widget tests**

Run: `pnpm --filter @open-edu/widgets test`
Expected: ALL PASS (existing widget tests may need ID updates)

- [ ] **Step 11: Commit**

```bash
git add packages/widgets/src/builtins/
git commit -m "feat(widgets): update core domain widgets with V2 metadata and new IDs"
```

---

## Task 7: Update Existing Widgets (Batch 2 — Math Domain)

**Files:**

- Modify: `packages/widgets/src/builtins/FractionVisual/FractionVisual.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/PlaceValueChart/PlaceValueChart.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/GridArea/GridArea.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/ClockTime/ClockTime.tsx` (last ~10 lines)
- Modify: `packages/widgets/src/builtins/MeasurementScale/MeasurementScale.tsx` (last ~10 lines)

- [ ] **Step 1: Update FractionVisual widget definition**

At the end of `packages/widgets/src/builtins/FractionVisual/FractionVisual.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const FractionVisualWidget: WidgetDefinitionV2 = {
  id: 'math.fraction-visual',
  version: '1.0.0',
  name: 'Fraction Visual',
  description: 'Visualize and manipulate fractions with interactive models',
  domain: 'math',
  learningIntents: [LearningIntent.Observe, LearningIntent.Explore],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsAnimation: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 3,
    bloomsLevel: 'understand',
    cognitiveLoad: 'low',
    subjectTags: ['math', 'fractions'],
    authoringPrompt: 'Create a fraction visualization exercise with clear visual models',
  },
  icon: 'pie-chart',
  keywords: ['fraction', 'visual', 'math', '分数'],
  status: 'stable',
  render: FractionVisualComponent,
};

export { FractionVisualWidget as fractionVisual };
export default FractionVisualWidget;
```

- [ ] **Step 2: Update PlaceValueChart widget definition**

At the end of `packages/widgets/src/builtins/PlaceValueChart/PlaceValueChart.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const PlaceValueChartWidget: WidgetDefinitionV2 = {
  id: 'math.place-value-chart',
  version: '1.0.0',
  name: 'Place Value Chart',
  description: 'Understand place value with interactive chart manipulation',
  domain: 'math',
  learningIntents: [LearningIntent.Observe, LearningIntent.Practice],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 3,
    bloomsLevel: 'understand',
    cognitiveLoad: 'low',
    subjectTags: ['math', 'place-value'],
    authoringPrompt: 'Create a place value chart exercise for multi-digit numbers',
  },
  icon: 'table',
  keywords: ['place', 'value', 'chart', 'math', '位值'],
  status: 'stable',
  render: PlaceValueChartComponent,
};

export { PlaceValueChartWidget as placeValueChart };
export default PlaceValueChartWidget;
```

- [ ] **Step 3: Update GridArea widget definition**

At the end of `packages/widgets/src/builtins/GridArea/GridArea.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const GridAreaWidget: WidgetDefinitionV2 = {
  id: 'math.grid-area',
  version: '1.0.0',
  name: 'Grid Area',
  description: 'Calculate and visualize area using grid models',
  domain: 'math',
  learningIntents: [LearningIntent.Practice, LearningIntent.Apply],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 4,
    bloomsLevel: 'apply',
    cognitiveLoad: 'moderate',
    subjectTags: ['math', 'geometry', 'area'],
    authoringPrompt: 'Create a grid-area calculation exercise',
  },
  icon: 'grid-3x3',
  keywords: ['grid', 'area', 'math', 'geometry', '面积'],
  status: 'stable',
  render: GridAreaComponent,
};

export { GridAreaWidget as gridArea };
export default GridAreaWidget;
```

- [ ] **Step 4: Update ClockTime widget definition**

At the end of `packages/widgets/src/builtins/ClockTime/ClockTime.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const ClockTimeWidget: WidgetDefinitionV2 = {
  id: 'math.clock-time',
  version: '1.0.0',
  name: 'Clock Time',
  description: 'Read and set time on analog and digital clocks',
  domain: 'math',
  learningIntents: [LearningIntent.Practice, LearningIntent.Apply],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsAnimation: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 3,
    bloomsLevel: 'understand',
    cognitiveLoad: 'low',
    subjectTags: ['math', 'time'],
    authoringPrompt: 'Create a clock-reading exercise with analog and digital times',
  },
  icon: 'clock',
  keywords: ['clock', 'time', 'math', '时钟', '时间'],
  status: 'stable',
  render: ClockTimeComponent,
};

export { ClockTimeWidget as clockTime };
export default ClockTimeWidget;
```

- [ ] **Step 5: Update MeasurementScale widget definition**

At the end of `packages/widgets/src/builtins/MeasurementScale/MeasurementScale.tsx`, replace the existing `WidgetDefinition` export:

```typescript
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

const MeasurementScaleWidget: WidgetDefinitionV2 = {
  id: 'math.measurement-scale',
  version: '1.0.0',
  name: 'Measurement Scale',
  description: 'Measure lengths, weights, and volumes using interactive scales',
  domain: 'math',
  learningIntents: [LearningIntent.Practice, LearningIntent.Apply],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
  },
  reward: {
    completionXP: 10,
    confetti: true,
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 4,
    bloomsLevel: 'apply',
    cognitiveLoad: 'moderate',
    subjectTags: ['math', 'measurement'],
    authoringPrompt: 'Create a measurement exercise using scales and rulers',
  },
  icon: 'ruler',
  keywords: ['measurement', 'scale', 'math', 'ruler', '测量'],
  status: 'stable',
  render: MeasurementScaleComponent,
};

export { MeasurementScaleWidget as measurementScale };
export default MeasurementScaleWidget;
```

- [ ] **Step 6: Run all widget tests**

Run: `pnpm --filter @open-edu/widgets test`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/widgets/src/builtins/
git commit -m "feat(widgets): update math domain widgets with V2 metadata and new IDs"
```

---

## Task 8: Update Widget Exports & Builtins Barrel

**Files:**

- Modify: `packages/widgets/src/builtins/index.ts`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Update builtins barrel export**

Replace `packages/widgets/src/builtins/index.ts`:

```typescript
export { multipleChoicePractice } from './multipleChoicePractice';
export { multipleChoice } from './MultipleChoice/MultipleChoice';
export { visualCounting } from './VisualCounting/VisualCounting';
export { matching } from './Matching/Matching';
export { dragDrop } from './DragDrop/DragDrop';
export { sequencing } from './Sequencing/Sequencing';
export { fillBlank } from './FillBlank/FillBlank';
export { storyQuestion } from './StoryQuestion/StoryQuestion';
export { realWorld } from './RealWorld/RealWorld';
export { fractionVisual } from './FractionVisual/FractionVisual';
export { chartReader } from './ChartReader/ChartReader';
export { gridArea } from './GridArea/GridArea';
export { placeValueChart } from './PlaceValueChart/PlaceValueChart';
export { measurementScale } from './MeasurementScale/MeasurementScale';
export { clockTime } from './ClockTime/ClockTime';
export { callout } from './Callout/Callout';
export { imageCompare } from './ImageCompare/ImageCompare';
export { hotspot } from './Hotspot/Hotspot';
export { timeline } from './Timeline/Timeline';
export { labelDiagram } from './LabelDiagram/LabelDiagram';
export { imageLabel } from './ImageLabel/ImageLabel';
```

- [ ] **Step 2: Update main index.ts exports**

Replace `packages/widgets/src/index.ts`:

```typescript
export const WIDGETS_VERSION = '0.2.0';

export type {
  WidgetRenderProps,
  WidgetDefinition,
  WidgetDefinitionV2,
  WidgetRegistry,
  RemoteWidgetManifest,
  RemoteWidgetRegistration,
} from './types';
export { WidgetRegistrationError } from './types';
export { createWidgetRegistry, registerAllBuiltins, createDefaultRegistry } from './registry';
export { RemoteWidgetLoader } from './remote-loader';
export type { RemoteWidgetLoadResult, EvaluateModule } from './remote-loader';
export { useRemoteWidget } from './use-remote-widget';
export type { UseRemoteWidgetResult } from './use-remote-widget';
export { Button } from '@open-edu/design-system';
export type { ButtonProps } from '@open-edu/design-system';
export { useObserveMode } from './use-observe-mode';
export type { ObserveModeOptions } from './use-observe-mode';

export {
  multipleChoicePractice,
  multipleChoice,
  visualCounting,
  matching,
  dragDrop,
  sequencing,
  fillBlank,
  storyQuestion,
  realWorld,
  fractionVisual,
  chartReader,
  gridArea,
  placeValueChart,
  measurementScale,
  clockTime,
  callout,
  imageCompare,
  hotspot,
  timeline,
  labelDiagram,
  imageLabel,
} from './builtins';

export {
  WidgetDomain,
  WIDGET_ALIAS_MAP,
  resolveWidgetId,
  migrateWidgetId,
  getDomainPrefix,
} from './domains';

export {
  LearningIntent,
  WIDGET_LEARNING_INTENTS,
  getLearningIntentsForWidget,
  getWidgetsByLearningIntent,
} from './metadata/learning-intents';

export type {
  WidgetCapabilities,
  AccessibilityMetadata,
  AnalyticsMetadata,
  RewardMetadata,
  AIMetadata,
  BloomsLevel,
  CognitiveLoad,
  DifficultyLevel,
} from './metadata';
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @open-edu/widgets typecheck`
Expected: PASS (new stub imports will fail until Task 9 creates them)

- [ ] **Step 4: Commit**

```bash
git add packages/widgets/src/builtins/index.ts packages/widgets/src/index.ts
git commit -m "feat(widgets): update barrel exports for V2 types, domains, and metadata"
```

---

## Task 9: Foundation Widget Stubs

**Files:**

- Create: `packages/widgets/src/builtins/Callout/Callout.tsx`
- Create: `packages/widgets/src/builtins/Callout/Callout.test.tsx`
- Create: `packages/widgets/src/builtins/ImageCompare/ImageCompare.tsx`
- Create: `packages/widgets/src/builtins/ImageCompare/ImageCompare.test.tsx`
- Create: `packages/widgets/src/builtins/Hotspot/Hotspot.tsx`
- Create: `packages/widgets/src/builtins/Hotspot/Hotspot.test.tsx`
- Create: `packages/widgets/src/builtins/Timeline/Timeline.tsx`
- Create: `packages/widgets/src/builtins/Timeline/Timeline.test.tsx`
- Create: `packages/widgets/src/builtins/LabelDiagram/LabelDiagram.tsx`
- Create: `packages/widgets/src/builtins/LabelDiagram/LabelDiagram.test.tsx`
- Create: `packages/widgets/src/builtins/ImageLabel/ImageLabel.tsx`
- Create: `packages/widgets/src/builtins/ImageLabel/ImageLabel.test.tsx`

- [ ] **Step 1: Create Callout stub**

```typescript
// packages/widgets/src/builtins/Callout/Callout.tsx
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function CalloutComponent() {
  return (
    <div role="region" aria-label="Callout">
      <p>Callout widget — coming soon</p>
    </div>
  );
}

const CalloutWidget: WidgetDefinitionV2 = {
  id: 'core.callout',
  version: '0.1.0',
  name: 'Callout',
  description: 'Highlight important information with styled callout boxes',
  domain: 'core',
  learningIntents: [LearningIntent.Observe],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    screenReader: true,
    ariaSupport: true,
  },
  analytics: {},
  reward: {},
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 1,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    subjectTags: ['general'],
    authoringPrompt: 'Create a callout to highlight key information',
  },
  icon: 'alert-circle',
  keywords: ['callout', 'highlight', 'note', 'info'],
  status: 'experimental',
  render: CalloutComponent,
};

export { CalloutWidget as callout };
export default CalloutWidget;
```

- [ ] **Step 2: Create Callout test**

```typescript
// packages/widgets/src/builtins/Callout/Callout.test.tsx
import { describe, it, expect } from 'vitest';
import { callout } from './Callout';

describe('Callout widget', () => {
  it('has correct widget id', () => {
    expect(callout.id).toBe('core.callout');
  });

  it('has a render function', () => {
    expect(typeof callout.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(callout.domain).toBe('core');
  });

  it('has learning intents', () => {
    expect(callout.learningIntents).toContain('observe');
  });

  it('is experimental status', () => {
    expect(callout.status).toBe('experimental');
  });
});
```

- [ ] **Step 3: Create ImageCompare stub**

```typescript
// packages/widgets/src/builtins/ImageCompare/ImageCompare.tsx
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function ImageCompareComponent() {
  return (
    <div role="region" aria-label="Image Compare">
      <p>Image Compare widget — coming soon</p>
    </div>
  );
}

const ImageCompareWidget: WidgetDefinitionV2 = {
  id: 'core.image-compare',
  version: '0.1.0',
  name: 'Image Compare',
  description: 'Compare two images side by side to identify differences or similarities',
  domain: 'core',
  learningIntents: [LearningIntent.Compare, LearningIntent.Observe],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    screenReader: true,
    ariaSupport: true,
  },
  analytics: {},
  reward: {},
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 2,
    bloomsLevel: 'understand',
    cognitiveLoad: 'low',
    subjectTags: ['general'],
    authoringPrompt: 'Create an image comparison exercise highlighting key differences',
  },
  icon: 'columns-2',
  keywords: ['image', 'compare', 'difference', 'side-by-side'],
  status: 'experimental',
  render: ImageCompareComponent,
};

export { ImageCompareWidget as imageCompare };
export default ImageCompareWidget;
```

- [ ] **Step 4: Create ImageCompare test**

```typescript
// packages/widgets/src/builtins/ImageCompare/ImageCompare.test.tsx
import { describe, it, expect } from 'vitest';
import { imageCompare } from './ImageCompare';

describe('ImageCompare widget', () => {
  it('has correct widget id', () => {
    expect(imageCompare.id).toBe('core.image-compare');
  });

  it('has a render function', () => {
    expect(typeof imageCompare.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(imageCompare.domain).toBe('core');
  });

  it('has learning intents', () => {
    expect(imageCompare.learningIntents).toContain('compare');
    expect(imageCompare.learningIntents).toContain('observe');
  });
});
```

- [ ] **Step 5: Create Hotspot stub**

```typescript
// packages/widgets/src/builtins/Hotspot/Hotspot.tsx
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function HotspotComponent() {
  return (
    <div role="region" aria-label="Hotspot">
      <p>Hotspot widget — coming soon</p>
    </div>
  );
}

const HotspotWidget: WidgetDefinitionV2 = {
  id: 'core.hotspot',
  version: '0.1.0',
  name: 'Hotspot',
  description: 'Click or tap on specific areas of an image to answer questions',
  domain: 'core',
  learningIntents: [LearningIntent.Explore, LearningIntent.Assess],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
  },
  analytics: {},
  reward: {},
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 3,
    bloomsLevel: 'apply',
    cognitiveLoad: 'moderate',
    subjectTags: ['general'],
    authoringPrompt: 'Create a hotspot exercise with clickable regions on an image',
  },
  icon: 'mouse-pointer-click',
  keywords: ['hotspot', 'click', 'tap', 'image', 'interactive'],
  status: 'experimental',
  render: HotspotComponent,
};

export { HotspotWidget as hotspot };
export default HotspotWidget;
```

- [ ] **Step 6: Create Hotspot test**

```typescript
// packages/widgets/src/builtins/Hotspot/Hotspot.test.tsx
import { describe, it, expect } from 'vitest';
import { hotspot } from './Hotspot';

describe('Hotspot widget', () => {
  it('has correct widget id', () => {
    expect(hotspot.id).toBe('core.hotspot');
  });

  it('has a render function', () => {
    expect(typeof hotspot.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(hotspot.domain).toBe('core');
  });

  it('has learning intents', () => {
    expect(hotspot.learningIntents).toContain('explore');
  });
});
```

- [ ] **Step 7: Create Timeline stub**

```typescript
// packages/widgets/src/builtins/Timeline/Timeline.tsx
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function TimelineComponent() {
  return (
    <div role="region" aria-label="Timeline">
      <p>Timeline widget — coming soon</p>
    </div>
  );
}

const TimelineWidget: WidgetDefinitionV2 = {
  id: 'core.timeline',
  version: '0.1.0',
  name: 'Timeline',
  description: 'Explore events in chronological order with interactive timeline',
  domain: 'core',
  learningIntents: [LearningIntent.Apply, LearningIntent.Observe],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
  },
  analytics: {},
  reward: {},
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 4,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    subjectTags: ['history', 'social'],
    authoringPrompt: 'Create a timeline exercise with 4-6 events in chronological order',
  },
  icon: 'git-branch',
  keywords: ['timeline', 'events', 'chronological', 'history', '时间线'],
  status: 'experimental',
  render: TimelineComponent,
};

export { TimelineWidget as timeline };
export default TimelineWidget;
```

- [ ] **Step 8: Create Timeline test**

```typescript
// packages/widgets/src/builtins/Timeline/Timeline.test.tsx
import { describe, it, expect } from 'vitest';
import { timeline } from './Timeline';

describe('Timeline widget', () => {
  it('has correct widget id', () => {
    expect(timeline.id).toBe('core.timeline');
  });

  it('has a render function', () => {
    expect(typeof timeline.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(timeline.domain).toBe('core');
  });

  it('has learning intents', () => {
    expect(timeline.learningIntents).toContain('apply');
  });
});
```

- [ ] **Step 9: Create LabelDiagram stub**

```typescript
// packages/widgets/src/builtins/LabelDiagram/LabelDiagram.tsx
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function LabelDiagramComponent() {
  return (
    <div role="region" aria-label="Label Diagram">
      <p>Label Diagram widget — coming soon</p>
    </div>
  );
}

const LabelDiagramWidget: WidgetDefinitionV2 = {
  id: 'science.label-diagram',
  version: '0.1.0',
  name: 'Label Diagram',
  description: 'Label parts of a scientific diagram or illustration',
  domain: 'science',
  learningIntents: [LearningIntent.Apply, LearningIntent.Assess],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
  },
  analytics: {},
  reward: {},
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 4,
    bloomsLevel: 'apply',
    cognitiveLoad: 'moderate',
    subjectTags: ['science', 'biology', 'anatomy'],
    authoringPrompt: 'Create a diagram labeling exercise with drag-and-drop labels',
  },
  icon: 'tag',
  keywords: ['label', 'diagram', 'science', 'parts', '标注'],
  status: 'experimental',
  render: LabelDiagramComponent,
};

export { LabelDiagramWidget as labelDiagram };
export default LabelDiagramWidget;
```

- [ ] **Step 10: Create LabelDiagram test**

```typescript
// packages/widgets/src/builtins/LabelDiagram/LabelDiagram.test.tsx
import { describe, it, expect } from 'vitest';
import { labelDiagram } from './LabelDiagram';

describe('LabelDiagram widget', () => {
  it('has correct widget id', () => {
    expect(labelDiagram.id).toBe('science.label-diagram');
  });

  it('has a render function', () => {
    expect(typeof labelDiagram.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(labelDiagram.domain).toBe('science');
  });

  it('has learning intents', () => {
    expect(labelDiagram.learningIntents).toContain('apply');
  });
});
```

- [ ] **Step 11: Create ImageLabel stub**

```typescript
// packages/widgets/src/builtins/ImageLabel/ImageLabel.tsx
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';

function ImageLabelComponent() {
  return (
    <div role="region" aria-label="Image Label">
      <p>Image Label widget — coming soon</p>
    </div>
  );
}

const ImageLabelWidget: WidgetDefinitionV2 = {
  id: 'science.image-label',
  version: '0.1.0',
  name: 'Image Label',
  description: 'Identify and label parts of an image or photograph',
  domain: 'science',
  learningIntents: [LearningIntent.Observe, LearningIntent.Apply],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsOffline: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
  },
  analytics: {},
  reward: {},
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 3,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    subjectTags: ['science'],
    authoringPrompt: 'Create an image labeling exercise identifying key features',
  },
  icon: 'image',
  keywords: ['image', 'label', 'identify', 'photo', '图片'],
  status: 'experimental',
  render: ImageLabelComponent,
};

export { ImageLabelWidget as imageLabel };
export default ImageLabelWidget;
```

- [ ] **Step 12: Create ImageLabel test**

```typescript
// packages/widgets/src/builtins/ImageLabel/ImageLabel.test.tsx
import { describe, it, expect } from 'vitest';
import { imageLabel } from './ImageLabel';

describe('ImageLabel widget', () => {
  it('has correct widget id', () => {
    expect(imageLabel.id).toBe('science.image-label');
  });

  it('has a render function', () => {
    expect(typeof imageLabel.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(imageLabel.domain).toBe('science');
  });

  it('has learning intents', () => {
    expect(imageLabel.learningIntents).toContain('observe');
  });
});
```

- [ ] **Step 13: Run all tests**

Run: `pnpm --filter @open-edu/widgets test`
Expected: ALL PASS (21 widgets: 15 existing + 6 stubs)

- [ ] **Step 14: Commit**

```bash
git add packages/widgets/src/builtins/
git commit -m "feat(widgets): add 6 foundation widget stubs with V2 metadata"
```

---

## Task 10: Update Runtime for Alias-Aware Lookup

**Files:**

- Modify: `packages/runtime/src/renderers/WidgetRenderer.tsx` (lines 48-52)
- Modify: `packages/runtime/src/components/WidgetCanvas.tsx` (lines 13-19)

- [ ] **Step 1: Update resolveWidgetId to use registry alias resolution**

In `packages/runtime/src/renderers/WidgetRenderer.tsx`, the `resolveWidgetId` function currently returns a raw string. The registry's `get()` method now handles alias resolution internally, so `resolveWidgetId` itself does not need to change. However, verify that the call at line 74 (`widgetRegistry?.get(widgetId)`) works correctly with aliases by reading the current code:

```typescript
// Read current lines 48-80 of WidgetRenderer.tsx
// The registry.get() already resolves aliases, so no change needed here.
// Just verify the existing code path works.
```

- [ ] **Step 2: Update WidgetCanvas formatWidgetName for new ID format**

In `packages/runtime/src/components/WidgetCanvas.tsx`, update the `formatWidgetName` function to handle both old and new ID formats:

```typescript
// packages/runtime/src/components/WidgetCanvas.tsx
// Replace the existing formatWidgetName function (lines 13-19):

function formatWidgetName(id: string): string {
  // Handle both old "open-edu.matching" and new "core.matching" formats
  const parts = id.split('.');
  const name = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

- [ ] **Step 3: Run runtime tests**

Run: `pnpm --filter @open-edu/runtime test`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/runtime/src/renderers/WidgetRenderer.tsx packages/runtime/src/components/WidgetCanvas.tsx
git commit -m "fix(runtime): ensure widget renderer handles alias-resolved IDs"
```

---

## Task 11: Update Example Packages for New Widget IDs

**Files:**

- Modify: `examples/widget-showcase/nodes/*.json` (update widget IDs)
- Modify: `examples/widget-practice/nodes/practice.json` (update widget ID)
- Modify: `examples/living-vs-nonliving/nodes/*.json` (update widget IDs)
- Modify: `packages/course-compiler/src/generators/package-generator.ts` (line 255, hardcoded quiz widget)

- [ ] **Step 1: Update widget-showcase node files**

For each JSON file in `examples/widget-showcase/nodes/`, update the `widget` field from `open-edu.*` to the new domain-prefixed ID:

- `multiple-choice.json`: `"widget": "open-edu.multiple-choice"` → `"widget": "core.multiple-choice"`
- `multiple-choice-practice.json`: `"widget": "open-edu.multiple-choice-practice"` → `"widget": "core.multiple-choice"`
- `visual-counting.json`: `"widget": "open-edu.visual-counting"` → `"widget": "core.visual-counting"`
- `matching.json`: `"widget": "open-edu.matching"` → `"widget": "core.matching"`
- `drag-drop.json`: `"widget": "open-edu.drag-drop"` → `"widget": "core.drag-drop"`
- `sequencing.json`: `"widget": "open-edu.sequencing"` → `"widget": "core.sequencing"`
- `fill-blank.json`: `"widget": "open-edu.fill-blank"` → `"widget": "core.fill-blank"`
- `story-question.json`: `"widget": "open-edu.story-question"` → `"widget": "core.story-question"`
- `real-world.json`: `"widget": "open-edu.real-world"` → `"widget": "core.real-world"`
- `fraction-visual.json`: `"widget": "open-edu.fraction-visual"` → `"widget": "math.fraction-visual"`
- `place-value-chart.json`: `"widget": "open-edu.place-value-chart"` → `"widget": "math.place-value-chart"`
- `grid-area.json`: `"widget": "open-edu.grid-area"` → `"widget": "math.grid-area"`
- `chart-reader.json`: `"widget": "open-edu.chart-reader"` → `"widget": "core.chart-reader"`
- `clock-time.json`: `"widget": "open-edu.clock-time"` → `"widget": "math.clock-time"`
- `measurement-scale.json`: `"widget": "open-edu.measurement-scale"` → `"widget": "math.measurement-scale"`

- [ ] **Step 2: Update widget-practice node file**

In `examples/widget-practice/nodes/practice.json`:

- `"widget": "open-edu.multiple-choice-practice"` → `"widget": "core.multiple-choice"`

- [ ] **Step 3: Update living-vs-nonliving node files**

For each JSON file in `examples/living-vs-nonliving/nodes/`:

- `observe.json`: `"widget": "open-edu.visual-counting"` → `"widget": "core.visual-counting"`
- `guided-practice.json`: `"widget": "open-edu.matching"` → `"widget": "core.matching"`
- `mastery-check.json`: `"widget": "open-edu.multiple-choice"` → `"widget": "core.multiple-choice"`
- `independent-practice.json`: `"widget": "open-edu.multiple-choice"` → `"widget": "core.multiple-choice"`

- [ ] **Step 4: Update hardcoded quiz widget in compiler**

In `packages/course-compiler/src/generators/package-generator.ts` line 255, change:

```typescript
// FROM:
widget: 'open-edu.multiple-choice';
// TO:
widget: 'core.multiple-choice';
```

- [ ] **Step 5: Run compiler tests**

Run: `pnpm --filter @open-edu/course-compiler test`
Expected: ALL PASS

- [ ] **Step 6: Run example validation if available**

Run: `pnpm --filter @open-edu/core test` (if examples are validated)
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add examples/ packages/course-compiler/src/generators/package-generator.ts
git commit -m "feat: update example packages and compiler to use new widget IDs"
```

---

## Task 12: End-to-End Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: ALL PASS

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: ALL PASS

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: ALL PASS

- [ ] **Step 4: Run format check**

Run: `pnpm format:check`
Expected: ALL PASS (or run `pnpm format` to fix)

- [ ] **Step 5: Build all packages**

Run: `pnpm build`
Expected: ALL PASS

- [ ] **Step 6: Verify backward compatibility**

The alias map ensures that any course using old `open-edu.*` widget IDs will still resolve correctly at runtime. The registry's `get()` method resolves aliases transparently.

Verify by checking that `createDefaultRegistry().get('open-edu.matching')` returns the matching widget (this is already tested in Task 5).

- [ ] **Step 7: Final commit if formatting was needed**

```bash
git add -A
git commit -m "chore: format and finalize widget system v2"
```

---

## Spec Coverage Checklist

| Spec Part | Title                          | Status      | Task(s)                  |
| --------- | ------------------------------ | ----------- | ------------------------ |
| Part 1    | Learning Intent Classification | ✅ Covered  | Task 1                   |
| Part 2    | Widget Registry                | ✅ Covered  | Tasks 2, 3, 5            |
| Part 3    | Widget Domains                 | ✅ Covered  | Tasks 4, 6, 7            |
| Part 4    | Widget Capabilities            | ✅ Covered  | Task 2                   |
| Part 5    | Accessibility Metadata         | ✅ Covered  | Task 2                   |
| Part 6    | Analytics Metadata             | ✅ Covered  | Task 2                   |
| Part 7    | Reward Metadata                | ✅ Covered  | Task 2                   |
| Part 8    | AI Metadata                    | ✅ Covered  | Task 2                   |
| Part 9    | Foundation Widgets             | ✅ Covered  | Task 9                   |
| Part 10   | Merge Duplicate Widgets        | ✅ Covered  | Task 6 (MC legacy alias) |
| Part 11   | Package Structure              | ⚠️ Deferred | See Future Work          |
| Part 12   | Registry Driven Documentation  | ⚠️ Deferred | See Future Work          |
| Part 13   | Authoring Experience           | ⚠️ Deferred | See Future Work          |
| Part 14   | Validation                     | ⚠️ Deferred | See Future Work          |
| Part 15   | Migration Layer                | ✅ Covered  | Task 4                   |
| Part 16   | Future Plugin API              | ⚠️ Deferred | See Future Work          |

---

## Future Work (Deferred Spec Parts)

These spec parts are deferred to follow-up plans. The core architecture (Tasks 1-12) provides the foundation they build on.

### Part 11: Package Structure

Split `@open-edu/widgets` into domain packages:

- `@open-edu/widgets-core` — core.matching, core.multiple-choice, etc.
- `@open-edu/widgets-math` — math.fraction-visual, math.clock-time, etc.
- `@open-edu/widgets-science` — science.label-diagram, science.image-label
- `@open-edu/widgets-shared` — shared utilities and types
- `@open-edu/widget-registry` — registry, types, domains, metadata
- `@open-edu/widget-types` — standalone type package

The compiler should dynamically discover widgets from these packages. Requires updating `pnpm-workspace.yaml`, all package.json files, and import paths across the codebase.

### Part 12: Registry Driven Documentation

Generate widget documentation directly from registry metadata:

- Widget catalog page (auto-generated from `WidgetDefinitionV2` fields)
- Capabilities matrix (from `WidgetCapabilities`)
- Schema documentation (from `schema` field)
- Example configs (from `ai.exampleConfigs`)
- Accessibility report (from `AccessibilityMetadata`)
- Learning intent guide (from `learningIntents`)
- AI authoring notes (from `ai.authoringPrompt`, `ai.generationHints`)

Implementation: A script or CLI command that reads the registry and generates Markdown/MDX documentation files.

### Part 13: Authoring Experience

Expose searchable metadata for AI and authoring tools:

- Search by learning goal, subject, grade, difficulty, interaction type
- Filter by offline support, accessibility level
- Semantic search using keywords + description
- AI can discover widgets using natural language queries

Implementation: Extend the registry's `search()` method with weighted scoring, fuzzy matching, and filter predicates.

### Part 14: Validation

Extend validation to check:

- All required metadata fields are present on V2 definitions
- Capabilities match actual implementation (e.g., if `supportsKeyboard: true`, verify keyboard handlers exist)
- Accessibility metadata consistency
- AI metadata completeness (missing `authoringPrompt` on stable widgets)
- Reward metadata validity
- Deprecated widget IDs trigger warnings
- Missing examples or schema definitions
- Duplicate aliases pointing to different targets

Implementation: Add a `validateRegistry(registry)` function that returns a list of warnings/errors.

### Part 16: Future Plugin API

Design registry for external plugins:

- Plugin provides: `WidgetDefinitionV2`, renderer, validator, schema, assets
- Compiler auto-discovers plugins via package.json `openEdu.widgets` field
- No code changes required to register plugins
- Plugin manifest format for remote widgets

Implementation: Extend `RemoteWidgetManifest` with metadata fields, add plugin discovery to compiler, document the plugin authoring guide.

---

## Summary of Changes

| What                       | Files Changed    | Tests Added            |
| -------------------------- | ---------------- | ---------------------- |
| Learning Intent Types      | 1 new            | 6 tests                |
| Metadata Types (5 modules) | 5 new + 1 barrel | 5 test files           |
| Extended WidgetDefinition  | 1 modified       | 4 tests                |
| Domains & Alias Map        | 1 new            | 11 tests               |
| Registry Refactor          | 1 modified       | 10 tests               |
| 15 Widget Updates          | 15 modified      | Existing tests updated |
| 6 Foundation Stubs         | 6 new widgets    | 6 test files           |
| Runtime Updates            | 2 modified       | Existing tests         |
| Example Updates            | ~18 JSON files   | Compiler tests         |
| **Total**                  | ~55 files        | ~42 new tests          |
