# Open-Edu Package Authoring Guide

Version: 0.1.0

---

This guide teaches you how to create educational packages for the Open-Edu Framework.

---

## 1. Minimal Package Structure

A valid package is a directory with at least a `package.json` manifest and one content node:

```
my-package/
├── package.json
├── workflow.json       (optional — linear routing is inferred)
└── nodes/
    └── lesson.md
```

---

## 2. Manifest Fields

Create a `package.json` in your package root:

```json
{
  "id": "my-lesson",
  "title": "My Lesson",
  "version": "0.1.0",
  "author": "Your Name",
  "entry": "nodes/lesson.md"
}
```

### Required Fields

| Field     | Description                        | Example                     |
| --------- | ---------------------------------- | --------------------------- |
| `id`      | Unique kebab-case identifier       | `intro-to-variables`        |
| `title`   | Human-readable display name        | `Introduction to Variables` |
| `version` | Semantic version                   | `1.0.0`                     |
| `author`  | Creator name or organization       | `Open-Edu Team`             |
| `entry`   | Relative path to the starting node | `nodes/lesson.md`           |

---

## 3. Node Types

### Lesson Node (`.md`)

Simple Markdown — the runtime renders it as accessible HTML:

```markdown
# Lesson Title

Content goes here. Use standard Markdown:

- Lists
- **bold** and _italic_
- `inline code`
- Code blocks
```

### Quiz Node (`.json`)

Multiple-choice assessment. At least one option must be correct:

```json
{
  "type": "quiz",
  "question": "What is 2 + 2?",
  "options": [
    { "id": "a", "text": "3", "correct": false },
    { "id": "b", "text": "4", "correct": true },
    { "id": "c", "text": "5", "correct": false }
  ],
  "skills": ["math.addition"]
}
```

### Reflection Node (`.json`)

Open-ended prompt for learner reflection:

```json
{
  "type": "reflection",
  "prompt": "What did you learn from this lesson?"
}
```

### Exercise Node (`.json`)

Widget-based interactive exercise:

```json
{
  "type": "exercise",
  "widget": "open-edu.multiple-choice-practice",
  "config": {
    "prompt": "Select the correct answer.",
    "options": [
      { "id": "a", "text": "Option A", "correct": true },
      { "id": "b", "text": "Option B", "correct": false }
    ],
    "explanation": "Option A is correct because..."
  }
}
```

---

## 4. Workflow Examples

### Linear Progression

```json
{
  "routing": {
    "nodes/intro.md": { "onComplete": "nodes/quiz.json" },
    "nodes/quiz.json": { "onComplete": "COMPLETED" }
  }
}
```

### Score-Based Branching

```json
{
  "routing": {
    "nodes/quiz.json": {
      "conditions": [
        { "if": "score >= 80", "then": "nodes/advanced.md" },
        { "if": "score < 80", "then": "nodes/remediation.md" }
      ]
    }
  }
}
```

### Remediation Loop

```json
{
  "routing": {
    "nodes/quiz.json": {
      "conditions": [
        { "if": "score >= 80", "then": "COMPLETED" },
        { "if": "score < 80", "then": "nodes/remediation.md" }
      ]
    },
    "nodes/remediation.md": {
      "onComplete": "nodes/quiz.json"
    }
  }
}
```

### Multi-Node Chain with Reflection

```json
{
  "routing": {
    "nodes/lesson.md": { "onComplete": "nodes/quiz.json" },
    "nodes/quiz.json": { "onComplete": "nodes/reflection.json" },
    "nodes/reflection.json": { "onComplete": "COMPLETED" }
  }
}
```

---

## 5. Rewards

Award badges on workflow completion:

```json
{
  "triggers": [
    {
      "onEvent": "workflow.complete",
      "rewards": [{ "action": "badge.award", "badge": "my-lesson-complete" }]
    }
  ]
}
```

---

## 6. Validation

Use the CLI to validate your package:

```bash
edu validate ./my-package
```

Or run validation tests with Vitest:

```ts
import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('my-package', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('my-lesson');
    expect(pkg.nodes.length).toBeGreaterThan(0);
  });
});
```

---

## 7. Common Mistakes

### Missing Required Manifest Fields

Every `package.json` must include `id`, `title`, `version`, `author`, and `entry`.

### Incorrect Entry Path

The `entry` field must be a valid path relative to the package root. Example: `nodes/lesson.md` (not `/nodes/lesson.md` or `./nodes/lesson.md`).

### Invalid Quiz Structure

Every quiz must have:

- A `question` string
- An `options` array with at least one item where `correct` is `true`
- Each option must have `id` and `text` fields

### Unreferenced Nodes

Every node in `workflow.json` routing must exist on disk. Every node file must be reachable from the routing graph.

### Circular Routes

Do not create circular routing paths (e.g., A → B → A) unless using a remediation loop pattern.

### Wrong JSON Filenames

Node files must use `.md` for lessons and `.json` for quizzes/reflections/exercises.

---

## 8. Instructions for AI Agents

### Deterministic Generation Rules

When generating an Open-Edu package:

1. **Always produce a complete, valid package** with `package.json`, at least one node, and a `workflow.json`.
2. **Use kebab-case** for the package `id` field.
3. **Version must be semver** (e.g., `1.0.0`).
4. **All paths are relative** to the package root. Never use absolute paths.
5. **Entry point must be a valid node file** — either `.md` (lesson) or `.json` (quiz/reflection/exercise).
6. **Quiz nodes must have at least one correct answer** — the `correct` field must be `true` on at least one option.
7. **Workflow routing keys must match node file paths exactly** — e.g., `nodes/quiz.json` not `quiz.json`.
8. **The terminal route is always `COMPLETED`** (uppercase, no file extension).
9. **Rewards should use `badge.award` action only** unless webhooks or scripts are explicitly requested.
10. **Keep content short and deterministic** — avoid open-ended or variable content when possible.

### Validation Checklist

Before delivering a package, verify:

- [ ] `package.json` has all 5 required fields
- [ ] `entry` node exists on disk
- [ ] All nodes referenced in `workflow.json` exist on disk
- [ ] Quiz nodes have at least one correct option
- [ ] No circular routes (unless intentional remediation loop)
- [ ] `COMPLETED` is used for terminal states
- [ ] JSON files are valid JSON
- [ ] All paths use forward slashes

---

## Example: Complete Minimal Package

```
hello-world/
├── package.json
├── workflow.json
└── nodes/
    └── hello.md
```

```json
// package.json
{
  "id": "hello-world",
  "title": "Hello World",
  "version": "0.1.0",
  "author": "Open-Edu",
  "entry": "nodes/hello.md"
}
```

```json
// workflow.json
{
  "routing": {
    "nodes/hello.md": { "onComplete": "COMPLETED" }
  }
}
```

```markdown
<!-- nodes/hello.md -->

# Hello World

Welcome to your first Open-Edu learning package!

Educational Packages are portable learning experiences.
```
