---
sidebar_position: 1
---

# Widgets Overview

The Widget SDK allows custom interactive nodes without modifying the core runtime.

## Widget Contract

```typescript
interface OpenEduWidget {
  mount(element: HTMLElement, config: unknown, context: WidgetContext): void;
  unmount(): void;
  getAriaTree(): AccessibleNodeTree;
}
```

## Widget Context

```typescript
interface WidgetContext {
  emitTelemetry(event: string, data: Record<string, unknown>): void;
  onVerify(score: number, metadata?: Record<string, unknown>): void;
}
```

## Built-in Widgets

- `open-edu.multiple-choice-practice` — Configurable multiple choice exercise

## Future

Phase 2 of the widget architecture will enable remote widget loading via Module Federation.
