# Widget Architecture v2

## Overview

The OpenEdu widget system provides a plugin architecture for educational interactive components. Widgets are self-contained units with metadata describing their learning intent, accessibility support, analytics capabilities, and AI generation hints.

## Core Concepts

### Widget Definition

Every widget implements `WidgetDefinition` (base) or `WidgetDefinitionV2` (extended metadata):

- **id**: Unique identifier in `{domain}.{name}` format (e.g., `core.matching`, `math.fraction-visual`)
- **version**: Semver string
- **render**: React component function
- **domain**: Content domain (`core`, `math`, `language`, `science`, `social`)
- **status**: Lifecycle status (`stable`, `experimental`, `deprecated`)
- **learningIntents**: How the widget supports learning (`assess`, `practice`, `observe`, `compare`, `explore`, `create`, `reflect`, `apply`)
- **capabilities**: Feature flags (keyboard, touch, offline, observeMode, hints, retry, etc.)
- **accessibility**: A11y feature documentation (high contrast, keyboard, screen reader, etc.)
- **analytics**: What events the widget can emit (attempts, hints, completion time, etc.)
- **reward**: Reward hooks the widget supports (completionXP, achievement, positiveMessage, confetti, etc.)
- **ai**: Metadata for LLM course generation (difficulty, estimatedMinutes, bloomsLevel, cognitiveLoad, recommendedAge, readingLevel, learningObjectives, commonMisconceptions, generationHints, exampleConfigs)

All 14 stable widgets are enriched with complete metadata across all categories. The 6 experimental stubs have minimal metadata.

### Registry

`WidgetRegistry` is the single source of truth:

```
createDefaultRegistry()
  → registers all 21 builtins
  → applies 15 alias mappings
  → supports: get, has, getAll, getByDomain, search, searchWithFilters
```

### Alias Resolution

Legacy `open-edu.*` IDs are transparently resolved to new domain-prefixed IDs:

```
open-edu.matching → core.matching
open-edu.fraction-visual → math.fraction-visual
open-edu.multiple-choice-practice → core.multiple-choice
```

### Domain Namespacing

Widgets are grouped by content domain:

- `core.*` — Universal widgets (matching, multiple-choice, drag-drop, sequencing, etc.)
- `math.*` — Math-specific (fraction-visual, clock-time, measurement-scale, etc.)
- `language.*` — Language arts (reserved for future use)
- `science.*` — Science (label-diagram, image-label)
- `social.*` — Social studies (reserved for future use)

### Metadata Validation

`validateWidgetMetadata()` enforces completeness and cross-field consistency:

**Completeness checks** (warnings for stable widgets):

- `ai.recommendedAge` — age-appropriate content generation
- `ai.learningObjectives` — content alignment
- `ai.commonMisconceptions` — generating helpful distractors
- `ai.exampleConfigs` — must contain at least one example
- `capabilities.supportsObserveMode` — all stable widgets should support observe mode

**Cross-field consistency checks:**

- `capabilities.supportsHints` requires `analytics.trackHints`
- `capabilities.supportsRetry` requires `analytics.trackRetries`
- `reward.completionXP` requires `reward.positiveMessage`

### Widget Catalog Generation

`generateWidgetCatalog()` produces a structured Markdown catalog from the widget registry, used in LLM prompts for AI-assisted content generation:

```
generateWidgetCatalog(registry)
  → extracts: id, name, description, domain, status, keywords, learningIntents
  → extracts: capabilities, accessibility, analytics (boolean → label)
  → extracts: reward (completionXP, positiveMessage, achievement)
  → extracts: AI metadata (difficulty, estimatedMinutes, bloomsLevel, cognitiveLoad,
               recommendedAge, readingLevel, learningObjectives, commonMisconceptions,
               generationHints)
  → groups widgets by domain with section headers
  → renders as Markdown suitable for LLM prompt injection
```

The CLI's `buildWidgetCatalog()` function extracts metadata from the registry and passes it through `generateWidgetCatalog()` to produce the catalog string.

## Data Flow

```
Course Package (JSON/Markdown)
  ↓
Compiler extracts widget ID from node
  ↓
Registry.resolveAlias(id) maps open-edu.* → core.*
  ↓
Registry.get(resolvedId) returns WidgetDefinition
  ↓
Runtime renders widget via definition.render(config)
```

## Integration Points

| Consumer                       | Integration                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| **Compiler** (agent-prompt.ts) | `generateWidgetCatalog(registry)` generates LLM prompt with live widget catalog |
| **Runtime** (WidgetRenderer)   | `registry.get()` with alias resolution via `resolveWidgetId()`                  |
| **CLI** (widget migrate)       | `WIDGET_ALIAS_MAP` for batch migration of legacy IDs                            |
| **Authoring tools**            | `registry.searchWithFilters()` for structured widget discovery                  |
| **Validation**                 | `validateWidgetMetadata()` for metadata completeness checks                     |

## File Structure

```
packages/widgets/src/
├── types.ts              # WidgetDefinition, WidgetDefinitionV2, WidgetRegistry, WidgetSearchFilters
├── registry.ts           # Registry implementation + registerAllBuiltins + createDefaultRegistry
├── domains.ts            # Domain constants (WidgetDomain), alias map (WIDGET_ALIAS_MAP), migration utils
├── validate-metadata.ts  # Metadata validation (validateWidgetMetadata)
├── metadata/
│   ├── learning-intents.ts # LearningIntent enum + WIDGET_LEARNING_INTENTS + helpers
│   ├── capabilities.ts     # WidgetCapabilities (16 flags)
│   ├── accessibility.ts    # AccessibilityMetadata (11 flags)
│   ├── analytics.ts        # AnalyticsMetadata (8 flags)
│   ├── reward.ts           # RewardMetadata (7 fields)
│   ├── ai.ts               # AIMetadata (12 fields)
│   └── index.ts            # Barrel exports
├── builtins/             # 15 stable + 6 stub widget implementations
├── remote-loader.ts      # Remote widget loading with integrity check
└── use-remote-widget.ts  # React hook for remote widgets

packages/core/src/
├── agent-prompt.ts       # LLM prompt using generateWidgetCatalog(createDefaultRegistry())
└── widget-catalog.ts     # generateWidgetCatalog() — dynamic catalog from registry

packages/cli/src/
└── commands/
    └── widget-migrate.ts # CLI batch migration of open-edu.* IDs
```

## Extension Points

1. **New widgets**: Implement `WidgetDefinitionV2` with all metadata, register via `registry.register()`
2. **Remote widgets**: Use `RemoteWidgetManifest` + `RemoteWidgetLoader` for on-demand widget fetching
3. **Aliases**: `registry.registerAlias(oldId, newId)` for backward compatibility
4. **Filters**: `registry.searchWithFilters()` for structured widget discovery
