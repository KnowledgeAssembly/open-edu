# IBM Carbon Adoption Plan

## Goal

Adopt IBM Carbon Design System as the foundational design language for OpenEdu while preserving OpenEdu's own visual identity.

Carbon should provide:

- Accessibility
- Design principles
- Interaction patterns
- Component architecture
- Design tokens
- Layout guidelines

OpenEdu should define:

- Brand identity
- Theme system
- Educational components
- AI interaction patterns
- Learning workflows

---

# Overall Strategy

DO NOT replace the current UI in one large refactor.

Instead, migrate incrementally.

Each phase should produce a working application.

---

# Phase 1 — Study & Audit

## Objective

Understand how the current frontend maps to Carbon.

### Tasks

- Study IBM Carbon Design System
- Study Carbon accessibility guidelines
- Study Carbon design tokens
- Study Carbon layout principles
- Study Carbon spacing system
- Study Carbon typography

Then audit the current project.

Produce:

- Current component inventory
- Missing components
- Duplicate components
- Accessibility gaps
- Theme inconsistencies

Deliverable:

```
docs/ui/component-audit.md
```

---

# Phase 2 — Design Tokens

## Objective

Introduce Carbon-inspired design tokens.

Do NOT redesign components yet.

Create

```
packages/design-system/
```

Structure

```
tokens/

colors.ts

spacing.ts

typography.ts

radius.ts

elevation.ts

motion.ts

breakpoints.ts

z-index.ts
```

Rules

Never hardcode:

- colors
- spacing
- radius
- shadows

Everything must consume tokens.

---

# Phase 3 — Theme Engine

Objective:

Build theme infrastructure before components.

Support:

- Light
- Dark

Future ready:

- Zen
- Forest
- High Focus

All themes use identical semantic tokens.

Example

background

surface

surfaceRaised

border

textPrimary

textSecondary

accent

success

warning

danger

No component should know which theme is active.

---

# Phase 4 — Typography

Replace current typography with Carbon-inspired typography.

Maintain OpenEdu branding.

Deliver:

Heading scale

Body scale

Caption scale

Code typography

Reading width

Line height

Reading optimized spacing

---

# Phase 5 — Layout System

Implement Carbon layout concepts.

Create reusable layouts.

Examples

App Layout

Three Panel Layout

Course Viewer Layout

Split View

Settings Layout

Dashboard Layout

Never build page-specific layouts again.

---

# Phase 6 — Primitive Components

Build the primitive component library.

Examples

Button

Input

Textarea

Checkbox

Radio

Select

Tabs

Accordion

Dialog

Popover

Tooltip

Menu

Drawer

Breadcrumb

Badge

Tag

Card

Skeleton

Spinner

Empty State

Progress

Notification

These should be generic.

---

# Phase 7 — Navigation

Implement navigation system.

Sidebar

Top Navigation

Breadcrumbs

Command Palette

Context Menu

Search

Mobile Navigation

Keyboard Navigation

---

# Phase 8 — Educational Components

Now build OpenEdu-specific components.

Examples

Lesson

Module

Concept Card

Definition Block

Example Block

Exercise

Quiz

Flashcard

Hint

Reflection

Summary

AI Explanation

Knowledge Graph Node

Learning Objective

Prerequisite

Progress Timeline

Course Card

These belong ONLY to OpenEdu.

---

# Phase 9 — AI Components

Build reusable AI UI.

AI Chat

Tutor Message

Thinking Indicator

Citation

Reference Card

Suggested Questions

Explain Button

Simplify Button

Generate Example

Generate Quiz

Generate Flashcards

Conversation History

---

# Phase 10 — Accessibility

Review every component.

Checklist

Keyboard navigation

Screen reader labels

ARIA

Contrast

Focus indicators

Reduced motion

Autism mode compatibility

High contrast compatibility

Reading ruler support

Large text support

No component merges until accessibility review passes.

---

# Phase 11 — Documentation

Every component must include

Purpose

Props

Variants

Accessibility notes

Examples

Do

Don't

Theme support

---

# Agent Workflow

For every new component:

Step 1

Check if Carbon already has an equivalent.

Step 2

Reuse Carbon interaction patterns.

Step 3

Adapt styling to OpenEdu.

Step 4

Implement using project architecture.

Step 5

Verify accessibility.

Step 6

Verify Light/Dark compatibility.

Step 7

Document component.

---

# Rules for AI Agents

Never copy IBM branding.

Never copy IBM colors.

Never copy IBM icons.

Never hardcode colors.

Never hardcode spacing.

Never bypass design tokens.

Never create duplicate components.

Always reuse existing primitives.

Always support theming.

Always support keyboard navigation.

Always support screen readers.

Always document every component.

---

# Definition of Done

A component is complete only if:

✓ Uses design tokens

✓ Supports themes

✓ Accessible

✓ Responsive

✓ Keyboard accessible

✓ Screen reader tested

✓ Documented

✓ Reusable

✓ No duplicated functionality

✓ Compatible with OpenEdu architecture

# Important

Introduce a dedicated package:

packages/
├── design-system/
│ ├── tokens/
│ ├── primitives/
│ ├── patterns/
│ ├── learning/
│ ├── ai/
│ ├── hooks/
│ ├── icons/
│ └── index.ts

This becomes the single source of truth for all UI. Every application in your monorepo—Learner App, Authoring Studio, Admin, and future apps—imports components from packages/design-system rather than implementing their own. That fits well with your current monorepo architecture and keeps the design system independent, reusable, and easy to evolve.
