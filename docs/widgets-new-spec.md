# OpenEdu Widget Development Specification

## Implement Experimental Widgets

You are implementing production-quality widgets for the OpenEdu Widget Framework.

These widgets are currently registered as experimental stubs.

Your task is to fully implement them while following the existing widget architecture.

The implementation should become the reference standard for future widget development.

---

# Widgets

Implement

core.callout

core.image-compare

core.hotspot

core.timeline

science.label-diagram

science.image-label

---

# General Requirements

Every widget must support

✓ Observe Mode

✓ Interactive Mode

✓ Offline-first

✓ Keyboard navigation

✓ Screen readers

✓ Touch devices

✓ Mouse

✓ Responsive layout

✓ Light & Dark themes

✓ RTL support

✓ Localization

✓ Accessibility metadata

✓ Analytics hooks

✓ Reward hooks

✓ AI metadata

✓ JSON schema validation

✓ Storybook examples

✓ Unit tests

✓ Compiler integration

✓ Documentation generation

---

Every widget must expose

id

title

description

icon

category

learningIntent

difficulty

estimatedMinutes

keywords

schema

exampleConfig

capabilities

accessibility

analytics

reward

---

# Common Widget Interface

All widgets implement

WidgetDefinition

WidgetRenderer

WidgetValidator

WidgetSchema

ExampleConfig

MigrationAlias

---

# Observe Mode

When

interactive = false

the learner should NOT solve anything.

Instead

• answers are pre-displayed

• interaction disabled

• learner simply studies

This must be consistent across all widgets.

---

# Interactive Mode

interactive = true

Learner completes activity.

Immediate feedback.

Retry support.

Hints.

Positive completion.

---

######################################################
Widget 1
######################################################

core.callout

Purpose

Highlight important information.

Learning Intent

Observe

Remember

Reflect

Explain

Support

Supported Types

note

tip

warning

important

definition

example

fun-fact

quote

success

question

Example

{
"widget":"core.callout",

"config":{

      "type":"tip",

      "title":"Did you know?",

      "content":"Plants make food using sunlight.",

      "icon":"🌿"

}

}

Config

type

title

content

icon

collapsible

defaultExpanded

colorVariant

Accessibility

Proper ARIA role

Icons hidden from screen readers

Collapsible keyboard support

---

######################################################
Widget 2
######################################################

core.image-compare

Purpose

Compare two images.

Learning Intent

Observe

Compare

Analyze

Supported Modes

slider

side-by-side

overlay

before-after

Example

Left

Healthy Leaf

Right

Diseased Leaf

Config

leftImage

rightImage

leftLabel

rightLabel

mode

caption

altText

showLabels

sliderPosition

Accessibility

Keyboard slider

Image descriptions

Screen reader support

Observe Mode

Slider locked

Interactive

Learner moves slider.

---

######################################################
Widget 3
######################################################

core.hotspot

Purpose

Learner identifies regions inside an image.

Learning Intent

Observe

Identify

Explore

Examples

India Map

Human Body

Plant

Solar System

Machine Parts

Config

image

altText

hotspots[]

Each hotspot

id

x

y

radius

label

correct

description

hint

Modes

single

multiple

Observe

Correct regions highlighted

Interactive

Learner taps image

Feedback after selection

Accessibility

Keyboard navigation between hotspots

Screen reader announces hotspot

---

######################################################
Widget 4
######################################################

core.timeline

Purpose

Display chronological information.

Learning Intent

Sequence

History

Process

Story

Lifecycle

Supported Layout

horizontal

vertical

compact

Modes

observe

interactive

Example

Water Cycle

Evaporation

↓

Condensation

↓

Rain

↓

Collection

Config

events[]

title

date

icon

description

image

layout

showDates

showImages

Interactive

Learner arranges events

Observe

Correct order shown

Accessibility

Keyboard navigation

Logical reading order

---

######################################################
Widget 5
######################################################

science.label-diagram

Purpose

Drag labels onto a scientific illustration.

Learning Intent

Identify

Recall

Anatomy

Science

Examples

Plant

Heart

Eye

Flower

Animal Cell

Map

Config

image

labels[]

Each label

id

text

target

hint

description

Observe

Labels already attached

Interactive

Learner positions labels

Accessibility

Keyboard assignment

Screen reader descriptions

High contrast markers

---

######################################################
Widget 6
######################################################

science.image-label

Purpose

Clickable educational image.

Unlike label-diagram,

labels remain fixed.

Learner explores.

Learning Intent

Explore

Observe

Discover

Example

Solar System

Click Mars

↓

Information card opens.

Config

image

regions[]

Each region

id

title

description

image

audio

video

tooltip

Observe

Explorer mode

Interactive

Quiz mode

Accessibility

Keyboard focus

Screen reader labels

Zoom support

---

# Shared Capabilities

Every widget should support

Hints

Retry

Reset

Fullscreen

Printing

Localization

Reduced Motion

High Contrast

Analytics

Rewards

AI Generation

---

# AI Metadata

Each widget exposes

recommendedGrades

difficulty

learningObjectives

bloomsLevel

estimatedMinutes

commonMisconceptions

generationPrompt

exampleConfigs

semanticKeywords

---

# Analytics

Widgets emit

Started

Completed

Retry

Hint Used

Success

Failure

Time Spent

Interaction Count

No analytics backend.

Only event interface.

---

# Rewards

Widgets emit

Completion

Perfect Score

First Attempt

Persistence

Reward engine decides what to do.

---

# Storybook

Every widget should include

Observe Example

Interactive Example

Accessibility Example

Mobile Example

Dark Theme

Large Text

RTL

---

# Testing

Unit Tests

Accessibility Tests

Keyboard Tests

Responsive Tests

Schema Validation

Snapshot Tests

Migration Tests

---

# Documentation

Generate

Purpose

Learning Intent

When To Use

When NOT To Use

Configuration

Examples

Accessibility

Observe Mode

Interactive Mode

AI Generation Notes

Migration Notes

---

# Deliverables

For each widget produce

✓ React Component

✓ JSON Schema

✓ Registry Entry

✓ Documentation

✓ Storybook Stories

✓ Unit Tests

✓ Accessibility Tests

✓ Example course-spec.json

✓ Example course-spec.md

✓ Compiler Integration

No placeholder implementations.

The widgets should be production-ready and serve as canonical examples for all future OpenEdu widgets.
