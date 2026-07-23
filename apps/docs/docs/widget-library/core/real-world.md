---
sidebar_position: 8
---

# Real World

**Widget ID:** `core.real-world` | **Domain:** core | **Status:** stable

> Apply learning to real-world scenarios with open-ended reflection.

## What it does

The Real World widget presents a practical scenario and asks students to apply what they learned. Students write their answer and explanation in a text area. It is designed for open-ended thinking rather than right/wrong answers.

## When to use this widget

- Applying math concepts to everyday situations
- Connecting science to real-world examples
- Reflective writing after a lesson
- Problem-solving with real-life context

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.real-world"
3. Write a relatable, age-appropriate scenario
4. Add a task description — what should the student do?
5. Optionally provide an expected answer for comparison

## Configuration fields

| Field             | Type    | Required | Description                                                          |
| ----------------- | ------- | -------- | -------------------------------------------------------------------- |
| `scenario`        | string  | Yes      | A real-world situation the student should think about.               |
| `taskDescription` | string  | No       | Specific instructions for what the student should do or answer.      |
| `description`     | string  | No       | Additional context or instructions.                                  |
| `interactive`     | boolean | No       | When false, shows the scenario in read-only mode. Defaults to false. |

## Example

```json
{
  "type": "exercise",
  "title": "Baking Cookies",
  "widget": "core.real-world",
  "config": {
    "scenario": "You are helping to bake cookies for a school event. The recipe calls for 2 cups of flour, 1 cup of sugar, and 1 teaspoon of vanilla. You need to triple the recipe to make enough for everyone.",
    "taskDescription": "How many cups of flour will you need in total? Write your answer and explain your thinking.",
    "interactive": true
  }
}
```

## Tips

- Use relatable, age-appropriate everyday scenarios
- Keep the scenario brief and concrete
- Encourage students to explain their reasoning, not just give an answer
- This widget works well at the end of a lesson for application

## See also

- [Story Question](story-question.md)
