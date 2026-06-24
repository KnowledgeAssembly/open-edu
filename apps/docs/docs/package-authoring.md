---
sidebar_position: 4
---

# Package Authoring Guide

Learn how to create educational packages for the Open-Edu Framework.

## Minimal Package Structure

A valid package is a directory with at least a `package.json` manifest and one content node:

```
my-package/
├── package.json
├── workflow.json
└── nodes/
    └── lesson.md
```

## Manifest Fields

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

## Node Types

### Lesson Node (`.md`)

```markdown
# Lesson Title

Content goes here. Use standard Markdown.
```

### Quiz Node (`.json`)

```json
{
  "type": "quiz",
  "question": "What is 2 + 2?",
  "options": [
    { "id": "a", "text": "3", "correct": false },
    { "id": "b", "text": "4", "correct": true }
  ]
}
```

### Reflection Node (`.json`)

```json
{
  "type": "reflection",
  "prompt": "What did you learn from this lesson?"
}
```

### Exercise Node (`.json`)

```json
{
  "type": "exercise",
  "widget": "open-edu.multiple-choice-practice",
  "config": {
    "prompt": "Select the correct answer.",
    "options": [
      { "id": "a", "text": "Option A", "correct": true },
      { "id": "b", "text": "Option B", "correct": false }
    ]
  }
}
```

## Workflow Examples

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

## Rewards

```json
{
  "triggers": [
    {
      "onEvent": "workflow.complete",
      "rewards": [{ "action": "badge.award", "badge": "lesson-complete" }]
    }
  ]
}
```

## Validation

```bash
edu validate ./my-package
```

## Common Mistakes

- **Missing required manifest fields** — Every `package.json` needs `id`, `title`, `version`, `author`, `entry`.
- **Incorrect entry path** — Use relative paths like `nodes/lesson.md`, not absolute paths.
- **Invalid quiz structure** — Every quiz needs a `question` and `options` array with at least one correct answer.
- **Unreferenced nodes** — All nodes in `workflow.json` routing must exist on disk.
- **Wrong terminal state** — The terminal route must be `COMPLETED` (uppercase).
- **JSON formatting** — Ensure all `.json` files are valid JSON.

## Instructions for AI Agents

### Deterministic Generation Rules

1. Always produce a complete, valid package with `package.json`, at least one node, and `workflow.json`.
2. Use kebab-case for the package `id`.
3. Version must be semver (e.g., `1.0.0`).
4. All paths are relative to the package root.
5. Entry point must be a valid node file (`.md` or `.json`).
6. Quiz nodes must have at least one correct answer.
7. Workflow routing keys must match node file paths exactly.
8. The terminal route is always `COMPLETED`.
9. Rewards should use `badge.award` action only unless webhooks or scripts are explicitly requested.
10. Keep content short and deterministic.

### Validation Checklist

- [ ] `package.json` has all 5 required fields
- [ ] `entry` node exists on disk
- [ ] All nodes in `workflow.json` exist on disk
- [ ] Quiz nodes have at least one correct option
- [ ] No circular routes (unless intentional remediation loop)
- [ ] `COMPLETED` is the terminal state
- [ ] JSON files are valid JSON
- [ ] All paths use forward slashes
