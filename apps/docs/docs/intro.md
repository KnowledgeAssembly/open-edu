---
sidebar_position: 1
---

# Open-Edu Framework

**An open runtime for educational experiences** that separates content from delivery platforms. Learning packages (Markdown + JSON) are loaded, validated, and rendered through a configurable runtime with built-in accessibility, telemetry, skill tracking, and rewards.

## Core Idea

Educational content should be portable. A learning package should run anywhere, regardless of the rendering engine, analytics provider, reward system, or hosting environment.

Authors create learning experiences using simple, structured, human-readable files. The framework runtime handles rendering, accessibility, navigation, telemetry, skill tracking, and reward integration.

## Design Principles

### Content First

Learning experiences are defined using open formats — Markdown and JSON — rather than proprietary editors. Every package remains human readable, version controllable, AI generatable, and platform independent.

### Agentic Authoring

AI-native creation is a foundational assumption. The framework uses deterministic schemas, predictable structures, and explicit contracts so both humans and AI systems can reliably create, modify, and validate educational content.

### Accessibility by Design

Accessibility is a responsibility of the runtime, not the content author. The framework enforces semantic rendering, keyboard navigation, screen reader compatibility, focus management, and predictable interaction patterns.

### Learning Observability

Learning interactions are captured as structured telemetry streams. The framework enables insight into time spent, interaction patterns, assessment performance, learning bottlenecks, and skill mastery.

### Adaptive Learning Through Data

Learning pathways adapt to learner behavior. Packages define progression rules based on mastery, performance, and engagement rather than static linear sequences.

### Open Extensibility

An extensible widget architecture allows specialized learning experiences without modifying the core system — coding environments, mathematics visualizations, simulations, and more.

## Quick Start

```bash
git clone https://github.com/spatnaik1982/open-edu
cd open-edu
pnpm install
pnpm build
pnpm --filter @open-edu/cli build
node packages/cli/dist/index.js dev ./examples/hello-world
```

Or install the CLI globally:

```bash
pnpm --filter @open-edu/cli build
node packages/cli/dist/index.js --help
```

## What's Next?

- [Architecture](./architecture) — How the framework is built
- [Package Format](./package-format) — Structure of educational packages
- [Package Authoring Guide](./package-authoring) — How to create packages
- [CLI Reference](./cli/overview) — All CLI commands
- [Widget SDK](./widgets/overview) — Building custom interactive widgets
