---
sidebar_position: 6
---

# Number Line

**Widget ID:** `math.number-line` | **Domain:** math | **Status:** stable

> Explore numbers, fractions, and operations on an interactive number line.

## What it does

The Number Line widget displays an interactive number line where students can place values, compare positions, and explore number relationships. It supports integers, decimals, and fractions with customizable ranges and markers.

## When to use this widget

- Teaching number sense and counting
- Visualizing addition and subtraction
- Comparing numbers and fractions
- Understanding negative numbers

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "math.number-line"
3. Set the min and max values for the line
4. Set the step size between marks
5. Optionally add a target value or markers

## Configuration fields

| Field         | Type             | Required | Description                                                                                      |
| ------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `min`         | number           | Yes      | The lowest number on the line.                                                                   |
| `max`         | number           | Yes      | The highest number on the line.                                                                  |
| `step`        | number           | Yes      | The spacing between marks. Use 1 for integers.                                                   |
| `target`      | number           | No       | A specific value students should locate on the line.                                             |
| `mode`        | string           | No       | "integers" (default) or "decimals" for fractional values.                                        |
| `markers`     | array of objects | No       | Highlighted markers. Each has value (number), label (string), and optional color (CSS variable). |
| `showLabels`  | boolean          | No       | Show number labels on the line. Defaults to true.                                                |
| `showGrid`    | boolean          | No       | Show vertical grid lines at marks. Defaults to false.                                            |
| `tolerance`   | number           | No       | How close the student needs to be to the target. Defaults to 0.5.                                |
| `interactive` | boolean          | No       | When false, shows a static number line. Defaults to false.                                       |

## Example

```json
{
  "type": "exercise",
  "title": "Number Line Explorer",
  "widget": "math.number-line",
  "config": {
    "min": -10,
    "max": 10,
    "step": 1,
    "target": 3.5,
    "markers": [
      { "value": -5, "label": "-5" },
      { "value": 0, "label": "0" },
      { "value": 7, "label": "7" }
    ],
    "showLabels": true,
    "showGrid": true,
    "mode": "decimals",
    "tolerance": 0.5,
    "interactive": false
  }
}
```

## Tips

- Start with positive integers only for early learners
- Add markers to highlight important reference points
- Use decimals mode only after students master integers
- Clear tick marks help students count between labeled numbers

## See also

- [Fraction Visual](fraction-visual.md)
- [Place Value Chart](place-value-chart.md)
