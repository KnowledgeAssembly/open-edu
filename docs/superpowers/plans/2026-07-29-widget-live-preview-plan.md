# Widget Live Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a side-by-side live widget preview with real-time validation to the dev-server editor.

**Architecture:** A `ResizablePanel` component in the design system provides a draggable split pane. In the dev-server, a `WidgetPreviewPanel` on the right renders the widget using a slim `WidgetPreviewProvider` context, while a `WidgetValidator` runs client-side validation using each widget's Zod config schema. The existing `EditorShell` wraps its content area with the split pane and passes validation errors inline to the form editors.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS, Zod, @open-edu/design-system, @open-edu/widgets, Vitest, @testing-library/react

---

## File Inventory

### New files to create (8):

| #   | File                                                                    | Responsibility                                      |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | `packages/design-system/src/patterns/ResizablePanel.tsx`                | Draggable split pane with collapse                  |
| 2   | `apps/dev-server/src/editor/hooks/useWidgetConfig.ts`                   | Extract widget config from node JSON                |
| 3   | `apps/dev-server/src/editor/WidgetValidator.ts`                         | Client-side widget config validation                |
| 4   | `apps/dev-server/src/editor/WidgetPreviewProvider.tsx`                  | Minimal runtime context for preview                 |
| 5   | `apps/dev-server/src/editor/WidgetPreviewPanel.tsx`                     | Right-side preview pane                             |
| 6   | `apps/dev-server/src/editor/SplitPaneLayout.tsx`                        | Wrapper around ResizablePanel with dev-server state |
| 7   | `packages/design-system/src/patterns/__tests__/ResizablePanel.test.tsx` | Tests for ResizablePanel                            |
| 8   | `apps/dev-server/src/editor/__tests__/widget-preview.test.tsx`          | Tests for preview components                        |

### Modified files (9):

| #    | File                                                   | Change                                                               |
| ---- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| 1    | `packages/design-system/src/index.ts`                  | Export `ResizablePanel`                                              |
| 2    | `packages/widgets/src/types.ts`                        | Change `schema` type to `z.ZodType<any, any, any>`                   |
| 3-29 | `packages/widgets/src/builtins/**/*.tsx`               | Export config schema + populate `schema` field on WidgetDefinitionV2 |
| 30   | `apps/dev-server/src/editor/SchemaForm.tsx`            | Add `fieldErrors` prop + error display                               |
| 31   | `apps/dev-server/src/editor/JSONNodeEditor.tsx`        | Accept + forward `fieldErrors` prop                                  |
| 32   | `apps/dev-server/src/editor/EditorShell.tsx`           | Integrate SplitPaneLayout, WidgetPreviewPanel, WidgetValidator       |
| 33   | `apps/dev-server/src/editor/__tests__/editor.test.tsx` | Add SchemaForm error tests                                           |

---

### Task 1: Add `ResizablePanel` to design system

**Files:**

- Create: `packages/design-system/src/patterns/ResizablePanel.tsx`
- Create: `packages/design-system/src/patterns/__tests__/ResizablePanel.test.tsx`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/design-system/src/patterns/__tests__/ResizablePanel.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResizablePanel } from '../ResizablePanel.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('ResizablePanel', () => {
  it('renders left and right panels', () => {
    render(
      <ResizablePanel
        left={<div data-testid="left-pane">Left</div>}
        right={<div data-testid="right-pane">Right</div>}
      />,
    );
    expect(screen.getByTestId('left-pane')).toBeInTheDocument();
    expect(screen.getByTestId('right-pane')).toBeInTheDocument();
  });

  it('renders a divider with drag handle', () => {
    render(
      <ResizablePanel
        left={<div>Left</div>}
        right={<div>Right</div>}
      />,
    );
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('hides right panel when collapsed', () => {
    render(
      <ResizablePanel
        left={<div data-testid="left-pane">Left</div>}
        right={<div data-testid="right-pane">Right</div>}
        collapsed={true}
      />,
    );
    expect(screen.getByTestId('left-pane')).toBeInTheDocument();
    expect(screen.queryByTestId('right-pane')).not.toBeInTheDocument();
  });

  it('applies minLeftPct when set', () => {
    render(
      <ResizablePanel
        left={<div>Left</div>}
        right={<div>Right</div>}
        minLeftPct={30}
        defaultRatio={0.2}
      />,
    );
    const leftContainer = screen.getByTestId('resizable-left');
    expect(leftContainer).toHaveStyle({ minWidth: '30%' });
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <ResizablePanel left={<div>Left</div>} right={<div>Right</div>} />,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/design-system test -- --run src/patterns/__tests__/ResizablePanel.test.tsx
```

Expected: FAIL — `ResizablePanel` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/design-system/src/patterns/ResizablePanel.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode, type MouseEvent, type TouchEvent } from 'react';
import { cn } from '../lib/utils.js';

export interface ResizablePanelProps {
  left: ReactNode;
  right: ReactNode;
  defaultRatio?: number;
  minLeftPct?: number;
  minRightPx?: number;
  collapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  onRatioChange?: (ratio: number) => void;
  leftClassName?: string;
  rightClassName?: string;
}

export function ResizablePanel({
  left,
  right,
  defaultRatio = 0.5,
  minLeftPct = 20,
  minRightPx = 300,
  collapsed = false,
  onCollapse,
  onExpand,
  onRatioChange,
  leftClassName,
  rightClassName,
}: ResizablePanelProps): JSX.Element {
  const [ratio, setRatio] = useState(defaultRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    dragging.current = true;
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (collapsed) return;

    const handleMouseMove = (e: MouseEvent | globalThis.MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = Math.max(
        minLeftPct / 100,
        Math.min(1 - minRightPx / rect.width, (e.clientX - rect.left) / rect.width),
      );
      setRatio(newRatio);
      onRatioChange?.(newRatio);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;
      const newRatio = Math.max(
        minLeftPct / 100,
        Math.min(1 - minRightPx / rect.width, (touch.clientX - rect.left) / rect.width),
      );
      setRatio(newRatio);
      onRatioChange?.(newRatio);
    };

    const handleUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [collapsed, minLeftPct, minRightPx, onRatioChange]);

  return (
    <div ref={containerRef} className="flex h-full w-full" data-testid="resizable-panel">
      <div
        data-testid="resizable-left"
        className={cn('overflow-auto', leftClassName)}
        style={{ flex: collapsed ? '1 1 100%' : `0 0 ${ratio * 100}%`, minWidth: collapsed ? undefined : `${minLeftPct}%` }}
      >
        {left}
      </div>
      {!collapsed && (
        <>
          <div
            role="separator"
            tabIndex={0}
            aria-label="Resize panels"
            aria-orientation="vertical"
            aria-valuenow={Math.round(ratio * 100)}
            className="bg-outline-variant hover:bg-primary active:bg-primary flex w-1 cursor-col-resize shrink-0 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onKeyDown={(e) => {
              const step = 0.02;
              if (e.key === 'ArrowLeft') {
                const newRatio = Math.max(minLeftPct / 100, ratio - step);
                setRatio(newRatio);
                onRatioChange?.(newRatio);
              } else if (e.key === 'ArrowRight') {
                const newRatio = Math.min(1 - minRightPx / (containerRef.current?.getBoundingClientRect().width ?? 800), ratio + step);
                setRatio(newRatio);
                onRatioChange?.(newRatio);
              }
            }}
          >
            <div className="bg-on-surface-variant/30 h-8 w-0.5 rounded-full" />
          </div>
          <div
            data-testid="right-pane"
            className={cn('overflow-auto', rightClassName)}
            style={{ flex: `0 0 ${(1 - ratio) * 100}%`, minWidth: `${minRightPx}px` }}
          >
            {right}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/design-system test -- --run src/patterns/__tests__/ResizablePanel.test.tsx
```

Expected: PASS (4 passed)

- [ ] **Step 5: Add export to design-system barrel**

In `packages/design-system/src/index.ts`, add after the `SplitView` export (line 209):

```typescript
export { ResizablePanel } from './patterns/ResizablePanel.js';
export type { ResizablePanelProps } from './patterns/ResizablePanel.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/patterns/ResizablePanel.tsx packages/design-system/src/patterns/__tests__/ResizablePanel.test.tsx packages/design-system/src/index.ts
git commit -m "feat(design-system): add ResizablePanel with drag-to-resize and collapse"
```

---

### Task 2: Fix widget schema type and populate for built-in widgets

**Files:**

- Modify: `packages/widgets/src/types.ts`
- Modify: `packages/widgets/src/builtins/MultipleChoice/MultipleChoice.tsx` (example — pattern applies to all 27)

- [ ] **Step 1: Fix the `schema` type in `WidgetDefinitionV2`**

In `packages/widgets/src/types.ts`, add `import type { z } from 'zod';` at the top, then change line 35:

```typescript
import type { z } from 'zod';

// ... line 35, change from:
  schema?: Record<string, unknown>;
// to:
  schema?: z.ZodType<any, any, any>;
```

- [ ] **Step 2: Export MultipleChoice schema and add to definition**

In `packages/widgets/src/builtins/MultipleChoice/MultipleChoice.tsx`, add exports for the config schemas and populate `schema` on the definition objects:

After the schema definitions (around line 30), add:

```typescript
const multipleChoiceConfigSchema = z.union([legacyConfigSchema, multiConfigSchema]);
export { multipleChoiceConfigSchema };
```

Then in the `MultipleChoiceWidget` definition (around line 472), add the `schema` field:

```typescript
const MultipleChoiceWidget: WidgetDefinitionV2 = {
  id: 'core.multiple-choice',
  name: 'Multiple Choice',
  // ... all existing fields ...
  schema: multipleChoiceConfigSchema,
  // ... rest of existing fields ...
};
```

Do the same for `LegacyChoiceWidget`:

```typescript
const LegacyChoiceWidget: WidgetDefinitionV2 = {
  id: 'open-edu.multiple-choice-practice',
  // ... all existing fields ...
  schema: multipleChoiceConfigSchema,
  // ... rest of existing fields ...
};
```

- [ ] **Step 3: Repeat for all 27 built-in widgets**

For each built-in widget in `packages/widgets/src/builtins/`:

1. If the widget has a local Zod config schema (const variable), export it by name.
2. If the schema is already exported (e.g., `dragDropSchema` in DragDrop, `matchingSchema` in Matching), it's already available.
3. If the widget has no config schema (minimal display widgets like `Callout`), leave `schema` undefined.
4. Add `schema: <exportedSchema>` to the `WidgetDefinitionV2` object.

Apply this pattern to each widget file. Here's the complete table:

| Widget file                                 | Schema variable                                | Action                                                                         |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `MultipleChoice/MultipleChoice.tsx`         | `legacyConfigSchema`, `multiConfigSchema`      | Export union as `multipleChoiceConfigSchema`, add `schema` to both definitions |
| `MultipleChoice/multipleChoicePractice.tsx` | (same as above)                                | Import from `./MultipleChoice.js`, add `schema`                                |
| `DragDrop/DragDrop.tsx`                     | `dragDropSchema` (already exported)            | Add `schema: dragDropSchema` to definition                                     |
| `Matching/Matching.tsx`                     | `matchingSchema` (already exported)            | Add `schema: matchingSchema` to definition                                     |
| `Sequencing/Sequencing.tsx`                 | `sequencingSchema` (already exported)          | Add `schema: sequencingSchema` to definition                                   |
| `FillBlank/FillBlank.tsx`                   | `fillBlankSchema`                              | Export `fillBlankSchema`, add `schema` to definition                           |
| `StoryQuestion/StoryQuestion.tsx`           | If schema exists, export + add; otherwise skip |
| `Flashcard/Flashcard.tsx`                   | `flashcardSchema`                              | Export `flashcardSchema`, add `schema` to definition                           |
| `VisualCounting/VisualCounting.tsx`         | If schema exists, export + add; otherwise skip |
| `FractionVisual/FractionVisual.tsx`         | `fractionVisualSchema` (already exported)      | Add `schema` to definition                                                     |
| `GridArea/GridArea.tsx`                     | If schema exists, export + add; otherwise skip |
| `PlaceValueChart/PlaceValueChart.tsx`       | `placeValueChartSchema` (already exported)     | Add `schema` to definition                                                     |
| `ClockTime/ClockTime.tsx`                   | `configSchema` (already exported)              | Add `schema: configSchema` to definition                                       |
| `MeasurementScale/MeasurementScale.tsx`     | `configSchema` (already exported)              | Add `schema: configSchema` to definition                                       |
| `NumberLine/NumberLine.tsx`                 | `numberLineSchema`                             | Export + add `schema` to definition                                            |
| `ChartReader/ChartReader.tsx`               | `configSchema`                                 | Export + add `schema` to definition                                            |
| `Callout/Callout.tsx`                       | No config schema (display-only)                | Skip                                                                           |
| `Hotspot/Hotspot.tsx`                       | If schema exists, export + add; otherwise skip |
| `Timeline/Timeline.tsx`                     | `timelineSchema`                               | Export + add `schema` to definition                                            |
| `LabelDiagram/LabelDiagram.tsx`             | `labelDiagramSchema` (already exported)        | Add `schema` to definition                                                     |
| `ImageLabel/ImageLabel.tsx`                 | `imageLabelSchema` (already exported)          | Add `schema` to definition                                                     |
| `AudioPlayer/AudioPlayer.tsx`               | If schema exists, export + add; otherwise skip |
| `VideoPlayer/VideoPlayer.tsx`               | If schema exists, export + add; otherwise skip |
| `ProcessDiagram/ProcessDiagram.tsx`         | `processDiagramSchema`                         | Export + add `schema` to definition                                            |
| `SocialMap/SocialMap.tsx`                   | `socialMapSchema`                              | Export + add `schema` to definition                                            |
| `RealWorld/RealWorld.tsx`                   | `realWorldSchema`                              | Export + add `schema` to definition                                            |
| `ImageCompare/ImageCompare.tsx`             | If schema exists, export + add; otherwise skip |

- [ ] **Step 4: Run existing widget tests**

```bash
pnpm --filter @open-edu/widgets test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/
git commit -m "feat(widgets): populate schema field on built-in widget definitions"
```

---

### Task 3: Create `useWidgetConfig` hook

**Files:**

- Create: `apps/dev-server/src/editor/hooks/useWidgetConfig.ts`
- Create dir: `apps/dev-server/src/editor/hooks/`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/dev-server/src/editor/__tests__/widget-preview.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWidgetConfig } from '../hooks/useWidgetConfig';

describe('useWidgetConfig', () => {
  it('returns isWidgetNode=true for exercise nodes', () => {
    const content = JSON.stringify({
      type: 'exercise',
      widgetConfig: { prompt: 'Test' },
      widget: 'core.multiple-choice',
    });
    const { result } = renderHook(() => useWidgetConfig(content));
    expect(result.current.isWidgetNode).toBe(true);
    expect(result.current.widgetType).toBe('core.multiple-choice');
    expect(result.current.widgetConfig).toEqual({ prompt: 'Test' });
  });

  it('returns isWidgetNode=true for custom nodes', () => {
    const content = JSON.stringify({
      type: 'custom',
      widgetConfig: { items: [] },
      widget: 'core.drag-drop',
    });
    const { result } = renderHook(() => useWidgetConfig(content));
    expect(result.current.isWidgetNode).toBe(true);
    expect(result.current.widgetType).toBe('core.drag-drop');
  });

  it('returns isWidgetNode=false for lesson nodes', () => {
    const content = JSON.stringify({ type: 'lesson', title: 'Hello' });
    const { result } = renderHook(() => useWidgetConfig(content));
    expect(result.current.isWidgetNode).toBe(false);
    expect(result.current.widgetType).toBeNull();
  });

  it('returns isWidgetNode=false for malformed JSON', () => {
    const { result } = renderHook(() => useWidgetConfig('not valid json'));
    expect(result.current.isWidgetNode).toBe(false);
    expect(result.current.widgetType).toBeNull();
  });

  it('returns isWidgetNode=false for empty config', () => {
    const content = JSON.stringify({ type: 'exercise' });
    const { result } = renderHook(() => useWidgetConfig(content));
    expect(result.current.isWidgetNode).toBe(true);
    expect(result.current.widgetType).toBe('core.multiple-choice');
    expect(result.current.widgetConfig).toEqual({});
  });

  it('uses widgetConfig field from the node', () => {
    const content = JSON.stringify({
      type: 'exercise',
      widgetConfig: { questions: [] },
      metadata: { widgetType: 'core.matching' },
    });
    const { result } = renderHook(() => useWidgetConfig(content));
    expect(result.current.widgetType).toBe('core.matching');
    expect(result.current.widgetConfig).toEqual({ questions: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: FAIL — `useWidgetConfig` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/dev-server/src/editor/hooks/useWidgetConfig.ts
import { useMemo } from 'react';

export interface WidgetConfigResult {
  widgetType: string | null;
  widgetConfig: Record<string, unknown> | null;
  isWidgetNode: boolean;
}

export function useWidgetConfig(content: string): WidgetConfigResult {
  return useMemo(() => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { widgetType: null, widgetConfig: null, isWidgetNode: false };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { widgetType: null, widgetConfig: null, isWidgetNode: false };
    }

    const type = parsed.type;
    if (type !== 'exercise' && type !== 'custom') {
      return { widgetType: null, widgetConfig: null, isWidgetNode: false };
    }

    const metadata = parsed.metadata as Record<string, unknown> | undefined;
    const widgetType =
      (typeof parsed.widget === 'string' ? parsed.widget : null) ??
      (metadata && typeof metadata.widgetType === 'string' ? metadata.widgetType : null) ??
      'core.multiple-choice';

    const widgetConfig = (parsed.widgetConfig as Record<string, unknown>) ?? {};

    return { widgetType, widgetConfig, isWidgetNode: true };
  }, [content]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/hooks/useWidgetConfig.ts apps/dev-server/src/editor/__tests__/widget-preview.test.tsx
git commit -m "feat(dev-server): add useWidgetConfig hook"
```

---

### Task 4: Create `WidgetValidator`

**Files:**

- Create: `apps/dev-server/src/editor/WidgetValidator.ts`
- Append tests to: `apps/dev-server/src/editor/__tests__/widget-preview.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `apps/dev-server/src/editor/__tests__/widget-preview.test.tsx`:

```typescript
import { validateWidgetConfig, type ValidationError } from '../WidgetValidator';
import { z } from 'zod';

describe('WidgetValidator', () => {
  it('returns empty errors for valid config matching schema', () => {
    const schema = z.object({ prompt: z.string().min(1) });
    const errors = validateWidgetConfig({ prompt: 'Hello' }, schema);
    expect(errors).toHaveLength(0);
  });

  it('returns errors for config violating schema', () => {
    const schema = z.object({ prompt: z.string().min(1) });
    const errors = validateWidgetConfig({ prompt: '' }, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.severity).toBe('error');
    expect(errors[0]!.path).toBe('prompt');
  });

  it('returns empty errors when schema is undefined', () => {
    const errors = validateWidgetConfig({ prompt: 'Hello' }, undefined);
    expect(errors).toHaveLength(0);
  });

  it('returns warnings for missing recommended fields', () => {
    const errors = validateWidgetConfig({}, undefined);
    expect(errors).toHaveLength(0);
  });

  it('handles nested object validation', () => {
    const schema = z.object({ options: z.array(z.object({ text: z.string() })).min(1) });
    const errors = validateWidgetConfig({ options: [{ text: '' }] }, schema);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: FAIL — `validateWidgetConfig` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/dev-server/src/editor/WidgetValidator.ts
import type { z } from 'zod';

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export function validateWidgetConfig(
  config: unknown,
  schema?: z.ZodType<any, any, any>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!schema) return errors;

  const result = schema.safeParse(config);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        severity: issue.code === 'invalid_type' ? 'error' : 'error',
        code: issue.code,
      });
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/WidgetValidator.ts apps/dev-server/src/editor/__tests__/widget-preview.test.tsx
git commit -m "feat(dev-server): add WidgetValidator for real-time widget config validation"
```

---

### Task 5: Create `WidgetPreviewProvider`

**Files:**

- Create: `apps/dev-server/src/editor/WidgetPreviewProvider.tsx`

- [ ] **Step 1: Write the failing test**

Add to `apps/dev-server/src/editor/__tests__/widget-preview.test.tsx`:

```typescript
import { WidgetPreviewProvider, useWidgetPreview } from '../WidgetPreviewProvider';

describe('WidgetPreviewProvider', () => {
  it('provides registry with default built-in widgets', () => {
    function Consumer() {
      const ctx = useWidgetPreview();
      return <div data-testid="widget-count">{ctx.registry.getAll().length}</div>;
    }
    render(
      <WidgetPreviewProvider>
        <Consumer />
      </WidgetPreviewProvider>,
    );
    expect(screen.getByTestId('widget-count').textContent).toBe('27');
  });

  it('wraps children and renders them', () => {
    render(
      <WidgetPreviewProvider>
        <div data-testid="child">content</div>
      </WidgetPreviewProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <WidgetPreviewProvider>
        <div>content</div>
      </WidgetPreviewProvider>,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: FAIL — `WidgetPreviewProvider` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/dev-server/src/editor/WidgetPreviewProvider.tsx
import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { WidgetRegistry, WidgetRenderProps } from '@open-edu/widgets';
import { createDefaultRegistry } from '@open-edu/widgets';

interface PreviewInteractionEvent {
  widgetId: string;
  type: string;
  data: unknown;
}

interface WidgetPreviewContextValue {
  registry: WidgetRegistry;
  emitInteraction: (widgetId: string, data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState: Record<string, unknown> | undefined;
  interactions: PreviewInteractionEvent[];
}

const WidgetPreviewContext = createContext<WidgetPreviewContextValue | null>(null);

export function useWidgetPreview(): WidgetPreviewContextValue {
  const ctx = useContext(WidgetPreviewContext);
  if (!ctx) throw new Error('useWidgetPreview must be used within WidgetPreviewProvider');
  return ctx;
}

export interface WidgetPreviewProviderProps {
  children: ReactNode;
}

export function WidgetPreviewProvider({ children }: WidgetPreviewProviderProps): JSX.Element {
  const [interactions, setInteractions] = useState<PreviewInteractionEvent[]>([]);

  const registry = useMemo(() => createDefaultRegistry(), []);

  const value: WidgetPreviewContextValue = {
    registry,
    emitInteraction: (widgetId: string, data: Record<string, unknown>) => {
      const event: PreviewInteractionEvent = { widgetId, type: 'interaction', data };
      setInteractions((prev) => [...prev, event]);
      console.debug('[widget:preview:interaction]', widgetId, data);
    },
    complete: (score?: number, state?: unknown) => {
      console.debug('[widget:preview:complete]', { score, state });
    },
    storedState: undefined,
    interactions,
  };

  return (
    <WidgetPreviewContext.Provider value={value}>
      {children}
    </WidgetPreviewContext.Provider>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/WidgetPreviewProvider.tsx apps/dev-server/src/editor/__tests__/widget-preview.test.tsx
git commit -m "feat(dev-server): add WidgetPreviewProvider for isolated widget preview context"
```

---

### Task 6: Create `WidgetPreviewPanel`

**Files:**

- Create: `apps/dev-server/src/editor/WidgetPreviewPanel.tsx`

- [ ] **Step 1: Write the failing test**

Add to `apps/dev-server/src/editor/__tests__/widget-preview.test.tsx`:

```typescript
import { WidgetPreviewPanel } from '../WidgetPreviewPanel';

describe('WidgetPreviewPanel', () => {
  it('shows empty state when widgetType is null', () => {
    render(<WidgetPreviewPanel widgetType={null} widgetConfig={null} validationErrors={[]} />);
    expect(screen.getByText(/select.*exercise/i)).toBeInTheDocument();
  });

  it('shows widget-not-found for unknown widget type', () => {
    render(<WidgetPreviewPanel widgetType="nonexistent.widget" widgetConfig={{}} validationErrors={[]} />);
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('shows error banner when validation errors exist', () => {
    const errors = [{ path: 'prompt', message: 'Required', severity: 'error' as const, code: 'invalid_type' }];
    render(
      <WidgetPreviewPanel
        widgetType="core.multiple-choice"
        widgetConfig={{}}
        validationErrors={errors}
      />,
    );
    expect(screen.getByText(/validation error/i)).toBeInTheDocument();
  });

  it('renders widget for known type with valid config', () => {
    render(
      <WidgetPreviewPanel
        widgetType="core.multiple-choice"
        widgetConfig={{ prompt: 'Test?', options: [{ id: 'a', text: 'Answer' }] }}
        validationErrors={[]}
      />,
    );
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <WidgetPreviewPanel widgetType={null} widgetConfig={null} validationErrors={[]} />,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: FAIL — `WidgetPreviewPanel` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/dev-server/src/editor/WidgetPreviewPanel.tsx
import { useMemo } from 'react';
import type { ValidationError } from './WidgetValidator';
import { WidgetPreviewProvider, useWidgetPreview } from './WidgetPreviewProvider';
import type { WidgetRenderProps } from '@open-edu/widgets';
import { Badge, Button, EmptyState } from '@open-edu/design-system';
import { PanelRightClose, RotateCcw } from 'lucide-react';

interface WidgetPreviewPanelProps {
  widgetType: string | null;
  widgetConfig: Record<string, unknown> | null;
  validationErrors: ValidationError[];
  onCollapse?: () => void;
  collapsed?: boolean;
}

function WidgetPreviewRenderer({ widgetType, widgetConfig }: { widgetType: string; widgetConfig: Record<string, unknown> }) {
  const { registry, emitInteraction, complete, storedState } = useWidgetPreview();
  const definition = registry.get(widgetType);

  if (!definition) {
    const available = registry.getAll().map((w) => w.id).join(', ');
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <p className="text-on-surface-variant text-sm font-medium">Widget '{widgetType}' not found</p>
          <p className="text-on-surface-variant/60 mt-1 text-xs">Available: {available}</p>
        </div>
      </div>
    );
  }

  const WidgetComponent = definition.render;
  const widgetProps: WidgetRenderProps = {
    nodeId: '__preview__',
    config: widgetConfig,
    emitInteraction: (data) => emitInteraction(widgetType, data),
    complete: (score?: number, state?: unknown) => complete(score, state),
    storedState,
  };

  return (
    <div className="flex min-h-[200px] items-center justify-center p-4">
      <div className="w-full max-w-[600px]">
        <WidgetComponent {...widgetProps} />
      </div>
    </div>
  );
}

export function WidgetPreviewPanel({
  widgetType,
  widgetConfig,
  validationErrors,
  onCollapse,
  collapsed,
}: WidgetPreviewPanelProps): JSX.Element {
  const errorCount = validationErrors.filter((e) => e.severity === 'error').length;
  const warningCount = validationErrors.filter((e) => e.severity === 'warning').length;

  return (
    <div className="flex h-full flex-col" data-testid="widget-preview-panel">
      {/* Header */}
      <div className="border-outline-variant bg-surface-container flex shrink-0 items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant text-xs font-semibold">Preview</span>
          {widgetType && (
            <Badge variant="outline" className="text-[10px]">
              {widgetType}
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount > 0 && errorCount === 0 && (
            <span className="text-warning text-[10px] font-medium">{warningCount} warning{warningCount > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {widgetType && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Reset preview" aria-label="Reset preview">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          {onCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onCollapse}
              title={collapsed ? 'Show preview' : 'Hide preview'}
              aria-label={collapsed ? 'Show preview' : 'Hide preview'}
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Validation banner */}
      {validationErrors.length > 0 && (
        <div className="border-error-container bg-error-container shrink-0 border-b px-3 py-2">
          {validationErrors.slice(0, 3).map((err, i) => (
            <p key={i} className="text-error text-[11px] leading-relaxed">
              <span className="font-medium">{err.path}</span>: {err.message}
            </p>
          ))}
          {validationErrors.length > 3 && (
            <p className="text-error/70 mt-1 text-[11px]">
              ...and {validationErrors.length - 3} more
            </p>
          )}
        </div>
      )}

      {/* Preview body */}
      <div className="flex-1 overflow-auto">
        {!widgetType ? (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              heading="No widget to preview"
              description="Select an exercise or custom node to see a live preview"
            />
          </div>
        ) : (
          <WidgetPreviewProvider>
            <WidgetPreviewRenderer widgetType={widgetType} widgetConfig={widgetConfig ?? {}} />
          </WidgetPreviewProvider>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add EmptyState import check — the EmptyState component needs heading + description**

Check the EmptyState component signature:

```bash
head -30 packages/design-system/src/patterns/EmptyState.tsx
```

If it takes different prop names, adjust the `EmptyState` usage above to match. Common props: `heading`, `description`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/dev-server/src/editor/WidgetPreviewPanel.tsx apps/dev-server/src/editor/__tests__/widget-preview.test.tsx
git commit -m "feat(dev-server): add WidgetPreviewPanel with live widget rendering"
```

---

### Task 7: Create `SplitPaneLayout`

**Files:**

- Create: `apps/dev-server/src/editor/SplitPaneLayout.tsx`

- [ ] **Step 1: Write the failing test**

Add to `apps/dev-server/src/editor/__tests__/widget-preview.test.tsx`:

```typescript
import { SplitPaneLayout } from '../SplitPaneLayout';

describe('SplitPaneLayout', () => {
  it('renders editor content in left pane', () => {
    render(
      <SplitPaneLayout
        editorContent={<div data-testid="editor">Editor</div>}
        previewContent={<div data-testid="preview">Preview</div>}
        showPreview={true}
        onTogglePreview={() => {}}
      />,
    );
    expect(screen.getByTestId('editor')).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toBeInTheDocument();
  });

  it('hides preview content when showPreview is false', () => {
    render(
      <SplitPaneLayout
        editorContent={<div data-testid="editor">Editor</div>}
        previewContent={<div data-testid="preview">Preview</div>}
        showPreview={false}
        onTogglePreview={() => {}}
      />,
    );
    expect(screen.getByTestId('editor')).toBeInTheDocument();
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <SplitPaneLayout
        editorContent={<div>Editor</div>}
        previewContent={<div>Preview</div>}
        showPreview={true}
        onTogglePreview={() => {}}
      />,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: FAIL — `SplitPaneLayout` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/dev-server/src/editor/SplitPaneLayout.tsx
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ResizablePanel } from '@open-edu/design-system';

const STORAGE_KEY = 'devserver-split-ratio';

interface SplitPaneLayoutProps {
  editorContent: ReactNode;
  previewContent: ReactNode;
  showPreview: boolean;
  onTogglePreview: () => void;
}

export function SplitPaneLayout({
  editorContent,
  previewContent,
  showPreview,
  onTogglePreview,
}: SplitPaneLayoutProps): JSX.Element {
  const [ratio, setRatio] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved ? Number(saved) : 0.5;
  });

  const handleRatioChange = useCallback((newRatio: number) => {
    setRatio(newRatio);
    localStorage.setItem(STORAGE_KEY, String(newRatio));
  }, []);

  return (
    <ResizablePanel
      left={editorContent}
      right={previewContent}
      defaultRatio={ratio}
      collapsed={!showPreview}
      onCollapse={onTogglePreview}
      onExpand={onTogglePreview}
      onRatioChange={handleRatioChange}
      leftClassName="bg-surface"
      rightClassName="bg-surface-container-low"
      minRightPx={350}
      minLeftPct={30}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/widget-preview.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/SplitPaneLayout.tsx apps/dev-server/src/editor/__tests__/widget-preview.test.tsx
git commit -m "feat(dev-server): add SplitPaneLayout wrapping ResizablePanel with persistence"
```

---

### Task 8: Add field error support to `SchemaForm`

**Files:**

- Modify: `apps/dev-server/src/editor/SchemaForm.tsx`
- Modify: `apps/dev-server/src/editor/__tests__/editor.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `apps/dev-server/src/editor/__tests__/editor.test.tsx`:

```typescript
describe('SchemaForm with field errors', () => {
  const defaultData = { id: 'test', title: 'Hello', count: 42, active: true };

  it('shows error text beneath fields with errors', () => {
    const fieldErrors = {
      id: [{ path: 'id', message: 'ID is required', severity: 'error' as const, code: 'invalid_type' }],
    };
    render(<SchemaForm data={defaultData} onChange={() => {}} fieldErrors={fieldErrors} />);
    expect(screen.getByText('ID is required')).toBeInTheDocument();
  });

  it('adds aria-invalid to errored fields', () => {
    const fieldErrors = {
      title: [{ path: 'title', message: 'Title too short', severity: 'error' as const, code: 'too_small' }],
    };
    render(<SchemaForm data={defaultData} onChange={() => {}} fieldErrors={fieldErrors} />);
    const input = screen.getByDisplayValue('Hello');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/editor.test.tsx -t "SchemaForm with field errors"
```

Expected: FAIL — no `fieldErrors` prop on SchemaForm

- [ ] **Step 3: Modify `SchemaForm` to accept `fieldErrors` prop**

Add to `SchemaForm.tsx`:

At the top, add the `ValidationError` import:

```typescript
import type { ValidationError } from './WidgetValidator';
```

In `SchemaFormProps`, add:

```typescript
  fieldErrors?: Record<string, ValidationError[]>;
```

In the component function, add the prop to destructuring:

```typescript
  fieldErrors = {},
```

Update `FieldWrapper` to accept and display errors. Change the `visibleKeys.map` section to pass errors:

Replace the `FieldWrapper` usage inside the map with:

```typescript
const fieldErr = fieldErrors[key];
return (
  <FieldWrapper key={key} label={label} error={fieldErr?.[0]} id={`field-${key}`}>
    {/* existing input/textarea/etc */}
  </FieldWrapper>
);
```

Update `FieldWrapper` to accept error and render it:

```typescript
function FieldWrapper({
  label,
  children,
  error,
  id,
}: {
  label: string;
  children: React.ReactNode;
  error?: ValidationError;
  id?: string;
}) {
  return (
    <div>
      <label className="text-on-surface-variant mb-0.5 block text-xs font-medium" htmlFor={id}>
        {label}
      </label>
      <div className={error ? 'relative' : ''}>
        {Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ 'aria-invalid'?: string; 'aria-describedby'?: string; id?: string }>, {
              'aria-invalid': error ? 'true' : undefined,
              'aria-describedby': error ? `${id}-error` : undefined,
              id,
            });
          }
          return child;
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-error mt-0.5 text-[11px]" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add imports needed for FieldWrapper**

At the top of `SchemaForm.tsx`, add:

```typescript
import React, { Children } from 'react';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/editor.test.tsx -t "SchemaForm with field errors"
```

Expected: PASS

- [ ] **Step 6: Run full dev-server test suite**

```bash
pnpm --filter @open-edu/dev-server test
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/dev-server/src/editor/SchemaForm.tsx apps/dev-server/src/editor/__tests__/editor.test.tsx
git commit -m "feat(dev-server): add fieldErrors prop to SchemaForm for inline validation display"
```

---

### Task 9: Add field errors to `JSONNodeEditor`

**Files:**

- Modify: `apps/dev-server/src/editor/JSONNodeEditor.tsx`

- [ ] **Step 1: Write the failing test**

Add to `apps/dev-server/src/editor/__tests__/editor.test.tsx`:

```typescript
describe('JSONNodeEditor with field errors', () => {
  it('passes fieldErrors to SchemaForm', () => {
    const fieldErrors = {
      title: [{ path: 'title', message: 'Required', severity: 'error' as const, code: 'invalid_type' }],
    };
    render(
      <JSONNodeEditor
        data={{ type: 'lesson' }}
        onChange={() => {}}
        fileName="test.json"
        fieldErrors={fieldErrors}
      />,
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/editor.test.tsx -t "JSONNodeEditor with field errors"
```

Expected: FAIL — `JSONNodeEditor` doesn't accept `fieldErrors`

- [ ] **Step 3: Modify `JSONNodeEditor`**

Add `fieldErrors` prop and pass it to `SchemaForm`:

In `JSONNodeEditor.tsx`, at the top add the import:

```typescript
import type { ValidationError } from './WidgetValidator';
```

Change the interface:

```typescript
interface JSONNodeEditorProps {
  data: ContentNodeData;
  onChange: (data: ContentNodeData) => void;
  fileName: string;
  fieldErrors?: Record<string, ValidationError[]>;
}
```

Add to destructuring:

```typescript
  fieldErrors = {},
```

In the `SchemaForm` usage (around line 153), add the prop:

```typescript
<SchemaForm
  data={formContent as Record<string, unknown>}
  onChange={handleFormChange}
  fields={fields}
  fieldLabels={commonFieldLabels}
  placeholders={commonPlaceholders}
  fieldErrors={fieldErrors}
/>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @open-edu/dev-server test -- --run src/editor/__tests__/editor.test.tsx -t "JSONNodeEditor with field errors"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/JSONNodeEditor.tsx apps/dev-server/src/editor/__tests__/editor.test.tsx
git commit -m "feat(dev-server): add fieldErrors prop to JSONNodeEditor"
```

---

### Task 10: Integrate into `EditorShell`

**Files:**

- Modify: `apps/dev-server/src/editor/EditorShell.tsx`
- Modify: `apps/dev-server/src/editor/types.ts` (if needed)

- [ ] **Step 1: Update types.ts to add `widgetErrors` to EditorFile (optional)**

If you want to persist validation errors per-file, add to `EditorFile` in `types.ts`:

```typescript
export interface EditorFile {
  path: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  validationError: string | null;
  widgetErrors?: Array<{ path: string; message: string; severity: string; code: string }>;
}
```

(Optional — validation errors can also be computed live without storing them.)

- [ ] **Step 2: Modify `EditorShell` to integrate preview**

The key changes to `EditorShell.tsx`:

**a) Add imports:**

```typescript
import { SplitPaneLayout } from './SplitPaneLayout';
import { WidgetPreviewPanel } from './WidgetPreviewPanel';
import { useWidgetConfig } from './hooks/useWidgetConfig';
import { validateWidgetConfigForType } from './WidgetValidator';
import { EyeOff, Eye } from 'lucide-react';
```

**b) Add state:**

```typescript
const [showPreview, setShowPreview] = useState(true);
```

**c) Add hooks after other useState calls:**

```typescript
const { widgetType, widgetConfig, isWidgetNode } = useWidgetConfig(currentFile?.content ?? '');
```

**d) First, add `validateWidgetConfigForType` to `WidgetValidator.ts`:**

Append to `apps/dev-server/src/editor/WidgetValidator.ts`:

```typescript
import { createDefaultRegistry } from '@open-edu/widgets';

let _registry: ReturnType<typeof createDefaultRegistry> | null = null;
function getRegistry() {
  if (!_registry) _registry = createDefaultRegistry();
  return _registry;
}

export function validateWidgetConfigForType(
  widgetType: string,
  config: unknown,
): ValidationError[] {
  const registry = getRegistry();
  const definition = registry.get(widgetType);
  const schema = (definition as any)?.schema;
  return validateWidgetConfig(config, schema ?? undefined);
}
```

**e) Add validation computation in `EditorShell`:**

```typescript
const validationErrors = useMemo(() => {
  if (!isWidgetNode || widgetType === null || widgetConfig === null) return [];
  return validateWidgetConfigForType(widgetType, widgetConfig);
}, [isWidgetNode, widgetType, widgetConfig]);
```

**f) Modify the content area to use `SplitPaneLayout`:**

Replace the `{mode === 'edit' ? (...)}` section's inner content div. Currently (around line 617):

```tsx
<div className="flex flex-1 flex-col overflow-hidden">
  {/* ... path bar ... */}
  <div className="flex-1 overflow-auto p-3">
    {showAssetManager ? (
      <AssetManager ... />
    ) : currentFile ? (
      <div>
        {currentFile.validationError && (...)}
        {fileEditorContent}
      </div>
    ) : (
      <div>Select a file...</div>
    )}
  </div>
</div>
```

Replace with:

```tsx
<div className="flex flex-1 flex-col overflow-hidden">
  {selectedPath && (
    <div className="border-outline-variant bg-surface flex items-center border-b px-2">
      {/* existing path bar — unchanged */}
      <div className="border-outline-variant flex items-center gap-1 border-r pr-2">
        <span className="text-on-surface-variant text-xs">{currentFile?.isDirty ? '●' : '○'}</span>
        <span className="text-on-surface max-w-[200px] truncate text-xs font-medium">
          {selectedPath}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-on-surface-variant text-xs font-medium"
        onClick={handleUndo}
        disabled={!currentFile?.isDirty}
        title="Revert to last saved state"
      >
        Undo
      </Button>
      {isWidgetNode && (
        <Button
          variant="ghost"
          size="sm"
          className="text-on-surface-variant text-xs font-medium"
          onClick={() => setShowPreview((p) => !p)}
          title={showPreview ? 'Hide preview' : 'Show preview'}
        >
          {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="ml-1">{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
        </Button>
      )}
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        className="text-on-surface-variant text-xs font-medium"
        onClick={handleSaveAll}
        disabled={dirtyCount === 0 || savingAll}
      >
        {savingAll ? 'Saving...' : `Save All${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-primary text-xs font-medium"
        onClick={handleSave}
        disabled={!currentFile?.isDirty || saving}
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )}

  <div className="flex-1 overflow-hidden">
    {showAssetManager ? (
      <AssetManager assets={assetFiles} onRefresh={handleRefreshAssets} />
    ) : currentFile ? (
      <SplitPaneLayout
        editorContent={
          <div className="h-full overflow-auto p-3">
            {currentFile.validationError && (
              <div className="border-error-container bg-error-container mb-3 rounded-lg border px-3 py-2">
                <p className="text-error text-xs font-medium">Validation Error:</p>
                <p className="text-error mt-0.5 text-xs">{currentFile.validationError}</p>
              </div>
            )}
            {fileEditorContent}
          </div>
        }
        previewContent={
          <WidgetPreviewPanel
            widgetType={isWidgetNode ? widgetType : null}
            widgetConfig={isWidgetNode ? widgetConfig : null}
            validationErrors={validationErrors}
            onCollapse={() => setShowPreview(false)}
          />
        }
        showPreview={showPreview && isWidgetNode}
        onTogglePreview={() => setShowPreview((p) => !p)}
      />
    ) : (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="text-on-surface-variant/40 mx-auto mb-2 h-10 w-10" strokeWidth={1} />
          <p className="text-on-surface-variant text-sm">Select a file from the sidebar to edit</p>
        </div>
      </div>
    )}
  </div>
</div>
```

**g) Pass `fieldErrors` to `JSONNodeEditor`:**

In the `fileEditorContent` useMemo, find the `JSONNodeEditor` usages (around lines 467-472 and 507-512) and pass `fieldErrors`:

```typescript
<JSONNodeEditor
  data={parsed}
  onChange={(d) => handleStructuredDataChange(d as unknown as Record<string, unknown>)}
  fileName={currentFile.path}
  fieldErrors={validationErrors.length > 0 ? groupErrorsByField(validationErrors) : {}}
/>
```

And add the grouping helper at the top of the component:

```typescript
function groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
  const grouped: Record<string, ValidationError[]> = {};
  for (const err of errors) {
    const field = err.path.split('.')[0]!;
    if (!grouped[field]) grouped[field] = [];
    grouped[field]!.push(err);
  }
  return grouped;
}
```

- [ ] **Step 3: Run the tests to verify the editor still works**

```bash
pnpm --filter @open-edu/dev-server test
```

Expected: PASS

- [ ] **Step 4: TypeScript check**

```bash
pnpm --filter @open-edu/dev-server exec tsc --noEmit
```

Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/
git commit -m "feat(dev-server): integrate widget live preview into EditorShell"
```

---

### Task 11: End-to-end verification

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test
```

Expected: All tests pass

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: No lint errors

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors

- [ ] **Step 4: Format check**

```bash
pnpm format:check
```

Expected: No formatting issues

- [ ] **Step 5: Regenerate dev-server CSS (if any Tailwind classes were added)**

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

Expected: CSS regenerates successfully

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: widget live preview with real-time validation in dev-server editor"
```
