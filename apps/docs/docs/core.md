---
sidebar_position: 10
---

# Core

The **core** package (`@open-edu/core`) is the foundation layer for loading, validating, scanning, and transforming Open-Edu packages. Every package the learner app, CLI, or dev-server consumes passes through core.

## Quick Start

```ts
import { loadPackage, scanPackages, scanAll } from '@open-edu/core';

const pkg = await loadPackage('./examples/hello-world');
const packages = await scanPackages('./examples');
const all = await scanAll('./examples'); // packages + bundles
```

## Responsibilities

### Package Loading

- `loadPackage(dir)` — loads a single package from disk, validates manifest + workflow + nodes
- `loadManifest(dir)` — parses `package.json` manifest
- `loadWorkflow(dir)` — parses `workflow.json` routing
- `loadNodes(dir, manifest)` — loads all content nodes (markdown, quiz, reflection, widget)
- `loadRewards(dir)` — parses `rewards.json` badge/webhook rules
- `loadCards(dir)` — parses `cards.json` Knowledge Card definitions

### Scanning

- `scanPackages(dir)` — discovers all valid packages in a directory, returns `PackageSummary[]`
- `scanBundles(dir)` — discovers all valid bundles in a directory, returns `BundleSummary[]`
- `scanAll(dir)` — discovers both packages and bundles in a single pass

### Bundle Loading

- `loadBundle(dir)` — loads a multi-module bundle with all module packages, validates prerequisites
- Supports `dependsOn` prerequisite chains between modules

### Validation & Linting

- `lintPackage(dir)` — content quality checks beyond schema validation (missing headings, empty nodes)
- `verifyIntegrity(dir)` — checksum verification for build manifests
- Error classes: `PackageLoadError`, `ManifestValidationError`, `NodeLoadError`, `WorkflowValidationError`, `BundleValidationError`, `CircularDependencyError`

### Patching

- `applyPatch(dir, operations)` — surgical JSON patches to modify package content

### Widget Catalog

- `generateWidgetCatalog(entries)` — generates structured catalog data for LLM prompts
- `getDefaultWidgetCatalog()` — returns the built-in widget catalog from `widget-catalog-data.json`

### Import & Compilation

- `importLearnEasy(source, output)` — converts Learn-Easy curriculum directories into Open-Edu bundles

### Agent Integration

- `generateAgentPrompt(pkg)` — generates an AI-ready prompt describing the package

## Error Types

| Error                      | Description                           |
| -------------------------- | ------------------------------------- |
| `PackageLoadError`         | General package loading failure       |
| `ManifestValidationError`  | Invalid `package.json`                |
| `NodeLoadError`            | Failed to load a content node         |
| `WorkflowValidationError`  | Invalid `workflow.json`               |
| `BundleValidationError`    | Invalid bundle structure              |
| `CircularDependencyError`  | Circular prerequisite chain in bundle |
| `MissingPrerequisiteError` | Referenced prerequisite not found     |

## Dependencies

- `@open-edu/schemas` — Zod validation schemas
- `zod` — runtime validation

## Tests

```bash
pnpm --filter @open-edu/core test
```
