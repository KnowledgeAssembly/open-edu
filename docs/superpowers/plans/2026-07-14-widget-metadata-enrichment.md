# Widget Metadata Enrichment, Validation & Documentation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill in the 17 unused metadata fields across all 14 stable widgets, deepen metadata validation rules, and expand documentation generation to emit full widget metadata.

**Architecture:** Three independent tracks: (1) Add concrete metadata values to each widget's V2 definition object, (2) Extend `validateWidgetMetadata()` with new structural checks and cross-reference validations, (3) Expand `WidgetCatalogEntry` and `generateWidgetCatalog()` to emit capabilities, accessibility, analytics, reward, and AI details.

**Tech Stack:** TypeScript, Vitest, Zod (for validation extensions)

---

## File Structure

| File                                                                  | Action | Purpose                                                              |
| --------------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| `packages/widgets/src/builtins/Matching/Matching.tsx`                 | Modify | Enrich metadata (AI, accessibility, analytics, reward, capabilities) |
| `packages/widgets/src/builtins/MultipleChoice/MultipleChoice.tsx`     | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/VisualCounting/VisualCounting.tsx`     | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/DragDrop/DragDrop.tsx`                 | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/Sequencing/Sequencing.tsx`             | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/FillBlank/FillBlank.tsx`               | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/StoryQuestion/StoryQuestion.tsx`       | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/RealWorld/RealWorld.tsx`               | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/ChartReader/ChartReader.tsx`           | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/FractionVisual/FractionVisual.tsx`     | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/PlaceValueChart/PlaceValueChart.tsx`   | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/GridArea/GridArea.tsx`                 | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/ClockTime/ClockTime.tsx`               | Modify | Enrich metadata                                                      |
| `packages/widgets/src/builtins/MeasurementScale/MeasurementScale.tsx` | Modify | Enrich metadata                                                      |
| `packages/widgets/src/__tests__/widget-metadata-enrichment.test.ts`   | Create | Tests for enriched metadata completeness                             |
| `packages/widgets/src/validate-metadata.ts`                           | Modify | Add new validation rules                                             |
| `packages/widgets/src/__tests__/validate-metadata.test.ts`            | Modify | Add tests for new rules                                              |
| `packages/core/src/widget-catalog.ts`                                 | Modify | Expand WidgetCatalogEntry, enhance catalog generation                |
| `packages/core/src/__tests__/widget-catalog.test.ts`                  | Modify | Add tests for new catalog sections                                   |

---

## Task 1: Enrich AI Metadata — learningObjectives, commonMisconceptions, recommendedAge, readingLevel, generationHints, exampleConfigs

**Files:**

- Modify: all 14 stable widget files (metadata section at bottom)
- Test: `packages/widgets/src/__tests__/widget-metadata-enrichment.test.ts`

### Step 1: Write metadata completeness test

- [ ] Create `packages/widgets/src/__tests__/widget-metadata-enrichment.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createDefaultRegistry } from '../index';
import type { WidgetDefinitionV2 } from '../types';

describe('Widget metadata enrichment', () => {
  const registry = createDefaultRegistry();
  const allWidgets = registry.getAll().map((w) => w as unknown as WidgetDefinitionV2);
  const stableWidgets = allWidgets.filter((w) => w.status === 'stable');

  describe('AI metadata completeness', () => {
    it('all stable widgets have recommendedAge', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.recommendedAge, `${w.id} missing recommendedAge`).toBeDefined();
        expect(w.ai?.recommendedAge).toHaveLength(2);
      }
    });

    it('all stable widgets have readingLevel', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.readingLevel, `${w.id} missing readingLevel`).toBeDefined();
      }
    });

    it('all stable widgets have learningObjectives', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.learningObjectives, `${w.id} missing learningObjectives`).toBeDefined();
        expect(w.ai!.learningObjectives!.length).toBeGreaterThan(0);
      }
    });

    it('all stable widgets have commonMisconceptions', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.commonMisconceptions, `${w.id} missing commonMisconceptions`).toBeDefined();
        expect(w.ai!.commonMisconceptions!.length).toBeGreaterThan(0);
      }
    });

    it('all stable widgets have generationHints', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.generationHints, `${w.id} missing generationHints`).toBeDefined();
        expect(w.ai!.generationHints!.length).toBeGreaterThan(0);
      }
    });

    it('all stable widgets have exampleConfigs', () => {
      for (const w of stableWidgets) {
        expect(w.ai?.exampleConfigs, `${w.id} missing exampleConfigs`).toBeDefined();
        expect(w.ai!.exampleConfigs!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Capabilities completeness', () => {
    it('all stable interactive widgets declare supportsObserveMode', () => {
      const interactive = stableWidgets.filter((w) => !['core.callout'].includes(w.id));
      for (const w of interactive) {
        expect(
          w.capabilities.supportsObserveMode,
          `${w.id} missing supportsObserveMode`,
        ).toBeDefined();
      }
    });
  });

  describe('Analytics completeness', () => {
    it('all stable widgets with supportsHints declare trackHints', () => {
      for (const w of stableWidgets) {
        if (w.capabilities.supportsHints) {
          expect(w.analytics.trackHints, `${w.id} has supportsHints but no trackHints`).toBe(true);
        }
      }
    });

    it('all stable widgets with supportsRetry declare trackRetries', () => {
      for (const w of stableWidgets) {
        if (w.capabilities.supportsRetry) {
          expect(w.analytics.trackRetries, `${w.id} has supportsRetry but no trackRetries`).toBe(
            true,
          );
        }
      }
    });
  });

  describe('Reward completeness', () => {
    it('at least one widget declares positiveMessage', () => {
      const withMessage = stableWidgets.filter((w) => w.reward?.positiveMessage);
      expect(withMessage.length).toBeGreaterThan(0);
    });

    it('at least one widget declares achievement', () => {
      const withAchievement = stableWidgets.filter((w) => w.reward?.achievement);
      expect(withAchievement.length).toBeGreaterThan(0);
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `pnpm --filter @open-edu/widgets test -- widget-metadata-enrichment`
Expected: FAIL — all new fields undefined

### Step 3: Enrich AI metadata for all 14 stable widgets

For each widget, add the 6 unfilled AI fields. Here is the data for every widget:

**core.matching** — `Matching.tsx` AI metadata section (after `authoringPrompt`):

```typescript
recommendedAge: [5, 12],
readingLevel: 'pre-reader',
learningObjectives: [
  'Identify correct pairs of related items',
  'Match items based on shared attributes',
  'Compare and contrast items to find relationships',
],
commonMisconceptions: [
  'Selecting both items from the same column',
  'Assuming alphabetical order determines matches',
],
generationHints: [
  'Use items with clear, unambiguous associations',
  'Mix obvious and challenging pairs',
  'Keep text labels short (2-4 words)',
],
exampleConfigs: [
  { pairs: [{ left: 'Dog', right: 'Puppy' }, { left: 'Cat', right: 'Kitten' }] },
  { pairs: [{ left: 'Hot', right: 'Cold' }, { left: 'Big', right: 'Small' }, { left: 'Fast', right: 'Slow' }] },
],
```

**core.multiple-choice** — `MultipleChoice.tsx` AI metadata section:

```typescript
recommendedAge: [6, 18],
readingLevel: 'grade-3',
learningObjectives: [
  'Select the correct answer from multiple alternatives',
  'Apply knowledge to eliminate incorrect options',
  'Distinguish between similar answer choices',
],
commonMisconceptions: [
  'Choosing the most familiar-sounding option without reading all choices',
  'Selecting options that are true but do not answer the question',
],
generationHints: [
  'Include one clearly correct answer',
  'Write plausible distractors that reflect common errors',
  'Keep the question stem concise and unambiguous',
],
exampleConfigs: [
  { prompt: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correct: 1 },
  { prompt: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], correct: 1 },
],
```

**core.visual-counting** — `VisualCounting.tsx` AI metadata section:

```typescript
recommendedAge: [3, 7],
readingLevel: 'pre-reader',
learningObjectives: [
  'Count objects accurately up to 12',
  'Recognize quantities visually without counting',
  'Add two groups of objects together',
],
commonMisconceptions: [
  'Double-counting an object at the boundary of groups',
  'Confusing 6 and 9 when items are rotated',
  'Losing track when items are scattered irregularly',
],
generationHints: [
  'Use visually distinct emoji items',
  'Limit count to 1-12 for clarity',
  'Space items clearly in the grid layout',
],
exampleConfigs: [
  { items: ['🍎', '🍎', '🍎'], answer: 3 },
  { items: ['🌟', '🌟', '🌟', '🌟', '🌟'], answer: 5 },
  { left: ['🐱', '🐱'], right: ['🐱', '🐱', '🐱'], answer: 5 },
],
```

**core.drag-drop** — `DragDrop.tsx` AI metadata section:

```typescript
recommendedAge: [5, 14],
readingLevel: 'grade-2',
learningObjectives: [
  'Classify items into the correct categories',
  'Categorize items based on shared attributes',
  'Compare categories to determine correct placement',
],
commonMisconceptions: [
  'Placing items in the first available target without reading labels',
  'Ignoring category boundaries and grouping by personal preference',
],
generationHints: [
  'Make item labels unambiguous',
  'Ensure target zone labels have distinct meanings',
  'Use 3-6 draggable items for manageable complexity',
],
exampleConfigs: [
  { items: [{ id: '1', label: 'Apple', target: 'Fruit' }, { id: '2', label: 'Carrot', target: 'Vegetable' }] },
  { items: [{ id: '1', label: 'Mercury', target: 'Inner Planet' }, { id: '2', label: 'Jupiter', target: 'Outer Planet' }] },
],
```

**core.sequencing** — `Sequencing.tsx` AI metadata section:

```typescript
recommendedAge: [6, 14],
readingLevel: 'grade-2',
learningObjectives: [
  'Arrange events in chronological or logical order',
  'Understand dependencies between steps',
  'Apply sequential reasoning to reorder scrambled items',
],
commonMisconceptions: [
  'Assuming alphabetical order is the correct sequence',
  'Confusing cause and effect in process steps',
  'Ignoring intermediate steps between start and end',
],
generationHints: [
  'Ensure a clear logical flow with no ambiguous ordering',
  'Avoid steps that could legitimately be swapped',
  'Keep total steps between 3-8 for manageable complexity',
],
exampleConfigs: [
  { items: ['First', 'Second', 'Third'], answer: [0, 1, 2] },
  { items: ['Mix ingredients', 'Preheat oven', 'Bake cake', 'Serve'], answer: [1, 0, 2, 3] },
],
```

**core.fill-blank** — `FillBlank.tsx` AI metadata section:

```typescript
recommendedAge: [5, 16],
readingLevel: 'grade-3',
learningObjectives: [
  'Complete sentences with the correct word or phrase',
  'Apply knowledge of vocabulary or mathematical terms',
  'Demonstrate recall of key concepts through cloze tasks',
],
commonMisconceptions: [
  'Choosing syntactically correct but semantically wrong answers',
  'Ignoring sentence context when selecting from options',
  'Entering the correct meaning in an incorrect grammatical form',
],
generationHints: [
  'Place blanks on key concepts, not filler words',
  'Provide 3-5 options per blank in select mode',
  'Ensure the sentence is grammatically complete with the answer filled in',
],
exampleConfigs: [
  { template: 'The capital of France is ___.', answers: ['Paris'] },
  { template: 'Water boils at ___ degrees Celsius.', answers: ['100'] },
],
```

**core.story-question** — `StoryQuestion.tsx` AI metadata section:

```typescript
recommendedAge: [6, 14],
readingLevel: 'grade-2',
learningObjectives: [
  'Comprehend a short story and identify key details',
  'Distinguish between facts stated in the text and opinions',
  'Make simple inferences based on story context',
],
commonMisconceptions: [
  'Selecting an answer without reading the full story',
  'Confusing the narrator\'s perspective with objective facts',
  'Choosing answers that are generally true but not supported by the text',
],
generationHints: [
  'Keep stories under 150 words for focused comprehension',
  'Include a clear narrative with a beginning, middle, and end',
  'Make distractors plausible but clearly contradicted by the text',
],
exampleConfigs: [
  { story: 'The cat sat on the mat. It was a sunny day.', questions: [{ prompt: 'Where did the cat sit?', options: ['On the mat', 'On the rug', 'Under the table'], correct: 0 }] },
],
```

**core.real-world** — `RealWorld.tsx` AI metadata section:

```typescript
recommendedAge: [8, 18],
readingLevel: 'grade-4',
learningObjectives: [
  'Apply learned concepts to a real-world scenario',
  'Explain reasoning using everyday context',
  'Self-assess understanding through open-ended reflection',
],
commonMisconceptions: [
  'Treating it as a right/wrong quiz instead of a reflection exercise',
  'Providing generic answers instead of scenario-specific responses',
],
generationHints: [
  'Use relatable, age-appropriate everyday scenarios',
  'Include an optional expectedAnswer for comparison',
  'Keep the scenario brief and concrete',
],
exampleConfigs: [
  { scenario: 'You have ₹50 and buy 3 notebooks at ₹12 each.', prompt: 'How much change do you get?' },
  { scenario: 'A plant grows 2 cm every week.', prompt: 'How tall will it be after 5 weeks?' },
],
```

**core.chart-reader** — `ChartReader.tsx` AI metadata section:

```typescript
recommendedAge: [6, 14],
readingLevel: 'grade-2',
learningObjectives: [
  'Read values accurately from a bar or pictograph chart',
  'Compare data across categories to identify trends',
  'Interpret visual representations of quantitative data',
],
commonMisconceptions: [
  'Confusing bar height with bar width when reading values',
  'Miscounting emoji rows in pictograph charts',
  'Comparing absolute values instead of relative proportions',
],
generationHints: [
  'Use small, clear datasets with 3-6 items',
  'Ensure bar values are visually distinguishable',
  'Use relevant emoji for pictograph mode',
],
exampleConfigs: [
  { type: 'bar', data: [{ label: 'Apples', value: 5 }, { label: 'Bananas', value: 3 }] },
  { type: 'pictograph', data: [{ label: 'Dogs', count: 4, emoji: '🐕' }, { label: 'Cats', count: 2, emoji: '🐱' }] },
],
```

**math.fraction-visual** — `FractionVisual.tsx` AI metadata section:

```typescript
recommendedAge: [5, 10],
readingLevel: 'pre-reader',
learningObjectives: [
  'Understand that a fraction represents parts of a whole',
  'Visualize the relationship between numerator and denominator',
  'Compare two fractions using visual models',
],
commonMisconceptions: [
  'Thinking a larger denominator means a larger fraction',
  'Confusing the shaded region with the unshaded region',
  'Not recognizing equivalent fractions across different models',
],
generationHints: [
  'Limit denominator to 12 or less for clear visualization',
  'Use circle mode for comparisons under 1 whole',
  'Always include the fraction notation alongside the visual model',
],
exampleConfigs: [
  { numerator: 1, denominator: 2, mode: 'bar' },
  { numerator: 3, denominator: 4, mode: 'circle' },
  { left: { numerator: 1, denominator: 2 }, right: { numerator: 2, denominator: 4 }, mode: 'compare' },
],
```

**math.place-value-chart** — `PlaceValueChart.tsx` AI metadata section:

```typescript
recommendedAge: [6, 10],
readingLevel: 'grade-2',
learningObjectives: [
  'Identify the position and value of each digit in a multi-digit number',
  'Understand how digit position determines its value',
  'Compose and decompose numbers using place value columns',
],
commonMisconceptions: [
  'Treating each column as having equal value regardless of position',
  'Confusing the Indian lakh/crore system with Western million/billion notation',
  'Placing digits without considering their positional value',
],
generationHints: [
  'Use targetNumber to auto-generate draggable digit bank',
  'Start with lakh mode before introducing crore',
  'Display column labels (Ones, Tens, Hundreds, ...) clearly above each slot',
],
exampleConfigs: [
  { targetNumber: 1234, mode: 'lakh' },
  { targetNumber: 56789, mode: 'lakh' },
  { targetNumber: 1234567, mode: 'crore' },
],
```

**math.grid-area** — `GridArea.tsx` AI metadata section:

```typescript
recommendedAge: [7, 12],
readingLevel: 'grade-3',
learningObjectives: [
  'Calculate the area of a shape by counting grid squares',
  'Understand area as the number of covered unit squares',
  'Distinguish between area and perimeter measurements',
],
commonMisconceptions: [
  'Counting grid lines instead of grid squares',
  'Confusing perimeter count with area count',
  'Double-counting squares shared between adjacent shapes',
],
generationHints: [
  'Keep grids under 10x10 for visual clarity',
  'Use maxHighlights to limit interactive cell selections',
  'Provide pre-highlighted shapes for observe/learn mode',
],
exampleConfigs: [
  { rows: 5, cols: 5, highlights: [[0,0],[0,1],[1,0],[1,1]], mode: 'area' },
  { rows: 4, cols: 4, highlights: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]], mode: 'perimeter' },
],
```

**math.clock-time** — `ClockTime.tsx` AI metadata section:

```typescript
recommendedAge: [4, 10],
readingLevel: 'pre-reader',
learningObjectives: [
  'Read the hour from an analog clock face',
  'Set clock hands to match a given digital time',
  'Understand the relationship between hour and minute hands',
],
commonMisconceptions: [
  'Reading the minute hand position as the hour',
  'Not accounting for the minute hand affecting the hour hand position',
  'Confusing o\'clock times with half-past times',
],
generationHints: [
  'Use round times (o\'clock, half past) for easy mode',
  'Use targetTime for precise grading in set mode',
  'Prefer 12-hour display for young learners',
],
exampleConfigs: [
  { hour: 3, minute: 0, mode: 'read' },
  { hour: 7, minute: 30, mode: 'set', targetTime: '7:30' },
  { hour: 11, minute: 45, mode: 'set', targetTime: '11:45' },
],
```

**math.measurement-scale** — `MeasurementScale.tsx` AI metadata section:

```typescript
recommendedAge: [6, 12],
readingLevel: 'grade-2',
learningObjectives: [
  'Read measurements accurately on a ruler or scale',
  'Understand the relationship between tick marks and values',
  'Estimate a measurement and verify against a target',
],
commonMisconceptions: [
  'Starting measurement count at 1 instead of 0',
  'Ignoring unit labels when reading values',
  'Misreading thermometer as showing area instead of temperature',
],
generationHints: [
  'Use simple step values (1, 2, 5, or 10)',
  'Keep the measurement range under 100 for young learners',
  'Always include the unit label in all markings',
],
exampleConfigs: [
  { type: 'ruler', max: 20, unit: 'cm', target: 12 },
  { type: 'thermometer', max: 50, unit: '°C', target: 37 },
  { type: 'cylinder', max: 100, unit: 'ml', target: 60 },
],
```

### Step 4: Add supportsObserveMode to all stable widgets

In each widget's `capabilities` section, add:

```typescript
supportsObserveMode: true,
```

This applies to all 14 stable widgets — they all implement observe mode via `useObserveMode`.

### Step 5: Add trackHints and trackRetries to all stable widgets

In each widget's `analytics` section, add:

```typescript
trackHints: true,
trackRetries: true,
```

These apply to all 14 stable widgets — they all support hints and retry.

### Step 6: Add positiveMessage to select widgets

Add `positiveMessage` to these widgets (beyond the existing MultipleChoice):

- `core.matching`: `positiveMessage: 'All pairs matched!'`
- `core.fill-blank`: `positiveMessage: 'All blanks filled correctly!'`
- `core.sequencing`: `positiveMessage: 'Sequence is correct!'`

### Step 7: Add achievement to all stable widgets

In each widget's `reward` section, add:

```typescript
achievement: 'first-{widget-short-name}',
```

Example: Matching gets `achievement: 'first-match'`, MultipleChoice gets `achievement: 'first-answer'`, etc.

### Step 8: Run tests to verify they pass

Run: `pnpm --filter @open-edu/widgets test -- widget-metadata-enrichment`
Expected: PASS

### Step 9: Run full widget tests

Run: `pnpm --filter @open-edu/widgets test`
Expected: All 750+ tests pass

### Step 10: Commit

```bash
git add packages/widgets/src/builtins/ packages/widgets/src/__tests__/widget-metadata-enrichment.test.ts
git commit -m "feat(widgets): enrich metadata across all 14 stable widgets

Add AI metadata (recommendedAge, readingLevel, learningObjectives,
commonMisconceptions, generationHints, exampleConfigs), capabilities
(supportsObserveMode), analytics (trackHints, trackRetries), and
reward (achievement, positiveMessage) to all stable widgets."
```

---

## Task 2: Deepen Validation Rules

**Files:**

- Modify: `packages/widgets/src/validate-metadata.ts`
- Modify: `packages/widgets/src/__tests__/validate-metadata.test.ts`

### Step 1: Write failing tests for new validation rules

- [ ] Add these test cases to `packages/widgets/src/__tests__/validate-metadata.test.ts`:

```typescript
it('warns when recommendedAge is missing', () => {
  const result = validateWidgetMetadata(
    v2({ ai: { difficulty: 'easy', recommendedAge: undefined } }),
  );
  expect(result.warnings).toContainEqual(expect.stringContaining('recommendedAge'));
});

it('warns when learningObjectives is empty', () => {
  const result = validateWidgetMetadata(v2({ ai: { difficulty: 'easy', learningObjectives: [] } }));
  expect(result.warnings).toContainEqual(expect.stringContaining('learningObjectives'));
});

it('warns when commonMisconceptions is empty', () => {
  const result = validateWidgetMetadata(
    v2({ ai: { difficulty: 'easy', commonMisconceptions: [] } }),
  );
  expect(result.warnings).toContainEqual(expect.stringContaining('commonMisconceptions'));
});

it('warns when supportsObserveMode is missing on non-experimental stable widget', () => {
  const result = validateWidgetMetadata(
    v2({ status: 'stable', capabilities: { supportsKeyboard: true } }),
  );
  expect(result.warnings).toContainEqual(expect.stringContaining('supportsObserveMode'));
});

it('does not warn about supportsObserveMode on experimental widgets', () => {
  const result = validateWidgetMetadata(v2({ status: 'experimental', capabilities: {} }));
  expect(result.warnings).not.toContainEqual(expect.stringContaining('supportsObserveMode'));
});

it('warns when supportsHints is true but trackHints is false', () => {
  const result = validateWidgetMetadata(
    v2({
      capabilities: { supportsHints: true },
      analytics: { trackHints: false },
    }),
  );
  expect(result.warnings).toContainEqual(expect.stringContaining('trackHints'));
});

it('warns when supportsRetry is true but trackRetries is false', () => {
  const result = validateWidgetMetadata(
    v2({
      capabilities: { supportsRetry: true },
      analytics: { trackRetries: false },
    }),
  );
  expect(result.warnings).toContainEqual(expect.stringContaining('trackRetries'));
});

it('warns when completionXP is set but positiveMessage is missing', () => {
  const result = validateWidgetMetadata(
    v2({
      reward: { completionXP: 10 },
    }),
  );
  expect(result.warnings).toContainEqual(expect.stringContaining('positiveMessage'));
});

it('warns when exampleConfigs is empty array', () => {
  const result = validateWidgetMetadata(
    v2({
      ai: { difficulty: 'easy', exampleConfigs: [] },
    }),
  );
  expect(result.warnings).toContainEqual(expect.stringContaining('exampleConfigs'));
});

it('no warnings for fully-populated widget with consistent metadata', () => {
  const result = validateWidgetMetadata(
    v2({
      status: 'stable',
      capabilities: { supportsObserveMode: true, supportsHints: true, supportsRetry: true },
      analytics: { trackHints: true, trackRetries: true },
      reward: { completionXP: 10, positiveMessage: 'Great!' },
      ai: {
        difficulty: 'easy',
        recommendedAge: [5, 10],
        learningObjectives: ['Learn something'],
        commonMisconceptions: ['A common error'],
        exampleConfigs: [{ test: true }],
      },
    }),
  );
  expect(result.warnings).toHaveLength(0);
});
```

### Step 2: Run tests to verify they fail

Run: `pnpm --filter @open-edu/widgets test -- validate-metadata`
Expected: FAIL — new rules not yet implemented

### Step 3: Implement new validation rules

Add to `packages/widgets/src/validate-metadata.ts` — after the existing checks, before the return statement:

```typescript
// AI metadata completeness
if (widget.ai) {
  if (!widget.ai.recommendedAge) {
    warnings.push('AI recommendedAge is recommended for age-appropriate content generation');
  }

  if (!widget.ai.learningObjectives || widget.ai.learningObjectives.length === 0) {
    warnings.push('AI learningObjectives are recommended for content alignment');
  }

  if (!widget.ai.commonMisconceptions || widget.ai.commonMisconceptions.length === 0) {
    warnings.push('AI commonMisconceptions are recommended for generating helpful distractors');
  }

  if (widget.ai.exampleConfigs && widget.ai.exampleConfigs.length === 0) {
    warnings.push('AI exampleConfigs should contain at least one example');
  }
}

// Capabilities — supportsObserveMode for stable widgets
if (widget.status === 'stable' && widget.capabilities && !widget.capabilities.supportsObserveMode) {
  warnings.push('Stable widgets should declare supportsObserveMode capability');
}

// Analytics — consistency with capabilities
if (
  widget.capabilities?.supportsHints &&
  widget.analytics &&
  widget.analytics.trackHints === false
) {
  warnings.push('Widget supports hints but trackHints is disabled');
}

if (
  widget.capabilities?.supportsRetry &&
  widget.analytics &&
  widget.analytics.trackRetries === false
) {
  warnings.push('Widget supports retry but trackRetries is disabled');
}

// Reward — completionXP should have positiveMessage
if (widget.reward?.completionXP && !widget.reward.positiveMessage) {
  warnings.push('Widget awards completionXP but has no positiveMessage for feedback');
}
```

### Step 4: Run tests to verify they pass

Run: `pnpm --filter @open-edu/widgets test -- validate-metadata`
Expected: All tests pass (including new ones)

### Step 5: Run full widget tests

Run: `pnpm --filter @open-edu/widgets test`
Expected: All tests pass

### Step 6: Commit

```bash
git add packages/widgets/src/validate-metadata.ts packages/widgets/src/__tests__/validate-metadata.test.ts
git commit -m "feat(widgets): deepen metadata validation rules

Add validation for AI metadata completeness (recommendedAge,
learningObjectives, commonMisconceptions, exampleConfigs),
capability-analytics consistency (trackHints ↔ supportsHints,
trackRetries ↔ supportsRetry), observeMode for stable widgets,
and reward feedback (positiveMessage when completionXP set)."
```

---

## Task 3: Expand Documentation Generation

**Files:**

- Modify: `packages/core/src/widget-catalog.ts`
- Modify: `packages/core/src/__tests__/widget-catalog.test.ts`

### Step 1: Expand WidgetCatalogEntry interface

Add new fields to `WidgetCatalogEntry` in `packages/core/src/widget-catalog.ts`:

```typescript
export interface WidgetCatalogEntry {
  id: string;
  name?: string;
  description?: string;
  domain?: string;
  status?: string;
  deprecated?: boolean;
  replacement?: string;
  keywords?: string[];
  learningIntents?: string[];
  legacyId?: string;
  // New fields
  capabilities?: string[];
  accessibility?: string[];
  analytics?: string[];
  reward?: { completionXP?: number; positiveMessage?: string };
  ai?: {
    difficulty?: string;
    estimatedMinutes?: number;
    bloomsLevel?: string;
    cognitiveLoad?: string;
    recommendedAge?: [number, number];
    learningObjectives?: string[];
    commonMisconceptions?: string[];
  };
}
```

### Step 2: Write failing tests for new catalog sections

Add to `packages/core/src/__tests__/widget-catalog.test.ts`:

```typescript
it('includes AI metadata when provided', () => {
  const catalog = generateWidgetCatalog({
    widgets: [
      {
        id: 'test.widget',
        name: 'Test Widget',
        description: 'A test',
        domain: 'core',
        status: 'stable',
        learningIntents: ['practice'],
        ai: {
          difficulty: 'easy',
          estimatedMinutes: 3,
          bloomsLevel: 'remember',
          recommendedAge: [5, 10],
          learningObjectives: ['Learn to test'],
          commonMisconceptions: ['Assuming tests always pass'],
        },
      },
    ],
  });
  expect(catalog).toContain('AI Notes');
  expect(catalog).toContain('Difficulty: easy');
  expect(catalog).toContain('Estimated time: 3 min');
  expect(catalog).toContain("Bloom's: remember");
  expect(catalog).toContain('Ages: 5-10');
  expect(catalog).toContain('Learning objectives:');
  expect(catalog).toContain('Learn to test');
  expect(catalog).toContain('Common misconceptions:');
  expect(catalog).toContain('Assuming tests always pass');
});

it('includes capabilities when provided', () => {
  const catalog = generateWidgetCatalog({
    widgets: [
      {
        id: 'test.widget',
        name: 'Test',
        domain: 'core',
        status: 'stable',
        capabilities: ['keyboard', 'screenReader', 'offline'],
      },
    ],
  });
  expect(catalog).toContain('Capabilities:');
  expect(catalog).toContain('keyboard');
  expect(catalog).toContain('screenReader');
});

it('includes accessibility when provided', () => {
  const catalog = generateWidgetCatalog({
    widgets: [
      {
        id: 'test.widget',
        name: 'Test',
        domain: 'core',
        status: 'stable',
        accessibility: ['highContrast', 'tts', 'ariaSupport'],
      },
    ],
  });
  expect(catalog).toContain('Accessibility:');
  expect(catalog).toContain('highContrast');
  expect(catalog).toContain('tts');
});

it('includes reward info when provided', () => {
  const catalog = generateWidgetCatalog({
    widgets: [
      {
        id: 'test.widget',
        name: 'Test',
        domain: 'core',
        status: 'stable',
        reward: { completionXP: 15, positiveMessage: 'Well done!' },
      },
    ],
  });
  expect(catalog).toContain('Rewards:');
  expect(catalog).toContain('15 XP');
  expect(catalog).toContain('Well done!');
});
```

### Step 3: Run tests to verify they fail

Run: `pnpm --filter @open-edu/core test -- widget-catalog`
Expected: FAIL — new sections not generated

### Step 4: Enhance generateWidgetCatalog to emit new sections

In `packages/core/src/widget-catalog.ts`, inside the per-widget loop (after the keywords section), add:

```typescript
// Capabilities
if (w.capabilities && w.capabilities.length > 0) {
  lines.push(`**Capabilities:** ${w.capabilities.join(', ')}`);
  lines.push('');
}

// Accessibility
if (w.accessibility && w.accessibility.length > 0) {
  lines.push(`**Accessibility:** ${w.accessibility.join(', ')}`);
  lines.push('');
}

// Analytics
if (w.analytics && w.analytics.length > 0) {
  lines.push(`**Analytics:** ${w.analytics.join(', ')}`);
  lines.push('');
}

// Rewards
if (w.reward) {
  const parts: string[] = [];
  if (w.reward.completionXP) parts.push(`${w.reward.completionXP} XP`);
  if (w.reward.positiveMessage) parts.push(`"${w.reward.positiveMessage}"`);
  if (parts.length > 0) {
    lines.push(`**Rewards:** ${parts.join(', ')}`);
    lines.push('');
  }
}

// AI Notes
if (w.ai) {
  lines.push('**AI Notes:**');
  if (w.ai.difficulty) lines.push(`- Difficulty: ${w.ai.difficulty}`);
  if (w.ai.estimatedMinutes) lines.push(`- Estimated time: ${w.ai.estimatedMinutes} min`);
  if (w.ai.bloomsLevel) lines.push(`- Bloom's: ${w.ai.bloomsLevel}`);
  if (w.ai.cognitiveLoad) lines.push(`- Cognitive load: ${w.ai.cognitiveLoad}`);
  if (w.ai.recommendedAge)
    lines.push(`- Ages: ${w.ai.recommendedAge[0]}-${w.ai.recommendedAge[1]}`);
  if (w.ai.learningObjectives && w.ai.learningObjectives.length > 0) {
    lines.push('- Learning objectives:');
    for (const obj of w.ai.learningObjectives) {
      lines.push(`  - ${obj}`);
    }
  }
  if (w.ai.commonMisconceptions && w.ai.commonMisconceptions.length > 0) {
    lines.push('- Common misconceptions:');
    for (const m of w.ai.commonMisconceptions) {
      lines.push(`  - ${m}`);
    }
  }
  lines.push('');
}
```

### Step 5: Run tests to verify they pass

Run: `pnpm --filter @open-edu/core test -- widget-catalog`
Expected: All tests pass

### Step 6: Run full core tests

Run: `pnpm --filter @open-edu/core test`
Expected: All tests pass

### Step 7: Commit

```bash
git add packages/core/src/widget-catalog.ts packages/core/src/__tests__/widget-catalog.test.ts
git commit -m "feat(core): expand widget catalog with full metadata

Enhance generateWidgetCatalog() to emit capabilities, accessibility,
analytics, reward info, and AI notes (difficulty, estimated time,
Bloom's level, age range, learning objectives, misconceptions).
Expand WidgetCatalogEntry to support new metadata fields."
```

---

## Task 4: Update CLI Catalog Builder to Pass New Fields

**Files:**

- Modify: `packages/cli/src/commands/generate.ts`

### Step 1: Update buildWidgetCatalog to extract new fields

In `packages/cli/src/commands/generate.ts`, update the `buildWidgetCatalog()` function to also extract the new metadata fields:

```typescript
function buildWidgetCatalog(): string {
  const registry = createDefaultRegistry();
  const allWidgets = registry.getAll();
  const input: WidgetCatalogInput = {
    widgets: allWidgets.map((w) => {
      const v2 = w as unknown as WidgetDefinitionV2;
      const intents = getLearningIntentsForWidget(w.id);
      const legacyEntry = Object.entries(WIDGET_ALIAS_MAP).find(([, target]) => target === w.id);

      const capabilityKeys: string[] = [];
      if (v2.capabilities) {
        for (const [key, val] of Object.entries(v2.capabilities)) {
          if (val === true) capabilityKeys.push(key.replace('supports', '').toLowerCase());
        }
      }

      const accessibilityKeys: string[] = [];
      if (v2.accessibility) {
        for (const [key, val] of Object.entries(v2.accessibility)) {
          if (val === true) accessibilityKeys.push(key);
        }
      }

      const analyticsKeys: string[] = [];
      if (v2.analytics) {
        for (const [key, val] of Object.entries(v2.analytics)) {
          if (val === true) analyticsKeys.push(key.replace('track', 'track ').trim());
        }
      }

      return {
        id: w.id,
        name: v2.name,
        description: v2.description,
        domain: v2.domain,
        status: v2.status,
        deprecated: v2.deprecated,
        replacement: v2.replacement,
        keywords: v2.keywords,
        learningIntents: intents,
        legacyId: legacyEntry?.[0],
        capabilities: capabilityKeys,
        accessibility: accessibilityKeys,
        analytics: analyticsKeys,
        reward: v2.reward?.completionXP
          ? { completionXP: v2.reward.completionXP, positiveMessage: v2.reward.positiveMessage }
          : undefined,
        ai: v2.ai
          ? {
              difficulty: v2.ai.difficulty,
              estimatedMinutes: v2.ai.estimatedMinutes,
              bloomsLevel: v2.ai.bloomsLevel,
              cognitiveLoad: v2.ai.cognitiveLoad,
              recommendedAge: v2.ai.recommendedAge,
              learningObjectives: v2.ai.learningObjectives,
              commonMisconceptions: v2.ai.commonMisconceptions,
            }
          : undefined,
      };
    }),
  };
  return generateWidgetCatalog(input);
}
```

### Step 2: Run typecheck

Run: `pnpm --filter @open-edu/cli typecheck`
Expected: PASS

### Step 3: Run CLI tests

Run: `pnpm --filter @open-edu/cli test`
Expected: All tests pass

### Step 4: Commit

```bash
git add packages/cli/src/commands/generate.ts
git commit -m "feat(cli): pass full metadata to widget catalog generator"
```

---

## Task 5: Final Verification

### Step 1: Run full test suite

Run: `pnpm test`
Expected: All tests pass across all packages

### Step 2: Run typecheck

Run: `pnpm typecheck`
Expected: PASS

### Step 3: Run lint

Run: `pnpm lint`
Expected: 0 errors (warnings OK)

### Step 4: Run format check

Run: `pnpm format:check`
Expected: PASS (run `pnpm format` first if needed)

### Step 5: Final commit if formatting needed

```bash
pnpm format && git add -A && git commit -m "chore: format code"
```

---

## Summary

| Task | Description                                           | Files Changed                 | Tests Added                 |
| ---- | ----------------------------------------------------- | ----------------------------- | --------------------------- |
| 1    | Enrich metadata (AI, capabilities, analytics, reward) | 14 widget files + 1 test file | 10 test cases               |
| 2    | Deepen validation                                     | 1 file + 1 test file          | 10 test cases               |
| 3    | Expand documentation generation                       | 1 file + 1 test file          | 4 test cases                |
| 4    | Update CLI catalog builder                            | 1 file                        | 0 (covered by Task 3 tests) |
| 5    | Final verification                                    | 0                             | N/A                         |

**Total:** 17 files modified/created, 24 new test cases
