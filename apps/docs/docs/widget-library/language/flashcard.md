---
sidebar_position: 1
---

# Flashcard

**Widget ID:** `language.flashcard` | **Domain:** language | **Status:** stable

> Study terms and concepts with interactive flip-card flashcards.

## What it does

The Flashcard widget shows cards with a front and back — tap to flip and reveal the answer. Students can rate their confidence (easy/medium/hard), shuffle the deck, and track their progress. It supports flip, multiple-choice, and spaced repetition modes.

## When to use this widget

- Vocabulary and spelling practice
- Memorizing key terms and definitions
- Language learning
- Quick revision before assessments

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "language.flashcard"
3. Create your cards — each needs a front and back
4. Optionally add hints, categories, and difficulty levels
5. Choose a study mode: flip, multiple, or spaced

## Configuration fields

| Field         | Type             | Required | Description                                                                                                                                                                 |
| ------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cards`       | array of objects | Yes      | Flashcards. Each has front (string), back (string), and optional hint (string), category (string), difficulty ("easy"/"medium"/"hard"), image (string), and audio (string). |
| `mode`        | string           | No       | Study mode: "flip" (default), "multiple" for multiple-choice, or "spaced" for spaced repetition.                                                                            |
| `shuffle`     | boolean          | No       | Randomize card order. Defaults to false.                                                                                                                                    |
| `interactive` | boolean          | No       | When false, shows cards in view-only mode. Defaults to false.                                                                                                               |

## Example

```json
{
  "type": "exercise",
  "title": "Spanish Vocabulary",
  "widget": "language.flashcard",
  "config": {
    "cards": [
      { "front": "Hola", "back": "Hello", "hint": "Common greeting", "category": "Greetings" },
      { "front": "Gracias", "back": "Thank you", "category": "Politeness" },
      { "front": "Adios", "back": "Goodbye", "category": "Greetings" },
      { "front": "Por favor", "back": "Please", "category": "Politeness" }
    ],
    "mode": "flip",
    "shuffle": true,
    "interactive": true
  }
}
```

## Tips

- Keep front text short — one word or phrase
- Use detailed back text for definitions and context
- Add categories to help students organize their study
- Group related cards together (e.g., all greetings, all food words)

## See also

- [Matching](../core/matching.md)
- [Fill in the Blank](../core/fill-blank.md)
