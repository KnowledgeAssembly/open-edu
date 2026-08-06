---
sidebar_position: 14
---

# Process Explainer

**Widget ID:** `core.process-explainer` | **Domain:** core | **Status:** stable

> Walk through a process one step at a time with clear explanations.

## What it does

The Process Explainer widget presents a process as a numbered list of steps. In step-by-step mode, each step is revealed progressively, keeping focus on one idea at a time. Optional dotLottie or SVG animations can be attached via config.animation.

## When to use this widget

- Teaching multi-stage processes step by step
- Explaining how a system works
- Guiding learners through a procedure

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.process-explainer"
3. Define your steps — each needs an id and title
4. Optionally add descriptions, icons, and media per step
5. Optionally attach an animation config for dotLottie/SVG effects

## Configuration fields

| Field         | Type             | Required | Description                                                                                                                      |
| ------------- | ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | string           | No       | An overall title for the explainer.                                                                                              |
| `steps`       | array of objects | Yes      | Explainer steps. Each has id (string) and title (string), with optional description (string), icon (string), and media (string). |
| `stepByStep`  | boolean          | No       | Reveal steps one at a time. Defaults to true.                                                                                    |
| `interactive` | boolean          | No       | When false, shows steps for observation only. Defaults to false.                                                                 |
| `animation`   | object           | No       | Optional OAS animation config (backend lottie/svg, src, trigger, reducedMotion, effects).                                        |

## Example

```json
{
  "type": "exercise",
  "title": "Water Cycle",
  "widget": "core.process-explainer",
  "config": {
    "title": "The Water Cycle",
    "stepByStep": true,
    "interactive": true,
    "steps": [
      { "id": "evap", "title": "Evaporation", "description": "Sun heats water into vapor" },
      { "id": "cond", "title": "Condensation", "description": "Vapor cools into clouds" },
      { "id": "rain", "title": "Precipitation", "description": "Water falls as rain or snow" },
      { "id": "collect", "title": "Collection", "description": "Water gathers in oceans and lakes" }
    ]
  }
}
```

## Tips

- Use 3-8 steps for clarity
- Keep step descriptions to 1-2 sentences
- Use stepByStep mode to reduce cognitive load

## See also

- [Process Diagram](../science/process-diagram.md)
- [Timeline](timeline.md)
