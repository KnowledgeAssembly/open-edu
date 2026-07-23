---
sidebar_position: 7
---

# Story Question

**Widget ID:** `core.story-question` | **Domain:** core | **Status:** stable

> Present a story or passage followed by comprehension questions.

## What it does

The Story Question widget shows a short story or reading passage, followed by multiple-choice comprehension questions. Students read the passage and answer questions about key details, inferences, and main ideas.

## When to use this widget

- Reading comprehension practice
- Assessing understanding of a passage
- Making inferences from text
- Identifying main ideas and supporting details

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.story-question"
3. Write your scenario — a short story or passage
4. Create 2-4 comprehension questions with options and correctIndex
5. Set interactive to true

## Configuration fields

| Field                      | Type             | Required | Description                                                                                       |
| -------------------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `scenario`                 | string           | Yes      | The story or reading passage text. Keep under 150 words for best results.                         |
| `questions`                | array of objects | Yes      | List of questions. Each has question (string), options (string array), and correctIndex (number). |
| `questions[].question`     | string           | Yes      | A comprehension question about the story.                                                         |
| `questions[].options`      | array of strings | Yes      | Answer choices. Must have at least 2.                                                             |
| `questions[].correctIndex` | number           | Yes      | The index (starting from 0) of the correct option.                                                |
| `interactive`              | boolean          | No       | When false, shows answers without requiring input. Defaults to false.                             |

## Example

```json
{
  "type": "exercise",
  "title": "Maya's Sunflower",
  "widget": "core.story-question",
  "config": {
    "scenario": "Maya planted a sunflower seed in a small pot. She placed it by the window and watered it every morning. After one week, a tiny green sprout appeared. Maya was excited! She continued watering it and gave it plant food. After two months, the sunflower grew taller than Maya. It had a big yellow flower on top that followed the sun across the sky.",
    "questions": [
      {
        "question": "Where did Maya place the pot?",
        "options": ["In the garden", "By the window", "On the roof", "In the closet"],
        "correctIndex": 1
      },
      {
        "question": "How often did Maya water the seed?",
        "options": ["Every morning", "Once a week", "Every day after school", "Only on weekends"],
        "correctIndex": 0
      }
    ],
    "interactive": true
  }
}
```

## Tips

- Keep stories under 150 words for focused comprehension
- Include a clear beginning, middle, and end
- Make distractors plausible but clearly contradicted by the text
- Use 2-4 questions per story for younger students

## See also

- [Multiple Choice](multiple-choice.md)
- [Fill in the Blank](fill-blank.md)
