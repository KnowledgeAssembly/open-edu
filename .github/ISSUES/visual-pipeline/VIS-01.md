---
name: '📖 VIS-01: Add widget type to pipeline types'
title: '[Story] VIS-01: Add widget type to pipeline types'
labels: ['type:story']
---

# Story VIS-01: Add `widget` type to pipeline types

## Objective

Add `widget` as a valid course spec activity type in `@open-edu/pipeline` so the LLM can output widget-based activities. Add `widgetId` and `widgetConfig` fields to `GeneratedActivity` and `ActivityContent`.

## Context

Currently `COURSE_SPEC_TYPES = ['reading', 'exercise', 'quiz', 'reflection']`. The LLM can only emit these types. To support widgets, we need to add `'widget'` and carry the widget selection through the data structures.

This is a foundational change — downstream stories (VIS-02, VIS-03, VIS-05) depend on these types.

## Scope

- **Allowed**: `packages/pipeline/src/types.ts`, `packages/pipeline/src/__tests__/types.test.ts` (create if not exists)
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] `COURSE_SPEC_TYPES` includes `'widget'`
- [ ] `GeneratedActivity` has optional `widgetId?: string`
- [ ] `GeneratedActivity` has optional `widgetConfig?: Record<string, unknown>`
- [ ] Existing code compiles without errors (no regressions)
- [ ] Tests verify widget-related fields type-check correctly

## Technical Notes & Constraints

### In `packages/pipeline/src/types.ts`:

1. Add `'widget'` to `COURSE_SPEC_TYPES`:

```typescript
export const COURSE_SPEC_TYPES = ['reading', 'exercise', 'quiz', 'reflection', 'widget'] as const;
```

2. Add to `GeneratedActivity`:

```typescript
export interface GeneratedActivity {
  step: ActivityStep;
  courseSpecType: CourseSpecActivityType;
  order: number;
  content: ActivityContent;
  /** Only set when courseSpecType === 'widget'. The widget ID (e.g. "open-edu.matching") */
  widgetId?: string;
  /** Only set when courseSpecType === 'widget'. The widget config object */
  widgetConfig?: Record<string, unknown>;
}
```

3. Add to `ActivityContent`:

```typescript
export interface ActivityContent {
  description: string;
  instructions?: string;
  examples?: string[];
  hints?: string[];
  questions?: MCQQuestion[];
  /** Widget config for widget-type activities */
  widgetConfig?: Record<string, unknown>;
}
```

### In `packages/pipeline/src/__tests__/types.test.ts` (create):

```typescript
import { describe, it, expect } from 'vitest';
import { COURSE_SPEC_TYPES } from '../types.js';

describe('course spec types', () => {
  it('includes widget', () => {
    expect(COURSE_SPEC_TYPES).toContain('widget');
  });
});
```

## Deliverables

- [x] Implementation (types updated)
- [x] Automated tests
- [ ] Documentation updates (not needed)

## Validation

```bash
pnpm --filter @open-edu/pipeline typecheck
pnpm --filter @open-edu/pipeline test
pnpm --filter @open-edu/pipeline lint
```

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- [Detailed story](../docs/EPIC_VISUAL_PIPELINE.md#story-vis-01-add-widget-type-to-pipeline-types)
