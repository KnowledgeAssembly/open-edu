---
sidebar_position: 4
---

# Drag & Drop

**Widget ID:** `core.drag-drop` | **Domain:** core | **Status:** stable

> Drag and drop items into the correct categories or zones.

## What it does

The Drag & Drop widget lets students sort items into target zones by dragging them with mouse, touch, or keyboard. Each item belongs in one target zone based on the expected positions you define. It works on touch screens, with a mouse, or via keyboard shortcuts.

## When to use this widget

- Sorting items into categories
- Classifying animals, objects, or concepts
- Grouping by shared attributes
- Hands-on sorting activities

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.drag-drop"
3. Define your items — each needs an id, label, and optional emoji
4. Define your target zones — each needs an id and label
5. Set expectedPositions to map each item id to its correct target id

## Configuration fields

| Field               | Type             | Required | Description                                                                             |
| ------------------- | ---------------- | -------- | --------------------------------------------------------------------------------------- |
| `items`             | array of objects | Yes      | The draggable items. Each has id (string), label (string), and optional emoji (string). |
| `targets`           | array of objects | Yes      | The drop zones. Each has id (string) and label (string).                                |
| `expectedPositions` | object           | Yes      | Maps item ids to target ids. e.g. `{"fish": "ocean", "bird": "sky"}`.                   |
| `description`       | string           | No       | Instructions shown above the activity.                                                  |
| `hints`             | array of strings | No       | Progressive hints for students who need help.                                           |
| `interactive`       | boolean          | No       | When false, shows items pre-placed in correct zones. Defaults to false.                 |

## Example

```json
{
  "type": "exercise",
  "title": "Habitat Sort",
  "widget": "core.drag-drop",
  "config": {
    "description": "Sort each animal into the correct habitat.",
    "items": [
      { "id": "fish", "label": "Fish", "emoji": "🐟" },
      { "id": "bird", "label": "Bird", "emoji": "🐦" },
      { "id": "whale", "label": "Whale", "emoji": "🐋" },
      { "id": "eagle", "label": "Eagle", "emoji": "🦅" }
    ],
    "targets": [
      { "id": "sky", "label": "Sky" },
      { "id": "ocean", "label": "Ocean" }
    ],
    "expectedPositions": {
      "fish": "ocean",
      "bird": "sky",
      "whale": "ocean",
      "eagle": "sky"
    },
    "interactive": true
  }
}
```

## Tips

- Use 3-6 items with 2-4 target zones for manageable complexity
- Make item labels unambiguous so placement is clear
- Ensure target zone labels have distinct meanings
- Add emoji to items for visual learners and non-readers

## See also

- [Matching](matching.md)
- [Sequencing](sequencing.md)
