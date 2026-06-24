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

## 8. Agentic AI Workflow

Open-Edu is designed to work hand-in-hand with AI agents. The CLI exposes machine-readable output, deterministic patch contracts, and a generation prompt so agents can inspect, create, and modify packages without parsing human-targeted text.

### 8.1 Getting the Schema Prompt

Before asking an AI to build a package, dump the full agent prompt with all schemas:

```bash
edu generate --prompt
```

This prints a complete, deterministic template containing:

- Package directory structure
- All Zod schema fields for `package.json`, `workflow.json`, `rewards.json`, and every node type
- Workflow routing patterns (linear, conditional, skill-based)
- Common mistakes and validation rules
- A fill-in-the-blanks template for quick generation

Pipe it directly into your conversation with an AI:

```bash
edu generate --prompt | pbcopy   # copy to clipboard (macOS)
edu generate --prompt | xclip    # copy to clipboard (Linux)
```

### 8.2 Quick Scaffolding from a Description

The fastest way to start is to describe your package in plain language:

```bash
edu generate --from-description "A JavaScript variables lesson with a quiz and remediation loop" ./my-lesson
```

The CLI will:

1. Extract a package ID and title from the description
2. Scaffold a complete directory with `package.json`, `workflow.json`, and starter nodes
3. Validate the result with `loadPackage()` and report any errors

Add `--force` to overwrite an existing directory.

### 8.3 Full Workflow: Idea → Validated Package

For complex packages, follow this iterative workflow:

#### Step 1: Get the prompt

```bash
edu generate --prompt > prompt.txt
```

Feed `prompt.txt` to your AI agent so it has the complete schema context.

#### Step 2: Generate the package from a description

Tell the AI what you want. Example prompt for the agent:

```
Create an Open-Edu package called "intro-to-variables" that teaches JavaScript variables.
It should have:
- A markdown lesson node (nodes/lesson.md) explaining let, const, var
- A quiz node (nodes/quiz.json) with 3 questions about variable scoping
- A reflection node (nodes/reflection.json) asking what they learned
- Linear workflow: lesson → quiz → reflection → COMPLETED
```

#### Step 3: Validate

```bash
edu validate ./my-package
```

If validation fails, feed the error output back to the AI:

```bash
edu validate ./my-package --json   # machine-readable errors
```

#### Step 4: Patch surgically

The `patch` command lets an AI make targeted edits without regenerating the entire package:

```bash
# Add a new quiz question
edu patch ./my-package --json - <<'EOF'
[
  { "op": "add", "path": "/options/-", "value": { "id": "d", "text": "block-scoped", "correct": true } }
]
EOF

# Replace the remediation content
edu patch ./my-package --json - <<'EOF'
[
  { "op": "replace", "path": "/0/content", "value": "# Let's review\n\nGo over scoping rules again." }
]
EOF
```

Each patch operation is validated atomically — if the result doesn't pass `loadPackage()`, all changes are rolled back. Use `--dry-run` to preview.

Supported patch operations: `add`, `remove`, `replace`, `upsert-node`, `remove-node`.

#### Step 5: Add rewards

```bash
edu patch ./my-package --json - <<'EOF'
[
  { "op": "add", "path": "/triggers/-", "value": {
    "onEvent": "workflow.complete",
    "rewards": [{ "action": "badge.award", "badge": "variables-complete" }]
  }}
]
EOF
```

### 8.4 Worked Example: Building a Remediation Package

Goal: Create a fractions lesson where low scorers loop through remediation.

**1. Scaffold**

```
edu generate --from-description "Fractions lesson with quiz and remediation" ./fractions
```

**2. Ask AI to fill in the content**

Prompt the agent with the generated `prompt.txt`. It produces:

```json
// nodes/quiz.json
{
  "type": "quiz",
  "question": "What is 1/4 + 1/4?",
  "options": [
    { "id": "a", "text": "1/4", "correct": false },
    { "id": "b", "text": "1/2", "correct": true },
    { "id": "c", "text": "1/8", "correct": false }
  ],
  "skills": ["fractions.addition"]
}
```

**3. Validate**

```bash
edu validate ./fractions --json
```

**4. Patch any issues**

```bash
edu patch ./fractions/package.json --json - <<'EOF'
[
  { "op": "replace", "path": "/author", "value": "AI Assistant" }
]
EOF
```

The complete package is now valid and runnable with the dev server.

### 8.5 AI Prompt Patterns

#### Simple Linear Lesson

```
Create an Open-Edu lesson package that teaches [TOPIC].
- One markdown node explaining the concept
- One quiz with [N] multiple-choice questions
- Linear workflow: lesson → quiz → COMPLETED
```

#### Conditional Branching

```
Create an Open-Edu package with conditional routing.
- Start with a quiz that branches:
  - Score >= 80% → advanced lesson node
  - Score < 80% → remediation lesson node
- The remediation node loops back to the quiz
- On passing, route to COMPLETED
```

#### Skill-Graph Dependencies

```
Create an Open-Edu package with skill-based progression.
- Skill "basics" is assessed by quiz-basics
- Skill "advanced" depends on "basics"
- Workflow checks skill mastery before unlocking advanced content
- Use the "skill:" prefix in routing conditions
```

#### Multi-Lesson Chain

```
Create a 3-lesson Open-Edu package on [COURSE_TOPIC].
- Part 1: markdown lesson + quiz
- Part 2: markdown lesson + reflection
- Part 3: exercise widget + final quiz
- Workflow chains them linearly with a badge reward on completion
```

### 8.6 Deterministic Generation Rules (for AI agents)

When generating an Open-Edu package, follow these rules:

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

### 8.7 Validation Checklist (for AI agents)

Before delivering a package, verify:

- [ ] `package.json` has all 5 required fields
- [ ] `entry` node exists on disk
- [ ] All nodes referenced in `workflow.json` exist on disk
- [ ] Quiz nodes have at least one correct option
- [ ] No circular routes (unless intentional remediation loop)
- [ ] `COMPLETED` is used for terminal states
- [ ] JSON files are valid JSON
- [ ] All paths use forward slashes

### 8.8 Tips for Effective AI Collaboration

- **Start with `--prompt`** — always give the AI the full schema prompt first. Without it, the AI may guess wrong field names or structures.
- **Use `--json` output** — all CLI commands accept `--json` for structured output that agents can parse reliably.
- **Iterate in small steps** — prefer `patch` with small operations over regenerating entire files.
- **Validate after every change** — run `edu validate` before committing to catch issues early.
- **Reference examples** — the `examples/` directory has 9 working packages covering linear, branching, remediation, skill-graph, and widget patterns. Point your AI to them as reference implementations.

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
