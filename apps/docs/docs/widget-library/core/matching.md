---
sidebar_position: 2
---

# Matching

**Widget ID:** `core.matching` | **Domain:** core | **Status:** stable

> Match pairs of items by dragging or selecting.

## What it does

The Matching widget shows two columns of items. Students connect each item from the left column to its corresponding match in the right column. It supports keyboard navigation, touch, and screen readers.

## When to use this widget

- Teaching vocabulary and definitions
- Matching causes to effects
- Pairing items with their categories
- Connecting concepts to examples

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.matching"
3. Define your pairs in the config — each pair has an itemA and itemB
4. Add an optional description to guide students
5. Optionally add hints to help students who get stuck

## Configuration fields

| Field           | Type             | Required | Description                                                                                           |
| --------------- | ---------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `pairs`         | array of objects | Yes      | The matching pairs. Each object has an itemA (string) and itemB (string).                             |
| `pairs[].itemA` | string           | Yes      | The left-side item text.                                                                              |
| `pairs[].itemB` | string           | Yes      | The right-side item text.                                                                             |
| `description`   | string           | No       | Instructions shown above the matching activity.                                                       |
| `hints`         | array of strings | No       | Progressive hints shown when students need help.                                                      |
| `interactive`   | boolean          | No       | When false, shows the activity in observe mode with correct matches pre-connected. Defaults to false. |

## Example

```json
{
  "type": "exercise",
  "title": "Fruit Color Matching",
  "widget": "core.matching",
  "config": {
    "description": "Match each fruit to its color.",
    "pairs": [
      { "itemA": "Apple", "itemB": "Red" },
      { "itemA": "Banana", "itemB": "Yellow" },
      { "itemA": "Orange", "itemB": "Orange" },
      { "itemA": "Grape", "itemB": "Purple" }
    ],
    "interactive": true
  }
}
```

## Tips

- Keep itemA and itemB labels short (2-4 words)
- Use 3-6 pairs for younger students, up to 10 for older ones
- Make sure each pair has a clear, unambiguous connection
- Add emoji to item labels for visual reinforcement

## See also

- [Drag & Drop](drag-drop.md)
- [Flashcard](../language/flashcard.md)
