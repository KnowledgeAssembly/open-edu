# OpenEdu Course Specification Compiler (`@open-edu/course-compiler`) Implementation Plan

The goal of this project is to implement the first version of the **OpenEdu Course Specification Compiler** (`@open-edu/course-compiler`). This package will compile human/AI-generated Markdown specification files (`course-spec.md`) into fully validated, production-ready OpenEdu educational packages.

---

## Approved Architectural Decisions

> [!IMPORTANT]
> **Key Architectural Decisions & Alignment**
> 1. **Specification Syntax Tolerance**: The compiler will use fuzzy header and list parsing via Remark/Unified AST traversal, allowing LLMs (ChatGPT, Gemini, Claude, local models) to generate specifications without rigid syntactic constraints.
> 2. **Canonical Intermediate Model (`CourseModel`)**: A strict Zod-backed intermediate data model ensures total decoupling between the Markdown format and the output package directory structure.
> 3. **Auto-Detect Output Structure**: The compiler automatically detects whether to target a single OpenEdu Module package (`manifest.json`) or a Multi-Module Bundle (`bundle.json`) based on the module count in `course-spec.md`.
> 4. **Asset Placeholder Generation**: When referenced media (images/diagrams/assets) in `course-spec.md` are missing locally during compilation, the compiler generates SVG/placeholder assets automatically and records an informational diagnostic.
> 5. **Deterministic File Generation**: Package generators write clean JSON and Markdown files with formatted keys and standardized IDs, guaranteeing identical output for identical inputs.
> 6. **WASM & Standalone Compatibility**: Code in parser/validator components will avoid Node.js native bindings or OS-specific dependencies, keeping future WebAssembly compilation clean.

---

## High-Level Architecture & Pipeline

```
course-spec.md
      │
Markdown Parser (Unified / Remark AST)
      │
AST Walker & Section Normalizer
      │
Semantic Parser ──► Diagnostic Collector (Severity, Line Nos, Hints)
      │
Intermediate Data Model (CourseModel Zod Schema)
      │
Plugin Execution Pipeline (Transformations & Extensions)
      │
Package Generator (Manifest/Bundle, Lessons, Quizzes, Placeholder Assets)
      │
Package Validation (@open-edu/core Integrity & Schemas)
      │
OpenEdu Package Directory Output
```

---

## Proposed Changes

### `packages/course-compiler` [NEW]

Create a new package `@open-edu/course-compiler` inside `packages/course-compiler/`.

#### [NEW] [package.json](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/package.json)
- Define `@open-edu/course-compiler` package configuration following project conventions:
  - `"private": true`, `"type": "module"`, `"version": "0.1.0"`
  - Three-entry `"exports"` block (`types` / `import` / `require`) pointing to `./dist/index.js`
  - `"files": ["dist"]`, standard scripts (`build`, `test`, `lint`, `typecheck`, `clean`)
  - pnpm workspace dependencies: `@open-edu/schemas`, `@open-edu/core`, `unified`, `remark-parse`, `remark-frontmatter`, `zod`, `commander`, `chokidar`
  - devDependencies: `vitest`
  - Note: frontmatter parsing is handled via `remark-frontmatter` within the unified pipeline rather than a separate `gray-matter` dependency, keeping the parser self-contained in the Remark AST.

#### [NEW] [tsconfig.json](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/tsconfig.json)
- Extend root `tsconfig.base.json`.

#### [NEW] [src/schemas/course-model.ts](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/src/schemas/course-model.ts)
- Define complete Zod schemas and TypeScript interfaces for the canonical intermediate data model:
  - `CourseModel`, `CourseMetadata`, `LearningObjective`, `CourseModule`, `Lesson`, `Activity`, `Quiz`, `Question`, `Flashcard`, `GlossaryEntry`, `Reference`, `Asset`.

#### [NEW] [src/schemas/diagnostics.ts](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/src/schemas/diagnostics.ts)
- Define diagnostic structures: `DiagnosticSeverity` (`error` | `warning` | `info`), `SourceLocation` (line, column, offset), and `CompilerDiagnostic`.

#### [NEW] [src/parser/markdown-ast.ts](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/src/parser/markdown-ast.ts)
- Implement AST parser using Remark (with `remark-parse` and `remark-frontmatter`) to produce standard `mdast` nodes with position context. Frontmatter is parsed as part of the unified pipeline and exposed as a `yaml` node in the AST, eliminating the need for a separate frontmatter library.

#### [NEW] [src/parser/semantic-parser.ts](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/src/parser/semantic-parser.ts)
- Convert Remark AST tree into strongly-typed `CourseModel`. Handles header hierarchy variations (`#`, `##`, `###`, `####`), frontmatter parsing, section extraction, and diagnostic mapping.

#### [NEW] [src/validators/semantic-validator.ts](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/src/validators/semantic-validator.ts)
- Semantic validation engine checking:
  - Duplicate lesson/module IDs
  - Missing required fields (titles, objectives)
  - Broken references / cross-links
  - Invalid metadata or prerequisite dependency loops
  - Duplicate quizzes or malformed quiz structures
  - Empty lessons or missing assets

#### [NEW] [src/generators/package-generator.ts](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/src/generators/package-generator.ts)
- Pure generator that takes `CourseModel` and writes target file structures:
  - Auto-detects single module (`manifest.json`) vs multi-module bundle (`bundle.json`).
  - Generates SVG/image placeholders when assets referenced in lessons are missing locally.
  - Generates `metadata.json`, `lessons/*.md`, `quizzes/*.json`, `assets/`.

#### CourseModel → Package Schema Mapping

The generator maps `CourseModel` types to `@open-edu/schemas` output types as follows:

| CourseModel Type | Output Format | `@open-edu/schemas` Type |
|---|---|---|
| `CourseMetadata` | `manifest.json` top-level fields | `PackageManifestSchema` |
| `CourseModule` (single) | `manifest.json` | `PackageManifestSchema` |
| `CourseModule` (multiple) | `bundle.json` + per-module `manifest.json` | `BundleManifestSchema`, `PackageManifestSchema` |
| `Lesson` | `lessons/<id>.md` content node | `ContentNodeSchema` via `LessonNodeSchema` |
| `Quiz` | `quizzes/<id>.json` content node | `ContentNodeSchema` via `QuizNodeSchema` |
| `Activity` | Embedded within lesson Markdown or standalone widget node | `ContentNodeSchema` via `ExerciseNodeSchema` / `WidgetNodeSchema` |
| `GlossaryEntry` | `metadata.json` glossary section | N/A (runtime-specific metadata) |
| `Asset` | `assets/<path>` with SVG placeholder if missing | resolved via `resolveAssets` in `@open-edu/core` |

The generator produces a flat `lessons/` and `quizzes/` directory, then constructs the appropriate manifest referencing those files via the `nodes` array. For bundles, each module gets its own subdirectory with a `manifest.json`, and a root `bundle.json` references them.

#### [NEW] [src/plugins/plugin-engine.ts](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/src/plugins/plugin-engine.ts)
- Extensibility system supporting lifecycle hooks (`beforeParse`, `afterAST`, `transformModel`, `beforeGenerate`, `afterGenerate`) for plugins such as Mermaid diagrams, accessibility annotations, localization, and exports (SCORM/EPUB).

#### [NEW] [src/cli/index.ts](file:///Users/sarthakpatnaik/.gemini/antigravity/worktrees/open-edu/build-course-spec-compiler/packages/course-compiler/src/cli/index.ts)
- Commander CLI implementing a `compile` command registered as a subcommand in `@open-edu/cli` (no standalone binary to avoid binary conflicts). The package exports a `compile(specPath, options)` function that `@open-edu/cli` wires into its own CLI as `openedu compile <file>`.
- Flags: `--validate`, `--watch`, `--output`, `--verbose`, `--format`.

---

## Verification Plan

### Automated Tests
- Unit & integration testing via Vitest:
  ```bash
  pnpm --filter @open-edu/course-compiler test
  ```
- Specific test suites:
  - `src/parser.test.ts`: AST & section extraction tests (colocated with source, per project convention).
  - `src/validators/semantic-validator.test.ts`: Diagnostic generation on malformed Markdown, duplicate IDs, missing sections.
  - `src/generators/package-generator.test.ts`: Deterministic output package structure verification, auto-detection logic, and asset placeholder generation.
  - `src/cli/index.test.ts`: CLI flag and execution tests.

### Output Validation

After generating the output directory, the compiler invokes `@open-edu/core`'s `loadPackage` (for single modules) or `loadBundle` (for bundles) on the generated output, producing actionable diagnostics if the output fails schema validation or integrity checks. This ensures the compiler never emits an invalid package.

### Manual Verification
- Compile sample `course-spec.md` files (including AI-generated mocks) and inspect output artifacts.
- Run package verification against `@open-edu/core` scanner and validator via `loadPackage` / `verifyIntegrity`.
