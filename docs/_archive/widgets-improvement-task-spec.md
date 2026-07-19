# OpenEdu Widget System v2

## Architecture Refactor & Enhancement Specification

You are the lead architect for the OpenEdu widget system.

Your goal is NOT to redesign the UI.

Your goal is to evolve the widget architecture into a scalable, accessible, AI-friendly plugin ecosystem while maintaining complete backwards compatibility with existing course-spec files.

This is an architectural refactor.

---

# Context

OpenEdu is an offline-first educational platform.

Core principles:

- Accessibility first
- AI-first authoring
- Offline-first
- Deterministic compilation
- Plugin architecture
- Long-term stability
- Extremely easy for AI to generate

The current widget system already works.

Do NOT rewrite it.

Instead extend it into a production-quality architecture.

---

# Primary Goals

Implement the following:

1. Learning-intent based widget registry
2. Common widget metadata
3. Widget capability system
4. Accessibility metadata
5. Analytics metadata
6. Reward metadata
7. AI generation metadata
8. Domain-based widget namespaces
9. Widget package architecture
10. Backward compatibility

---

# NON GOALS

Do NOT

- redesign existing widgets
- change widget behaviour
- break existing JSON
- break compiler output
- change runtime rendering

Existing packages should continue to compile unchanged.

---

# Part 1

Learning Intent Classification

Current widgets are grouped by implementation.

Instead expose learning categories.

Example

Learning

    Assess
    Practice
    Observe
    Compare
    Explore
    Create
    Reflect
    Apply

Each widget should belong to one or more learning intents.

Example

Matching

Learning Intent

Practice

Compare

Vocabulary

Categorization

Multiple Choice

Assess

Recall

Practice

Sequencing

Ordering

Process

Reasoning

Drag Drop

Categorization

Sorting

Classification

The registry should support multiple intents.

---

# Part 2

Widget Registry

Create a strongly typed registry.

Example

WidgetDefinition

id

name

description

version

domain

learningIntents

capabilities

accessibility

analytics

reward

ai

schema

renderer

validator

icon

keywords

status

deprecated

replacement

This registry becomes the single source of truth.

Compiler

Authoring UI

AI

Documentation

Toolbox

must all consume the same registry.

---

# Part 3

Widget Domains

Replace flat widget namespace

Instead of

open-edu.matching

use

core.matching

math.fraction

math.clock

math.measurement

language.fill-blank

language.reading

science.diagram

science.label

social.timeline

social.map

The compiler must continue supporting old widget IDs.

Provide alias mapping.

Example

open-edu.matching

↓

core.matching

---

# Part 4

Widget Capabilities

Every widget should declare capabilities.

Example

supportsObserveMode

supportsKeyboard

supportsScreenReader

supportsHints

supportsRetry

supportsScoring

supportsVoice

supportsOffline

supportsPrinting

supportsTouch

supportsMouse

supportsAnalytics

supportsRewards

supportsAccessibility

supportsAnimation

supportsLocalization

These are metadata only.

Do NOT implement new functionality unless already supported.

---

# Part 5

Accessibility Metadata

Every widget definition must include

accessibility

highContrast

keyboardOnly

screenReader

tts

captions

signLanguageReady

easyLanguage

reducedMotion

audioDescription

focusManagement

ariaSupport

This does NOT automatically implement features.

It documents support.

Future tooling can validate accessibility.

---

# Part 6

Analytics Metadata

Every widget should optionally expose

analytics

trackAttempts

trackHints

trackRetries

trackMistakes

trackCompletionTime

trackSuccessRate

trackConfidence

trackInteractions

Do not implement analytics backend.

Only metadata.

---

# Part 7

Reward Integration

Every widget should expose optional reward hooks.

completionXP

achievement

badge

celebrationAnimation

collectibleCard

confetti

positiveMessage

Reward engine decides whether to use them.

Widgets only expose capability.

---

# Part 8

AI Metadata

Every widget definition should include metadata useful for LLMs.

difficulty

estimatedMinutes

bloomsLevel

cognitiveLoad

recommendedAge

readingLevel

subjectTags

learningObjectives

commonMisconceptions

authoringPrompt

generationHints

exampleConfigs

This metadata will later power AI course generation.

---

# Part 9

Foundation Widgets

Add registry definitions for future widgets.

Implementation is NOT required.

Only metadata.

Required additions

core.callout

core.image-compare

core.hotspot

core.timeline

science.label-diagram

science.image-label

These should appear in registry.

Stub renderer is acceptable.

---

# Part 10

Merge Duplicate Widgets

Current

multiple-choice

multiple-choice-practice

Introduce

core.multiple-choice

Modes

quiz

practice

Compiler must still accept both legacy IDs.

---

# Part 11

Package Structure

Refactor packages.

Example

packages

widgets-core

widgets-math

widgets-language

widgets-science

widgets-social

widgets-shared

widget-registry

widget-types

widget-utils

Compiler should dynamically discover widgets.

Avoid hardcoded imports.

---

# Part 12

Registry Driven Documentation

Generate widget documentation directly from registry.

The registry becomes the documentation source.

No duplicated documentation.

Generate

Widget Catalog

Capabilities

Schema

Examples

Accessibility

Learning Intent

AI Notes

---

# Part 13

Authoring Experience

Expose searchable metadata.

Search by

learning goal

subject

grade

difficulty

interaction type

offline support

accessibility

AI can discover widgets using semantic search.

---

# Part 14

Validation

Extend validation.

Validate

capabilities

accessibility metadata

AI metadata

reward metadata

deprecated widget IDs

missing examples

missing schema

duplicate aliases

---

# Part 15

Migration Layer

Provide migration utilities.

Input

open-edu.matching

Output

core.matching

Provide automatic migration.

Never break existing packages.

---

# Part 16

Future Plugin API

Design registry for external plugins.

Plugin should only provide

WidgetDefinition

Renderer

Validator

Schema

Assets

The compiler should auto-register plugins.

No code changes required.

---

# Deliverables

Produce

1.  Architecture document

Widget Architecture v2

2.

Migration guide

3.

Registry interfaces

4.

TypeScript types

5.

Package structure

6.

Registry implementation

7.

Example widget definitions

8.

Updated compiler loading flow

9.

Documentation generation flow

10.

Migration compatibility layer

---

# Success Criteria

The new architecture must

✓ compile existing courses unchanged

✓ require zero changes to existing widgets

✓ support future widgets without compiler modification

✓ support AI-generated content

✓ support plugin ecosystem

✓ support offline-first operation

✓ support accessibility validation

✓ support reward engine integration

✓ support analytics integration

✓ provide a single source of truth for widget metadata

Most importantly:

The widget registry should become the heart of the OpenEdu ecosystem, from which the compiler, authoring tools, AI assistants, documentation, validation, accessibility tooling, and plugin system all derive their knowledge.
