---
sidebar_position: 4
---

# Clock Time

**Widget ID:** `math.clock-time` | **Domain:** math | **Status:** stable

> Read and set time on an interactive analog clock with digital display.

## What it does

The Clock Time widget shows an analog clock face. Students can read the current time, set the hands to a specific time, or see both analog and digital time together. It supports hour, half-hour, and minute-level precision.

## When to use this widget

- Teaching how to read an analog clock
- Practicing time to the hour and half-hour
- Converting between analog and digital time
- Understanding AM and PM

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "math.clock-time"
3. Set the starting time (hour and minute)
4. Choose set mode for interactive practice or display mode
5. Optionally set a target time for students to match

## Configuration fields

| Field         | Type    | Required | Description                                                               |
| ------------- | ------- | -------- | ------------------------------------------------------------------------- |
| `hour`        | number  | Yes      | The starting hour (1-12).                                                 |
| `minute`      | number  | Yes      | The starting minute (0-59).                                               |
| `mode`        | string  | No       | "set" for interactive time-setting, "display" for reading only.           |
| `showDigital` | boolean | No       | Show the digital time alongside the analog clock. Defaults to true.       |
| `targetTime`  | object  | No       | Target time for students to match. Has hour (number) and minute (number). |
| `description` | string  | No       | Instructions for the student.                                             |
| `interactive` | boolean | No       | When false, shows the clock in display mode. Defaults to false.           |

## Example

```json
{
  "type": "exercise",
  "title": "Set the Clock",
  "widget": "math.clock-time",
  "config": {
    "description": "Set the clock to show 7:30.",
    "hour": 3,
    "minute": 0,
    "mode": "set",
    "showDigital": true,
    "targetTime": { "hour": 7, "minute": 30 },
    "interactive": true
  }
}
```

## Tips

- Start with hour-only times (e.g. 3:00) before adding minutes
- Use clear, large clock faces for young learners
- Show both analog and digital representations together
- Explain the difference between the hour and minute hands

## See also

- [Measurement Scale](measurement-scale.md)
