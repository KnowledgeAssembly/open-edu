---
sidebar_position: 3
---

# Visual Counting

**Widget ID:** `core.visual-counting` | **Domain:** core | **Status:** stable

> Display visual objects for students to count and identify quantities.

## What it does

The Visual Counting widget shows a grid of visual objects (like emoji) and asks students to count them. Students type or select the correct number. It helps early learners build number sense through visual grouping.

## When to use this widget

- Teaching counting and quantities to early learners
- Building number recognition skills
- Visual math practice for pre-readers
- Reinforcing one-to-one correspondence

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.visual-counting"
3. Choose an emoji or character for the items
4. Set the count — how many items to show
5. Add a description like "Count the stars!"

## Configuration fields

| Field         | Type             | Required | Description                                                                        |
| ------------- | ---------------- | -------- | ---------------------------------------------------------------------------------- |
| `items`       | array of strings | Yes      | Emoji or characters to display as countable items. Usually a single item repeated. |
| `count`       | number           | Yes      | How many items to show (1-12 recommended).                                         |
| `text`        | string           | No       | Text shown after the count, e.g. "stars" displays as "5 stars".                    |
| `description` | string           | No       | Instructions shown above the counting grid.                                        |
| `interactive` | boolean          | No       | When false, shows the correct count. Defaults to false.                            |

## Example

```json
{
  "type": "exercise",
  "title": "Count the Stars",
  "widget": "core.visual-counting",
  "config": {
    "description": "How many stars do you see?",
    "items": ["⭐"],
    "count": 5,
    "text": "stars",
    "interactive": true
  }
}
```

## Tips

- Use visually distinct emoji that are easy to count
- Limit counts to 1-12 for young learners
- Space items clearly in the grid — avoid crowding
- Start with small counts and gradually increase

## See also

- [Number Line](../math/number-line.md)
- [Grid Area](../math/grid-area.md)
