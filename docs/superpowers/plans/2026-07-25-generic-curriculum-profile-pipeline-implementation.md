# Generic Curriculum Profile Pipeline — Implementation Plan

> **Target executor:** deepseek-4-flash agent. This plan is self-contained — read it in full before starting.
> **Total tasks:** 14. **Execution order:** strictly sequential (each task depends on prior tasks).
> **Exit criteria per task:** tests pass (`pnpm --filter @open-edu/pipeline test`).
> **Final validation:** `pnpm --filter @open-edu/pipeline test && pnpm --filter @open-edu/pipeline typecheck && pnpm --filter @open-edu/pipeline build`

---

## Reference: Current codebase structure

The pipeline lives at `packages/pipeline/src/`. It runs an 8-stage PDF→course-spec pipeline orchestrated by `graph/index.ts` (`runPipelineV2`):

| Stage                  | Module                         | Key issue                                                               |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| 1. Extract             | `extract/index.ts`             | Uses generic chapter-heading regex, no hooks                            |
| 2. Source inventory    | `source/inventory.ts`          | **Hardcodes NIOS markers** (`NIOS_LESSON_HEADING`, etc.)                |
| 3. Concept map         | `concepts/index.ts`            | LLM prompt says "mathematics lesson"                                    |
| 4. Lesson blueprints   | `blueprint/index.ts`           | Prompt says "mathematics concept", hardcoded math renderers             |
| 5. Activity generation | `generate-activities/index.ts` | Uses `GeneratedConcept` (legacy type) with fake `CH1`, empty `coreIdea` |
| 6. Asset plan + render | `assets/`                      | 11 SVG renderers, all math-specific; prompt says "mathematics course"   |
| 7. Validate + coverage | `validation/`, `coverage/`     | `mathValidation` mandatory in quality report                            |
| 8. Output              | `output/index.ts`              | Renders markdown + JSON course-spec                                     |

**Hardcoded issues in graph (`graph/index.ts`):**

- `widgetCategories: []` hardcoded in CLI pass-through (line 223)
- Stage 5 builds fake `GeneratedConcept` with `chapterCode: 'CH1'`, `coreIdea: ''`, `examples: []`, `difficulty: 'beginner'`, `estimatedDuration: 30` (lines 212–225)
- Resume hash ignores profile, scope, widget capabilities, prompt versions

**Hardcoded issues in CLI (`cli/index.ts`):**

- `--subject` validator requires lowercase letters only (line 151)
- No `--profile`, `--curriculum`, `--language`, `--locale`, `--scope`, `--widget-category` flags
- `--chapter` uses numeric index only

**Key test patterns:**

- `src/test-helpers.ts` exports `makeConcept()`, `makeActivity()`, `makeFullPair()`
- Tests use vitest with explicit assertions (no snapshots)
- Mock LLM patterns use `FakeRouter` class
- Schema validation tests use Zod `.parse()` with `.toThrow()`/`.not.toThrow()`
- Test files follow pattern: `src/<module>/__tests__/<module>.test.ts`

---

## Task 1: Define the curriculum profile contract

### Objective

Create the `CurriculumProfile` interface + registry so profiles can be registered, resolved, and queried.

### Files to create

**1. `packages/pipeline/src/profile/types.ts`** — Profile interfaces and Zod schemas

Define these exports:

```ts
export interface SourceTaxonomy {
  lessonLabels: string[];
  sectionLabels: string[];
  objectiveLabels: string[];
  definitionLabels: string[];
  exampleLabels: string[];
  exerciseLabels: string[];
  reviewLabels: string[];
  assessmentLabels: string[];
}

export interface CurriculumProfile {
  id: string;
  subject: string;
  curriculum?: string;
  locale: string;
  language: string;
  sourceTaxonomy: SourceTaxonomy;
  conceptKinds: string[];
  representations: string[];
  questionFamilies: string[];
  widgetCategories: string[];
  assetRendererTypes: string[];
  validatorIds: string[];
  promptContext: Record<string, unknown>;
}
```

Also export a Zod schema `CurriculumProfileSchema` that validates:

- `id` is non-empty string matching `/^[a-z][a-z0-9_-]*$/`
- `subject` is non-empty string
- `locale` matches `/^[a-z]{2}-[A-Z]{2}$/` (e.g. `en-IN`)
- `language` matches `/^[a-z]{2}$/` (e.g. `en`)
- Arrays (`conceptKinds`, `representations`, `questionFamilies`, `widgetCategories`, `assetRendererTypes`, `validatorIds`) have no duplicate entries — use `.refine()`
- `sourceTaxonomy` validates all 8 array fields are present (use `z.object` for nested)

**2. `packages/pipeline/src/profile/registry.ts`** — Profile registry

Implement:

- `registerProfile(profile: CurriculumProfile): void` — registers a profile, throws Error on duplicate ID
- `getProfile(id: string): CurriculumProfile | undefined`
- `listProfiles(): CurriculumProfile[]`
- `resolveProfile(params: { profileId?: string; subject?: string; curriculum?: string }): CurriculumProfile` — resolution order: explicit `profileId` → subject+curriculum match → generic profile fallback
- `clearRegistry(): void` — for test teardown only
- Module-level `const profiles = new Map<string, CurriculumProfile>()` to store profiles
- Export `const GENERIC_PROFILE_ID = 'generic'`

`resolveProfile` logic:

```
if profileId provided → getProfile(profileId) || throw Error("profile not found: ...")
if curriculum && subject → find profile where p.curriculum === curriculum && p.subject === subject
if subject → find profile where p.subject === subject
fallback → getProfile('generic') || throw Error("no generic profile registered")
```

**3. `packages/pipeline/src/profile/__tests__/registry.test.ts`** — Tests

Test cases (use `beforeEach` to `clearRegistry()`):

- Register a valid profile, then `getProfile` returns it
- Register duplicate ID throws Error
- `getProfile` returns undefined for unknown ID
- `resolveProfile` with explicit profile ID works
- `resolveProfile` falls back to subject match
- `resolveProfile` falls back to generic when no subject match
- `resolveProfile` throws if no generic registered and no match
- `clearRegistry` clears all profiles
- `CurriculumProfileSchema` rejects empty id
- `CurriculumProfileSchema` rejects duplicate widget categories
- `CurriculumProfileSchema` rejects invalid locale format
- `listProfiles` returns all registered profiles

Use a helper `makeProfile(overrides)` function that returns a minimal valid profile.

### Files to modify

**4. `packages/pipeline/src/types.ts`** — Add re-exports:

```ts
export type { CurriculumProfile, SourceTaxonomy } from './profile/types.js';
```

### Test command

```
pnpm --filter @open-edu/pipeline test -- registry
```

---

## Task 2: Add generic and built-in profiles

### Objective

Create the 4 built-in profiles (generic, NIOS, math, science) and register them at package init.

### Files to create

**1. `packages/pipeline/src/profile/builtins/generic.ts`** — Fallback profile

```ts
import type { CurriculumProfile } from '../types.js';

export const GENERIC_PROFILE: CurriculumProfile = {
  id: 'generic',
  subject: 'generic',
  locale: 'en-IN',
  language: 'en',
  sourceTaxonomy: {
    lessonLabels: ['Lesson', 'Chapter', 'Unit', 'Module'],
    sectionLabels: ['Section'],
    objectiveLabels: ['Learning Objectives', 'Objectives', 'Goals'],
    definitionLabels: ['Definition', 'Key Terms'],
    exampleLabels: ['Example'],
    exerciseLabels: ['Exercise', 'Practice', 'Questions'],
    reviewLabels: ['Review', 'Summary', 'Key Points'],
    assessmentLabels: ['Test', 'Assessment', 'Quiz'],
  },
  conceptKinds: ['knowledge', 'skill', 'procedure', 'application'],
  representations: ['concrete', 'visual', 'symbolic'],
  questionFamilies: ['direct_question', 'multiple_choice', 'fill_blank', 'short_answer'],
  widgetCategories: ['core'],
  assetRendererTypes: [],
  validatorIds: [],
  promptContext: {
    teachingStyle: 'scaffolded discovery',
    activityStructure: 'observe -> practice -> assess -> reflect',
  },
};
```

**2. `packages/pipeline/src/profile/builtins/nios.ts`** — NIOS adapter (NIOS taxonomy moved from `source/inventory.ts`)

```ts
import type { CurriculumProfile } from '../types.js';

export const NIOS_PROFILE: CurriculumProfile = {
  id: 'nios',
  subject: 'nios',
  curriculum: 'nios',
  locale: 'en-IN',
  language: 'en',
  sourceTaxonomy: {
    lessonLabels: ['Lesson', 'पाठ'],
    sectionLabels: ['Section'],
    objectiveLabels: ['LEARNING OUTCOMES', 'Objectives', 'OBJECTIVES', 'सीखने के परिणाम'],
    definitionLabels: ['Definition', 'Key Terms'],
    exampleLabels: ['Example', 'उदाहरण'],
    exerciseLabels: [
      'Let us see what you have learnt',
      'Exercise',
      'अभ्यास',
      'आइए देखें आपने क्या सीखा',
    ],
    reviewLabels: ['REVIEW', 'Review', 'पुनरावृत्ति', 'What have you learnt', 'आपने क्या सीखा'],
    assessmentLabels: ['TEST', 'Test', 'परीक्षा', 'Assessment', 'मूल्यांकन'],
  },
  conceptKinds: ['knowledge', 'skill', 'procedure', 'application'],
  representations: ['concrete', 'visual', 'symbolic'],
  questionFamilies: ['direct_question', 'multiple_choice', 'fill_blank', 'short_answer'],
  widgetCategories: ['core'],
  assetRendererTypes: [],
  validatorIds: [],
  promptContext: {
    chapterStartPhrase: 'From this lesson, you will learn',
    teachingStyle: 'scaffolded discovery',
  },
};
```

**3. `packages/pipeline/src/profile/builtins/math.ts`** — Mathematics extensions (moved from existing hardcoded values)

```ts
import type { CurriculumProfile } from '../types.js';

export const MATH_PROFILE: CurriculumProfile = {
  id: 'math',
  subject: 'mathematics',
  locale: 'en-IN',
  language: 'en',
  sourceTaxonomy: {
    lessonLabels: ['Lesson', 'Chapter', 'Unit'],
    sectionLabels: ['Section'],
    objectiveLabels: ['Learning Objectives', 'Objectives'],
    definitionLabels: ['Definition'],
    exampleLabels: ['Example'],
    exerciseLabels: ['Exercise', 'Practice'],
    reviewLabels: ['Review', 'Summary'],
    assessmentLabels: ['Test', 'Assessment'],
  },
  conceptKinds: ['skill', 'knowledge', 'procedure', 'application'],
  representations: ['concrete', 'visual', 'symbolic'],
  questionFamilies: [
    'direct_computation',
    'word_problems',
    'real_world',
    'comparison',
    'estimation',
    'pattern_recognition',
    'true_false',
    'justification',
  ],
  widgetCategories: ['core', 'math'],
  assetRendererTypes: [
    'place-value-chart',
    'number-line',
    'fraction-bar',
    'fraction-circle',
    'decimal-grid',
    'measurement-scale',
    'area-grid',
    'perimeter-grid',
    'geometry-basic',
    'bar-chart',
    'pictograph',
  ],
  validatorIds: ['math'],
  promptContext: {
    teachingStyle: 'concrete -> visual -> symbolic (CPA approach)',
    includeAdultContext: true,
  },
};
```

**4. `packages/pipeline/src/profile/builtins/science.ts`** — Initial science extension

```ts
import type { CurriculumProfile } from '../types.js';

export const SCIENCE_PROFILE: CurriculumProfile = {
  id: 'science',
  subject: 'science',
  locale: 'en-IN',
  language: 'en',
  sourceTaxonomy: {
    lessonLabels: ['Lesson', 'Chapter', 'Unit', 'Topic'],
    sectionLabels: ['Section'],
    objectiveLabels: ['Learning Objectives', 'Objectives', 'Goals'],
    definitionLabels: ['Definition', 'Key Terms', 'Key Concepts'],
    exampleLabels: ['Example', 'Case Study'],
    exerciseLabels: ['Exercise', 'Practice', 'Questions', 'Activity'],
    reviewLabels: ['Review', 'Summary', 'Key Points'],
    assessmentLabels: ['Test', 'Assessment', 'Quiz'],
  },
  conceptKinds: ['knowledge', 'process', 'classification', 'application'],
  representations: ['visual', 'symbolic', 'concrete'],
  questionFamilies: [
    'direct_question',
    'multiple_choice',
    'fill_blank',
    'short_answer',
    'classification',
    'process_description',
  ],
  widgetCategories: ['core', 'science'],
  assetRendererTypes: [],
  validatorIds: ['science'],
  promptContext: {
    teachingStyle: 'observation -> classification -> explanation',
  },
};
```

### Files to modify

**5. `packages/pipeline/src/profile/registry.ts`** — Add auto-registration at module init:

At the bottom of `registry.ts`, add:

```ts
import { GENERIC_PROFILE } from './builtins/generic.js';
import { NIOS_PROFILE } from './builtins/nios.js';
import { MATH_PROFILE } from './builtins/math.js';
import { SCIENCE_PROFILE } from './builtins/science.js';

let _builtinsRegistered = false;
export function registerBuiltinProfiles(): void {
  if (_builtinsRegistered) return;
  _builtinsRegistered = true;
  registerProfile(GENERIC_PROFILE);
  registerProfile(NIOS_PROFILE);
  registerProfile(MATH_PROFILE);
  registerProfile(SCIENCE_PROFILE);
}

// Auto-register on import
registerBuiltinProfiles();
```

**6. `packages/pipeline/src/profile/__tests__/registry.test.ts`** — Add tests (append to existing test file):

- After import, generic profile is registered
- After import, math profile is registered
- After import, science profile is registered
- After import, nios profile is registered
- Resolve with `subject: 'mathematics'` returns math profile
- Resolve with `subject: 'science'` returns science profile
- Resolve with `curriculum: 'nios'` returns nios profile
- Resolve with `subject: 'history'` returns generic profile (unknown subject fallback)
- Generic profile does not contain math-only renderer types or validator ids
- Each built-in profile passes `CurriculumProfileSchema.parse()` validation

### Test command

```
pnpm --filter @open-edu/pipeline test -- profile
```

---

## Task 3: Add explicit document scope

### Objective

Replace the `--chapter <index>` approach with a `DocumentScope` discriminated union. Support full-document, chapter-by-index, chapter-by-ID, page ranges, and source-unit-ID scopes.

### Files to create

**1. `packages/pipeline/src/scope/types.ts`** — Scope types

```ts
export type DocumentScope =
  | { kind: 'all' }
  | { kind: 'chapter-index'; index: number }
  | { kind: 'chapter-id'; id: string }
  | { kind: 'pages'; start: number; end: number }
  | { kind: 'source-units'; ids: string[] };

export function parseScope(raw: string): DocumentScope {
  if (raw === 'all') return { kind: 'all' };
  if (raw.startsWith('chapter-index:')) {
    const index = parseInt(raw.slice('chapter-index:'.length), 10);
    if (isNaN(index) || index < 1) throw new Error(`Invalid chapter index: ${raw}. Must be >= 1.`);
    return { kind: 'chapter-index', index };
  }
  if (raw.startsWith('chapter-id:')) {
    const id = raw.slice('chapter-id:'.length);
    if (!id) throw new Error(`Invalid chapter ID: ${raw}. ID must not be empty.`);
    return { kind: 'chapter-id', id };
  }
  if (raw.startsWith('pages:')) {
    const range = raw.slice('pages:'.length);
    const [startStr, endStr] = range.split('-');
    const start = parseInt(startStr!, 10);
    const end = parseInt(endStr!, 10);
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      throw new Error(`Invalid page range: ${raw}. Format: pages:1-5`);
    }
    return { kind: 'pages', start, end };
  }
  if (raw.startsWith('source-units:')) {
    const ids = raw
      .slice('source-units:'.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0)
      throw new Error(`Invalid source units: ${raw}. Must specify at least one ID.`);
    return { kind: 'source-units', ids };
  }
  throw new Error(
    `Unknown scope format: ${raw}. Valid: all, chapter-index:N, chapter-id:ID, pages:A-B, source-units:id,id`,
  );
}

export function scopeToString(scope: DocumentScope): string {
  switch (scope.kind) {
    case 'all':
      return 'all';
    case 'chapter-index':
      return `chapter-index:${scope.index}`;
    case 'chapter-id':
      return `chapter-id:${scope.id}`;
    case 'pages':
      return `pages:${scope.start}-${scope.end}`;
    case 'source-units':
      return `source-units:${scope.ids.join(',')}`;
  }
}
```

**2. `packages/pipeline/src/scope/resolve.ts`** — Scope resolution against source inventory

```ts
import type { DocumentScope } from './types.js';
import type { SourceInventory, SourceUnit } from '../source/types.js';
import type { ChapterStructure } from '../structure/types.js';

export interface ResolvedScope {
  filteredUnits: SourceUnit[];
  warnings: string[];
}

export function resolveScope(scope: DocumentScope, inventory: SourceInventory): ResolvedScope {
  const warnings: string[] = [];

  switch (scope.kind) {
    case 'all':
      return { filteredUnits: inventory.units, warnings: [] };

    case 'chapter-index': {
      // Filter units belonging to chapter at 1-based index
      const lessonUnits = inventory.units.filter((u) => u.type === 'lesson');
      const targetIdx = scope.index - 1; // convert to 0-based
      if (targetIdx < 0 || targetIdx >= lessonUnits.length) {
        warnings.push(
          `Chapter index ${scope.index} not found (only ${lessonUnits.length} lessons)`,
        );
        return { filteredUnits: inventory.units, warnings };
      }
      const targetLesson = lessonUnits[targetIdx]!;
      const startIdx = inventory.units.indexOf(targetLesson);
      const endIdx = inventory.units.findIndex(
        (u, i) =>
          u.type === 'lesson' && inventory.units.indexOf(u) === targetIdx + 1 && i > startIdx,
      );
      const end = endIdx >= 0 ? endIdx : inventory.units.length;
      return { filteredUnits: inventory.units.slice(startIdx, end), warnings };
    }

    case 'chapter-id': {
      // Filter units whose text matches a chapter ID pattern
      const matching = inventory.units.filter(
        (u) => u.id === scope.id || u.location.heading === scope.id,
      );
      if (matching.length === 0) {
        warnings.push(`Chapter ID "${scope.id}" not found in inventory`);
        return { filteredUnits: inventory.units, warnings };
      }
      return { filteredUnits: matching, warnings };
    }

    case 'pages': {
      const filtered = inventory.units.filter(
        (u) => u.location.pageStart >= scope.start && u.location.pageStart <= scope.end,
      );
      if (filtered.length === 0) {
        warnings.push(`No units found in page range ${scope.start}-${scope.end}`);
        return { filteredUnits: inventory.units, warnings };
      }
      return { filteredUnits: filtered, warnings };
    }

    case 'source-units': {
      const byId = new Map(inventory.units.map((u) => [u.id, u]));
      const filtered: SourceUnit[] = [];
      for (const id of scope.ids) {
        const unit = byId.get(id);
        if (unit) filtered.push(unit);
        else warnings.push(`Source unit "${id}" not found in inventory`);
      }
      if (filtered.length === 0) {
        warnings.push('No valid source unit IDs found');
        return { filteredUnits: inventory.units, warnings };
      }
      return { filteredUnits: filtered, warnings };
    }

    default:
      return { filteredUnits: inventory.units, warnings: [`Unknown scope kind`] };
  }
}
```

**3. `packages/pipeline/src/scope/__tests__/resolve.test.ts`** — Tests

Use a minimal `SourceInventory` builder helper. Test cases:

- `parseScope('all')` returns `{ kind: 'all' }`
- `parseScope('chapter-index:3')` returns `{ kind: 'chapter-index', index: 3 }`
- `parseScope('chapter-id:foo')` returns `{ kind: 'chapter-id', id: 'foo' }`
- `parseScope('pages:5-12')` returns `{ kind: 'pages', start: 5, end: 12 }`
- `parseScope('source-units:src-1,src-5')` returns correct ids
- `parseScope` rejects `chapter-index:0`, `pages:5-3`, empty id, empty source-units
- `resolveScope` all mode returns all units
- `resolveScope` chapter-index filters correctly (1-based)
- `resolveScope` chapter-index out of range warns and returns all
- `resolveScope` chapter-id filters by ID match
- `resolveScope` chapter-id not found warns
- `resolveScope` pages mode filters by page range
- `resolveScope` source-units filters by IDs, warns on unknown IDs
- `scopeToString` round-trips with `parseScope`

### Files to modify

**4. `packages/pipeline/src/cli/index.ts`** — CLI changes:

- Add `scope: string` field to `CLIOptions` interface (default `'all'`)
- Add `profileId?: string` field to `CLIOptions`
- Add `curriculum?: string` field to `CLIOptions`
- Add `language: string` field (default `'en'`)
- Add `locale: string` field (default `'en-IN'`)
- Add `widgetCategories: string[]` field (default `[]`)
- Add arg parsing for `--scope`, `--profile`, `--curriculum`, `--language`, `--locale`, `--widget-category`
- `--widget-category` should be repeatable (accumulate in array)
- **Remove** the `--chapter` flag entirely — it is replaced by `--scope chapter-index:<num>`
- Update `printHelp()` with all new flags
- Relax subject validation from `/^[a-z]+$/` to `/.+/` (allow spaces, hyphens, Unicode)
- In `runPipelineCLI()`: call `parseScope(options.scope)` before running, import and resolve profile from registry
- Pass resolved profile's `widgetCategories` to `runPipelineV2` (instead of `[]`)
- Log resolved profile ID/scope in verbose output

**5. `packages/pipeline/src/config/config.ts`** — No changes for this task. The existing config is fine.

### Test command

```
pnpm --filter @open-edu/pipeline test -- scope cli config
```

---

## Task 4: Separate generic extraction from curriculum classification

### Objective

Move document structure detection and source classification into separate, profile-aware modules. Remove all NIOS constants from `source/inventory.ts`.

### Files to create

**1. `packages/pipeline/src/structure/types.ts`** — Document hierarchy types

```ts
export interface ChapterStructure {
  id: string; // Stable ID, e.g. 'chapter-1' or 'document-chapter-1'
  label: string; // Human-readable label
  heading: string; // Raw heading text from PDF
  pageStart: number;
  pageEnd: number;
  sections: SectionStructure[];
  confidence: number; // 0.0-1.0
}

export interface SectionStructure {
  id: string; // e.g. 'chapter-1-section-1'
  heading: string;
  pageStart: number;
  pageEnd: number;
  parentChapterId: string;
  sourceUnitIds: string[];
  confidence: number;
}
```

**2. `packages/pipeline/src/structure/detect.ts`** — Boundary detection

Implement these functions:

```ts
import type { PageContent } from '../source/inventory.js';
import type { SourceTaxonomy } from '../profile/types.js';
import type { ChapterStructure } from './types.js';

// Escape regex special characters in labels
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build heading regex from taxonomy labels
function buildHeadingRegex(labels: string[], pattern: 'chapter' | 'section'): RegExp {
  const alternatives = labels.map(escapeRegex).join('|');
  if (pattern === 'chapter') {
    return new RegExp(
      `^(?:${alternatives})\\\\s+(\\\\d+)\\\\s*[:\\\\-\\\\u2013\\\\u2014]\\\\s*(.+)$`,
      'im',
    );
  }
  return new RegExp(`^(?:${alternatives})\\\\s*[:\\\\-\\\\u2013\\\\u2014]\\\\s*(.+)$`, 'im');
}

// Detect chapters from PDF pages
export function detectDocumentStructure(
  pages: PageContent[],
  taxonomy: SourceTaxonomy,
): ChapterStructure[] {
  // Step 1: Generic numbered heading detection
  const GENERIC_HEADING = /^(Chapter|Lesson|Unit|Module)\s+(\d+)\s*[:\-\u2013\u2014]\s*(.+)$/im;
  // Step 2: All-caps heading detection (3+ words in ALL CAPS)
  const ALL_CAPS = /^([A-Z][A-Z\s,]{10,})$/m;
  // Step 3: Markdown-like headings
  const MARKDOWN_H = /^#+\s+(.+)/m;

  const chapters: ChapterStructure[] = [];
  let currentChapter: ChapterStructure | null = null;
  let chapterCounter = 0;

  // Build profile-specific heading regex
  const chapterRegex = buildHeadingRegex(taxonomy.lessonLabels, 'chapter');

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const text = page.text.trim();

    // Try profile-specific heading first
    let match = text.match(chapterRegex);
    // Then generic
    if (!match) match = text.match(GENERIC_HEADING);
    // Then all-caps
    if (!match) {
      const capsMatch = text.match(ALL_CAPS);
      if (capsMatch) {
        chapterCounter++;
        if (currentChapter) chapters.push(currentChapter);
        currentChapter = {
          id: `chapter-${chapterCounter}`,
          label: capsMatch[1]!.trim(),
          heading: capsMatch[0]!,
          pageStart: page.pageNum,
          pageEnd: page.pageNum,
          sections: [],
          confidence: 0.6,
        };
        continue;
      }
    }
    // Then markdown
    if (!match) {
      const mdMatch = text.match(MARKDOWN_H);
      if (mdMatch) {
        chapterCounter++;
        if (currentChapter) chapters.push(currentChapter);
        currentChapter = {
          id: `chapter-${chapterCounter}`,
          label: mdMatch[1]!.trim(),
          heading: mdMatch[0]!,
          pageStart: page.pageNum,
          pageEnd: page.pageNum,
          sections: [],
          confidence: 0.7,
        };
        continue;
      }
    }

    if (match) {
      chapterCounter++;
      if (currentChapter) {
        currentChapter.pageEnd = page.pageNum;
        chapters.push(currentChapter);
      }
      currentChapter = {
        id: `chapter-${chapterCounter}`,
        label: match[3]?.trim() || match[2]?.trim() || '',
        heading: match[0]!,
        pageStart: page.pageNum,
        pageEnd: page.pageNum,
        sections: [],
        confidence: 0.9,
      };
    }
  }

  // Push last chapter
  if (currentChapter) {
    currentChapter.pageEnd = pages[pages.length - 1]?.pageNum || currentChapter.pageStart;
    chapters.push(currentChapter);
  }

  return chapters;
}

// When no chapters detected, synthesize one
export function createSyntheticChapter(pages: PageContent[]): ChapterStructure {
  return {
    id: 'document-chapter-1',
    label: 'Document',
    heading: '',
    pageStart: pages[0]?.pageNum || 1,
    pageEnd: pages[pages.length - 1]?.pageNum || 1,
    sections: [],
    confidence: 0.5,
  };
}

// Remove repeated header/footer lines across pages
export function removeRepeatedHeaders(pages: PageContent[], threshold: number = 3): PageContent[] {
  if (pages.length < threshold) return pages;

  // Collect first lines and last lines of each page
  const firstLines = pages.map((p) => p.text.split('\n')[0]?.trim() || '');
  const lastLines = pages.map((p) => {
    const lines = p.text.split('\n');
    return lines[lines.length - 1]?.trim() || '';
  });

  // Find repeated lines
  const firstLineCounts = new Map<string, number>();
  const lastLineCounts = new Map<string, number>();
  for (const line of firstLines) firstLineCounts.set(line, (firstLineCounts.get(line) || 0) + 1);
  for (const line of lastLines) lastLineCounts.set(line, (lastLineCounts.get(line) || 0) + 1);

  const repeatedFirsts = new Set(
    [...firstLineCounts].filter(([, c]) => c >= threshold).map(([l]) => l),
  );
  const repeatedLasts = new Set(
    [...lastLineCounts].filter(([, c]) => c >= threshold).map(([l]) => l),
  );

  return pages.map((p) => {
    const lines = p.text.split('\n');
    let trimmed = p.text;
    if (lines[0] && repeatedFirsts.has(lines[0].trim())) {
      trimmed = lines.slice(1).join('\n');
    }
    const newLines = trimmed.split('\n');
    if (newLines[newLines.length - 1] && repeatedLasts.has(newLines[newLines.length - 1]!.trim())) {
      trimmed = newLines.slice(0, -1).join('\n');
    }
    return { pageNum: p.pageNum, text: trimmed };
  });
}
```

**3. `packages/pipeline/src/structure/__tests__/detect.test.ts`** — Tests

Use `makePage(text, pageNum)` helper. Test cases:

- Detects `Chapter 1: Introduction` heading
- Detects `Lesson 3: Fractions` heading
- Detects all-caps `BASIC ARITHMETIC OPERATIONS`
- Detects markdown `## Cell Biology`
- Detects NIOS heading `पाठ 1: संख्याएं`
- Single page with no heading → `detectDocumentStructure` returns empty, `createSyntheticChapter` creates `document-chapter-1`
- Multi-chapter document preserves chapter order
- `removeRepeatedHeaders` removes repeated first/last lines
- Confidence is always between 0 and 1 for all results

### Files to modify

**4. `packages/pipeline/src/source/inventory.ts`** — REFACTOR (the biggest single-file change):

- **REMOVE** all `NIOS_*` constants (lines 6-14): `NIOS_LESSON_HEADING`, `NIOS_OBJECTIVE_MARKER`, `NIOS_EXAMPLE_MARKER`, `NIOS_EXERCISE_MARKER`, `NIOS_REVIEW_MARKER`, `NIOS_TEST_MARKER`, `NIOS_CHAPTER_START`, `NIOS_CHAPTER_TITLE`

- Add import for `SourceTaxonomy` from profile types

- Change `splitIntoSegments()` signature to accept `taxonomy: SourceTaxonomy`:

  ```ts
  function splitIntoSegments(pages: PageContent[], taxonomy: SourceTaxonomy): SourceUnit[];
  ```

- Build classification regexes dynamically from taxonomy labels. Example for lesson heading:

  ```ts
  const lessonLabelPattern = taxonomy.lessonLabels.map(escapeRegex).join('|');
  const LESSON_HEADING = new RegExp(
    `^(?:${lessonLabelPattern})\\s+(\\d+)\\s*[:\\-\\u2013\\u2014]\\s*(.+)$`,
    'im',
  );
  ```

- Do the same for: objective, example, exercise, review, assessment markers
- For each marker type, build: `new RegExp('^(?:' + labels.join('|') + ')', 'im')`

- The `TABLE_OF_CONTENTS` regex stays (it's universal)

- Change `buildSourceInventory()` to also accept `taxonomy: SourceTaxonomy`.
- Update the call site in `graph/index.ts` to pass `profile.sourceTaxonomy`.

**5. `packages/pipeline/src/source/inventory-prompt.ts`** — Update `buildInventoryPrompt`:

- Add `subject: string` parameter
- Change from: `You are classifying source units extracted from a textbook.`
- To: `You are classifying source units extracted from a ${subject} textbook.`

**6. `packages/pipeline/src/source/types.ts`** — No changes needed, but add an export to make it easy to import elsewhere.

### Test command

```
pnpm --filter @open-edu/pipeline test -- extract source structure
```

---

## Task 5: Make concepts and blueprints profile-neutral

### Objective

Replace hardcoded "mathematics" in concept/blueprint prompts with profile fields. Add `extensions` record for domain-specific metadata.

### Files to modify

**1. `packages/pipeline/src/concepts/prompt.ts`** — Update `buildConceptMapPrompt`:

```ts
import type { SourceUnit } from '../source/types.js';
import type { CurriculumProfile } from '../profile/types.js';

export function buildConceptMapPrompt(
  sourceUnits: SourceUnit[],
  subject: string,
  profile: CurriculumProfile,
): string {
  const inputUnits = sourceUnits.map((u) => ({
    unitId: u.id,
    type: u.type,
    pageStart: u.location.pageStart,
    text: u.text.slice(0, 1500),
  }));
  const unitsJson = JSON.stringify(inputUnits, null, 2);

  const validKinds = profile.conceptKinds.join('", "');
  const validReps = profile.representations.join('", "');
  const includeAdultContext = profile.promptContext?.includeAdultContext === true;
  const teachingStyle = profile.promptContext?.teachingStyle || 'scaffolded discovery';

  return `You are designing a concept map for a ${subject} lesson.

Teaching style: ${teachingStyle}

Below are extracted source units from the textbook.

Source units:
${unitsJson}

Generate a list of discrete, teachable concepts. Rules:
1. Each concept MUST reference at least one source unit ID as evidence.
2. Concepts MUST cover every objective and assessment in the source material.
3. Create ONE concept per independently teachable skill.
4. Never generate a concept without citing source evidence via sourceUnitIds.
5. conceptId must match pattern: lowercase letters, digits, underscores.
6. Do NOT generate more than 15 concepts per lesson.

For each concept, provide:
- conceptId, label, kind (one of: "${validKinds}")
- sourceUnitIds: array of source unit IDs
- learningObjective, coreIdea, difficulty, masteryThreshold
- prerequisites: conceptIds of prerequisites (empty array if none)
- representations: at least one of "${validReps}"
- exerciseFamilies, misconceptionTargets
${includeAdultContext ? '- adultContext: real-world application (optional)' : ''}
- recommendedWidgetCategories
- estimatedMinutes (5-60)

Return a JSON object with a "concepts" array.`;
}
```

Key changes:

- Replace `"mathematics lesson"` with `${subject} lesson`
- Replace hardcoded concept kinds with profile fields
- Replace hardcoded representations with profile fields
- Conditionally include `adultContext` based on `profile.promptContext.includeAdultContext`
- Inject teaching style from profile

**2. `packages/pipeline/src/concepts/types.ts`** — Add `extensions` field to `ConceptSchema`:

- Add `extensions: z.record(z.unknown()).optional()` inside ConceptSchema (before the closing `)`)

**3. `packages/pipeline/src/concepts/index.ts`** — Update `generateConceptMap`:

```ts
export async function generateConceptMap(
  router: LlmRouter,
  sourceUnits: SourceUnit[],
  lessonName: string,
  profile: CurriculumProfile, // NEW parameter
): Promise<{ concepts: Concept[]; warnings: string[] }>;
```

- Pass `profile` to `buildConceptMapPrompt`
- After generating concepts, validate each against `profile.conceptKinds` and `profile.representations`
- Add warnings for unsupported kinds/representations

**4. `packages/pipeline/src/blueprint/prompt.ts`** — Update `buildBlueprintPrompt`:

```ts
import type { Concept } from '../concepts/types.js';
import type { SourceUnit } from '../source/types.js';
import type { CurriculumProfile } from '../profile/types.js';

export function buildBlueprintPrompt(
  concept: Concept,
  sourceUnits: SourceUnit[],
  profile: CurriculumProfile, // CHANGED: was activeWidgetCategories
): string {
  const teachingStyle = profile.promptContext?.teachingStyle || 'scaffolded discovery';
  const assetRendererTypes = profile.assetRendererTypes.join('", "');

  return `Design a lesson blueprint for teaching this ${profile.subject} concept.

Teaching style: ${teachingStyle}

CONCEPT:
${JSON.stringify({ conceptId: concept.conceptId, label: concept.label, kind: concept.kind, learningObjective: concept.learningObjective, coreIdea: concept.coreIdea, difficulty: concept.difficulty, representations: concept.representations, misconceptionTargets: concept.misconceptionTargets, prerequisites: concept.prerequisites, adultContext: concept.adultContext, recommendedWidgetCategories: concept.recommendedWidgetCategories }, null, 2)}

SOURCE EVIDENCE (textbook excerpts):
${JSON.stringify(
  sourceUnits
    .filter((u) => concept.sourceUnitIds.includes(u.id))
    .map((u) => ({ id: u.id, type: u.type, text: u.text.slice(0, 1000) })),
  null,
  2,
)}

AVAILABLE WIDGET CATEGORIES: ${profile.widgetCategories.join(', ')}

Create a lesson blueprint with:
- conceptId, sourceUnitIds (non-empty), objective, priorKnowledge
- representations: "concrete", "visual", "symbolic"
- lessonArc: array of { step, description, durationMinutes (1-20) }.
  Valid steps: hook, observe, worked_example, guided_practice, widget_practice, independent_practice, mastery_check, remediation, extension.
  mastery_check is REQUIRED.
- assetRequests: array of { id, rendererType, parameters, description }.
  rendererType must be one of: ${assetRendererTypes}
- widgetRequests: array of { step, widgetCategory, mode (observe|interactive), description }.
- questionFamilies: types of questions.
- misconceptionTargets.

DO NOT request widget categories not in the available list.
If the concept has "visual" representation, include at least one assetRequest (when renderers are available).

Return the blueprint as a single JSON object matching the schema.`;
}
```

**5. `packages/pipeline/src/blueprint/index.ts`** — Update `generateLessonBlueprints`:

```ts
export async function generateLessonBlueprints(
  router: LlmRouter,
  concepts: Concept[],
  sourceUnits: SourceUnit[],
  profile: CurriculumProfile, // CHANGED: was widgetCategories: string[]
): Promise<{ blueprints: LessonBlueprint[]; warnings: string[] }>;
```

- Pass `profile` to `buildBlueprintPrompt`
- Validate widget requests against `profile.widgetCategories`

**6. `packages/pipeline/src/blueprint/types.ts`** — Update `validateBlueprint`:

- Add `profile: CurriculumProfile` parameter
- Validate `AssetRequest.rendererType` against `profile.assetRendererTypes`
- Warn (don't fail) for unsupported renderer types

### Test updates

**7. `packages/pipeline/src/concepts/__tests__/concept-map.test.ts`** — Add tests:

- Profile with custom concept kinds is passed through to prompt
- Unsupported concept kind produces warning
- Profile with `includeAdultContext: false` makes `adultContext` optional

**8. `packages/pipeline/src/blueprint/__tests__/blueprint.test.ts`** — Add tests:

- Profile-specific renderer types appear in prompt
- Unsupported widget category produces warning
- Blueprint with profile that has no asset renderers accepts no asset requests

### Test command

```
pnpm --filter @open-edu/pipeline test -- concepts blueprint
```

---

## Task 6: Wire complete concepts and blueprints into activity generation

### Objective

Fix `graph/index.ts` to pass real `Concept` objects (not fake `GeneratedConcept`) to `generateActivitiesForConcept`. Remove hardcoded `CH1`, empty `coreIdea`, and fixed durations.

### Files to modify

**1. `packages/pipeline/src/generate-activities/index.ts`** — Rename and refactor:

Define the new input interface:

```ts
export interface ActivityGenerationInput {
  concept: Concept; // Real concept from stage 3
  blueprint: LessonBlueprint; // From stage 4
  profile: CurriculumProfile;
  sourceUnits: SourceUnit[]; // Evidence source units
}
```

**Rename** `generateActivitiesForConcept` → `generateActivitiesFromBlueprint` and change signature to:

```ts
export async function generateActivitiesFromBlueprint(
  llm: LlmProvider,
  input: ActivityGenerationInput,
  validationErrors?: string[],
): Promise<{ activities: GeneratedActivity[]; warnings: string[]; errors: string[] }>;
```

This function:

- Uses `input.blueprint.lessonArc` to determine step order instead of the fixed 5-step sequence. The `lessonArc` is always populated by the blueprint stage — there is no fallback to a 5-step default.
- Maps each arc step to a course-spec type: `hook` → reading, `observe` → reading, `worked_example` → reading, `guided_practice` → exercise, `widget_practice` → widget, `independent_practice` → exercise, `mastery_check` → quiz, `remediation` → reading, `extension` → exercise, `positive_completion` → reflection
- Uses `input.concept` fields (not fake ones) for prompt template variables
- Adds `sourceUnitIds`, `questionFamily`, and `profileId` metadata to each activity

**Remove** the old `generateActivitiesForConcept(concept: GeneratedConcept, ...)` function — it is no longer needed. Update all callers to use `generateActivitiesFromBlueprint`.

**2. `packages/pipeline/src/generate-activities/prompts/*.ts`** — Update all 5 prompt files:

In each prompt template, replace:

- `{CONCEPT_ID}` — already used, keep
- `{LEARNING_OBJECTIVE}` — already used, keep
- `{CORE_IDEA}` — already used, keep
- `{EXAMPLES}` — already used, keep
- `{MISCONCEPTIONS}` — already used, keep

Add new template variables:

- `{PROFILE_SUBJECT}` — for prompts that say "mathematics"
- `{PROFILE_STYLE}` — teaching style from profile
- `{QUESTION_FAMILIES}` — comma-separated question family names

Example for `observe.ts`: change any reference to "mathematics" to `{PROFILE_SUBJECT}`.

**3. `packages/pipeline/src/graph/index.ts`** — Major refactor of Stage 5:

**Remove** lines 208–227 (the fake `GeneratedConcept` construction loop).

**Replace** with:

```ts
// Stage 5: Generate activities from blueprints using real concepts
const conceptActivityPairs: ConceptActivityPair[] = [];
const conceptActivityMap = new Map<string, GeneratedActivity[]>();

if (canResume('course-spec.json')) {
  if (options.verbose) console.log('[5/8] Activities already generated (resuming)');
} else {
  if (options.verbose) console.log('[5/8] Generating activities from blueprints...');
  if (!options.dryRun) {
    const llmAdapter = router.getStageProvider('activity_generation');
    for (const bp of blueprints) {
      // Find the real Concept for this blueprint
      const concept = concepts.find((c) => c.conceptId === bp.conceptId);
      if (!concept) {
        reviewItems.push(`No concept found for blueprint: ${bp.conceptId}`);
        continue;
      }
      const result = await generateActivitiesFromBlueprint(llmAdapter, {
        concept,
        blueprint: bp,
        profile,
        sourceUnits: inventory.units,
      });
      // Map result to ConceptActivityPair for output
      const pair: ConceptActivityPair = {
        concept: {
          conceptId: concept.conceptId,
          chapterCode: bp.lessonArc[0]!.step,
          chapterName: concept.label,
          learningObjective: concept.learningObjective,
          coreIdea: concept.coreIdea,
          examples: [],
          misconceptions: concept.misconceptionTargets,
          supports: { visual: concept.representations.includes('visual') },
          masteryCriteria: concept.masteryThreshold,
          difficulty: concept.difficulty,
          estimatedDuration: concept.estimatedMinutes,
          dependencies: concept.prerequisites,
        },
        activities: result.activities,
      };
      conceptActivityPairs.push(pair);
      conceptActivityMap.set(bp.conceptId, result.activities);
      reviewItems.push(...result.errors);
    }
  }
}
```

Also update the `conceptActivityPairs` variable to be non-`const` (use `let` at top).

**4. `packages/pipeline/src/graph/index.ts`** — Update function signature for `runPipelineV2`:

- Add `profile: CurriculumProfile` to options
- Pass `profile` to concept generation (stage 3)
- Pass `profile` to blueprint generation (stage 4)
- Pass `profile` to asset plan generation (stage 6)
- Pass `profile` to validation stages (stage 7)
- Pass `profile` to quality report (stage 8)

Update the `runPipelineV2` options type to include `profile: CurriculumProfile`.

### Test updates

**5. `packages/pipeline/src/__tests__/generic-pipeline.test.ts`** — (This file is created in Task 12, but basic integration test can go here):

- Create a mock profile + FakeRouter
- Run a minimal pipeline
- Verify concept fields (not fake CH1) are used in activities

### Test command

```
pnpm --filter @open-edu/pipeline test -- generic-pipeline generate-activities types
```

---

## Task 7: Make assets extensible through a renderer registry

### Objective

Replace hardcoded 11 SVG renderers with a registry. Allow profiles to declare permitted renderers.

### Files to create

**1. `packages/pipeline/src/assets/registry.ts`** — Renderer registry

```ts
import type { AssetManifestEntry } from './types.js';
import { renderSvg } from './svg.js';

export interface AssetRenderer {
  type: string;
  mediaType: string;
  render(entry: AssetManifestEntry): string | Uint8Array;
  validate(parameters: Record<string, unknown>): string[];
}

const renderers = new Map<string, AssetRenderer>();

export function registerRenderer(renderer: AssetRenderer): void {
  if (renderers.has(renderer.type)) {
    throw new Error(`Asset renderer "${renderer.type}" is already registered`);
  }
  renderers.set(renderer.type, renderer);
}

export function getRenderer(type: string): AssetRenderer | undefined {
  return renderers.get(type);
}

export function listRenderers(): AssetRenderer[] {
  return [...renderers.values()];
}

export function getRenderersForProfile(allowedTypes: string[]): AssetRenderer[] {
  return allowedTypes.map((t) => renderers.get(t)).filter(Boolean) as AssetRenderer[];
}

export function clearRendererRegistry(): void {
  renderers.clear();
}

// Register all 11 built-in SVG renderers
export function registerBuiltinRenderers(): void {
  registerRenderer({
    type: 'place-value-chart',
    mediaType: 'image/svg+xml',
    render: (entry) => renderSvg(entry),
    validate: (params) => {
      const errors: string[] = [];
      if (typeof (params as any).maxPlaces !== 'number') errors.push('maxPlaces must be a number');
      return errors;
    },
  });
  // Repeat for the other 10 renderer types: number-line, fraction-bar, fraction-circle,
  // decimal-grid, measurement-scale, area-grid, perimeter-grid, geometry-basic, bar-chart, pictograph
  // Each with its own validate() checking required parameter types
}

// Auto-register on import
registerBuiltinRenderers();
```

NOTE: You must register all 11 renderers. Each `validate` function should check the parameters that renderer expects. For simplicity, the validate can be minimal (e.g., check for number types where needed). Look at `svg.ts` for the parameter names each renderer uses.

**2. `packages/pipeline/src/assets/__tests__/registry.test.ts`** — Tests:

- Register a renderer, then `getRenderer` returns it
- Duplicate registration throws Error
- `listRenderers` returns all registered
- `getRenderersForProfile` filters by allowed types
- `clearRendererRegistry` clears all
- Each builtin renderer's `validate` with valid params returns empty array `[]`

### Files to modify

**3. `packages/pipeline/src/assets/types.ts`** — Change `rendererType` in `AssetManifestEntrySchema`:

- Replace `z.enum(SVG_RENDERER_TYPES)` with `z.string().min(1)` to allow future non-SVG renderers
- Keep `SVG_RENDERER_TYPES` constant exported but don't enforce it in schema

**4. `packages/pipeline/src/assets/manifest.ts`** — Update `generateAssetFiles`:

- Replace `renderSvg(entry)` call with: lookup `getRenderer(entry.rendererType)`, call `renderer.render(entry)`
- If renderer not found, push error: `Asset "${entry.id}" has unknown renderer type "${entry.rendererType}"`
- Continue processing other assets (don't crash on unknown renderer)
- Propagate render errors through returned `errors` array

**5. `packages/pipeline/src/assets/svg.ts`** — No significant changes needed. The existing `renderSvg()` function already handles all 11 types. The registry wraps these.

**6. `packages/pipeline/src/assets/asset-plan-prompt.ts`** — Update `buildAssetPlanPrompt`:

```ts
import type { LessonBlueprint } from '../blueprint/types.js';
import type { CurriculumProfile } from '../profile/types.js';

export function buildAssetPlanPrompt(
  blueprints: LessonBlueprint[],
  profile: CurriculumProfile,
): string {
  const bpSummary = blueprints.map((bp) => ({
    conceptId: bp.conceptId,
    assetRequests: bp.assetRequests,
    representations: bp.representations,
  }));

  const rendererList = profile.assetRendererTypes.join('", "');

  return `You are planning visual assets for a ${profile.subject} course.

Each lesson blueprint below has asset requests describing the visual aids needed.

Blueprints:
${JSON.stringify(bpSummary, null, 2)}

For each unique asset request across all blueprints, generate an asset manifest entry with:
- id: unique identifier
- filename: "{id}.svg"
- mediaType: "image/svg+xml"
- altText: accessible description of the visual
- caption: optional caption shown below the image
- rendererType: one of: ${rendererList}
- conceptIds: array of concept IDs this asset supports
- sourceUnitIds: array of source unit IDs referenced
- parameters: renderer-specific numeric/string parameters

Return a JSON object with an "assets" array.`;
}
```

NOTE: Remove the hardcoded renderer parameter format examples. Keep the prompt concise and let the LLM infer parameter shapes from context.

### Test command

```
pnpm --filter @open-edu/pipeline test -- assets
```

---

## Task 8: Make widgets profile-aware

### Objective

Filter widget categories through the active profile. Pass widget context to prompts. Use canonical widget IDs from the widget catalog.

### Files to modify

**1. `packages/pipeline/src/generate-activities/widget-schemas.ts`** — Add three new exports:

```ts
// Get widget IDs whose category prefix matches profile widgetCategories
export function getAllowedWidgetIdsForProfile(profile: CurriculumProfile): string[] {
  const allowed: string[] = [];
  for (const [id] of widgetSchemaRegistry) {
    const category = id.split('.')[0]; // e.g. "core" from "core.matching"
    if (profile.widgetCategories.includes(category)) {
      allowed.push(id);
    }
  }
  return allowed;
}

// Build a context object for LLM prompts describing available widgets
export function getWidgetContextForProfile(
  profile: CurriculumProfile,
): { id: string; category: string }[] {
  return getAllowedWidgetIdsForProfile(profile).map((id) => ({
    id,
    category: id.split('.')[0] || '',
  }));
}

// Check if a widget ID is allowed for a profile
export function isWidgetAllowedForProfile(widgetId: string, profile: CurriculumProfile): boolean {
  const category = widgetId.split('.')[0] || '';
  return profile.widgetCategories.includes(category);
}
```

Import `CurriculumProfile` from profile types at the top.

**2. `packages/pipeline/src/generate-activities/index.ts`** — Update prompt builder to use profile widgets:

- In `buildStepPrompt`, add profile-aware widget context
- After generating a widget activity, validate the widget ID against `profile.widgetCategories` using `isWidgetAllowedForProfile`

**3. `packages/pipeline/src/graph/index.ts`** — Replace `widgetCategories: []` at call site (around line 223) with `profile.widgetCategories`. This should already be handled by Task 6 changes.

**4. `packages/pipeline/src/cli/index.ts`** — Pass resolved profile's widget categories to pipeline. Should already be handled by Task 3.

### Test updates

**5. `packages/pipeline/src/generate-activities/__tests__/widget-schemas.test.ts`** — Add tests (at end of file):

- `getAllowedWidgetIdsForProfile` with math profile includes `math.*` widgets (e.g. `math.fraction-visual`, `math.clock-time`)
- `getAllowedWidgetIdsForProfile` with generic profile includes only `core.*` widgets
- `getAllowedWidgetIdsForProfile` with science profile includes `core.*` + `science.*` widgets
- `getAllowedWidgetIdsForProfile` with profile having empty widgetCategories returns empty array
- `isWidgetAllowedForProfile` rejects `math.fraction-visual` for generic profile
- `isWidgetAllowedForProfile` accepts `core.matching` for any profile with `core` category

### Test commands

```
pnpm --filter @open-edu/pipeline test -- widgets
pnpm --filter @open-edu/widgets test
```

---

## Task 9: Replace unconditional math validation with validator plugins

### Objective

Make validation pluggable. Math validator runs only when profile enables it. Add validator registry + generic validators.

### Files to create

**1. `packages/pipeline/src/validation/registry.ts`** — Validator registry

```ts
import type { CurriculumProfile } from '../profile/types.js';
import type { Concept } from '../concepts/types.js';
import type { LessonBlueprint } from '../blueprint/types.js';
import type { GeneratedActivity } from '../types.js';
import type { AssetManifestEntry } from '../assets/types.js';
import type { SourceUnit } from '../source/types.js';

export interface ValidationContext {
  concepts: Concept[];
  blueprints: LessonBlueprint[];
  activities: GeneratedActivity[];
  assets: AssetManifestEntry[];
  sourceUnits: SourceUnit[];
  profile: CurriculumProfile;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  source: string;
}

export interface SubjectValidator {
  id: string;
  supports(profile: CurriculumProfile): boolean;
  validateConcepts(ctx: ValidationContext): ValidationIssue[];
  validateActivities(ctx: ValidationContext): ValidationIssue[];
}

const validators = new Map<string, SubjectValidator>();

export function registerValidator(v: SubjectValidator): void {
  if (validators.has(v.id)) {
    throw new Error(`Validator "${v.id}" is already registered`);
  }
  validators.set(v.id, v);
}

export function getValidator(id: string): SubjectValidator | undefined {
  return validators.get(id);
}

export function listValidators(): SubjectValidator[] {
  return [...validators.values()];
}

export function getValidatorsForProfile(profile: CurriculumProfile): SubjectValidator[] {
  // Always include generic/structural validators + profile-selected ones
  const result: SubjectValidator[] = [];
  for (const v of validators.values()) {
    if (v.supports(profile)) {
      result.push(v);
    }
  }
  return result;
}

export function clearValidatorRegistry(): void {
  validators.clear();
}

// Built-in structural validator (always runs)
const STRUCTURAL_VALIDATOR: SubjectValidator = {
  id: 'structure',
  supports: () => true, // always runs
  validateConcepts: (ctx) => {
    const issues: ValidationIssue[] = [];
    // Check all source units are covered by at least one concept
    const requiredUnits = ctx.sourceUnits.filter((u) => u.requiredCoverage);
    const coveredIds = new Set(ctx.concepts.flatMap((c) => c.sourceUnitIds));
    for (const unit of requiredUnits) {
      if (!coveredIds.has(unit.id)) {
        issues.push({
          id: `uncovered-${unit.id}`,
          severity: 'warning',
          message: `Required source unit "${unit.id}" (${unit.type}) is not covered by any concept`,
          source: 'structure',
        });
      }
    }
    return issues;
  },
  validateActivities: (ctx) => {
    const issues: ValidationIssue[] = [];
    // Check all concepts have at least one activity
    const conceptsWithActivities = new Set(ctx.activities.map((a) => a.step)); // simplified
    for (const concept of ctx.concepts) {
      const hasActivity = ctx.blueprints.some((b) => b.conceptId === concept.conceptId);
      if (!hasActivity) {
        issues.push({
          id: `no-blueprint-${concept.conceptId}`,
          severity: 'warning',
          message: `Concept "${concept.conceptId}" has no blueprint`,
          source: 'structure',
        });
      }
    }
    return issues;
  },
};

// Auto-register on import
registerValidator(STRUCTURAL_VALIDATOR);
```

**2. `packages/pipeline/src/validation/__tests__/registry.test.ts`** — Tests:

- Register a validator, then `getValidator` returns it
- Duplicate registration throws Error
- `getValidatorsForProfile` returns structural validator always
- `getValidatorsForProfile` for math profile returns structure + math
- `getValidatorsForProfile` for generic profile returns only structure (no math)
- `clearValidatorRegistry` clears all

### Files to modify

**3. `packages/pipeline/src/validation/math.ts`** — Wrap existing math validation as `SubjectValidator`:

Add at bottom of file (or create a new export):

```ts
import type { SubjectValidator, ValidationContext, ValidationIssue } from './registry.js';
import type { CurriculumProfile } from '../profile/types.js';

export const MathValidator: SubjectValidator = {
  id: 'math',
  supports: (profile: CurriculumProfile) => profile.validatorIds.includes('math'),
  validateConcepts: (ctx: ValidationContext): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    for (const concept of ctx.concepts) {
      if (concept.exerciseFamilies.length === 0) {
        issues.push({
          id: `no-exercise-${concept.conceptId}`,
          severity: 'warning',
          message: `Math concept "${concept.conceptId}" has no exercise families`,
          source: 'math',
        });
      }
    }
    return issues;
  },
  validateActivities: (ctx: ValidationContext): ValidationIssue[] => {
    const mathQuestions = extractMathQuestions(ctx.activities);
    const results = validateAllMath(mathQuestions);
    return results
      .filter((r) => !r.valid)
      .map((r) => ({
        id: `math-${r.question}`,
        severity: 'error' as const,
        message: `Math question failed: ${r.reason}`,
        source: 'math',
      }));
  },
};
```

Also register it at the bottom of `registry.ts` (or in `math.ts` via import):

```ts
import { MathValidator } from './math.js';
registerValidator(MathValidator);
```

**4. `packages/pipeline/src/validation/report.ts`** — Refactor `QualityReport`:

Replace the `mathValidation` field with a generic `validationResults` map:

```ts
export interface QualityReport {
  version: 1;
  generatedAt: string;
  status: 'complete' | 'partial' | 'failed';
  stageModelUsage: Record<string, { provider: string; model: string }>;
  retries: number;
  durationMs: number;
  conceptCount: number;
  assetCount: number;
  hasCycles: boolean;
  coverage: CoverageLedger['summary'];
  validationResults: Record<
    string,
    {
      totalChecked: number;
      passed: number;
      failed: number;
      failures: ValidationIssue[];
    }
  >;
  widgetValidation: {
    totalChecked: number;
    passed: number;
    failed: number;
    failures: WidgetValidationResult[];
  };
  reviewItems: string[];
  publishGates: {
    requiredCoverage: { passed: boolean; threshold: number; actual: number };
    subjectValidation: { passed: boolean; actual: number };
    widgetValidity: { passed: boolean; actual: number };
    assetCompleteness: { passed: boolean; actual: number };
    conceptCoverage: { passed: boolean; actual: number };
    noDependencyCycles: { passed: boolean };
  };
}
```

Update `generateQualityReport`:

- Remove `mathResults` parameter; accept `validationIssues: ValidationIssue[]` instead
- Group issues by `issue.source` to populate `validationResults`
- Compute `publishGates.subjectValidation` from all validation results
- Remove the `mathCorrectness` gate — use `subjectValidation` gate instead

**5. `packages/pipeline/src/graph/index.ts`** — Update Stage 7:

Replace the current validation section (lines 295–308) with:

```ts
// Stage 7: Validate via validator registry
if (options.verbose) console.log('[7/8] Running validation...');
const allActivities = conceptActivityPairs.flatMap((p) => p.activities);

const validators = getValidatorsForProfile(profile);
const allValidationIssues: ValidationIssue[] = [];
const validationContext: ValidationContext = {
  concepts,
  blueprints,
  activities: allActivities,
  assets: assetManifest.assets,
  sourceUnits: inventory.units,
  profile,
};

for (const validator of validators) {
  const conceptIssues = validator.validateConcepts(validationContext);
  const activityIssues = validator.validateActivities(validationContext);
  allValidationIssues.push(...conceptIssues, ...activityIssues);
}

// Widget validation runs unconditionally (it's structural, not profile-specific)
const widgetResults: WidgetValidationResult[] = [];
for (const activity of allActivities) {
  if (activity.courseSpecType === 'widget' && activity.widgetId && activity.widgetConfig) {
    widgetResults.push(validateWidgetConfig(activity.widgetId, activity.widgetConfig));
  }
}
```

Update the quality report call to pass `allValidationIssues`:

```ts
const report = generateQualityReport({
  stageUsage,
  retries,
  durationMs,
  coverage: coverageLedger.summary,
  validationIssues: allValidationIssues,
  widgetResults,
  reviewItems,
  assetCount: assetManifest.assets.length,
  conceptCount: concepts.length,
  hasCycles: conceptWarnings.some((w) => w.includes('cycle')),
});
```

### Test command

```
pnpm --filter @open-edu/pipeline test -- validation report
```

---

## Task 10: Fix scope-aware resume and artifact identity

### Objective

Compute artifact hash from all relevant inputs (PDF content, profile, scope, widget caps, prompt versions, model configs). Prevent cross-scope artifact reuse.

### Files to modify

**1. `packages/pipeline/src/graph/index.ts`** — Update `computeConfigHash()`:

Replace the current `computeConfigHash` (lines 60–78) with:

```ts
function computeConfigHash(): string {
  const hash = createHash('sha256');
  // Include PDF content hash
  try {
    const pdfContent = readFileSync(options.pdfPath);
    const pdfHash = createHash('sha256').update(pdfContent).digest('hex');
    hash.update(pdfHash);
  } catch {
    // If PDF can't be read, use path as fallback
    hash.update(options.pdfPath);
  }
  const cfg = JSON.stringify({
    pdfPath: options.pdfPath,
    profileId: profile.id,
    subject: options.subject,
    levelCode: options.levelCode,
    language: options.language || 'en',
    locale: options.locale || 'en-IN',
    scope: options.scope ? scopeToString(options.scope) : 'all',
    promptVersion: '2.0', // Increment when prompts change
    stages: [
      'source_inventory',
      'concept_map',
      'concept_enrichment',
      'lesson_blueprint',
      'asset_plan',
      'activity_generation',
      'review',
    ].map((s) => ({ stage: s, ...router.getStageConfig(s as LlmStage) })),
  });
  hash.update(cfg);
  return hash.digest('hex').slice(0, 16);
}
```

**2. `packages/pipeline/src/graph/index.ts`** — Add `pipeline-manifest.json`:

After computing hash, write a manifest file:

```ts
const pipelineManifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  configHash,
  pdfPath: options.pdfPath,
  profileId: profile.id,
  subject: options.subject,
  levelCode: options.levelCode,
  scope: options.scope ? scopeToString(options.scope) : 'all',
  stages: [...stages],
};
maybeWrite(
  join(options.outputDir, 'pipeline-manifest.json'),
  JSON.stringify(pipelineManifest, null, 2),
  true, // force overwrite
);
```

**3. `packages/pipeline/src/graph/index.ts`** — Update resume logic:

On resume, load `pipeline-manifest.json` and validate:

- Config hash matches (already handled by `.pipeline-hash`)
- Scope in manifest matches current scope (reject if changed)
- Profile in manifest matches current profile (reject if changed)

Change `canResume()` to also check `pipeline-manifest.json`:

```ts
function canResume(filename: string): boolean {
  if (!options.resume) return false;
  if (previousHash && previousHash !== configHash) return false;
  // Also check pipeline-manifest.json for scope/profile match
  const manifestPath = join(options.outputDir, 'pipeline-manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const currentScope = options.scope ? scopeToString(options.scope) : 'all';
      if (manifest.scope !== currentScope) return false;
      if (manifest.profileId !== profile.id) return false;
    } catch {
      return false;
    }
  }
  return existsSync(join(options.outputDir, filename));
}
```

**4. `packages/pipeline/src/scope/__tests__/resolve.test.ts`** — Add resume-related test:

- Two runs with different scope produce different config hashes (tested indirectly via `computeConfigHash` change)

### Test command

```
pnpm --filter @open-edu/pipeline test -- scope generic-pipeline
```

---

## Task 11: Add profile-aware CLI and configuration

### Objective

Wire all profile/scope/language/locale CLI flags end-to-end to the pipeline.

### Files to modify

**1. `packages/pipeline/src/cli/index.ts`** — Complete CLI integration:

This file was partially modified in Task 3. Now finish it:

- Import `resolveProfile`, `registerBuiltinProfiles` from profile registry
- Import `parseScope` from scope types
- In `runPipelineCLI()`:
  1. Resolve profile from `--profile`/`--subject`/`--curriculum`
  2. Parse scope from `--scope`
  3. Pass profile to `runPipelineV2`
  4. Pass scope to `runPipelineV2`
  5. Pass language, locale from CLI

Update the `runPipelineV2` call:

```ts
const result = await runPipelineV2(router, {
  pdfPath: options.pdf,
  levelCode: options.level.toUpperCase(),
  subject: options.subject,
  force: options.force,
  scope: options.scope ? parseScope(options.scope) : { kind: 'all' as const },
  profile: resolvedProfile,
  outputDir: options.outputDir,
  verbose: options.verbose,
  dryRun: options.dryRun,
  resume: options.resume,
  maxRetries: options.maxRetries,
  format: options.format,
  widgetCategories:
    options.widgetCategories.length > 0
      ? options.widgetCategories
      : resolvedProfile.widgetCategories,
  language: options.language,
  locale: options.locale,
});
```

Make `--dry-run` not invoke LLMs: check `options.dryRun` before calling LLM-heavy stages in `graph/index.ts` (this already exists partially).

Update `printHelp()` to show all new flags with examples:

```
--profile <id>          Curriculum profile (generic, math, science, nios)
--curriculum <id>       Curriculum adapter (e.g., nios)
--language <code>       Content language (default: en)
--locale <locale>       Locale (default: en-IN)
--scope <value>         Scope: all, chapter-index:N, chapter-id:ID, pages:A-B, source-units:id,id
--widget-category <id>  Repeatable widget category filter (core, math, science, etc.)
```

**2. `packages/pipeline/src/graph/index.ts`** — Update `runPipelineV2` options type:

```ts
export async function runPipelineV2(
  router: LlmRouter,
  options: {
    pdfPath: string;
    levelCode: string;
    subject: string;
    force: boolean;
    scope: DocumentScope;
    profile: CurriculumProfile;
    outputDir: string;
    verbose: boolean;
    dryRun: boolean;
    resume: boolean;
    maxRetries: number;
    format: 'md' | 'json' | 'both';
    widgetCategories: string[];
    language?: string;
    locale?: string;
  },
): Promise<PipelineResult>;
```

- Use `options.profile` throughout the function instead of building profile context manually
- Use `options.scope` for all scope-aware filtering. **Remove** the old `chapterFilter` logic entirely — there is no deprecated fallback.

**3. `packages/pipeline/src/config/config.ts`** — Add profile-aware stage defaults (optional for this task, can be done in Task 13).

### Test command

```
pnpm --filter @open-edu/pipeline test -- cli config
pnpm --filter @open-edu/pipeline build
```

---

## Task 12: Add generic fixtures and acceptance tests

### Objective

Build the generic-pipeline integration test that verifies all profiles produce valid output.

### Files to create

**1. `packages/pipeline/src/fixtures/generic-science/README.md`**

```
# Generic Science Fixture

Place a science-related PDF textbook chapter here for testing the generic and science profiles.
The pipeline will use this to verify non-math content generation.

Expected usage:
pnpm --filter @open-edu/pipeline test -- generic-pipeline
```

**2. `packages/pipeline/src/fixtures/generic-science/source-inventory.json`**

Create a minimal source inventory fixture:

```json
{
  "documentId": "generic-science",
  "title": "Introduction to Cells",
  "totalPages": 5,
  "units": [
    {
      "id": "src-1",
      "type": "lesson",
      "text": "Chapter 1: Introduction to Cells",
      "location": { "pageStart": 1 },
      "extractionConfidence": 0.95,
      "requiredCoverage": true
    },
    {
      "id": "src-2",
      "type": "objective",
      "text": "Learning Objectives: Understand what cells are",
      "location": { "pageStart": 1 },
      "extractionConfidence": 0.95,
      "requiredCoverage": true
    },
    {
      "id": "src-3",
      "type": "definition",
      "text": "A cell is the basic structural and functional unit of all living organisms.",
      "location": { "pageStart": 2 },
      "extractionConfidence": 0.9,
      "requiredCoverage": false
    },
    {
      "id": "src-4",
      "type": "worked_example",
      "text": "Example: Plant cells have a cell wall while animal cells do not.",
      "location": { "pageStart": 3 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    },
    {
      "id": "src-5",
      "type": "exercise",
      "text": "Exercise: List three differences between plant and animal cells.",
      "location": { "pageStart": 4 },
      "extractionConfidence": 0.9,
      "requiredCoverage": true
    }
  ],
  "warnings": []
}
```

**3. `packages/pipeline/src/fixtures/single-chapter/README.md`**

```
# Single Chapter Fixture

Place a single-chapter PDF here for testing the synthetic chapter behavior.
The pipeline should handle PDFs without heading-based chapter boundaries.

A single-chapter PDF should produce one module without requiring a detected chapter heading.
```

**4. `packages/pipeline/src/__tests__/generic-pipeline.test.ts`** — Integration test

This is the most important test. It should use `FakeRouter` to mock all LLM calls.

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { registerBuiltinProfiles, resolveProfile } from '../profile/registry.js';
import type { CurriculumProfile } from '../profile/types.js';
import type { SourceInventory } from '../source/types.js';
import { buildCoverageLedger } from '../coverage/index.js';
// Import FakeRouter from test-helpers or math-level-b-lesson1 fixture
import { FakeRouter } from '../test-helpers.js' // if available, or define inline

describe('Generic Pipeline', () => {
  beforeAll(() => {
    registerBuiltinProfiles();
  });

  it('generic profile produces valid output', () => {
    const profile = resolveProfile({ subject: 'history' });
    expect(profile.id).toBe('generic');
    // Verify generic profile has core widgets, no math renderers, no math validators
    expect(profile.widgetCategories).toContain('core');
    expect(profile.assetRendererTypes).toEqual([]);
    expect(profile.validatorIds).toEqual([]);
  });

  it('math profile resolves for mathematics subject', () => {
    const profile = resolveProfile({ subject: 'mathematics' });
    expect(profile.id).toBe('math');
    expect(profile.validatorIds).toContain('math');
    expect(profile.assetRendererTypes.length).toBeGreaterThan(0);
  });

  it('science profile resolves for science subject', () => {
    const profile = resolveProfile({ subject: 'science' });
    expect(profile.id).toBe('science');
    expect(profile.conceptKinds).toContain('process');
    expect(profile.widgetCategories).toContain('science');
  });

  it('nios profile resolves for nios curriculum', () => {
    const profile = resolveProfile({ curriculum: 'nios' });
    expect(profile.id).toBe('nios');
    expect(profile.sourceTaxonomy.lessonLabels).toContain('पाठ');
  });

  it('source inventory JSON is valid for generic science fixture', () => {
    const inventory: SourceInventory = JSON.parse(
      readFileSync(...) // from fixtures/generic-science/source-inventory.json
    );
    expect(inventory.units.length).toBeGreaterThan(0);
    expect(SourceInventorySchema.safeParse(inventory).success).toBe(true);
  });

  it('single chapter produces synthetic chapter', () => {
    // Test that createSyntheticChapter works for flat documents
    const pages = [{ pageNum: 1, text: 'No headings here' }];
    const chapter = createSyntheticChapter(pages);
    expect(chapter.id).toBe('document-chapter-1');
    expect(chapter.confidence).toBe(0.5);
  });

  it('profile-specific validators run only when enabled', () => {
    const validators = getValidatorsForProfile(resolveProfile({ subject: 'history' }));
    const validatorIds = validators.map(v => v.id);
    expect(validatorIds).toContain('structure');
    expect(validatorIds).not.toContain('math');

    const mathValidators = getValidatorsForProfile(resolveProfile({ subject: 'mathematics' }));
    const mathIds = mathValidators.map(v => v.id);
    expect(mathIds).toContain('math');
  });
});
```

**5. `packages/pipeline/package.json`** — Add test scripts:

```json
"test:generic": "vitest run -- generic-pipeline",
"test:fixture": "vitest run -- generic-pipeline math-level-b-lesson1"
```

### Test command

```
pnpm --filter @open-edu/pipeline test
pnpm --filter @open-edu/course-compiler test
```

---

## Task 13: Document extension and operational workflows

### Objective

Add documentation for the generic profile contract, how to add new subjects, renderers, validators, etc.

### Files to create/modify

**1. `packages/pipeline/README.md`** — Pipeline documentation

Create with these sections:

- Overview: what the pipeline does
- CLI usage: all flags with examples
- Adding a new subject (without changing graph):
  1. Create `src/profile/builtins/your-subject.ts`
  2. Register in `registry.ts`
  3. Optionally add validators, renderers
- Adding a new curriculum adapter (without changing extractor):
  1. Set `sourceTaxonomy` with curriculum-specific labels
  2. Set `promptContext` with curriculum-specific hints
- Registering asset renderers
- Registering validators
- Single-chapter vs multi-chapter usage
- Model-stage overrides
- Artifact identity and resume behavior
- Operational checklist for reviewing a new subject profile

Keep README concise — target ~200 lines max.

**2. `openwiki/operations/testing-and-changes.md`** — Add section:

- How to run pipeline tests
- Generic pipeline test instructions
- Profile-specific test instructions

**3. `openwiki/domain/content-and-workflows.md`** — Add section linking to pipeline profiles

### Test commands

```
pnpm --filter @open-edu/pipeline lint
pnpm --filter @open-edu/pipeline typecheck
pnpm --filter @open-edu/pipeline build
```

---

## Task 14: Evaluate profile quality and routing

### Objective

Create evaluation infrastructure for comparing profile quality. Run all profiles through the same fixture and measure output quality.

### Files to create

**1. `packages/pipeline/src/evaluation/profile-evaluation.ts`** — Evaluation runner

```ts
import type { CurriculumProfile } from '../profile/types.js';
import type { LlmRouter } from '@open-edu/llm-config';

export interface ProfileEvalResult {
  profileId: string;
  subject: string;
  conceptCount: number;
  sourceCoveragePercent: number;
  activityCount: number;
  assetCount: number;
  widgetValidityPercent: number;
  latencyMs: number;
  retriesUsed: number;
  llmCalls: number;
  publishStatus: 'complete' | 'partial' | 'failed';
}

export async function evaluateProfile(
  router: LlmRouter,
  profile: CurriculumProfile,
  pdfPath: string,
): Promise<ProfileEvalResult> {
  // Run the pipeline with this profile
  // Collect metrics (concept count, coverage %, validation pass rate, latency, cost estimate)
  // Return structured result
}

export function compareProfiles(results: ProfileEvalResult[]): {
  bestByMetric: Record<string, string>;
  comparison: ProfileEvalResult[];
} {
  // Compare profiles by each metric
  // Return best profile per metric
}
```

**2. `packages/pipeline/src/evaluation/__tests__/profile-evaluation.test.ts`** — Tests:

- `compareProfiles` returns valid comparison
- Profile eval result schema validation
- Mock profile eval with FakeRouter

**3. `docs/generic-pipeline-evaluation.md`** — Link to evaluation results

### Test command

```
pnpm --filter @open-edu/pipeline test -- evaluation
```

---

## Implementation Order (must follow this sequence)

```
Task 1  → Profile contract + registry (NO deps)
Task 2  → Built-in profiles (depends on T1)
Task 3  → Document scope (depends on T1)
Task 4  → Generic extraction + remove NIOS (depends on T2, T3)
Task 5  → Profile-neutral concepts/blueprints (depends on T2, T4)
Task 6  → Wire concepts/blueprints into activities (depends on T5)
Task 7  → Asset renderer registry (depends on T2)
Task 8  → Profile-aware widgets (depends on T2)
Task 9  → Validator registry (depends on T2)
Task 10 → Resume + artifact identity (depends on T3, T6)
Task 11 → CLI + configuration (depends on T3, T6, T7, T8, T9)
Task 12 → Fixtures + acceptance tests (depends on T6–T10)
Task 13 → Documentation (depends on T11)
Task 14 → Evaluation (depends on T12)
```

Tasks 7, 8, 9 can be done in parallel after Task 2.

---

## Final validation

After all 14 tasks are complete, run:

```
pnpm --filter @open-edu/pipeline test
pnpm --filter @open-edu/pipeline typecheck
pnpm --filter @open-edu/pipeline lint
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/course-compiler test
```

All must pass. In addition:

- [ ] Any subject label resolves to a profile (generic fallback)
- [ ] NIOS behavior is in the nios profile, not in generic code
- [ ] Math behavior is in the math profile
- [ ] Science profile demonstrates non-math generation
- [ ] Single-chapter PDF works without chapter headings
- [ ] Multi-chapter PDF preserves chapter hierarchy
- [ ] Full and scoped runs cannot reuse incompatible artifacts
- [ ] Profile capabilities control widgets, assets, question families, validators
- [ ] Activities receive complete concept and blueprint (not fabricated defaults)
- [ ] Generic quality gates run for every subject
- [ ] Domain validators run only when enabled by active profile
