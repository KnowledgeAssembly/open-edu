---
sidebar_position: 1
---

# Fraction Visual

**Widget ID:** `math.fraction-visual` | **Domain:** math | **Status:** stable

> Visualize and interact with fractions using circle or bar models.

## What it does

The Fraction Visual widget shows fractions as shaded parts of a circle or bar. Students can see the relationship between numerator and denominator, compare fractions visually, and practice shading the correct portion.

## When to use this widget

- Introducing fractions to early learners
- Visualizing equivalent fractions
- Comparing fraction sizes
- Building intuitive understanding of numerator and denominator

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "math.fraction-visual"
3. Set the numerator and denominator
4. Choose circle or bar mode
5. Set interactive to true if students should shade the fraction themselves

## Configuration fields

| Field         | Type    | Required | Description                                                           |
| ------------- | ------- | -------- | --------------------------------------------------------------------- |
| `numerator`   | number  | Yes      | The top number in the fraction (parts shaded).                        |
| `denominator` | number  | Yes      | The bottom number in the fraction (total parts). Keep to 12 or less.  |
| `mode`        | string  | No       | "circle" (default) or "bar" representation.                           |
| `description` | string  | No       | Instructions for the student.                                         |
| `showLabel`   | boolean | No       | Show the fraction label as text. Defaults to false.                   |
| `interactive` | boolean | No       | When true, students shade the fraction themselves. Defaults to false. |

## Example

```json
{
  "type": "exercise",
  "title": "Fraction Shading",
  "widget": "math.fraction-visual",
  "config": {
    "description": "Shade 3/4 of the circle.",
    "numerator": 3,
    "denominator": 4,
    "mode": "circle",
    "showLabel": true,
    "interactive": true
  }
}
```

## Tips

- Limit denominator to 12 or less for clear visualization
- Use circle mode for fractions under 1 whole
- Use bar mode for comparing multiple fractions
- Always show the fraction label for reinforcement

## See also

- [Number Line](number-line.md)
- [Grid Area](grid-area.md)
