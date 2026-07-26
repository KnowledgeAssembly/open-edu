# CLI Skills

Skills that extend the Open-Edu CLI with agent-ready prompts and workflows.

## `course-spec-generator`

**File:** `course-spec-generator.skill.md`

A thin compatibility reference for the `edu generate --prompt` command. Contains the minimal JSON format specification, CLI usage, activity types, and pedagogical steps needed to produce a compiler-compatible `course-spec.json`.

**When to use:** Quick reference when an agent needs the course spec format but does not need full validation, quality checks, or package compilation.

## `openedu-course-authoring` (Portable Skill)

**Location:** `skills/openedu-course-authoring/SKILL.md`

The full-featured course authoring skill. Use this for complete workflows.

### Installation

Copy the skill directory to your agent's skills directory:

```bash
cp -r skills/openedu-course-authoring ~/.agents/skills/openedu-course-authoring
```

### How Repository Mode is Detected

The skill's `scripts/discover-openedu.mjs` walks upward from the working directory looking for `pnpm-workspace.yaml`. If found, it detects available capabilities (compiler, CLI, widget catalog, pipeline, examples) and exposes the correct commands.

### Portable Mode vs Repository Mode

| Feature                     | Portable Mode | Repository Mode |
| --------------------------- | ------------- | --------------- |
| Generate `course-spec.json` | Yes           | Yes             |
| Structural validation       | Yes           | Yes             |
| Quality report              | Yes           | Yes             |
| Compiler validation         | No            | Yes             |
| Widget catalog validation   | No            | Yes             |
| Package compilation         | No            | Yes             |
| Package validation          | No            | Yes             |
| Content linting             | No            | Yes             |
| PDF pipeline integration    | No            | Yes             |
| Dev server preview          | No            | Yes (suggested) |

### Relationship to CLI Prompt

- `course-spec-generator.skill.md` — minimal reference used by `edu generate --prompt`
- `openedu-course-authoring` — full authoring skill with discovery, validation, compilation

When `--prompt` is used, the CLI outputs the content of `course-spec-generator.skill.md` as the agent context. For interactive authoring, prefer the portable skill.
