---
sidebar_position: 1
---

# Widgets Overview

The Widget SDK provides a typed contract for interactive nodes, a registry for managing widget definitions, built-in widgets, remote widget loading, and NPM scaffold templates for publishing custom widgets.

## Widget Contract

```typescript
import type { ReactNode } from 'react';

interface WidgetDefinition {
  id: string;
  version?: string;
  render(props: WidgetRenderProps): ReactNode;
}

interface WidgetRenderProps {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction(data: Record<string, unknown>): void;
  complete(score?: number): void;
}
```

## Widget Registry

The `WidgetRegistry` manages registration and lookup:

```typescript
import { createWidgetRegistry } from '@open-edu/widgets';

const registry = createWidgetRegistry();

registry.register({
  id: 'my-widget',
  render(props) {
    return <div>{/* widget UI */}</div>;
  },
});

const widget = registry.get('my-widget');
// widget.render({ nodeId, config, emitInteraction, complete });
```

- Duplicate widget IDs are rejected with a typed error.
- `registry.get()` returns `undefined` when a widget is not registered.

## Built-in Widgets

- **`open-edu.multiple-choice-practice`** — Configurable multiple choice exercise with accessible radio inputs, keyboard support, and score-based completion.

## Remote Widget Loading

Widgets can be loaded from remote URLs at runtime via module federation:

```typescript
import { RemoteWidgetLoader } from '@open-edu/widgets';

const loader = new RemoteWidgetLoader();
const state = await loader.load(
  {
    id: 'remote-quiz',
    version: '1.0.0',
    url: 'https://example.com/widgets/quiz.js',
    integrity: 'sha256-abc123...',
    fallback: 'open-edu.multiple-choice-practice',
  },
  registry,
);
```

The loader supports:

- **Integrity verification** — SHA-256 hash check before execution
- **Fallback widgets** — use a local widget if remote loading fails
- **Per-session caching** — avoids re-fetching the same `id@version`
- **Sandboxed evaluation** — uses Blob URLs for isolated module scope

## Widget Scaffold Template

`edu widget create` generates a self-contained, publishable widget package:

```
my-widget/
├── package.json          # name, version, peer deps on react + @open-edu/widgets
├── tsconfig.json
├── src/
│   ├── index.tsx         # default export: WidgetDefinition
│   └── index.test.tsx
└── vitest.config.ts
```

## Usage in Packages

Reference widgets in exercise or custom nodes:

```json
{
  "type": "exercise",
  "widget": "open-edu.multiple-choice-practice",
  "config": {
    "prompt": "What is the capital of France?",
    "options": [
      { "id": "a", "text": "London", "correct": false },
      { "id": "b", "text": "Paris", "correct": true }
    ]
  }
}
```

For remote widgets, use the `remoteWidget` field on custom nodes.
