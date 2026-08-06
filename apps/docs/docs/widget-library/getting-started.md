---
sidebar_position: 0
---

# Getting Started with Widgets

This guide walks you through building your first lesson with Open-Edu widgets. In under 10 minutes, you will create a working lesson with an introduction, a quiz, a matching activity, and flashcards.

## Prerequisites

- You have the Open-Edu CLI installed (`edu` command works in your terminal)
- You can create and edit `.json` and `.md` files

## Step 1: Create a lesson directory

Create a new folder for your lesson and set up the basic structure:

```bash
mkdir my-first-lesson
mkdir my-first-lesson/nodes
```

Create a `package.json` that describes your lesson:

```json
{
  "id": "my-first-lesson",
  "title": "My First Lesson",
  "version": "1.0.0",
  "author": "Your Name",
  "entry": "nodes/intro.md"
}
```

Save this as `my-first-lesson/package.json`.

## Step 2: Create a lesson intro

Every lesson starts with a Markdown node. This is where you introduce the topic.

Create `my-first-lesson/nodes/intro.md`:

```markdown
# Welcome to Animals!

Today we will learn about different animals and where they live.

Are you ready? Let's go!
```

## Step 3: Add a Multiple Choice quiz

Now let's add a quiz to check what students have learned. We use an **Exercise node** with the `core.multiple-choice` widget.

Create `my-first-lesson/nodes/animal-quiz.json`:

```json
{
  "type": "exercise",
  "title": "Animal Quiz",
  "widget": "core.multiple-choice",
  "config": {
    "questions": [
      {
        "question": "Which animal can fly?",
        "options": ["Dog", "Eagle", "Fish"],
        "correctIndex": 1
      },
      {
        "question": "Which animal lives in water?",
        "options": ["Cat", "Fish", "Monkey"],
        "correctIndex": 1
      },
      {
        "question": "Which animal says moo?",
        "options": ["Cow", "Duck", "Sheep"],
        "correctIndex": 0
      }
    ],
    "interactive": true
  }
}
```

Each question has:

- `question` — the text shown to students
- `options` — the answer choices
- `correctIndex` — which option is correct (counting from 0)

Setting `interactive` to `true` means students can answer. When it is `false`, the widget shows the answers without asking for input — this is called **observe mode**.

## Step 4: Add a Matching activity

Matching activities are great for reinforcing connections between concepts. Let's match animals to their habitats.

Create `my-first-lesson/nodes/animal-match.json`:

```json
{
  "type": "exercise",
  "title": "Animal Homes",
  "widget": "core.matching",
  "config": {
    "description": "Match each animal to its home.",
    "pairs": [
      { "itemA": "Fish", "itemB": "Water" },
      { "itemA": "Bird", "itemB": "Nest" },
      { "itemA": "Cow", "itemB": "Farm" },
      { "itemA": "Bear", "itemB": "Cave" }
    ],
    "interactive": true
  }
}
```

The `pairs` field lists the items to match. `itemA` goes on the left, `itemB` on the right. Students draw lines between them.

## Step 5: Add Flashcards for review

Flashcards help students review key facts. Let's create animal fact cards.

Create `my-first-lesson/nodes/animal-flashcards.json`:

```json
{
  "type": "exercise",
  "title": "Animal Facts",
  "widget": "language.flashcard",
  "config": {
    "cards": [
      {
        "front": "What animal is known as man's best friend?",
        "back": "Dog",
        "hint": "Woof woof!",
        "category": "Pets"
      },
      {
        "front": "Which animal has a long trunk?",
        "back": "Elephant",
        "hint": "Largest land animal",
        "category": "Wild"
      },
      { "front": "Which animal gives us milk?", "back": "Cow", "hint": "Moo!", "category": "Farm" },
      {
        "front": "Which animal can change its color?",
        "back": "Chameleon",
        "hint": "Blends in with surroundings",
        "category": "Wild"
      }
    ],
    "mode": "flip",
    "shuffle": true,
    "interactive": true
  }
}
```

Each card has a `front` (the question) and a `back` (the answer). The `hint` field helps students who get stuck. `shuffle: true` randomizes the card order each time.

## Step 6: Connect the nodes

Now we link everything together in a workflow file. This tells Open-Edu what order to show the nodes.

Create `my-first-lesson/workflow.json`:

```json
{
  "routing": {
    "nodes/intro.md": { "onComplete": "nodes/animal-quiz.json" },
    "nodes/animal-quiz.json": { "onComplete": "nodes/animal-match.json" },
    "nodes/animal-match.json": { "onComplete": "nodes/animal-flashcards.json" },
    "nodes/animal-flashcards.json": { "onComplete": "COMPLETED" }
  }
}
```

The `routing` object maps each node to the next one. When a student finishes a node, the `onComplete` key says where to go next. `COMPLETED` means the lesson is done.

## Step 7: Preview your lesson

Run the dev server (now the Course Creator Studio) to see your lesson:

```bash
edu dev ./my-first-lesson
```

Open your browser to the URL shown in the terminal. You should see your intro, quiz, matching activity, and flashcards in order.

## What's next?

- Browse the full [Widget Library](./core/multiple-choice.md) to discover all 26 built-in widgets
- Learn about [Package Authoring](../package-authoring) for advanced node types like reflections and assessments
- See more examples in the [Examples](../examples/hello-world) section
