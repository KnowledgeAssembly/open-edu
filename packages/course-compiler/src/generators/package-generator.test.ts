import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generatePackage } from './package-generator.js';
import type { CourseModel } from '../schemas/index.js';

function validModel(): CourseModel {
  return {
    metadata: { title: 'Test Course', description: 'A test course', language: 'en' },
    modules: [
      {
        id: 'test-module',
        title: 'Test Module',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Introduction',
            objectives: [{ id: 'o1', description: 'Understand the basics' }],
            content: 'Welcome to the course.',
            quiz: {
              id: 'quiz-1',
              title: 'Intro Quiz',
              questions: [
                {
                  id: 'q1',
                  type: 'multiple-choice',
                  prompt: 'What is 2+2?',
                  options: [
                    { id: 'a', text: '4', correct: true },
                    { id: 'b', text: '5', correct: false },
                  ],
                },
              ],
              shuffleQuestions: false,
            },
          },
          {
            id: 'lesson-2',
            title: 'Advanced',
            objectives: [{ id: 'o2', description: 'Master the topic' }],
            content: 'Advanced content here.',
          },
        ],
      },
    ],
  };
}

function withTempDir(fn: (dir: string) => Promise<void>) {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), 'course-compiler-test-'));
    await fn(dir);
  };
}

describe('generatePackage', () => {
  it(
    'generates single-module package with correct structure',
    withTempDir(async (dir) => {
      const model = validModel();
      const result = await generatePackage(model, dir);

      expect(result.diagnostics).toBeDefined();
      expect(existsSync(join(dir, 'package.json'))).toBe(true);
      expect(existsSync(join(dir, 'workflow.json'))).toBe(true);
      expect(existsSync(join(dir, 'nodes'))).toBe(true);
      expect(existsSync(join(dir, 'assets'))).toBe(true);
    }),
  );

  it(
    'generates manifest with correct fields',
    withTempDir(async (dir) => {
      const model = validModel();
      await generatePackage(model, dir);

      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
      expect(pkg.id).toBe('test-module');
      expect(pkg.title).toBe('Test Module');
      expect(pkg.version).toBe('0.1.0');
      expect(pkg.author).toBe('OpenEdu');
      expect(pkg.entry).toBe('nodes/lesson-1.md');
    }),
  );

  it(
    'generates workflow with linear routing',
    withTempDir(async (dir) => {
      const model = validModel();
      await generatePackage(model, dir);

      const workflow = JSON.parse(readFileSync(join(dir, 'workflow.json'), 'utf-8'));
      expect(workflow.routing['nodes/lesson-1.md'].onComplete).toBe('nodes/quiz-1.json');
      expect(workflow.routing['nodes/quiz-1.json'].onComplete).toBe('nodes/lesson-2.md');
      expect(workflow.routing['nodes/lesson-2.md'].onComplete).toBe('COMPLETED');
    }),
  );

  it(
    'generates lesson markdown files',
    withTempDir(async (dir) => {
      const model = validModel();
      await generatePackage(model, dir);

      const lesson1 = readFileSync(join(dir, 'nodes/lesson-1.md'), 'utf-8');
      expect(lesson1).toContain('# Introduction');
      expect(lesson1).toContain('Understand the basics');
      expect(lesson1).toContain('Welcome to the course.');

      const lesson2 = readFileSync(join(dir, 'nodes/lesson-2.md'), 'utf-8');
      expect(lesson2).toContain('# Advanced');
    }),
  );

  it(
    'generates quiz JSON files',
    withTempDir(async (dir) => {
      const model = validModel();
      await generatePackage(model, dir);

      const quiz = JSON.parse(readFileSync(join(dir, 'nodes/quiz-1.json'), 'utf-8'));
      expect(quiz.type).toBe('exercise');
      expect(quiz.widget).toBe('open-edu.multiple-choice');
      expect(quiz.title).toBe('Intro Quiz');
      expect(quiz.config.questions).toHaveLength(1);
      expect(quiz.config.questions[0].question).toBe('What is 2+2?');
      expect(quiz.config.questions[0].options).toEqual(['4', '5']);
      expect(quiz.config.questions[0].correctIndex).toBe(0);
      expect(quiz.config.interactive).toBe(true);
    }),
  );

  it(
    'generates quiz with all questions not just first',
    withTempDir(async (dir) => {
      const model = validModel();
      model.modules[0]!.lessons[0]!.quiz = {
        id: 'quiz-multi',
        title: 'Multi Quiz',
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            prompt: 'First question?',
            options: [
              { id: 'a', text: 'Correct', correct: true },
              { id: 'b', text: 'Wrong', correct: false },
            ],
          },
          {
            id: 'q2',
            type: 'multiple-choice',
            prompt: 'Second question?',
            options: [
              { id: 'c', text: 'No', correct: false },
              { id: 'd', text: 'Yes', correct: true },
            ],
          },
        ],
        shuffleQuestions: false,
      };
      await generatePackage(model, dir);

      const quiz = JSON.parse(readFileSync(join(dir, 'nodes/quiz-multi.json'), 'utf-8'));
      expect(quiz.config.questions).toHaveLength(2);
      expect(quiz.config.questions[0].question).toBe('First question?');
      expect(quiz.config.questions[0].correctIndex).toBe(0);
      expect(quiz.config.questions[1].question).toBe('Second question?');
      expect(quiz.config.questions[1].correctIndex).toBe(1);
    }),
  );

  it(
    'generates separate node files for each activity',
    withTempDir(async (dir) => {
      const model = validModel();
      model.modules[0]!.lessons[0]!.activities = [
        { id: 'act-reading-1', type: 'reading', content: 'Read this text.' },
        { id: 'act-exercise-1', type: 'exercise', instructions: 'Solve these.' },
        { id: 'act-reflection-1', type: 'reflection', prompt: 'Reflect on this.', private: true },
      ];
      await generatePackage(model, dir);

      const nodes = readdirSync(join(dir, 'nodes')).sort();
      expect(nodes).toContain('act-reading-1.md');
      expect(nodes).toContain('act-exercise-1.md');
      expect(nodes).toContain('act-reflection-1.json');

      const reflection = JSON.parse(
        readFileSync(join(dir, 'nodes/act-reflection-1.json'), 'utf-8'),
      );
      expect(reflection.type).toBe('reflection');
      expect(reflection.prompt).toBe('Reflect on this.');

      const reading = readFileSync(join(dir, 'nodes/act-reading-1.md'), 'utf-8');
      expect(reading).toContain('Read this text.');

      // Activities should not appear in lesson markdown
      const lesson = readFileSync(join(dir, 'nodes/lesson-1.md'), 'utf-8');
      expect(lesson).not.toContain('Read this text.');
      expect(lesson).not.toContain('Solve these.');
      expect(lesson).not.toContain('Reflect on this.');
    }),
  );

  it(
    'includes activity nodes in workflow routing',
    withTempDir(async (dir) => {
      const model = validModel();
      model.modules[0]!.lessons[0]!.activities = [
        { id: 'act-1', type: 'reading', content: 'Activity A' },
        { id: 'act-2', type: 'reflection', prompt: 'Reflect', private: true },
      ];
      await generatePackage(model, dir);

      const workflow = JSON.parse(readFileSync(join(dir, 'workflow.json'), 'utf-8'));
      const routing = workflow.routing;
      expect(routing['nodes/lesson-1.md'].onComplete).toBe('nodes/act-1.md');
      expect(routing['nodes/act-1.md'].onComplete).toBe('nodes/act-2.json');
      expect(routing['nodes/act-2.json'].onComplete).toBe('nodes/quiz-1.json');
      expect(routing['nodes/quiz-1.json'].onComplete).toBe('nodes/lesson-2.md');
    }),
  );

  it(
    'generates placeholder SVG assets when placeholderGenerated is true',
    withTempDir(async (dir) => {
      const model = validModel();
      model.modules[0]!.lessons[0]!.assets = [
        { id: 'img-1', path: 'diagram.png', type: 'image', placeholderGenerated: true },
      ];
      await generatePackage(model, dir);

      expect(existsSync(join(dir, 'assets/diagram.png'))).toBe(true);
      const svg = readFileSync(join(dir, 'assets/diagram.png'), 'utf-8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('img-1');
    }),
  );

  it(
    'generates bundle structure for multi-module course',
    withTempDir(async (dir) => {
      const model: CourseModel = {
        metadata: { title: 'Multi Module Course', description: 'A bundle', language: 'en' },
        modules: [
          {
            id: 'mod-1',
            title: 'Module 1',
            lessons: [
              {
                id: 'l1',
                title: 'Lesson 1',
                objectives: [{ id: 'o1', description: 'Obj' }],
                content: 'Content',
              },
            ],
            prerequisites: [],
          },
          {
            id: 'mod-2',
            title: 'Module 2',
            lessons: [
              {
                id: 'l2',
                title: 'Lesson 2',
                objectives: [{ id: 'o2', description: 'Obj' }],
                content: 'Content',
              },
            ],
            prerequisites: ['mod-1'],
          },
        ],
      };
      await generatePackage(model, dir);

      expect(existsSync(join(dir, 'bundle.json'))).toBe(true);
      expect(existsSync(join(dir, 'modules/mod-1/package.json'))).toBe(true);
      expect(existsSync(join(dir, 'modules/mod-2/package.json'))).toBe(true);

      const bundle = JSON.parse(readFileSync(join(dir, 'bundle.json'), 'utf-8'));
      expect(bundle.type).toBe('bundle');
      expect(bundle.modules).toHaveLength(2);
      expect(bundle.modules[0].id).toBe('mod-1');
      expect(bundle.modules[1].id).toBe('mod-2');
      expect(bundle.modules[1].dependsOn).toEqual(['mod-1']);
    }),
  );

  it(
    'uses metadata author and version in manifest',
    withTempDir(async (dir) => {
      const model = validModel();
      model.metadata.author = 'Test Author';
      model.metadata.version = '2.0.0';
      await generatePackage(model, dir);

      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
      expect(pkg.author).toBe('Test Author');
      expect(pkg.version).toBe('2.0.0');
    }),
  );

  it(
    'generates nodes directory with all files',
    withTempDir(async (dir) => {
      const model = validModel();
      await generatePackage(model, dir);

      const nodes = readdirSync(join(dir, 'nodes')).sort();
      expect(nodes).toEqual(['lesson-1.md', 'lesson-2.md', 'quiz-1.json']);
    }),
  );

  it(
    'records info diagnostics for placeholder assets',
    withTempDir(async (dir) => {
      const model = validModel();
      model.modules[0]!.lessons[0]!.assets = [
        { id: 'img-1', path: 'image.png', type: 'image', placeholderGenerated: true },
      ];
      const result = await generatePackage(model, dir);

      const placeholderDiags = result.diagnostics.filter((d) => d.code === 'PLACEHOLDER_GENERATED');
      expect(placeholderDiags.length).toBeGreaterThanOrEqual(1);
      expect(placeholderDiags[0]!.severity).toBe('info');
    }),
  );
});
