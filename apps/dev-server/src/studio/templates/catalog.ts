import type { TemplateMeta } from '../types.js';

function packageJson(overrides: { id: string; title: string; entry: string }): string {
  return JSON.stringify(
    {
      name: `@open-edu/example-${overrides.id}`,
      id: overrides.id,
      title: overrides.title,
      version: '1.0.0',
      private: true,
      description: `${overrides.title} starter created in OpenEdu Studio`,
      author: 'OpenEdu Studio',
      entry: overrides.entry,
    },
    null,
    2,
  );
}

function linearWorkflow(nodes: string[]): string {
  const routing: Record<string, { onComplete: string }> = {};
  for (let i = 0; i < nodes.length; i++) {
    routing[nodes[i]!] = {
      onComplete: nodes[i + 1] ?? 'COMPLETED',
    };
  }
  return JSON.stringify({ routing }, null, 2);
}

const READING_LESSON_MD = `# Reading Lesson

A short lesson to get you started.

## Ideas

- **Highlight** key vocabulary.
- Add questions below the reading.

## Next

Edit this file in the Studio, then preview and share.
`;

const LESSON_QUIZ_MD = `# The Water Cycle

Water moves through three main states.

## Evaporation

The sun heats water, turning it into vapor.

## Condensation

Vapor cools and forms clouds.

## Precipitation

Water falls back to earth as rain or snow.

## Check yourself

Ready? Answer the quiz that follows.
`;

const LESSON_QUIZ_JSON = JSON.stringify(
  {
    type: 'quiz',
    title: 'The Water Cycle Check',
    question: 'What is it called when vapor cools and forms clouds?',
    options: [
      { id: 'a', text: 'Evaporation', correct: false },
      { id: 'b', text: 'Condensation', correct: true },
      { id: 'c', text: 'Precipitation', correct: false },
    ],
  },
  null,
  2,
);

const PRACTICE_LESSON_MD = `# Counting Warm-Up

Let’s practice counting by tens.

## Example

10, 20, 30, 40, 50.

## Your turn

Try the practice quiz to check your speed.
`;

const PRACTICE_QUIZ_JSON = JSON.stringify(
  {
    type: 'quiz',
    title: 'Counting Practice',
    question: 'What comes after 40 when counting by tens?',
    options: [
      { id: 'a', text: '45', correct: false },
      { id: 'b', text: '50', correct: true },
      { id: 'c', text: '60', correct: false },
    ],
  },
  null,
  2,
);

const SHORT_UNIT_OPEN_MD = `# Why the Sky Is Blue

A short unit to explore a big idea.

## Light and color

Sunlight looks white but holds many colors.

## Scattering

Tiny air particles scatter short blue waves more than others.

That is why a clear sky appears blue.
`;

const SHORT_UNIT_QUIZ_JSON = JSON.stringify(
  {
    type: 'quiz',
    title: 'Sky Blue Check',
    question: 'Why does the sky look blue on a clear day?',
    options: [
      { id: 'a', text: 'Clouds dye the air blue', correct: false },
      { id: 'b', text: 'Blue light scatters more than other colors', correct: true },
      { id: 'c', text: 'The ocean reflects blue light', correct: false },
    ],
  },
  null,
  2,
);

const SHORT_UNIT_CLOSE_MD = `# Wrap-Up

Great work finishing this short unit.

## What you learned

- Sunlight contains many colors.
- Short blue waves scatter the most.

## Go further

Try observing the sky at sunrise or sunset and compare its color.
`;

export const STUDIO_TEMPLATES: TemplateMeta[] = [
  {
    id: 'reading-lesson',
    titleKey: 'studio.template.readingLesson.title',
    descriptionKey: 'studio.template.readingLesson.description',
    files: {
      'package.json': packageJson({
        id: 'reading-lesson',
        title: 'Reading Lesson',
        entry: 'nodes/lesson.md',
      }),
      'nodes/lesson.md': READING_LESSON_MD,
      'workflow.json': linearWorkflow(['nodes/lesson.md']),
    },
  },
  {
    id: 'lesson-quiz',
    titleKey: 'studio.template.lessonQuiz.title',
    descriptionKey: 'studio.template.lessonQuiz.description',
    files: {
      'package.json': packageJson({
        id: 'lesson-quiz',
        title: 'Lesson and Quiz',
        entry: 'nodes/lesson.md',
      }),
      'nodes/lesson.md': LESSON_QUIZ_MD,
      'nodes/quiz.json': LESSON_QUIZ_JSON,
      'workflow.json': linearWorkflow(['nodes/lesson.md', 'nodes/quiz.json']),
    },
  },
  {
    id: 'practice-stub',
    titleKey: 'studio.template.practiceStub.title',
    descriptionKey: 'studio.template.practiceStub.description',
    files: {
      'package.json': packageJson({
        id: 'practice-stub',
        title: 'Practice Warm-Up',
        entry: 'nodes/lesson.md',
      }),
      'nodes/lesson.md': PRACTICE_LESSON_MD,
      'nodes/practice.json': PRACTICE_QUIZ_JSON,
      'workflow.json': linearWorkflow(['nodes/lesson.md', 'nodes/practice.json']),
    },
  },
  {
    id: 'short-unit',
    titleKey: 'studio.template.shortUnit.title',
    descriptionKey: 'studio.template.shortUnit.description',
    files: {
      'package.json': packageJson({
        id: 'short-unit',
        title: 'Short Unit',
        entry: 'nodes/opening.md',
      }),
      'nodes/opening.md': SHORT_UNIT_OPEN_MD,
      'nodes/quiz.json': SHORT_UNIT_QUIZ_JSON,
      'nodes/closing.md': SHORT_UNIT_CLOSE_MD,
      'workflow.json': linearWorkflow(['nodes/opening.md', 'nodes/quiz.json', 'nodes/closing.md']),
    },
  },
];

export function getTemplateById(id: string): TemplateMeta | undefined {
  return STUDIO_TEMPLATES.find((t) => t.id === id);
}
