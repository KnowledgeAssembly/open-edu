---
sidebar_position: 1
---

# Multiple Choice

**Widget ID:** `core.multiple-choice` | **Domain:** core | **Status:** stable

> Ask questions and let students pick from a list of answers.

## What it does

The Multiple Choice widget presents a question with several answer options. Students select their answer and get immediate feedback. It supports both single-question and multi-question modes with a progress indicator.

## When to use this widget

- Checking knowledge after a lesson
- Quick formative assessments
- Practice quizzes with multiple questions
- Pre-assessment before starting a topic

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.multiple-choice"
3. Create your questions — each needs a question text, options array, and correctIndex
4. Set interactive to true so students can answer
5. Optionally add explanations for each question

## Configuration fields

| Field                      | Type             | Required | Description                                                                                                                      |
| -------------------------- | ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `questions`                | array of objects | Yes      | List of questions. Each has question (string), options (string array), correctIndex (number), and optional explanation (string). |
| `questions[].question`     | string           | Yes      | The question text shown to the student.                                                                                          |
| `questions[].options`      | array of strings | Yes      | The answer choices. Must have at least 2 options.                                                                                |
| `questions[].correctIndex` | number           | Yes      | The index (starting from 0) of the correct option.                                                                               |
| `questions[].explanation`  | string           | No       | Shown after the student answers, explaining why the answer is correct.                                                           |
| `interactive`              | boolean          | No       | When false, shows correct answers without requiring student input. Defaults to false.                                            |

## Example

```json
{
  "type": "exercise",
  "title": "Solar System Quiz",
  "widget": "core.multiple-choice",
  "config": {
    "questions": [
      {
        "question": "What is the largest planet in our solar system?",
        "options": ["Earth", "Mars", "Jupiter", "Saturn"],
        "correctIndex": 2
      },
      {
        "question": "How many continents are there on Earth?",
        "options": ["5", "6", "7", "8"],
        "correctIndex": 2
      },
      {
        "question": "What gas do plants absorb from the air?",
        "options": ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
        "correctIndex": 1,
        "explanation": "Plants use carbon dioxide during photosynthesis to make their food."
      }
    ],
    "interactive": true
  }
}
```

## Tips

- Keep questions short and focused on one concept
- Write plausible but clearly incorrect distractors
- Include 3-5 questions per exercise for younger students
- Add explanations to reinforce learning after each answer

## See also

- [Fill in the Blank](fill-blank.md)
- [Story Question](story-question.md)
