---
sidebar_position: 1
---

# CLI Overview

The `edu` CLI provides development tools for Open-Edu packages. All commands support `--json` for machine-readable output.

## Commands

### Dev

Start a development server for a package:

```bash
edu dev ./my-package
```

### Validate

Validate a package structure, schemas, and optional integrity:

```bash
edu validate ./my-package
edu validate --verify-integrity ./my-package
```

### Build

Build a package for distribution with manifest metadata:

```bash
edu build ./my-package -o ./dist
```

Produces a build directory with an `open-edu-build.json` manifest containing file hashes, timestamps, and entry point.

### Package

Create a distributable archive:

```bash
edu package ./my-package
```

Produces `<id>-<version>.tar.gz` with deterministic content, excluding `dist`, `node_modules`, and `.git`.

### Create

Scaffold a new package directory:

```bash
edu create ./my-lesson --id my-lesson --title "My Lesson" --author "Me"
```

Generates a valid `package.json`, `workflow.json`, `nodes/intro.md`, and `validate.test.ts`. Refuses to write into non-empty directories unless `--force` is passed.

### Report

Summarize telemetry JSONL files:

```bash
edu report ./telemetry.jsonl
edu report ./telemetry.jsonl --json
```

Displays total events, sessions, node completions, and average quiz score.

### Lint-Content

Run content quality checks beyond schema validation:

```bash
edu lint-content ./my-package
edu lint-content ./my-package --max-warnings 0
```

Checks for: empty headings, quizzes with all correct answers, short reflection prompts, unreachable workflow nodes, and more.

### Patch

Apply surgical, validated JSON patches to existing packages:

```bash
edu patch ./my-package ./patch-file.json
edu patch ./my-package ./patch-file.json --dry-run
```

Patch operations: `add`, `remove`, `replace`, `upsert-node`, `remove-node`. Runs validation after applying — rejects invalid patches without modifying files.

### Generate

Output agent-ready prompts and generate packages from descriptions:

```bash
edu generate --prompt
edu generate --from-description "Create a JavaScript variables lesson"
```

`--prompt` outputs a structured template for AI agents. `--from-description` scaffolds a package with basic content generation.

### Widget Create

Scaffold a publishable widget package:

```bash
edu widget create ./my-widget --id my-widget-id --title "My Widget"
```

Generates a complete widget package with `package.json`, `src/index.tsx`, `src/index.test.tsx`, and `vitest.config.ts`.
