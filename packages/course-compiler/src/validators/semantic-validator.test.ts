import { describe, it, expect } from 'vitest';
import { validateCourseModel } from './semantic-validator.js';
import type { CourseModel } from '../schemas/index.js';

function validModel(): CourseModel {
  return {
    metadata: { title: 'Test', description: 'Test course', language: 'en' },
    modules: [
      {
        id: 'mod-1',
        title: 'Module 1',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            objectives: [{ id: 'obj-1', description: 'Learn something' }],
            content: 'Lesson content here',
          },
        ],
      },
    ],
  };
}

describe('validateCourseModel', () => {
  it('passes for a valid model', () => {
    const diags = validateCourseModel(validModel());
    const errors = diags.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('detects duplicate module IDs', () => {
    const model = validModel();
    model.modules.push({
      id: 'mod-1',
      title: 'Duplicate Module',
      lessons: [
        {
          id: 'l2',
          title: 'Lesson 2',
          objectives: [{ id: 'o1', description: 'Obj' }],
          content: 'C',
        },
      ],
    });
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'DUPLICATE_MODULE_ID')).toBe(true);
  });

  it('detects duplicate lesson IDs within a module', () => {
    const model = validModel();
    model.modules[0]!.lessons.push({
      id: 'lesson-1',
      title: 'Duplicate Lesson',
      objectives: [{ id: 'o2', description: 'Another obj' }],
      content: 'More content',
    });
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'DUPLICATE_LESSON_ID')).toBe(true);
  });

  it('detects missing lesson titles', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.title = '';
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'MISSING_TITLE')).toBe(true);
  });

  it('detects lessons with no objectives', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.objectives = [];
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'MISSING_OBJECTIVES')).toBe(true);
  });

  it('detects broken prerequisite references', () => {
    const model = validModel();
    model.modules[0]!.prerequisites = ['nonexistent-module'];
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'BROKEN_PREREQUISITE')).toBe(true);
  });

  it('detects cycles in prerequisite graph', () => {
    const model: CourseModel = {
      metadata: { title: 'T', description: 'D', language: 'en' },
      modules: [
        {
          id: 'mod-a',
          title: 'A',
          prerequisites: ['mod-b'],
          lessons: [
            { id: 'l1', title: 'L1', objectives: [{ id: 'o1', description: 'O' }], content: 'C' },
          ],
        },
        {
          id: 'mod-b',
          title: 'B',
          prerequisites: ['mod-c'],
          lessons: [
            { id: 'l2', title: 'L2', objectives: [{ id: 'o2', description: 'O' }], content: 'C' },
          ],
        },
        {
          id: 'mod-c',
          title: 'C',
          prerequisites: ['mod-a'],
          lessons: [
            { id: 'l3', title: 'L3', objectives: [{ id: 'o3', description: 'O' }], content: 'C' },
          ],
        },
      ],
    };
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'CYCLE_DETECTED')).toBe(true);
  });

  it('detects quizzes with no questions', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.quiz = {
      id: 'quiz-1',
      title: 'Empty Quiz',
      questions: [],
      shuffleQuestions: false,
    };
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'EMPTY_QUIZ')).toBe(true);
  });

  it('detects multiple-choice questions with no correct option', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.quiz = {
      id: 'quiz-1',
      title: 'Quiz',
      questions: [
        {
          id: 'q-1',
          type: 'multiple-choice',
          prompt: 'What is 2+2?',
          options: [
            { id: 'a', text: '3', correct: false },
            { id: 'b', text: '5', correct: false },
          ],
        },
      ],
      shuffleQuestions: false,
    };
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'MISSING_CORRECT_OPTION')).toBe(true);
  });

  it('detects multiple-choice questions with fewer than 2 options', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.quiz = {
      id: 'quiz-1',
      title: 'Quiz',
      questions: [
        {
          id: 'q-1',
          type: 'multiple-choice',
          prompt: 'What is 2+2?',
          options: [{ id: 'a', text: '4', correct: true }],
        },
      ],
      shuffleQuestions: false,
    };
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'INVALID_QUESTION_OPTIONS')).toBe(true);
  });

  it('detects modules with no lessons', () => {
    const model = validModel();
    model.modules[0]!.lessons = [];
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'EMPTY_MODULE')).toBe(true);
  });

  it('warns about empty lesson content', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.content = '';
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'EMPTY_LESSON')).toBe(true);
  });

  it('detects placeholder assets as info', () => {
    const model = validModel();
    model.modules[0]!.lessons[0]!.assets = [
      { id: 'asset-1', path: 'img.png', type: 'image', placeholderGenerated: true },
    ];
    const diags = validateCourseModel(model);
    expect(diags.some((d) => d.code === 'PLACEHOLDER_ASSET')).toBe(true);
  });

  it('passes for a valid course with quiz and activities', () => {
    const model: CourseModel = {
      metadata: { title: 'Full Course', description: 'A full course', language: 'en' },
      modules: [
        {
          id: 'mod-1',
          title: 'Module 1',
          lessons: [
            {
              id: 'lesson-1',
              title: 'Lesson 1',
              objectives: [{ id: 'o1', description: 'Objective 1' }],
              content: 'Content',
              activities: [{ id: 'act-1', type: 'reading', content: 'Read this' }],
              quiz: {
                id: 'quiz-1',
                title: 'Quiz',
                questions: [
                  {
                    id: 'q-1',
                    type: 'multiple-choice',
                    prompt: 'Q?',
                    options: [
                      { id: 'a', text: 'A', correct: true },
                      { id: 'b', text: 'B', correct: false },
                    ],
                  },
                ],
                shuffleQuestions: false,
              },
            },
          ],
        },
      ],
    };
    const diags = validateCourseModel(model);
    expect(diags.filter((d) => d.severity === 'error')).toHaveLength(0);
  });
});
