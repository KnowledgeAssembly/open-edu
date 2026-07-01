---
sidebar_position: 7
---

# Schema Layer (`@open-edu/schemas`)

The schema package is the single source of truth for all data structures in the framework. It uses **Zod** to define schemas that produce TypeScript types, JSON Schema exports, and runtime validators.

## Exported Schemas

| Schema                                                                                                 | Description                                                                                  |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `PackageManifestSchema`                                                                                | Package identity — `id`, `title`, `version`, `author`, `entry`, optional `skills`            |
| `ContentNodeSchema`                                                                                    | Discriminated union of all node types (`lesson`, `quiz`, `reflection`, `exercise`, `custom`) |
| `LessonNodeSchema`, `QuizNodeSchema`, `ReflectionNodeSchema`, `ExerciseNodeSchema`, `WidgetNodeSchema` | Individual node type schemas                                                                 |
| `WorkflowSchema`                                                                                       | Routing rules with linear `onComplete` and conditional `conditions`                          |
| `RouteDefinitionSchema`                                                                                | Single route — either `onComplete` or `conditions` array                                     |
| `ProgressSnapshotSchema`                                                                               | Learner state — `currentNodeId`, `visitedNodes`, `scores`, `isCompleted`                     |
| `BundleProgressSnapshotSchema`                                                                         | Bundle-level progress — `bundleId`, `moduleStatuses`, per-module `ModuleProgressSnapshot`    |
| `ModuleProgressSnapshotSchema`                                                                         | Per-module progress snapshot — `moduleId`, `currentNodeId`, `visitedNodes`, `scores`         |
| `BundleManifestSchema`                                                                                 | Bundle identity — `id`, `title`, `version`, `author`, ordered `modules` array                |
| `BundleModuleRefSchema`                                                                                | Module reference — `id`, `title`, `path`, `dependsOn`, `estimatedDuration`                   |
| `RewardsSchema`                                                                                        | Reward triggers with conditional badge/webhook/script actions                                |
| `SkillGraphSchema`                                                                                     | Skill definitions, dependencies, mastery thresholds                                          |
| `MasteryLevelSchema`                                                                                   | Enum: `not_attempted`, `in_progress`, `achieved`, `mastered`                                 |
| `TelemetryEventSchema`                                                                                 | Discriminated union of all telemetry event types                                             |
| `RemoteWidgetManifestSchema`                                                                           | Remote widget identity, URL, integrity hash, fallback                                        |
| `SkillsSchema`                                                                                         | Skill definitions in manifest                                                                |
| `CardDefinitionSchema`                                                                                 | A single Living Knowledge Card — `id`, `title`, `type`, `category`, `summary`, `unlock` etc. |
| `CardDefinitionsSchema`                                                                                | Object wrapper `{ cards: [...] }` for card definitions                                       |
| `CardTypeSchema`                                                                                       | Enum: `knowledge`, `skill`, `achievement`, `exploration`, `mentor`                           |
| `CardDifficultySchema`                                                                                 | Enum: `easy`, `medium`, `hard`                                                               |

## Usage

```typescript
import { PackageManifestSchema, QuizNodeSchema } from '@open-edu/schemas';
import type { PackageManifest, QuizNode } from '@open-edu/schemas';

const manifest: PackageManifest = {
  id: 'my-lesson',
  title: 'My Lesson',
  version: '0.1.0',
  author: 'Me',
  entry: 'nodes/intro.md',
};

const result = PackageManifestSchema.safeParse(manifest);
// result.success ? result.data : result.error.issues
```

## JSON Schema Export

Schemas can be exported to JSON Schema for use in non-TypeScript tooling:

```typescript
import { toJsonSchema } from '@open-edu/schemas';
const jsonSchema = toJsonSchema(PackageManifestSchema);
```

## Design Principle

Schemas are written once in Zod and consumed everywhere — runtime validation, TypeScript types, documentation generation, and AI agent prompts. Never hand-write types; always derive from Zod.
