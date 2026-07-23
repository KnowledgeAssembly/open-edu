---
sidebar_position: 6
---

# Fill in the Blank

**Widget ID:** `core.fill-blank` | **Domain:** core | **Status:** stable

> Complete sentences by filling in missing words or numbers.

## What it does

The Fill in the Blank widget shows a sentence or paragraph with gaps. Students fill in the blanks by selecting from a dropdown of options or typing their answer. It supports both select mode (choose from options) and type mode (write the answer).

## When to use this widget

- Vocabulary practice and word recall
- Cloze reading comprehension exercises
- Math equation completion
- Grammar exercises (verb tenses, prepositions)

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.fill-blank"
3. Write your template text with \_\_\_ where blanks go
4. Define each blank with an id, position, and correct answer
5. Choose select mode (dropdown) or type mode (free text)

## Configuration fields

| Field         | Type             | Required | Description                                                                                                                              |
| ------------- | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `template`    | string           | Yes      | The text with **_ placeholders for blanks. e.g. "Water _** from the ground."                                                             |
| `blanks`      | array of objects | Yes      | Each blank definition. Has id (string), position (number), correctAnswer (string or number), and optional options array for select mode. |
| `mode`        | string           | No       | "select" for dropdown choices (default) or "type" for free text input.                                                                   |
| `description` | string           | No       | Instructions shown above the activity.                                                                                                   |
| `hints`       | array of strings | No       | Progressive hints for students who need help.                                                                                            |
| `interactive` | boolean          | No       | When false, shows filled blanks. Defaults to false.                                                                                      |

## Example

```json
{
  "type": "exercise",
  "title": "Water Cycle Sentences",
  "widget": "core.fill-blank",
  "config": {
    "description": "Complete the sentences about the water cycle.",
    "template": "Water ___ from the ground into the air. It forms ___ in the sky. Then it falls back down as ___.",
    "blanks": [
      {
        "id": "b1",
        "position": 0,
        "correctAnswer": "evaporates",
        "options": ["evaporates", "freezes", "sinks"]
      },
      {
        "id": "b2",
        "position": 1,
        "correctAnswer": "clouds",
        "options": ["rocks", "clouds", "waves"]
      },
      { "id": "b3", "position": 2, "correctAnswer": "rain", "options": ["rain", "sand", "wind"] }
    ],
    "mode": "select",
    "interactive": true
  }
}
```

## Tips

- Place blanks on key vocabulary or concepts, not filler words
- Provide 3-5 options per blank in select mode
- Make sure the sentence reads correctly when the right answer is filled in
- Use type mode only for older students or simple single-word answers

## See also

- [Multiple Choice](multiple-choice.md)
- [Story Question](story-question.md)
