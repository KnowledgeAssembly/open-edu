# OpenEdu Widget Specification

## social.map (SVG Engine)

You are implementing the OpenEdu SVG-based Interactive Map Framework.

This is NOT simply a map viewer.

This is a reusable SVG interaction engine capable of powering:

- Geography maps
- Historical maps
- Science diagrams
- Biology illustrations
- Floor plans
- Infographics
- Educational posters
- Museum guides
- Interactive textbooks

The map widget is the first consumer.

The SVG engine is the actual product.

---

# Primary Goals

Implement

social.map

built on top of

core.svg-explorer

The SVG engine must be generic.

Map-specific behavior should be a plugin layer.

---

# Architecture

Course Spec

↓

social.map

↓

core.svg-explorer

↓

SVG Renderer

↓

Interaction Layer

↓

Analytics

↓

Accessibility

↓

Reward Engine

---

# Core Design Principles

Offline First

SVG Native

Accessibility First

Touch Friendly

Keyboard Friendly

AI Friendly

Theme Aware

Responsive

Declarative

No GIS dependency

No Leaflet

No Mapbox

No OpenLayers

No Google Maps

Everything should work from a local SVG file.

---

# Widget Registry

id

social.map

domain

social

category

geography

learningIntent

explore

identify

compare

locate

analyze

---

# Supported Use Cases

Find a State

Find a Country

Identify Rivers

Locate Mountains

Match Capitals

Color Regions

Historical Empires

Trade Routes

Population Maps

Climate Maps

Election Maps

District Maps

Custom Educational Maps

---

# Data Model

Map configuration is fully declarative.

Example

{
"widget": "social.map",

"config": {

    "map": "india-states",

    "interactive": true,

    "mode": "identify",

    "regions": [

      {
        "id": "odisha",

        "name": "Odisha",

        "description": "State on eastern coast",

        "capital": "Bhubaneswar",

        "aliases": ["OR"],

        "metadata": {
          "language": "Odia"
        }
      }

    ]

}
}

---

# SVG Requirements

The engine must support SVG files where regions are identified by IDs.

Example

<path id="odisha"/>

<path id="karnataka"/>

<path id="maharashtra"/>

IDs become interaction targets.

Do not rely on SVG structure.

Only IDs.

---

# Engine Features

#################################################
Selection
#################################################

Single Select

Multi Select

Region Highlight

Region Focus

Region Hover

Region Active

Region Disabled

Programmatic Selection

---

#################################################
Labels
#################################################

Auto Labels

Manual Labels

Leader Lines

Tooltip Labels

Persistent Labels

Dynamic Labels

Zoom Labels

Hide Labels

---

#################################################
Tooltips
#################################################

Region Name

Description

Custom HTML

Metadata

Images

Audio

Video

Multiple Languages

---

#################################################
Zoom
#################################################

Fit To Screen

Zoom In

Zoom Out

Reset

Pinch Zoom

Mouse Wheel

Keyboard Zoom

Region Zoom

Animated Zoom

Reduced Motion Support

---

#################################################
Pan
#################################################

Mouse Drag

Touch Drag

Keyboard Pan

Programmatic Pan

---

#################################################
Layers
#################################################

Political

Physical

Population

Climate

Historical

Custom Layers

Layer Toggle

Layer Legend

---

# Interaction Modes

#################################################
Mode 1
#################################################

observe

Learner studies map.

Regions already highlighted.

No scoring.

No validation.

---

#################################################
Mode 2
#################################################

identify

Question

"Find Odisha"

Learner clicks.

Validate.

Feedback.

---

#################################################
Mode 3
#################################################

explore

Click region.

Information panel opens.

No right or wrong.

---

#################################################
Mode 4
#################################################

compare

Compare multiple regions.

Highlight differences.

---

#################################################
Mode 5
#################################################

label

Drag labels to regions.

Map labeling activity.

---

#################################################
Mode 6
#################################################

quiz

Multiple questions.

Track score.

Completion state.

---

# Accessibility

WCAG AA minimum.

Must support

Keyboard Navigation

Screen Reader

High Contrast

Reduced Motion

Focus Indicators

Touch Targets

Zoom

Text Scaling

ARIA Labels

Semantic Regions

Screen reader example

"Odisha. State of India. Capital Bhubaneswar."

---

# Keyboard Support

Tab

Arrow Keys

Enter

Space

Escape

Plus

Minus

Home

End

Must be fully usable without mouse.

---

# Screen Reader Support

Each SVG region exposed as

button

or

interactive region

with

aria-label

aria-description

Support

NVDA

VoiceOver

TalkBack

---

# Visual States

Default

Hover

Focused

Selected

Correct

Incorrect

Disabled

Visited

Theme controlled.

No hardcoded colors.

---

# Analytics

Emit

MapOpened

RegionViewed

RegionSelected

ZoomChanged

LayerChanged

QuizStarted

QuizCompleted

HintUsed

AttemptFailed

AttemptSucceeded

---

# Reward Hooks

Completion

Perfect Score

Exploration Achievement

Geography Master

History Explorer

Map Expert

No reward logic.

Only events.

---

# AI Metadata

Expose

Difficulty

Grade Level

Learning Objectives

Bloom Level

Estimated Time

Keywords

Common Misconceptions

Region Metadata

Subject Tags

Generation Hints

---

# Map Package Format

Maps should be installable packages.

Example

@open-edu/maps-india

Contains

india.svg

metadata.json

search-index.json

thumbnail.png

manifest.json

---

# Manifest Format

{
"id":"india",

"title":"India States",

"version":"1.0.0",

"regions":28,

"languages":[
"en",
"hi"
]
}

---

# Built-in Maps

Provide reference implementations.

world

india

india-districts

asia

continents

solar-system

human-body

plant-diagram

These demonstrate the SVG engine.

---

# Asset Pipeline

Implement build tooling.

Input

GeoJSON

↓

Simplify

↓

Convert

↓

SVG

↓

SVGO

↓

Generate Metadata

↓

Package

Output

OpenEdu Map Package

---

# Performance

Support

1000+ SVG regions

60fps zoom

Lazy metadata loading

Virtualized labels

Optimized hit testing

No GIS libraries.

---

# Deliverables

1. core.svg-explorer

2. social.map

3. SVG interaction engine

4. Map package specification

5. Asset pipeline

6. TypeScript interfaces

7. JSON schemas

8. Accessibility implementation

9. Storybook examples

10. Unit tests

11. Documentation

12. Example maps

13. Compiler integration

14. AI generation metadata

The SVG engine should become a core OpenEdu platform capability that can be reused by geography, science, history, diagrams, infographics, and future educational experiences.
