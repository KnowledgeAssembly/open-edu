---
sidebar_position: 5
---

# Measurement Scale

**Widget ID:** `math.measurement-scale` | **Domain:** math | **Status:** stable

> Read and set measurements on interactive rulers, thermometers, and scales.

## What it does

The Measurement Scale widget shows a labeled scale — like a ruler, thermometer, or measuring jug. Students read the current measurement or set it to a target value. It supports various units and scale types.

## When to use this widget

- Teaching how to read a ruler or thermometer
- Measuring length, temperature, or volume
- Comparing measurements
- Practicing estimation before precise measurement

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "math.measurement-scale"
3. Choose the scale type: ruler, thermometer, or measuring jug
4. Set the min, max, and step values
5. Set a target value for students to match

## Configuration fields

| Field         | Type    | Required | Description                                                |
| ------------- | ------- | -------- | ---------------------------------------------------------- |
| `type`        | string  | Yes      | Scale type: "ruler", "thermometer", or "jug".              |
| `min`         | number  | Yes      | Minimum value on the scale.                                |
| `max`         | number  | Yes      | Maximum value on the scale.                                |
| `step`        | number  | Yes      | The increment between markings. Use 1 for whole numbers.   |
| `unit`        | string  | No       | Unit label, e.g. "cm", "°C", "ml".                         |
| `targetValue` | number  | No       | The target measurement students should set.                |
| `description` | string  | No       | Instructions for the student.                              |
| `showReading` | boolean | No       | Show the numeric reading. Defaults to true.                |
| `showLabels`  | boolean | No       | Show scale labels. Defaults to true.                       |
| `interactive` | boolean | No       | When false, shows a static measurement. Defaults to false. |

## Example

```json
{
  "type": "exercise",
  "title": "Thermometer Reading",
  "widget": "math.measurement-scale",
  "config": {
    "description": "Set the thermometer to 25 degrees Celsius.",
    "type": "thermometer",
    "min": -10,
    "max": 50,
    "step": 1,
    "unit": "°C",
    "targetValue": 25,
    "showReading": true,
    "showLabels": true,
    "interactive": true
  }
}
```

## Tips

- Use whole-number measurements for early learners
- Include both metric and imperial options when relevant
- Explain where to start measuring from (e.g. the 0 mark, not the 1 mark)
- Show labeled markings clearly for readability

## See also

- [Clock Time](clock-time.md)
