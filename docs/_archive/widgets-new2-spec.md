# OpenEdu Widget Development Specification

## Phase 2 Core Widgets

Implement the following production-quality widgets.

These widgets extend the OpenEdu widget library and follow the existing WidgetDefinition architecture.

Every widget must support

✓ Observe Mode
✓ Interactive Mode (when applicable)
✓ Offline-first
✓ Responsive
✓ Keyboard navigation
✓ Screen readers
✓ RTL
✓ Localization
✓ Storybook
✓ JSON Schema
✓ Registry
✓ Analytics
✓ Reward Hooks
✓ AI Metadata

Do NOT introduce new architectural patterns.

Reuse existing widget infrastructure.

---

###########################################################
Widget 1
###########################################################

core.audio-player

Purpose

Play educational audio.

Learning Intent

Observe

Listen

Pronunciation

Storytelling

Language Learning

Music

Accessibility

Primary accessibility widget.

Must support captions and transcript.

---

Supported Modes

single

playlist

loop

segment

---

Config

audio

transcript

captions

title

description

duration

autoplay

loop

playbackRate

showTranscript

showControls

waveform

---

Observe

Simple playback.

---

Interactive

Bookmarks

Transcript highlighting

Playback speed

Repeat sentence

---

AI Metadata

language

speaker

accent

pronunciation

difficulty

---

###########################################################
Widget 2
###########################################################

core.video-player

Purpose

Educational video playback.

Learning Intent

Observe

Demonstration

Explanation

---

Config

video

poster

title

captions

chapters

transcript

startTime

endTime

showTranscript

allowFullscreen

---

Observe

Normal playback

---

Interactive

Chapter navigation

Transcript sync

Quiz timestamps

Bookmarks

---

Accessibility

Keyboard

Captions

Audio description

Transcript

Reduced motion

---

AI Metadata

learningObjectives

videoSummary

keyMoments

keywords

---

###########################################################
Widget 3
###########################################################

language.flashcard

Purpose

Vocabulary and memory practice.

Learning Intent

Recall

Revision

Memorization

Retrieval Practice

---

Modes

flip

multiple

spaced

---

Card

front

back

image

audio

hint

category

difficulty

---

Observe

Cards already flipped.

---

Interactive

Flip

Self-assess

Shuffle

Retry incorrect

---

Future Ready

Expose metadata for spaced repetition engine.

Do NOT implement scheduling.

---

Analytics

Correct

Incorrect

Flips

Review Time

Confidence

---

###########################################################
Widget 4
###########################################################

science.process-diagram

Purpose

Visual explanation of systems and processes.

Examples

Water Cycle

Food Chain

Digestive System

Photosynthesis

Computer Boot Process

---

Learning Intent

Observe

Understand

Process

---

Layouts

horizontal

vertical

cycle

radial

---

Nodes

title

description

image

icon

---

Connections

arrow

dashed

double

loop

---

Observe

Animation optional.

---

Interactive

Reveal next

Step-by-step

Learner predicts next step

---

Accessibility

Linear reading order

Keyboard navigation

Reduced motion

---

###########################################################
Widget 5
###########################################################

math.number-line

Purpose

Visual number reasoning.

---

Learning Intent

Understand

Estimate

Compare

Arithmetic

---

Modes

integers

decimals

fractions

negative

measurement

---

Config

min

max

step

target

markers

showLabels

showGrid

---

Observe

Number highlighted.

---

Interactive

Click

Drag

Estimate

Compare

---

Examples

Locate 3

Locate 1/2

Jump by 5

Negative Numbers

Fractions

---

Accessibility

Keyboard

Screen reader

High contrast

---

###########################################################
Widget 6
###########################################################

social.map

Purpose

Interactive educational maps.

---

Learning Intent

Explore

Identify

Geography

History

---

Supported Maps

World

India

State

District

Custom SVG

---

Config

map

regions

labels

legend

markers

zoom

projection

---

Each Region

id

name

description

color

tooltip

image

---

Observe

Highlighted regions

---

Interactive

Find state

Click country

Locate river

Historical map

---

Accessibility

Keyboard region navigation

Screen reader region labels

Zoom

High contrast

---

###########################################################
Shared Features
###########################################################

Every widget supports

interactive

hint

hints

retry

reset

fullscreen

print

theme

locale

analytics

reward

accessibility

---

###########################################################
AI Metadata
###########################################################

Each widget exposes

difficulty

bloomsLevel

estimatedMinutes

readingLevel

learningObjectives

commonMisconceptions

generationHints

semanticKeywords

exampleConfigs

---

###########################################################
Documentation
###########################################################

Generate

Purpose

Learning Intent

Examples

Observe Mode

Interactive Mode

Configuration

Accessibility

Analytics

Reward Hooks

AI Notes

Migration Notes

---

###########################################################
Testing
###########################################################

Unit Tests

Accessibility Tests

Keyboard Tests

Schema Tests

Snapshot Tests

Mobile Tests

Migration Tests

---

###########################################################
Deliverables
###########################################################

For each widget

✓ React Component

✓ JSON Schema

✓ WidgetDefinition

✓ Storybook

✓ Documentation

✓ Tests

✓ Registry Entry

✓ Example course-spec.json

✓ Example course-spec.md

✓ Compiler Integration

These widgets should match the implementation quality of the existing OpenEdu widget ecosystem and become reusable reference implementations for future widget development.
