# Widget System v2 — Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all remaining gaps from the Widget System v2 spec — register foundation stubs, add structured search, validate metadata, integrate the registry into the compiler and runtime, add a CLI migration command, and produce the architecture + migration guide docs.

**Architecture:** This plan extends the existing v2 work already merged on `feat/widget-system-v2`. The registry, metadata types, alias map, domain constants, learning intents, and all 21 builtin widgets (15 stable + 6 stubs) already exist and pass 721 tests. What's missing is wiring: the stubs aren't registered, the compiler hardcodes legacy IDs, the runtime's `resolveWidgetId` bypasses the alias map, search only does text matching, metadata isn't validated, and there's no CLI migration tool or docs.

**Tech Stack:** TypeScript 5.x, Vitest 1.x, React 18.x, Commander 12.x (CLI)

---

## File Map

### Files to Create

| File                                                             | Purpose                                       |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `packages/widgets/src/__tests__/registry-stubs.test.ts`          | Tests for foundation stub auto-registration   |
| `packages/widgets/src/__tests__/registry-search-filters.test.ts` | Tests for structured filter API on registry   |
| `packages/widgets/src/validate-metadata.ts`                      | Metadata validation for WidgetDefinitionV2    |
| `packages/widgets/src/__tests__/validate-metadata.test.ts`       | Tests for metadata validation                 |
| `packages/cli/src/commands/widget-migrate.ts`                    | CLI command for batch widget ID migration     |
| `packages/cli/src/commands/widget-migrate.test.ts`               | Tests for CLI migration command               |
| `docs/widget-architecture-v2.md`                                 | Architecture document (deliverable from spec) |
| `docs/widget-migration-guide.md`                                 | Migration guide for course authors            |

### Files to Modify

| File                                                               | Change                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `packages/widgets/src/registry.ts`                                 | Import + register 6 stubs in `BUILTIN_WIDGETS`; add `searchWithFilters()` method |
| `packages/widgets/src/index.ts`                                    | Export new `validateWidgetMetadata`, `searchWithFilters`                         |
| `packages/core/package.json`                                       | Add `@open-edu/widgets` dependency                                               |
| `packages/core/src/agent-prompt.ts`                                | Replace hardcoded `open-edu.*` widget catalog with registry-generated content    |
| `packages/core/src/agent-prompt.test.ts`                           | Update tests for new catalog format                                              |
| `packages/runtime/src/renderers/WidgetRenderer.tsx`                | Use `resolveWidgetId` from `@open-edu/widgets` instead of local function         |
| `packages/cli/src/index.ts`                                        | Register `widget-migrate` command                                                |
| `packages/widgets/templates/widget-scaffold/template/package.json` | Use `WidgetDefinitionV2` in scaffold                                             |

---

## Task 1: Register Foundation Stubs in Default Registry

The 6 stub widgets are exported but not registered by `registerAllBuiltins()`. This means `createDefaultRegistry()` doesn't include them.

**Files:**

- Modify: `packages/widgets/src/registry.ts:1-27,102-127`
- Create: `packages/widgets/src/__tests__/registry-stubs.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/widgets/src/__tests__/registry-stubs.test.ts
import { describe, it, expect } from 'vitest';
import { createWidgetRegistry, registerAllBuiltins } from '../registry';

describe('Foundation stub auto-registration', () => {
  const STUB_IDS = [
    'core.callout',
    'core.image-compare',
    'core.hotspot',
    'core.timeline',
    'science.label-diagram',
    'science.image-label',
  ];

  for (const id of STUB_IDS) {
    it(`registers ${id} in default registry`, () => {
      const registry = createWidgetRegistry();
      registerAllBuiltins(registry);
      expect(registry.has(id)).toBe(true);
      expect(registry.get(id)).toBeDefined();
    });
  }

  it('registers all 21 builtins (15 stable + 6 stubs)', () => {
    const registry = createWidgetRegistry();
    registerAllBuiltins(registry);
    expect(registry.getAll()).toHaveLength(21);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test -- --run src/__tests__/registry-stubs.test.ts`
Expected: FAIL — `expect(received).toHaveLength(21)` → received 15

- [ ] **Step 3: Import and register stubs**

In `packages/widgets/src/registry.ts`, update the import and `BUILTIN_WIDGETS`:

```typescript
// Line 1-27: add stubs to import
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
  callout,
  imageCompare,
  hotspot,
  timeline,
  labelDiagram,
  imageLabel,
} from './builtins';

// Line 102-118: add stubs to BUILTIN_WIDGETS
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
  callout,
  imageCompare,
  hotspot,
  timeline,
  labelDiagram,
  imageLabel,
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-edu/widgets test -- --run src/__tests__/registry-stubs.test.ts`
Expected: 7 tests PASS

- [ ] **Step 5: Run full widget test suite**

Run: `pnpm --filter @open-edu/widgets test -- --run`
Expected: All tests PASS (count increases from 721 to 728)

- [ ] **Step 6: Commit**

```bash
git add packages/widgets/src/registry.ts packages/widgets/src/__tests__/registry-stubs.test.ts
git commit -m "feat(widgets): register foundation stubs in default registry"
```

---

## Task 2: Add Structured Filter API to Registry

The spec (Part 13) requires search by difficulty, grade, accessibility, intent, domain, and interaction type. The current `search()` only does text matching.

**Files:**

- Modify: `packages/widgets/src/registry.ts:40-99`
- Modify: `packages/widgets/src/types.ts:61-77`
- Create: `packages/widgets/src/__tests__/registry-search-filters.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/widgets/src/__tests__/registry-search-filters.test.ts
import { describe, it, expect } from 'vitest';
import { createWidgetRegistry } from '../registry';
import type { WidgetDefinitionV2 } from '../types';
import { LearningIntent } from '../metadata/learning-intents';

function v2(id: string, overrides: Partial<WidgetDefinitionV2> = {}): WidgetDefinitionV2 {
  return {
    id,
    name: id,
    description: id,
    domain: id.split('.')[0] ?? '',
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

describe('Registry searchWithFilters', () => {
  it('filters by domain', () => {
    const r = createWidgetRegistry();
    r.register(v2('core.matching', { domain: 'core' }));
    r.register(v2('math.fraction-visual', { domain: 'math' }));
    expect(r.searchWithFilters({ domain: 'core' })).toHaveLength(1);
    expect(r.searchWithFilters({ domain: 'math' })).toHaveLength(1);
    expect(r.searchWithFilters({ domain: 'science' })).toHaveLength(0);
  });

  it('filters by learning intent', () => {
    const r = createWidgetRegistry();
    r.register(v2('core.matching', { learningIntents: [LearningIntent.Practice] }));
    r.register(v2('core.multiple-choice', { learningIntents: [LearningIntent.Assess] }));
    expect(r.searchWithFilters({ intent: LearningIntent.Practice })).toHaveLength(1);
    expect(r.searchWithFilters({ intent: LearningIntent.Assess })).toHaveLength(1);
  });

  it('filters by difficulty', () => {
    const r = createWidgetRegistry();
    r.register(v2('a', { ai: { difficulty: 'easy' } }));
    r.register(v2('b', { ai: { difficulty: 'hard' } }));
    expect(r.searchWithFilters({ difficulty: 'easy' })).toHaveLength(1);
  });

  it('filters by status', () => {
    const r = createWidgetRegistry();
    r.register(v2('a', { status: 'stable' }));
    r.register(v2('b', { status: 'experimental' }));
    expect(r.searchWithFilters({ status: 'stable' })).toHaveLength(1);
  });

  it('filters by capability flag', () => {
    const r = createWidgetRegistry();
    r.register(v2('a', { capabilities: { supportsKeyboard: true } }));
    r.register(v2('b', { capabilities: {} }));
    expect(r.searchWithFilters({ capability: 'supportsKeyboard' })).toHaveLength(1);
  });

  it('filters by accessibility flag', () => {
    const r = createWidgetRegistry();
    r.register(v2('a', { accessibility: { screenReader: true } }));
    r.register(v2('b', { accessibility: {} }));
    expect(r.searchWithFilters({ accessibility: 'screenReader' })).toHaveLength(1);
  });

  it('combines multiple filters with AND logic', () => {
    const r = createWidgetRegistry();
    r.register(
      v2('a', { domain: 'core', learningIntents: [LearningIntent.Practice], status: 'stable' }),
    );
    r.register(
      v2('b', { domain: 'core', learningIntents: [LearningIntent.Assess], status: 'stable' }),
    );
    r.register(
      v2('c', { domain: 'math', learningIntents: [LearningIntent.Practice], status: 'stable' }),
    );
    const result = r.searchWithFilters({ domain: 'core', intent: LearningIntent.Practice });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns all widgets when no filters specified', () => {
    const r = createWidgetRegistry();
    r.register(v2('a'));
    r.register(v2('b'));
    expect(r.searchWithFilters({})).toHaveLength(2);
  });

  it('searches text in combination with filters', () => {
    const r = createWidgetRegistry();
    r.register(v2('core.matching', { name: 'Matching', domain: 'core', keywords: ['match'] }));
    r.register(v2('core.drag-drop', { name: 'Drag Drop', domain: 'core', keywords: ['drag'] }));
    const result = r.searchWithFilters({ domain: 'core', query: 'match' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('core.matching');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test -- --run src/__tests__/registry-search-filters.test.ts`
Expected: FAIL — `searchWithFilters` is not a function

- [ ] **Step 3: Add `searchWithFilters` to `WidgetRegistry` interface**

In `packages/widgets/src/types.ts`, add to the `WidgetRegistry` interface (after `search`):

```typescript
searchWithFilters(filters: WidgetSearchFilters): WidgetDefinition[];
```

Add the filter type before the interface:

```typescript
export interface WidgetSearchFilters {
  query?: string;
  domain?: string;
  intent?: LearningIntent;
  difficulty?: DifficultyLevel;
  status?: WidgetDefinitionV2['status'];
  capability?: keyof WidgetCapabilities;
  accessibility?: keyof AccessibilityMetadata;
}
```

Add the necessary import at the top:

```typescript
import type {
  LearningIntent,
  DifficultyLevel,
  WidgetCapabilities,
  AccessibilityMetadata,
} from './metadata';
```

- [ ] **Step 4: Implement `searchWithFilters` on registry**

In `packages/widgets/src/registry.ts`, add after the `search` method (after line 76):

```typescript
searchWithFilters(filters: import('./types').WidgetSearchFilters) {
  return Array.from(widgets.values()).filter((w) => {
    const v2 = w as WidgetDefinitionV2;

    // Text query (reuses search logic)
    if (filters.query) {
      const lower = filters.query.trim().toLowerCase();
      const textMatch =
        w.id.toLowerCase().includes(lower) ||
        v2.name?.toLowerCase().includes(lower) ||
        v2.description?.toLowerCase().includes(lower) ||
        v2.keywords?.some((k) => k.toLowerCase().includes(lower));
      if (!textMatch) return false;
    }

    // Domain filter
    if (filters.domain && v2.domain !== filters.domain) return false;

    // Intent filter
    if (filters.intent && !v2.learningIntents?.includes(filters.intent)) return false;

    // Difficulty filter
    if (filters.difficulty && v2.ai?.difficulty !== filters.difficulty) return false;

    // Status filter
    if (filters.status && v2.status !== filters.status) return false;

    // Capability filter
    if (filters.capability && !v2.capabilities?.[filters.capability]) return false;

    // Accessibility filter
    if (filters.accessibility && !v2.accessibility?.[filters.accessibility]) return false;

    return true;
  });
},
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @open-edu/widgets test -- --run src/__tests__/registry-search-filters.test.ts`
Expected: 9 tests PASS

- [ ] **Step 6: Export `WidgetSearchFilters` from barrel**

In `packages/widgets/src/index.ts`, add `WidgetSearchFilters` to the type exports:

```typescript
export type {
  // ... existing types ...
  WidgetSearchFilters,
} from './types';
```

- [ ] **Step 7: Run full widget test suite**

Run: `pnpm --filter @open-edu/widgets test -- --run`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/widgets/src/types.ts packages/widgets/src/registry.ts packages/widgets/src/index.ts packages/widgets/src/__tests__/registry-search-filters.test.ts
git commit -m "feat(widgets): add structured filter API (searchWithFilters) to registry"
```

---

## Task 3: Add Metadata Validation

The spec (Part 14) requires validation of capabilities, accessibility, AI, reward metadata, deprecated IDs, missing schemas, and duplicate aliases.

**Files:**

- Create: `packages/widgets/src/validate-metadata.ts`
- Create: `packages/widgets/src/__tests__/validate-metadata.test.ts`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/widgets/src/__tests__/validate-metadata.test.ts
import { describe, it, expect } from 'vitest';
import { validateWidgetMetadata, type MetadataValidationResult } from '../validate-metadata';
import type { WidgetDefinitionV2 } from '../types';
import { LearningIntent } from '../metadata/learning-intents';

function v2(overrides: Partial<WidgetDefinitionV2> = {}): WidgetDefinitionV2 {
  return {
    id: 'test.widget',
    name: 'Test',
    description: 'A test widget',
    domain: 'test',
    learningIntents: [LearningIntent.Practice],
    capabilities: {},
    accessibility: {},
    analytics: {},
    reward: {},
    ai: { difficulty: 'medium' },
    status: 'stable',
    render: () => null,
    ...overrides,
  };
}

describe('validateWidgetMetadata', () => {
  it('returns no errors for a valid V2 definition', () => {
    const result = validateWidgetMetadata(v2());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('warns when name is missing', () => {
    const result = validateWidgetMetadata(v2({ name: '' }));
    expect(result.warnings).toContainEqual(expect.stringContaining('name'));
  });

  it('warns when description is missing', () => {
    const result = validateWidgetMetadata(v2({ description: '' }));
    expect(result.warnings).toContainEqual(expect.stringContaining('description'));
  });

  it('warns when learningIntents is empty', () => {
    const result = validateWidgetMetadata(v2({ learningIntents: [] }));
    expect(result.warnings).toContainEqual(expect.stringContaining('learningIntents'));
  });

  it('warns when ai.difficulty is missing', () => {
    const result = validateWidgetMetadata(v2({ ai: {} }));
    expect(result.warnings).toContainEqual(expect.stringContaining('difficulty'));
  });

  it('warns when keywords are missing', () => {
    const result = validateWidgetMetadata(v2({ keywords: undefined }));
    expect(result.warnings).toContainEqual(expect.stringContaining('keywords'));
  });

  it('errors when id is empty', () => {
    const result = validateWidgetMetadata(v2({ id: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('id'));
  });

  it('errors when domain has no dot separator', () => {
    const result = validateWidgetMetadata(v2({ id: 'nodothere', domain: '' }));
    expect(result.errors).toContainEqual(expect.stringContaining('domain'));
  });

  it('warns when status is experimental', () => {
    const result = validateWidgetMetadata(v2({ status: 'experimental' }));
    expect(result.warnings).toContainEqual(expect.stringContaining('experimental'));
  });

  it('warns when deprecated is true but replacement is missing', () => {
    const result = validateWidgetMetadata(v2({ deprecated: true, replacement: undefined }));
    expect(result.warnings).toContainEqual(expect.stringContaining('replacement'));
  });

  it('warns when icon is missing', () => {
    const result = validateWidgetMetadata(v2({ icon: undefined }));
    expect(result.warnings).toContainEqual(expect.stringContaining('icon'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test -- --run src/__tests__/validate-metadata.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement metadata validator**

```typescript
// packages/widgets/src/validate-metadata.ts
import type { WidgetDefinitionV2 } from './types';

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWidgetMetadata(widget: WidgetDefinitionV2): MetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field checks (errors)
  if (!widget.id) {
    errors.push('Widget id is required');
  }

  if (!widget.domain && widget.id.includes('.')) {
    // Domain can be inferred from id prefix, but warn if empty
  }

  // Recommended field checks (warnings)
  if (!widget.name) {
    warnings.push('Widget name is recommended for discoverability');
  }

  if (!widget.description) {
    warnings.push('Widget description is recommended for authoring tools');
  }

  if (!widget.learningIntents || widget.learningIntents.length === 0) {
    warnings.push('At least one learning intent is recommended for classification');
  }

  if (!widget.keywords || widget.keywords.length === 0) {
    warnings.push('Keywords are recommended for search discoverability');
  }

  if (!widget.icon) {
    warnings.push('An icon is recommended for toolbox display');
  }

  if (!widget.ai?.difficulty) {
    warnings.push('AI difficulty level is recommended for content generation');
  }

  if (widget.status === 'experimental') {
    warnings.push(`Widget ${widget.id} is marked experimental — ensure it is ready for use`);
  }

  if (widget.deprecated && !widget.replacement) {
    warnings.push(`Widget ${widget.id} is deprecated but has no replacement ID specified`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-edu/widgets test -- --run src/__tests__/validate-metadata.test.ts`
Expected: 11 tests PASS

- [ ] **Step 5: Export from barrel**

In `packages/widgets/src/index.ts` add:

```typescript
export { validateWidgetMetadata } from './validate-metadata';
export type { MetadataValidationResult } from './validate-metadata';
```

- [ ] **Step 6: Run full widget test suite**

Run: `pnpm --filter @open-edu/widgets test -- --run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/widgets/src/validate-metadata.ts packages/widgets/src/__tests__/validate-metadata.test.ts packages/widgets/src/index.ts
git commit -m "feat(widgets): add metadata validation for WidgetDefinitionV2"
```

---

## Task 4: Fix WidgetRenderer to Use Alias Map

`WidgetRenderer.tsx` has its own `resolveWidgetId()` that doesn't go through the alias map. It should use `resolveWidgetId` from `@open-edu/widgets`.

**Files:**

- Modify: `packages/runtime/src/renderers/WidgetRenderer.tsx:1-10,48-52`

- [ ] **Step 1: Read current file**

Read: `packages/runtime/src/renderers/WidgetRenderer.tsx` lines 1-15 and 48-52

- [ ] **Step 2: Update import and function**

Replace the local `resolveWidgetId` with the one from `@open-edu/widgets`:

```typescript
// Line 1-10: update imports
import { resolveWidgetId as resolveAlias, type WidgetDefinition } from '@open-edu/widgets';

// Lines 48-52: remove the local resolveWidgetId function entirely
// (delete lines 48-52)
```

Update the usage at line 73:

```typescript
// Line 73: change from local function to alias-aware resolver
const widgetId = resolveAlias(node.widget ?? (node.type === 'exercise' ? 'exercise' : 'exercise'));
```

Actually, cleaner approach — keep a thin local wrapper:

```typescript
function resolveWidgetId(node: { type: string; widget?: string }): string {
  if (node.type === 'custom' && node.widget) return resolveAlias(node.widget);
  if (node.type === 'exercise') return resolveAlias(node.widget ?? 'exercise');
  return 'exercise';
}
```

- [ ] **Step 3: Verify runtime still compiles**

Run: `pnpm --filter @open-edu/runtime typecheck`
Expected: Clean

- [ ] **Step 4: Verify runtime tests pass**

Run: `pnpm --filter @open-edu/runtime test -- --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/renderers/WidgetRenderer.tsx
git commit -m "fix(runtime): use alias map for widget ID resolution in WidgetRenderer"
```

---

## Task 5: ~~Add CLI `widget migrate` Command~~ — REMOVED

> **Removed.** This task was deprioritized for MVP. Legacy `open-edu.*` IDs are automatically resolved at runtime via the alias map, so a batch migration tool is not required. The `WIDGET_ALIAS_MAP` in `@open-edu/widgets/src/domains.ts` handles transparent resolution. If batch migration is needed in the future, it can be added as a standalone utility without coupling to the CLI.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/commands/widget-migrate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { migratePackage } from './widget-migrate';

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn((path: string) => {
    if (path.endsWith('package.json')) {
      return JSON.stringify({
        id: 'test-pkg',
        title: 'Test',
        version: '1.0.0',
        entry: 'nodes/intro.md',
      });
    }
    if (path.endsWith('intro.md')) {
      return '---\ntitle: Intro\n---\n\nSome content.';
    }
    return '';
  }),
  readdirSync: vi.fn(() => ['package.json', 'workflow.json', 'nodes']),
  statSync: vi.fn(() => ({ isDirectory: () => false })),
  writeFileSync: vi.fn(),
}));

describe('migratePackage', () => {
  it('returns migration report with no changes for clean package', async () => {
    const result = await migratePackage('/fake/pkg', { dryRun: true });
    expect(result.migrated).toBe(0);
    expect(result.changes).toHaveLength(0);
  });

  it('detects open-edu.* references in content', async () => {
    // Override readFileSync to return content with legacy ID
    const fs = await import('node:fs');
    vi.mocked(fs.readFileSync).mockImplementation((path: unknown) => {
      const p = String(path);
      if (p.endsWith('intro.md')) {
        return '---\ntitle: Intro\n---\n\nwidget: open-edu.visual-counting\n\nSome content.';
      }
      if (p.endsWith('package.json')) {
        return JSON.stringify({
          id: 'test-pkg',
          title: 'Test',
          version: '1.0.0',
          entry: 'nodes/intro.md',
        });
      }
      return '';
    });

    const result = await migratePackage('/fake/pkg', { dryRun: true });
    expect(result.migrated).toBeGreaterThan(0);
    expect(result.changes[0].oldId).toBe('open-edu.visual-counting');
    expect(result.changes[0].newId).toBe('core.visual-counting');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/cli test -- --run src/commands/widget-migrate.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `widget-migrate.ts`**

```typescript
// packages/cli/src/commands/widget-migrate.ts
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { WIDGET_ALIAS_MAP, migrateWidgetId } from '@open-edu/widgets';

export interface MigrationChange {
  file: string;
  oldId: string;
  newId: string;
}

export interface MigrationResult {
  migrated: number;
  changes: MigrationChange[];
  dryRun: boolean;
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, extensions));
    } else if (extensions.includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function migratePackage(
  packageDir: string,
  options: { dryRun?: boolean } = {},
): Promise<MigrationResult> {
  const dryRun = options.dryRun ?? false;
  const changes: MigrationChange[] = [];
  const extensions = ['.md', '.json', '.jsonc'];
  const files = getAllFiles(packageDir, extensions);

  // Build reverse lookup for all legacy IDs
  const legacyIds = Object.keys(WIDGET_ALIAS_MAP);

  for (const filePath of files) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    let modified = content;
    for (const legacyId of legacyIds) {
      if (!modified.includes(legacyId)) continue;
      const { newId, migrated } = migrateWidgetId(legacyId);
      if (!migrated) continue;

      // Replace all occurrences
      while (modified.includes(legacyId)) {
        modified = modified.replace(legacyId, newId);
        changes.push({ file: filePath, oldId: legacyId, newId });
      }
    }

    if (modified !== content && !dryRun) {
      writeFileSync(filePath, modified, 'utf-8');
    }
  }

  return { migrated: changes.length, changes, dryRun };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @open-edu/cli test -- --run src/commands/widget-migrate.test.ts`
Expected: Tests PASS

- [ ] **Step 5: Register command in CLI index**

In `packages/cli/src/index.ts`, find where commands are registered and add:

```typescript
import { migratePackage } from './commands/widget-migrate.js';

// In the command registration section:
program
  .command('widget-migrate')
  .description('Migrate open-edu.* widget IDs to domain-prefixed IDs')
  .argument('<packageDir>', 'Path to the course package directory')
  .option('--dry-run', 'Preview changes without writing', false)
  .option('--json', 'Output results as JSON')
  .action(async (packageDir: string, options: { dryRun: boolean; json: boolean }) => {
    const result = await migratePackage(packageDir, { dryRun: options.dryRun });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(
        `Migrated ${result.migrated} widget reference(s)${result.dryRun ? ' (dry run)' : ''}`,
      );
      for (const c of result.changes) {
        console.log(`  ${c.file}: ${c.oldId} → ${c.newId}`);
      }
    }
  });
```

- [ ] **Step 6: Verify CLI builds**

Run: `pnpm --filter @open-edu/cli build`
Expected: Clean build

- [ ] **Step 7: Run full CLI test suite**

Run: `pnpm --filter @open-edu/cli test -- --run`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/commands/widget-migrate.ts packages/cli/src/commands/widget-migrate.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add widget-migrate command for batch ID migration"
```

---

## Task 6: Generate Agent Prompt from Registry

The compiler's `agent-prompt.ts` hardcodes all 15 widgets with `open-edu.*` IDs. Replace this with a function that generates the widget catalog from the registry.

**Files:**

- Modify: `packages/core/package.json`
- Create: `packages/core/src/widget-catalog.ts`
- Create: `packages/core/src/__tests__/widget-catalog.test.ts`
- Modify: `packages/core/src/agent-prompt.ts:152-622`

- [ ] **Step 1: Add `@open-edu/widgets` dependency**

In `packages/core/package.json`, add to dependencies:

```json
{
  "dependencies": {
    "@open-edu/schemas": "workspace:*",
    "@open-edu/widgets": "workspace:*",
    "zod": "^3.25.76"
  }
}
```

- [ ] **Step 2: Install updated dependency**

Run: `pnpm install`
Expected: Clean install

- [ ] **Step 3: Write the failing test**

```typescript
// packages/core/src/__tests__/widget-catalog.test.ts
import { describe, it, expect } from 'vitest';
import { generateWidgetCatalog } from '../widget-catalog';
import { createDefaultRegistry } from '@open-edu/widgets';

describe('generateWidgetCatalog', () => {
  it('generates markdown for all registered widgets', () => {
    const registry = createDefaultRegistry();
    const catalog = generateWidgetCatalog(registry);
    expect(catalog).toContain('Widget Catalog');
    expect(catalog).toContain('core.matching');
    expect(catalog).toContain('core.multiple-choice');
    expect(catalog).toContain('math.fraction-visual');
    expect(catalog).toContain('open-edu.matching'); // legacy alias note
  });

  it('generates catalog with domain sections', () => {
    const registry = createDefaultRegistry();
    const catalog = generateWidgetCatalog(registry);
    expect(catalog).toContain('Core Widgets');
    expect(catalog).toContain('Math Widgets');
  });

  it('includes learning intent for each widget', () => {
    const registry = createDefaultRegistry();
    const catalog = generateWidgetCatalog(registry);
    expect(catalog).toContain('Practice');
    expect(catalog).toContain('Assess');
  });

  it('marks deprecated widgets', () => {
    const registry = createDefaultRegistry();
    const catalog = generateWidgetCatalog(registry);
    expect(catalog).toContain('deprecated');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @open-edu/core test -- --run src/__tests__/widget-catalog.test.ts`
Expected: FAIL — module not found

- [ ] **Step 5: Implement `generateWidgetCatalog`**

```typescript
// packages/core/src/widget-catalog.ts
import type { WidgetRegistry, WidgetDefinitionV2, WidgetDefinition } from '@open-edu/widgets';
import { WIDGET_ALIAS_MAP, getLearningIntentsForWidget } from '@open-edu/widgets';

export function generateWidgetCatalog(registry: WidgetRegistry): string {
  const lines: string[] = [];
  lines.push('## Widget Catalog');
  lines.push('');
  lines.push('The following built-in widgets are available. Each has a unique `widget` ID.');
  lines.push(
    'Legacy `open-edu.*` IDs are automatically resolved to their new domain-prefixed equivalents.',
  );
  lines.push('');

  const allWidgets = registry.getAll();

  // Group by domain
  const byDomain = new Map<string, WidgetDefinition[]>();
  for (const w of allWidgets) {
    const v2 = w as WidgetDefinitionV2;
    const domain = v2.domain || w.id.split('.')[0] || 'unknown';
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(w);
  }

  const DOMAIN_LABELS: Record<string, string> = {
    core: 'Core Widgets',
    math: 'Math Widgets',
    language: 'Language Widgets',
    science: 'Science Widgets',
    social: 'Social Widgets',
  };

  for (const [domain, widgets] of byDomain) {
    lines.push(`### ${DOMAIN_LABELS[domain] ?? domain} Widgets`);
    lines.push('');

    for (const w of widgets) {
      const v2 = w as WidgetDefinitionV2;
      const intents = getLearningIntentsForWidget(w.id);
      const statusTag =
        v2.status === 'deprecated'
          ? ' **[DEPRECATED]**'
          : v2.status === 'experimental'
            ? ' *(experimental)*'
            : '';

      lines.push(`#### ${v2.name ?? w.id} (\`${w.id}\`)${statusTag}`);
      if (v2.description) lines.push(v2.description);
      lines.push('');

      if (intents.length > 0) {
        lines.push(`Learning intents: ${intents.join(', ')}`);
        lines.push('');
      }

      // Find legacy alias
      const legacyEntry = Object.entries(WIDGET_ALIAS_MAP).find(([, target]) => target === w.id);
      if (legacyEntry) {
        lines.push(`Legacy ID: \`${legacyEntry[0]}\` (auto-resolved)`);
        lines.push('');
      }

      if (v2.deprecated && v2.replacement) {
        lines.push(`**Deprecated.** Use \`${v2.replacement}\` instead.`);
        lines.push('');
      }

      if (v2.keywords?.length) {
        lines.push(`Keywords: ${v2.keywords.join(', ')}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @open-edu/core test -- --run src/__tests__/widget-catalog.test.ts`
Expected: 4 tests PASS

- [ ] **Step 7: Replace hardcoded catalog in agent-prompt.ts**

In `packages/core/src/agent-prompt.ts`, replace lines 152-622 (the entire `## Widget Catalog` section) with:

```typescript
// At the top of the file, add import:
import { createDefaultRegistry } from '@open-edu/widgets';
import { generateWidgetCatalog } from './widget-catalog';

// In the function body, replace the hardcoded catalog with:
const widgetCatalog = generateWidgetCatalog(createDefaultRegistry());
```

Then in the template literal, replace the hardcoded widget catalog section:

```typescript
// Replace lines 152-622 with:
${widgetCatalog}
```

- [ ] **Step 8: Run core tests**

Run: `pnpm --filter @open-edu/core test -- --run`
Expected: All tests PASS

- [ ] **Step 9: Verify CLI tests still pass (agent prompt integration)**

Run: `pnpm --filter @open-edu/cli test -- --run`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add packages/core/package.json packages/core/src/widget-catalog.ts packages/core/src/__tests__/widget-catalog.test.ts packages/core/src/agent-prompt.ts
git commit -m "feat(core): generate widget catalog from registry instead of hardcoding"
```

---

## Task 7: Write Widget Architecture v2 Document

The spec deliverable #1 requires an architecture document.

**Files:**

- Create: `docs/widget-architecture-v2.md`

- [ ] **Step 1: Create the architecture document**

```markdown
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
- **learningIntents**: How the widget supports learning (`assess`, `practice`, `observe`, `compare`, `explore`, `create`, `reflect`, `apply`)
- **capabilities**: Feature flags (keyboard, touch, offline, etc.)
- **accessibility**: A11y feature documentation
- **analytics**: What events the widget can emit
- **reward**: Reward hooks the widget supports
- **ai**: Metadata for LLM course generation

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

```

### Domain Namespacing

Widgets are grouped by content domain:
- `core.*` — Universal widgets (matching, multiple-choice, drag-drop, etc.)
- `math.*` — Math-specific (fraction-visual, clock-time, measurement-scale, etc.)
- `language.*` — Language arts (reserved)
- `science.*` — Science (label-diagram, image-label)
- `social.*` — Social studies (reserved)

## Data Flow

```

Course Package (JSON/Markdown)
↓ compiler references widget IDs
Registry.resolveAlias(id)
↓ maps open-edu._ → core._
Registry.get(resolvedId)
↓ returns WidgetDefinition
Runtime renders widget via definition.render(config)

```

## Integration Points

| Consumer | Uses |
|----------|------|
| Compiler (agent-prompt.ts) | `getDefaultWidgetCatalog()` for LLM prompts |
| Runtime (WidgetRenderer) | `registry.get()` with alias resolution |
| CLI (generate command) | `getDefaultWidgetCatalog()` from `@open-edu/core` |
| Authoring tools | `registry.searchWithFilters()` for widget discovery |
| Validation | `validateWidgetMetadata()` for metadata completeness |

## File Structure

```

packages/widgets/src/
├── types.ts # WidgetDefinition, WidgetDefinitionV2, WidgetRegistry
├── registry.ts # Registry implementation + registerAllBuiltins
├── domains.ts # Domain constants, alias map, migration utils
├── validate-metadata.ts # Metadata validation
├── metadata/
│ ├── learning-intents.ts
│ ├── capabilities.ts
│ ├── accessibility.ts
│ ├── analytics.ts
│ ├── reward.ts
│ ├── ai.ts
│ └── index.ts
├── builtins/ # 15 stable + 6 stub widgets
├── remote-loader.ts # Remote widget loading
└── use-remote-widget.ts # React hook for remote widgets

```

## Extension Points

1. **New widgets**: Implement `WidgetDefinitionV2`, register via `registry.register()`
2. **Remote widgets**: Use `RemoteWidgetManifest` + `RemoteWidgetLoader`
3. **Aliases**: `registry.registerAlias(oldId, newId)` for backward compatibility
4. **Filters**: `registry.searchWithFilters()` for structured discovery
```

- [ ] **Step 2: Commit**

```bash
git add docs/widget-architecture-v2.md
git commit -m "docs: add Widget Architecture v2 document"
```

---

## Task 8: Write Migration Guide

The spec deliverable #2 requires a migration guide for course authors.

**Files:**

- Create: `docs/widget-migration-guide.md`

- [ ] **Step 1: Create the migration guide**

````markdown
# Widget Migration Guide

## What Changed

Widget IDs have been updated from a flat namespace to domain-prefixed IDs:

| Old ID                              | New ID                   |
| ----------------------------------- | ------------------------ |
| `open-edu.matching`                 | `core.matching`          |
| `open-edu.multiple-choice`          | `core.multiple-choice`   |
| `open-edu.multiple-choice-practice` | `core.multiple-choice`   |
| `open-edu.visual-counting`          | `core.visual-counting`   |
| `open-edu.drag-drop`                | `core.drag-drop`         |
| `open-edu.sequencing`               | `core.sequencing`        |
| `open-edu.fill-blank`               | `core.fill-blank`        |
| `open-edu.story-question`           | `core.story-question`    |
| `open-edu.real-world`               | `core.real-world`        |
| `open-edu.fraction-visual`          | `math.fraction-visual`   |
| `open-edu.place-value-chart`        | `math.place-value-chart` |
| `open-edu.grid-area`                | `math.grid-area`         |
| `open-edu.chart-reader`             | `core.chart-reader`      |
| `open-edu.clock-time`               | `math.clock-time`        |
| `open-edu.measurement-scale`        | `math.measurement-scale` |

## Do I Need to Migrate?

**No.** All legacy `open-edu.*` IDs are automatically resolved at runtime. Existing courses will continue to work without changes.

**Recommended.** New IDs are more descriptive and will be the standard going forward.

## Automatic Migration

Run the CLI migration tool:

```bash
edu widget-migrate ./my-course-package
```
````

This will:

1. Scan all `.md`, `.json`, and `.jsonc` files in the package
2. Replace all `open-edu.*` widget references with new IDs
3. Report what was changed

Preview changes without writing:

```bash
edu widget-migrate ./my-course-package --dry-run
```

## Manual Migration

Replace widget IDs in your node files:

**Before:**

```json
{
  "type": "exercise",
  "widget": "open-edu.matching",
  "config": { ... }
}
```

**After:**

```json
{
  "type": "exercise",
  "widget": "core.matching",
  "config": { ... }
}
```

## Multiple Choice Merge

`open-edu.multiple-choice` and `open-edu.multiple-choice-practice` are now unified as `core.multiple-choice`. The widget supports both modes via config:

- Quiz mode: `{ "prompt": "...", "options": [...] }`
- Practice mode: `{ "questions": [...], "interactive": true }`

## New Widgets

The following widgets are available as experimental stubs:

| ID                      | Status       |
| ----------------------- | ------------ |
| `core.callout`          | Experimental |
| `core.image-compare`    | Experimental |
| `core.hotspot`          | Experimental |
| `core.timeline`         | Experimental |
| `science.label-diagram` | Experimental |
| `science.image-label`   | Experimental |

## Backward Compatibility

- All legacy IDs are resolved automatically via the alias map
- The compiler accepts both old and new IDs
- No changes required to existing courses
- `multiple-choice-practice` is deprecated — use `core.multiple-choice` with practice config

````

- [ ] **Step 2: Commit**

```bash
git add docs/widget-migration-guide.md
git commit -m "docs: add widget migration guide for course authors"
````

---

## Task 9: Final Verification & PR Update

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS across all packages

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: Clean

- [ ] **Step 4: Run format check**

Run: `pnpm format:check`
Expected: Clean (or run `pnpm format` to fix)

- [ ] **Step 5: Push all commits**

```bash
git push
```

---

## Task Dependency Graph

| Task                         | Depends On | Reason                                   |
| ---------------------------- | ---------- | ---------------------------------------- |
| Task 1 (Register Stubs)      | None       | Independent foundation                   |
| Task 2 (Search Filters)      | None       | Independent; extends registry            |
| Task 3 (Metadata Validation) | None       | Independent; new file                    |
| Task 4 (WidgetRenderer Fix)  | Task 1     | Needs stubs registered for full coverage |
| Task 5 (CLI Migrate)         | None       | Independent; uses existing alias map     |
| Task 6 (Agent Prompt)        | Task 1     | Needs registry to include all 21 widgets |
| Task 7 (Architecture Doc)    | Tasks 1-6  | Documents completed work                 |
| Task 8 (Migration Guide)     | Task 5     | References CLI command                   |
| Task 9 (Final Verification)  | All        | Validates everything                     |

## Parallel Execution Graph

```
Wave 1 (Start immediately — no dependencies):
├── Task 1: Register Foundation Stubs
├── Task 2: Search Filters
└── Task 3: Metadata Validation

Wave 2 (After Wave 1 completes):
├── Task 4: WidgetRenderer Fix (needs Task 1)
├── Task 5: CLI Migrate (independent but safe in Wave 2)
└── Task 6: Agent Prompt (needs Task 1)

Wave 3 (After Wave 2 completes):
├── Task 7: Architecture Doc
└── Task 8: Migration Guide

Wave 4 (Final):
└── Task 9: Final Verification

Critical Path: Task 1 → Task 6 → Task 7 → Task 9
```

## Commit Strategy

1. `feat(widgets): register foundation stubs in default registry`
2. `feat(widgets): add structured filter API (searchWithFilters) to registry`
3. `feat(widgets): add metadata validation for WidgetDefinitionV2`
4. `fix(runtime): use alias map for widget ID resolution in WidgetRenderer`
5. ~~`feat(cli): add widget-migrate command for batch ID migration`~~ — Removed (auto-resolved at runtime)
6. `feat(core): generate widget catalog from registry instead of hardcoding`
7. `docs: add Widget Architecture v2 document`
8. `docs: add widget migration guide for course authors`

## Success Criteria

After all tasks complete:

- [ ] All 21 widgets registered in default registry (including 6 stubs)
- [ ] `searchWithFilters()` supports domain, intent, difficulty, status, capability, accessibility
- [ ] `validateWidgetMetadata()` returns errors and warnings for V2 definitions
- [ ] `WidgetRenderer` uses alias map from `@open-edu/widgets`
- [ ] ~~`edu widget-migrate` rewrites legacy IDs in course packages~~ — Removed (auto-resolved at runtime)
- [ ] Agent prompt generated from registry (no hardcoded widget IDs)
- [ ] Architecture document published
- [ ] Migration guide published
- [ ] All tests pass, typecheck clean, lint clean
