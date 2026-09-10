# @open-edu/interactive-runtime

Host bridge and React mount wrappers for interactive engine nodes (`{ type: "interactive" }`).

## Role

This package is a **thin bridge layer** between OpenEdu and [`@knowledgeassemble/interactive-react`](https://github.com/knowledgeassemble/interactive-react). It does NOT contain engine logic, SVG rendering, or scoring.

## What it provides

- `buildOpenEduBridge(inputs)` — constructs an `OpenEduBridge` from host-provided seams (locale, tokens, i18n, a11y, telemetry, asset resolution)
- `buildSemanticTokens()` — reads CSS custom properties (`--oe-*`) into a token map engines can reference
- `InteractiveNodeView` — React component that mounts a single-engine interactive node
- `InteractiveLessonView` — React component that mounts a composed (multi-engine) interactive lesson

## What it does NOT do

- **Learner chrome** (title, prompt, Mark complete button) lives in `@open-edu/runtime` → `InteractiveRenderer`
- **SVG interaction / rendering** lives in `@knowledgeassemble/interactive-react`
- **Scoring / answer keys** — not implemented (planned for Phase OC-4)

## Usage

```tsx
import {
  buildOpenEduBridge,
  buildSemanticTokens,
  InteractiveNodeView,
} from '@open-edu/interactive-runtime';

const bridge = buildOpenEduBridge({
  locale: 'en',
  tokens: buildSemanticTokens(),
  reducedMotion: false,
  t: (key, vars) => translate(key, vars),
  announce: (msg) => liveRegion.announce(msg),
  onEvent: (event) => telemetry.send(event),
  resolveAsset: (id) => `/assets/${id}`,
});

<InteractiveNodeView
  spec={node.spec}
  engineType={node.engine ?? 'visual'}
  bridge={bridge}
  onReady={() => setIsReady(true)}
/>;
```

## Dependencies

- `@knowledgeassemble/interactive-react` — engine React components
- `@open-edu/schemas` — shared Zod types
