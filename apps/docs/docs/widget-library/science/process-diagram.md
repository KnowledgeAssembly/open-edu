---
sidebar_position: 3
---

# Process Diagram

**Widget ID:** `science.process-diagram` | **Domain:** science | **Status:** stable

> Explore step-by-step scientific processes with connected diagrams.

## What it does

The Process Diagram widget shows a connected diagram of a scientific process — like the water cycle, food chain, or rock cycle. Nodes represent steps, and connections show the flow. It supports cycle, linear, and custom layouts with step-by-step reveal.

## When to use this widget

- Teaching the water cycle or rock cycle
- Explaining food chains and food webs
- Showing cause-and-effect processes
- Visualizing life cycles with stages

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "science.process-diagram"
3. Define process nodes — each has an id and title
4. Define connections between nodes with optional labels
5. Choose a layout: cycle, linear, or tree

## Configuration fields

| Field         | Type             | Required | Description                                                                                                                         |
| ------------- | ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `nodes`       | array of objects | Yes      | Process steps. Each has id (string), title (string), and optional description (string) and icon (string).                           |
| `connections` | array of objects | Yes      | Connections between nodes. Each has from (node id), to (node id), and optional label (string) and type ("arrow", "loop", "dashed"). |
| `layout`      | string           | No       | Layout style: "cycle", "linear", "tree", or "flow". Defaults to "cycle".                                                            |
| `title`       | string           | No       | An overall title for the diagram.                                                                                                   |
| `stepByStep`  | boolean          | No       | Reveal nodes one at a time. Defaults to false.                                                                                      |
| `interactive` | boolean          | No       | When false, shows the complete diagram. Defaults to false.                                                                          |

## Example

```json
{
  "type": "exercise",
  "title": "The Water Cycle",
  "widget": "science.process-diagram",
  "config": {
    "nodes": [
      {
        "id": "evaporation",
        "title": "Evaporation",
        "description": "Sun heats water, turning it into vapor",
        "icon": "☀️"
      },
      {
        "id": "condensation",
        "title": "Condensation",
        "description": "Water vapor cools and forms clouds",
        "icon": "☁️"
      },
      {
        "id": "precipitation",
        "title": "Precipitation",
        "description": "Water falls as rain, snow, or hail",
        "icon": "🌧️"
      },
      {
        "id": "collection",
        "title": "Collection",
        "description": "Water gathers in oceans and lakes",
        "icon": "🌊"
      }
    ],
    "connections": [
      { "from": "evaporation", "to": "condensation", "label": "vapor rises" },
      { "from": "condensation", "to": "precipitation", "label": "clouds form" },
      { "from": "precipitation", "to": "collection", "label": "water falls" },
      { "from": "collection", "to": "evaporation", "type": "loop", "label": "cycle repeats" }
    ],
    "layout": "cycle",
    "title": "The Water Cycle",
    "stepByStep": true,
    "interactive": false
  }
}
```

## Tips

- Use clear step labels that students can read easily
- Show arrows to indicate the direction of the process
- Add brief descriptions for each step
- Cycle layout works best for repeating processes

## See also

- [Sequencing](../core/sequencing.md)
- [Timeline](../core/timeline.md)
