---
sidebar_position: 8
---

# Course Compiler

The `@open-edu/course-compiler` package compiles human/AI-generated Markdown specification files (`course-spec.md`) into fully validated, production-ready OpenEdu educational packages.

## Pipeline

```
course-spec.md
    │
    ▼
┌────────────────┐
│ Markdown Parser│  Remark/Unified AST + YAML frontmatter
├────────────────┤
│Semantic Parser │  AST → CourseModel (modules, lessons, quizzes, activities)
├────────────────┤
│   Validator    │  Duplicate IDs, missing fields, cross-references, dependency loops
├────────────────┤
│Plugin Pipeline │  Lifecycle hooks (beforeParse, afterAST, transformModel, etc.)
├────────────────┤
│Package Gen.    │  Single-module (package.json) or bundle (bundle.json) output
├────────────────┤
│Core Validation │  Validates output with @open-edu/core loadPackage/loadBundle
└────────────────┘
    │
    ▼
   package/ or bundle/
```

## Usage

```bash
# Basic compilation
edu compile ./course-spec.md --output ./my-course

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
- `### Activity:` headings define activities (reading, exercise, discussion, reflection, video)
- `### Quiz:` headings define quizzes with ordered lists for questions and unordered lists for options
- **`Objectives:`** (bold) followed by a list defines learning objectives
- **`Glossary:`** / **`References:`** support term:definition and link entries

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

| Hook              | When                          | Use Case                              |
| ----------------- | ----------------------------- | ------------------------------------- |
| `beforeParse`     | Before Markdown parsing       | Preprocess raw content                |
| `afterAST`        | After AST construction        | Inspect/modify the remark AST         |
| `transformModel`  | After semantic parsing        | Add custom fields to the CourseModel  |
| `beforeGenerate`  | Before file generation        | Inject diagnostics or modify the model |
| `afterGenerate`   | After files are written       | Post-processing or cleanup            |

## Diagnostics

The compiler collects diagnostics at every pipeline stage. Each diagnostic has:

- **severity**: `error` | `warning` | `info`
- **message**: Human-readable description
- **code**: Machine-readable identifier (e.g., `DUPLICATE_MODULE_ID`, `MISSING_OBJECTIVES`)
- **hint**: Optional suggestion for resolving the issue
