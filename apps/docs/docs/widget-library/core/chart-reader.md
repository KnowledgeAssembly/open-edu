---
sidebar_position: 9
---

# Chart Reader

**Widget ID:** `core.chart-reader` | **Domain:** core | **Status:** stable

> Display bar charts and graphs for students to read and interpret.

## What it does

The Chart Reader widget shows a bar chart or pictograph that students read to answer questions. It displays clear, color-coded data visualizations with labels and values. Students interpret the chart and answer what they see.

## When to use this widget

- Teaching data interpretation and graph reading
- Comparing quantities visually
- Introducing bar charts and pictographs
- Math lessons on data handling

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.chart-reader"
3. Provide your data as label-value pairs
4. Choose a chart type: bar or pictograph
5. Add a description or question about the chart

## Configuration fields

| Field          | Type             | Required | Description                                                          |
| -------------- | ---------------- | -------- | -------------------------------------------------------------------- |
| `data`         | array of objects | Yes      | Chart data. Each entry has label (string) and value (number).        |
| `type`         | string           | No       | Chart type: "bar" (default) or a pictograph variant.                 |
| `title`        | string           | No       | A title displayed above the chart.                                   |
| `description`  | string           | No       | Question or instructions about the chart.                            |
| `showValues`   | boolean          | No       | Show numeric values on the chart bars. Defaults to true.             |
| `correctLabel` | string           | No       | The label of the correct answer for quiz mode.                       |
| `interactive`  | boolean          | No       | When false, shows the chart for observation only. Defaults to false. |

## Example

```json
{
  "type": "exercise",
  "title": "Favorite Sports",
  "widget": "core.chart-reader",
  "config": {
    "description": "Which sport is the most popular based on the chart?",
    "type": "bar",
    "data": [
      { "label": "Cricket", "value": 12 },
      { "label": "Football", "value": 8 },
      { "label": "Hockey", "value": 5 }
    ],
    "title": "Favorite Sports",
    "showValues": true,
    "correctLabel": "Cricket",
    "interactive": true
  }
}
```

## Tips

- Use 3-6 data items with clearly distinguishable values
- Keep labels short and readable
- Use values that are easy to compare visually
- Add a title to give context to the chart

## See also

- [Grid Area](../math/grid-area.md)
