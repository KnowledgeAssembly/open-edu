---
sidebar_position: 5
---

# Sequencing

**Widget ID:** `core.sequencing` | **Domain:** core | **Status:** stable

> Arrange items in the correct order by dragging or selecting.

## What it does

The Sequencing widget presents a scrambled list of items that students must arrange in the correct order. They drag items into position or use keyboard shortcuts. Common uses include ordering story events, life cycle stages, math steps, or historical events.

## When to use this widget

- Teaching chronological order
- Story sequencing activities
- Step-by-step process understanding
- Life cycle and growth ordering

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.sequencing"
3. Define your items — each needs an id, label, and optional emoji
4. Set correctOrder — an array of item ids in the right order
5. Optionally add hints to help students

## Configuration fields

| Field          | Type             | Required | Description                                                                               |
| -------------- | ---------------- | -------- | ----------------------------------------------------------------------------------------- |
| `items`        | array of objects | Yes      | The items to sequence. Each has id (string), label (string), and optional emoji (string). |
| `correctOrder` | array of strings | Yes      | The correct sequence of item ids, e.g. ["seed", "sprout", "plant", "flower"].             |
| `description`  | string           | No       | Instructions shown above the activity.                                                    |
| `hints`        | array of strings | No       | Progressive hints for students who need help.                                             |
| `interactive`  | boolean          | No       | When false, shows items in correct order. Defaults to false.                              |

## Example

```json
{
  "type": "exercise",
  "title": "Life Cycle Sequencing",
  "widget": "core.sequencing",
  "config": {
    "description": "Put the life cycle steps in the correct order.",
    "items": [
      { "id": "seed", "label": "Seed", "emoji": "🌱" },
      { "id": "sprout", "label": "Sprout", "emoji": "🌿" },
      { "id": "plant", "label": "Plant", "emoji": "🌻" },
      { "id": "flower", "label": "Flower", "emoji": "🌸" }
    ],
    "correctOrder": ["seed", "sprout", "plant", "flower"],
    "interactive": true
  }
}
```

## Tips

- Ensure there is a clear, unambiguous correct order
- Avoid steps that could legitimately be swapped
- Keep total items between 3-8 for manageable complexity
- Add emoji icons to items for visual recognition

## See also

- [Drag & Drop](drag-drop.md)
- [Timeline](timeline.md)
