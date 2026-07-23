---
sidebar_position: 2
---

# Place Value Chart

**Widget ID:** `math.place-value-chart` | **Domain:** math | **Status:** stable

> Build and explore numbers using an interactive place value chart.

## What it does

The Place Value Chart widget helps students understand how digits represent different values based on their position. Students drag digits into columns (ones, tens, hundreds, etc.) to build numbers. It supports the Indian number system with lakh and crore places.

## When to use this widget

- Teaching place value concepts
- Building multi-digit numbers
- Understanding expanded form
- Comparing numbers using place value

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "math.place-value-chart"
3. Set the target number students should build
4. Provide the digits for students to drag
5. Choose the max place value level

## Configuration fields

| Field             | Type             | Required | Description                                                     |
| ----------------- | ---------------- | -------- | --------------------------------------------------------------- |
| `targetNumber`    | number           | Yes      | The number students should build on the chart.                  |
| `draggableDigits` | array of numbers | Yes      | The digits students can use, e.g. [5, 4, 3] for the number 543. |
| `maxPlaces`       | string           | No       | Highest place value shown, e.g. "hundred", "thousand", "lakh".  |
| `description`     | string           | No       | Instructions for the student.                                   |
| `showLabels`      | boolean          | No       | Show place value labels. Defaults to true.                      |
| `interactive`     | boolean          | No       | When false, shows the completed chart. Defaults to false.       |

## Example

```json
{
  "type": "exercise",
  "title": "Place Value Practice",
  "widget": "math.place-value-chart",
  "config": {
    "description": "Build the number 543 by placing digits in the correct columns.",
    "maxPlaces": "hundred",
    "targetNumber": 543,
    "draggableDigits": [5, 4, 3],
    "showLabels": true,
    "interactive": true
  }
}
```

## Tips

- Use numbers up to 999 for early learners
- Include visual separators between columns for clarity
- Explain that zero acts as a placeholder
- Start with 2-digit numbers before introducing larger ones

## See also

- [Number Line](number-line.md)
