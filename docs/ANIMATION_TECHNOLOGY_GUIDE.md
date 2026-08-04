# OpenEdu Animation Technology Guide

**Version:** 1.0 (MVP)

---

# Purpose

This document describes **when to use CSS, SVG, dotLottie, Canvas, and WebGPU** within OpenEdu.

The goal is to ensure animations remain:

- Simple
- Consistent
- Offline-first
- Accessible
- Easy for AI to generate
- Easy for course authors to understand

---

# Guiding Principle

> **Choose the technology based on the content, not the animation.**

Animations should communicate educational meaning rather than showcase visual effects.

---

# Technology Selection Flow

```text
                What are you animating?
                         │
        ┌────────────────┴────────────────┐
        │                                 │
     UI / Text                      Educational Graphic
        │                                 │
        ▼                                 ▼
   CSS + Motion                        SVG
        │
        │
        ├──────────────┐
        │              │
        ▼              ▼
 Decorative      Runtime Simulation
 Character              │
        │               ▼
        ▼           Canvas/WebGPU
   dotLottie
```

---

# CSS + Motion

## Purpose

Animate user interface elements.

## Best For

- Text
- Cards
- Buttons
- Accordions
- Tabs
- Navigation
- Quiz feedback
- Page transitions
- Step reveals

## Examples

- Fade in a paragraph
- Slide a lesson panel
- Expand an accordion
- Highlight the selected answer
- Animate progress indicators

## Advantages

- Small bundle size
- GPU accelerated
- Easy to implement
- Excellent accessibility support

## Avoid

- Complex diagrams
- Scientific illustrations
- Character animation
- Simulations

---

# SVG

## Purpose

Animate educational graphics.

SVG should be the default choice for educational visuals.

## Best For

- Biology
- Geography
- History
- Mathematics
- Tribal Art
- Engineering
- Process diagrams
- Maps
- Timelines

## Examples

- Blood flowing through the heart
- Plant growth
- Solar system
- Water cycle
- Timeline progression
- Draw geometric constructions
- Reveal labels

## Advantages

- Resolution independent
- Small files
- Individual elements can animate
- Excellent accessibility
- Easy to export from design tools

## Avoid

- Particle effects
- Large physics simulations
- Character acting

---

# dotLottie

## Purpose

Display pre-authored decorative animations.

Think of dotLottie as "animated illustrations."

## Best For

- Pipili
- Mascots
- Rewards
- Celebrations
- Loading animations
- Empty states
- Onboarding

## Examples

- Pipili waves
- Badge unlock
- Confetti
- Trophy animation
- Success celebration

## Advantages

- Compact assets
- Artist-friendly workflow
- High-quality animation
- Cross-platform support

## Avoid

- Educational diagrams
- Interactive graphics
- Data-driven animation
- Simulations

---

# Canvas

## Purpose

Render dynamic, interactive graphics.

Canvas redraws every frame and is suitable for simulations.

## Best For

- Drawing tools
- Physics
- Games
- Algorithm visualization
- Interactive graph editors
- Whiteboards

## Examples

- Pendulum simulation
- Particle systems
- Sorting visualization
- Interactive graph plotting
- Paint application

## Advantages

- Excellent performance
- Highly interactive
- Efficient for many moving objects

## Avoid

- Static diagrams
- Labelled illustrations
- Maps
- Timelines

---

# WebGPU (Future)

## Purpose

High-performance scientific rendering.

## Best For

- Chemistry
- Astronomy
- Fluid dynamics
- AI visualization
- 3D simulations
- Large particle systems

## Examples

- Molecular simulation
- Galaxy visualization
- Fluid flow
- Cellular automata

## MVP Status

Not required.

Design the architecture so that WebGPU can be added later without changing lesson content.

---

# Widget Mapping

| Widget          | Technology      |
| --------------- | --------------- |
| Callout         | CSS             |
| Accordion       | CSS             |
| Tabs            | CSS             |
| Stepper         | CSS             |
| Timeline        | SVG             |
| Diagram         | SVG             |
| Image Label     | SVG             |
| Hotspot         | SVG             |
| Process         | SVG             |
| Graph           | SVG             |
| Geometry        | SVG             |
| Read Aloud      | CSS             |
| Flashcards      | CSS             |
| Multiple Choice | CSS             |
| Matching        | CSS + SVG       |
| Ordering        | CSS             |
| Compare         | SVG             |
| Mascot          | dotLottie       |
| Reward Badge    | dotLottie       |
| Loading         | CSS / dotLottie |
| Whiteboard      | Canvas          |
| Simulation      | Canvas          |
| Physics Lab     | Canvas          |
| Chemistry Lab   | WebGPU (Future) |

---

# Common Educational Examples

## Photosynthesis

Technology

SVG

Reason

Individual leaves, arrows, sunlight, and labels are vector elements that can animate independently.

---

## Human Heart

Technology

SVG

Reason

Blood flow, chambers, valves, and labels are structured graphics.

---

## Water Cycle

Technology

SVG

Reason

Clouds, arrows, rain, and evaporation are vector illustrations.

---

## Geometry Lesson

Technology

SVG

Reason

Lines, circles, angles, and measurements remain mathematically precise.

---

## Quiz Feedback

Technology

CSS

Reason

Only interface elements are animated.

---

## Badge Unlock

Technology

dotLottie

Reason

A polished decorative animation authored by a designer.

---

## Pipili

Technology

dotLottie

Reason

Character animation benefits from artist-created timelines and easing.

---

## Drawing Activity

Technology

Canvas

Reason

Continuous user interaction and freehand rendering.

---

## Physics Simulation

Technology

Canvas

Reason

Large numbers of continuously changing objects.

---

# Design Rules

## Prefer SVG whenever the learner is studying the graphic.

## Prefer CSS whenever the learner is interacting with the interface.

## Prefer dotLottie whenever the animation is decorative or character-driven.

## Prefer Canvas whenever graphics are generated dynamically.

## Reserve WebGPU for future high-performance scientific simulations.

---

# Accessibility

Every animation should:

- Respect `prefers-reduced-motion`.
- Be pausable when appropriate.
- Never rely solely on motion to convey meaning.
- Provide text alternatives where needed.
- Preserve keyboard accessibility.

---

# Performance Guidelines

## CSS

Use for lightweight interface transitions.

## SVG

Keep illustrations modular and optimize assets with SVGO.

## dotLottie

Use compressed `.lottie` packages instead of raw JSON where possible.

## Canvas

Only redraw regions that change.

## WebGPU

Load lazily and only for widgets that require it.

---

# Recommended MVP Stack

| Layer                       | Recommendation            |
| --------------------------- | ------------------------- |
| Framework                   | React + TypeScript + Vite |
| UI Animation                | Motion                    |
| Educational Graphics        | SVG                       |
| Character Animation         | dotLottie                 |
| Interactive Activities      | Canvas                    |
| Future Scientific Rendering | WebGPU                    |

---

# Final Recommendation

For the MVP, keep the animation architecture **widget-centric**. Widget authors choose the appropriate rendering technology internally, while lesson authors work only with widget JSON configuration. This keeps lesson Markdown declarative, portable, and stable even as rendering technologies evolve.
