# Widget Live Preview — Design Document

**Date:** 2026-07-29
**Status:** Draft

## Overview

Add a side-by-side live preview pane to the dev-server editor for widget config JSONs (exercise/custom content nodes). The preview renders the widget in real-time as the user edits its configuration, with client-side validation using each widget's Zod schema.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    EditorShell                        │
│  ┌──────────────────────────────────────────────────┐│
│  │  Toolbar: [file path]  [Toggle Preview] [Save]  ││
│  ├──────────────────────┬───────────────────────────┤│
│  │                      │                           ││
│  │   File Tree           │  ResizablePanel           ││
│  │   (FileTree)          │  ┌─────────────────────┐ ││
│  │                      │  │ Left Pane           │ ││
│  │                      │  │ (form / raw editor) │ ││
│  │                      │  ├─────────────────────┤ ││
│  │                      │  │ Divider (draggable) │ ││
│  │                      │  ├─────────────────────┤ ││
│  │                      │  │ Right Pane          │ ││
│  │                      │  │ WidgetPreviewPanel  │ ││
│  │                      │  │ ┌─────────────────┐ │ ││
│  │                      │  │ │ Header (name,   │ │ │
│  │                      │  │ │  reset, errors) │ │ │
│  │                      │  │ ├─────────────────┤ │ ││
│  │                      │  │ │ WidgetPreview   │ │ │
│  │                      │  │ │ Provider        │ │ │
│  │                      │  │ │ ┌─────────────┐ │ │ │
│  │                      │  │ │ │ Widget      │ │ │ │
│  │                      │  │ │ │ Renderer    │ │ │ │
│  │                      │  │ │ └─────────────┘ │ │ │
│  │                      │  │ └─────────────────┘ │ ││
│  │                      │  └─────────────────────┘ ││
│  └──────────────────────┴───────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Data Flow

```
User types in editor → content string
                            ↓
                   JSON.parse (if .json)
                            ↓
              useWidgetConfig hook
              ┌─────────────────────┐
              │ Extract widgetType  │
              │ Extract widgetConfig│
              └─────────────────────┘
                     │           │
                     ▼           ▼
              WidgetValidator  WidgetPreviewPanel
              ┌──────────────┐ ┌───────────────┐
              │ JSON syntax  │ │ Look up widget│
              │ Zod parse    │ │ in registry   │
              │ Completeness │ │ Render with   │
              └──────────────┘ │ live config   │
                     │         └───────────────┘
                     ▼
              ValidationError[]
              ├──→ Banner in preview panel
              └──→ Inline field errors in form
```

## Components

### 1. `ResizablePanel` (design-system, new)

A horizontal split pane with a draggable divider. Added to `packages/design-system/src/patterns/`.

```typescript
interface ResizablePanelProps {
  left: ReactNode;
  right: ReactNode;
  defaultRatio?: number; // 0-1, default 0.5
  minLeftPct?: number; // min % left can shrink to
  minRightPx?: number; // min px for right panel
  collapsed?: boolean; // right panel collapsed
  onCollapse?: () => void;
  onExpand?: () => void;
  onRatioChange?: (ratio: number) => void;
  leftClassName?: string;
  rightClassName?: string;
}
```

Built with `forwardRef`, `displayName`, `cn()`. Drag handle uses native `onMouseDown`/`onTouchStart` events. Divider is keyboard-navigable (arrow keys). Stores ratio in `localStorage` via consumer (not built-in).

### 2. `useWidgetConfig` (dev-server, new)

Hook that extracts widget info from the currently edited file.

```typescript
function useWidgetConfig(content: string): {
  widgetType: string | null;
  widgetConfig: unknown | null;
  isWidgetNode: boolean;
};
```

Logic:

- Parse JSON content
- If `type === "exercise"` → read `widgetConfig` field, use `metadata?.widgetType || "core.multiple-choice"`
- If `type === "custom"` → read `widgetConfig` field
- Otherwise → `isWidgetNode: false`
- Malformed/parse error → `isWidgetNode: false`

### 3. `WidgetPreviewProvider` (dev-server, new)

Minimal context provider for isolated widget preview.

Provides via React context:

- `WidgetRegistry` instance (via `createDefaultRegistry()`)
- Mock `emitInteraction` — logs to dev-server telemetry inspector
- Mock `complete` — logs completion event
- `storedState` — undefined (fresh preview each session)

Only wraps the preview pane content — not the entire editor.

### 4. `WidgetPreviewPanel` (dev-server, new)

The right-side preview pane. Uses design-system components:

| UI Element      | DS Component                                                                |
| --------------- | --------------------------------------------------------------------------- |
| Widget name     | `Badge`                                                                     |
| Collapse button | `Button` with `variant="ghost"`, `size="sm"`, Lucide `PanelRightClose` icon |
| Reset button    | `Button` with `variant="ghost"`, `size="sm"`, Lucide `RotateCcw` icon       |
| Error banner    | `Badge` with `variant="destructive"` (errors) or Tag variant `warning`      |
| Loading state   | `Spinner`                                                                   |
| Empty state     | `EmptyState` component                                                      |
| Toolbar hints   | `Tooltip`                                                                   |

Layout (top to bottom):

1. **Header** — `Badge` with widget name, collapse/reset `Button`s
2. **Validation banner** — error count summary
3. **Preview area** — `WidgetPreviewProvider` wrapping `WidgetRenderer`, centered in a learner-like viewport (~600px width)
4. **Metadata footer** — widget domain, capabilities, accessibility info from registry

Debounces config updates at 300ms via `useDebounce` to avoid excessive re-renders.

### 5. `WidgetValidator` (dev-server, new)

Client-side validation engine. Three layers:

1. **JSON syntax** — `JSON.parse()` with `try/catch`, reports line/column
2. **Zod schema** — `widgetSchema.safeParse(widgetConfig)` using schema from registry definition
3. **Metadata completeness** — checks required `configFields` from catalog entry

```typescript
interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

function validateWidgetConfig(
  widgetType: string,
  widgetConfig: unknown,
  schema?: ZodSchema,
): ValidationError[];
```

Errors flow to:

- Preview panel banner (via `WidgetPreviewPanel`)
- Inline form fields (via `JSONNodeEditor` → `SchemaForm`)

### 6. `SplitPaneLayout` (dev-server, new)

Thin wrapper around `ResizablePanel` from design-system. Handles:

- Collapse/expand toggle state
- Persistence of split ratio in `localStorage`
- Conditionally renders preview panel only for widget nodes

## Changes to Existing Files

### `packages/design-system/src/patterns/ResizablePanel.tsx` (new)

- Implementation: `forwardRef`, `displayName`, `cn()`, drag handle with mouse/touch/keyboard events
- No hardcoded colors — uses `bg-border`, `hover:bg-primary` via tailwind tokens
- Exported from `packages/design-system/src/index.ts`

### `apps/dev-server/src/editor/EditorShell.tsx` (modified)

- Import `ResizablePanel` from `@open-edu/design-system`
- Replace single content outlet with `SplitPaneLayout`
- Add `showPreview` state (default: true for widget nodes)
- Add `SplitPaneLayout` wrapper around the editor content area
- Pass `validationErrors` to both `JSONNodeEditor` and `WidgetPreviewPanel`

### `apps/dev-server/src/editor/JSONNodeEditor.tsx` (modified)

- Accept `fieldErrors?: Record<string, ValidationError[]>` prop
- Pass errors to `SchemaForm` for each field
- Fields with errors get `aria-invalid="true"`, `aria-describedby`

### `apps/dev-server/src/editor/SchemaForm.tsx` (modified)

- Accept `fieldErrors?: Record<string, ValidationError[]>` in each field config
- Show red border + error text beneath inputs with errors
- Uses `Badge` from DS for error indicator

### `apps/dev-server/src/editor/api.ts` (modified)

- Add `fetchWidgetSchemas(): Promise<Record<string, unknown>>`
- Called once on editor mount, cached for session

### `packages/widgets/src/types.ts` (modified, if needed)

- Ensure `WidgetDefinitionV2.schema` field is populated for built-in widgets
- Each built-in widget exports its config Zod schema as the canonical validation source

## States

| State                        | Previews              | Validation    | UI                                                                             |
| ---------------------------- | --------------------- | ------------- | ------------------------------------------------------------------------------ |
| **Loading schemas**          | N/A                   | N/A           | Spinner in preview header                                                      |
| **Non-widget file selected** | Hidden                | N/A           | Preview panel shows EmptyState: "Select an exercise or custom node to preview" |
| **JSON parse error**         | Paused                | Error banner  | "JSON syntax error at line 3, column 12"                                       |
| **Widget not in registry**   | Placeholder           | Warning       | "Widget 'core.xyz' not found" + list of available widgets                      |
| **Empty widgetConfig**       | Renders               | Warnings      | Widget with default state + "config is empty" warning                          |
| **Valid config**             | Renders live          | Pass          | Widget renders normally, green "Valid" badge                                   |
| **Schema violation**         | Renders (best-effort) | Errors inline | Red borders on errored fields, error count banner                              |
| **Widget runtime error**     | Error boundary        | N/A           | "Widget crashed" fallback with reset button                                    |
| **Preview collapsed**        | Hidden                | N/A           | Only editor visible; expand arrow on divider                                   |

## Testing

| Test                      | Scope      | What                                                            |
| ------------------------- | ---------- | --------------------------------------------------------------- |
| `ResizablePanel`          | DS         | Render, drag resize, collapse/expand, keyboard nav, min widths  |
| `useWidgetConfig`         | Dev-server | Extract from exercise/custom/other, handle malformed JSON       |
| `WidgetValidator`         | Dev-server | JSON parse errors, Zod schema violations, completeness warnings |
| `WidgetPreviewPanel`      | Dev-server | Live update, debounce, widget-not-found, error boundary         |
| `EditorShell integration` | Dev-server | Preview toggle, error propagation, layout for all file types    |

### Non-goals

- Full course preview in editor (only widget-level preview)
- Remote widget preview in editor (v1 focuses on built-in widgets)
- Editing widget state/live interaction in preview (read-only preview)

## Future Considerations

- Remote widget support (needs iframe sandbox for JS execution isolation)
- Context-aware preview (show widget within its content node layout)
- Snapshot testing for widget configs
- Multiple-widget comparison view
