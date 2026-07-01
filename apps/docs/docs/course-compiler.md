---
sidebar_position: 8
---

# Course Compiler

The `@open-edu/course-compiler` package compiles human/AI-generated course specification files into fully validated, production-ready OpenEdu educational packages. It supports both **Markdown** (`course-spec.md`) and **JSON** (`course-spec.json`) input formats, auto-detected by file extension.

## Pipeline

```
course-spec.md / course-spec.json
    │
    ▼
┌───────────────────────┐
│ Input Parser          │  Markdown (Remark/Unified AST + YAML frontmatter)
│                       │  or JSON (Zod-validated CourseModel structure)
├───────────────────────┤
│ Semantic Parser       │  AST → CourseModel (modules, lessons, quizzes, activities)
├───────────────────────┤
│    Validator          │  Duplicate IDs, missing fields, cross-references, dependency loops
├───────────────────────┤
│ Plugin Pipeline       │  Lifecycle hooks (beforeParse, afterAST, transformModel, etc.)
├───────────────────────┤
│ Package Generator     │  Single-module (package.json) or bundle (bundle.json) output
│                       │  Emits widget JSON nodes with Zod-validated config
├───────────────────────┤
│ Core Validation       │  Validates output with @open-edu/core loadPackage/loadBundle
└───────────────────────┘
    │
    ▼
   package/ or bundle/
```

## Usage

```bash
# Basic compilation (auto-detects .md vs .json)
edu compile ./course-spec.md --output ./my-course
edu compile ./course-spec.json --output ./my-course

# Validate output against @open-edu/core schemas
edu compile ./course-spec.md --output ./my-course --validate

# Verbose diagnostics
edu compile ./course-spec.md --verbose
```

## Course Spec Format

A `course-spec.md` file uses Markdown headings to define structure:

```markdown
---
title: Introduction to Algebra
description: Learn the basics of algebra
author: OpenEdu
version: 1.0.0
---

# Module 1: Algebra Basics

This module covers the foundation of algebra.

## Lesson 1.1: Variables

**Objectives:**

- Understand what a variable represents
- Identify variables in expressions

Variables are symbols that represent quantities in mathematics.

### Activity: Reading

Read the chapter on variables.

### Quiz: Variables Quiz

1. What is a variable?

- [x] A symbol for a quantity
- [ ] A type of number
- [ ] An equation
```

### Structure Rules

- `#` headings define **modules** (one module = single package; multiple = bundle)
- `##` headings define **lessons** within modules
- `### Activity:` headings define activities (reading, exercise, discussion, reflection, video, widget)
- `### Quiz:` headings define quizzes with ordered lists for questions and unordered lists for options
- **`Objectives:`** (bold) followed by a list defines learning objectives
- **`Glossary:`** / **`References:`** support term:definition and link entries

## JSON Input Format

A `course-spec.json` file uses the same `CourseModel` schema as the compiler's internal representation:

```json
{
  "title": "Introduction to Algebra",
  "description": "Learn the basics of algebra",
  "author": "OpenEdu",
  "version": "1.0.0",
  "modules": [
    {
      "id": "algebra-basics",
      "title": "Algebra Basics",
      "description": "The foundation of algebra.",
      "lessons": [
        {
          "id": "variables",
          "title": "Variables",
          "objectives": [
            "Understand what a variable represents",
            "Identify variables in expressions"
          ],
          "content": "Variables are symbols that represent quantities in mathematics.",
          "activities": [
            { "type": "reading", "title": "Reading", "content": "Read the chapter on variables." },
            {
              "type": "widget",
              "title": "Matching Exercise",
              "widgetId": "open-edu.matching",
              "config": {
                "pairs": [
                  { "term": "Variable", "definition": "A symbol for a quantity" },
                  { "term": "Constant", "definition": "A fixed value" }
                ]
              }
            }
          ],
          "quiz": {
            "title": "Variables Quiz",
            "questions": [
              {
                "text": "What is a variable?",
                "options": [
                  { "text": "A symbol for a quantity", "correct": true },
                  { "text": "A type of number", "correct": false },
                  { "text": "An equation", "correct": false }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
}
```

JSON input is auto-detected by the `.json` file extension. Widget activities (`type: "widget"`) are emitted as first-class widget JSON nodes in the output package, with their config validated against the widget's own Zod schema.

## Output

For a single module, the compiler produces:

```
output/
├── package.json        # Manifest with id, title, version, author, entry
├── workflow.json       # Linear routing through nodes
├── nodes/
│   ├── lesson-1.md     # Lesson content with objectives
│   └── quiz-1.json     # Quiz data with questions and options
└── assets/             # Generated SVG placeholders for missing assets
```

For multiple modules, it produces a bundle:

```
output/
├── bundle.json         # Bundle manifest with module references
└── modules/
    ├── module-1/       # Standard package
    │   ├── package.json
    │   ├── workflow.json
    │   └── nodes/
    └── module-2/
        └── ...
```

## Plugin System

Plugins can hook into the compilation pipeline at 5 lifecycle stages:

| Hook             | When                    | Use Case                               |
| ---------------- | ----------------------- | -------------------------------------- |
| `beforeParse`    | Before Markdown parsing | Preprocess raw content                 |
| `afterAST`       | After AST construction  | Inspect/modify the remark AST          |
| `transformModel` | After semantic parsing  | Add custom fields to the CourseModel   |
| `beforeGenerate` | Before file generation  | Inject diagnostics or modify the model |
| `afterGenerate`  | After files are written | Post-processing or cleanup             |

## Diagnostics

The compiler collects diagnostics at every pipeline stage. Each diagnostic has:

- **severity**: `error` | `warning` | `info`
- **message**: Human-readable description
- **code**: Machine-readable identifier (e.g., `DUPLICATE_MODULE_ID`, `MISSING_OBJECTIVES`)
- **hint**: Optional suggestion for resolving the issue
