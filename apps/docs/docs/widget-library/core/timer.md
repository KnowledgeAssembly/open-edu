---
sidebar_position: 10
---

# Timer

**Widget ID:** `core.timer` | **Domain:** core | **Status:** stable

> A visual countdown or count-up timer for breaks and transitions.

## What it does

The Timer widget shows time as a shrinking ring, bar, or row of blocks so elapsed and remaining time feel concrete rather than abstract. It supports clear start signals, pre-warned near-end announcements, and a calm completion state — designed with autism-spectrum learners in mind, with no startling audio or flashing.

## When to use this widget

- Placing a timed stretch break between lessons
- Predictable transitions between activities
- Quiet focus or reading blocks with a count-up timer
- Teaching the concept of elapsed versus remaining time

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.timer"
3. Choose a duration in seconds (5–3600)
4. Pick a visual: ring (default), bar, or blocks
5. Optionally add warnings with atSeconds and a message for predictable transitions
6. Leave interactive off for an auto-running break, or turn it on for pause/resume/restart controls

## Configuration fields

| Field             | Type             | Required | Description                                                                                                        |
| ----------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `duration`        | number           | No       | Length of the timer in seconds (5–3600). Defaults to 120.                                                          |
| `mode`            | string           | No       | "countdown" (default) or "countup".                                                                                |
| `label`           | string           | No       | Short heading such as "Time for a stretch break".                                                                  |
| `completeMessage` | string           | No       | Calm message shown when the timer finishes, e.g. "Ready to continue?".                                             |
| `visual`          | string           | No       | "ring" (default), "bar", or "blocks" time representation.                                                          |
| `warnings`        | array of objects | No       | Pre-warned transitions. Each has atSeconds (number) and an optional message (string).                              |
| `interactive`     | boolean          | No       | When true, shows pause/resume/restart controls. When false (default) the timer auto-runs and completes on its own. |
| `allowSkip`       | boolean          | No       | Whether to show an "End break now" button. Defaults to true.                                                       |

## Example

```json
{
  "type": "exercise",
  "title": "Take a Break",
  "widget": "core.timer",
  "config": {
    "duration": 120,
    "mode": "countdown",
    "label": "Time for a stretch break",
    "completeMessage": "Ready to continue?",
    "visual": "ring",
    "warnings": [
      { "atSeconds": 60, "message": "One minute left — finish up" },
      { "atSeconds": 10, "message": "Almost done" }
    ],
    "interactive": false
  }
}
```

## Tips

- Use short, concrete break lengths (1–5 minutes) for young or spectrum learners
- Add a warning 30–60 seconds before the end to support predictable transitions
- Provide a clear label and a calm completeMessage
- Visual time is primary — keep the digital readout on for accessibility

## See also

- [Callout](callout.md)
- [Audio Player](audio-player.md)
- [Clock Time](../math/clock-time.md)
