import { describe, it, expect } from 'vitest';
import { lintPackage } from './content-lint';
import type { LoadedPackage, LoadedNode } from './types';

function makeNode(overrides: Partial<LoadedNode> & { relativePath: string }): LoadedNode {
  return {
    path: `/pkg/${overrides.relativePath}`,
    content: '',
    node: { type: 'lesson' },
    ...overrides,
  };
}

function makePkg(overrides: Partial<LoadedPackage>): LoadedPackage {
  return {
    rootDir: '/pkg',
    manifest: {
      id: 'test',
      title: 'Test',
      version: '0.1.0',
      author: 'Test',
      entry: 'nodes/intro.md',
    },
    workflow: null,
    rewards: null,
    nodes: [],
    assetPaths: [],
    ...overrides,
  };
}

describe('lintPackage', () => {
  describe('heading structure', () => {
    it('warns when document has no headings', () => {
      const pkg = makePkg({
        nodes: [makeNode({ relativePath: 'nodes/lesson.md', content: 'Just text, no headings' })],
      });
      const result = lintPackage(pkg);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.message).toContain('no heading structure');
    });

    it('warns when document does not start with H1', () => {
      const pkg = makePkg({
        nodes: [makeNode({ relativePath: 'nodes/lesson.md', content: '## No H1\n\nJust H2' })],
      });
      const result = lintPackage(pkg);
      expect(result.warnings.some((w) => w.message.includes('not start with an H1'))).toBe(true);
    });

    it('warns on skipped heading levels', () => {
      const pkg = makePkg({
        nodes: [
          makeNode({ relativePath: 'nodes/lesson.md', content: '# H1\n\n### H3 skipped H2' }),
        ],
      });
      const result = lintPackage(pkg);
      expect(result.warnings.some((w) => w.message.includes('Heading level skipped'))).toBe(true);
    });

    it('passes valid heading structure', () => {
      const pkg = makePkg({
        nodes: [makeNode({ relativePath: 'nodes/lesson.md', content: '# H1\n\n## H2\n\n### H3' })],
      });
      const result = lintPackage(pkg);
      const headingIssues = result.warnings.filter((w) => w.message.includes('heading'));
      expect(headingIssues).toHaveLength(0);
    });
  });

  describe('quiz checks', () => {
    it('warns when all options are correct', () => {
      const pkg = makePkg({
        nodes: [
          makeNode({
            relativePath: 'nodes/quiz.json',
            node: {
              type: 'quiz',
              question: 'Test?',
              options: [
                { id: 'a', text: 'Yes', correct: true },
                { id: 'b', text: 'Also yes', correct: true },
              ],
            },
          }),
        ],
      });
      const result = lintPackage(pkg);
      expect(
        result.warnings.some((w) => w.message.includes('All quiz options are marked correct')),
      ).toBe(true);
    });

    it('warns when no option has explanatory text', () => {
      const pkg = makePkg({
        nodes: [
          makeNode({
            relativePath: 'nodes/quiz.json',
            node: {
              type: 'quiz',
              question: 'Test?',
              options: [
                { id: 'a', text: 'True', correct: true },
                { id: 'b', text: 'False', correct: false },
              ],
            },
          }),
        ],
      });
      const result = lintPackage(pkg);
      expect(result.warnings.some((w) => w.message.includes('no explanation-like feedback'))).toBe(
        true,
      );
    });

    it('passes well-formed quiz with feedback', () => {
      const pkg = makePkg({
        nodes: [
          makeNode({
            relativePath: 'nodes/quiz.json',
            node: {
              type: 'quiz',
              question: 'What is 2+2?',
              options: [
                {
                  id: 'a',
                  text: '4 is the correct answer because two plus two mathematically equals four',
                  correct: true,
                },
                {
                  id: 'b',
                  text: '3 is incorrect because two plus two equals four, not three',
                  correct: false,
                },
              ],
            },
          }),
        ],
      });
      const result = lintPackage(pkg);
      const quizIssues = result.warnings.filter((w) => w.file === 'nodes/quiz.json');
      expect(quizIssues).toHaveLength(0);
    });
  });

  describe('reflection prompts', () => {
    it('warns when reflection prompt is too short', () => {
      const pkg = makePkg({
        nodes: [
          makeNode({
            relativePath: 'nodes/reflect.json',
            node: { type: 'reflection', prompt: 'Hi' },
          }),
        ],
      });
      const result = lintPackage(pkg);
      expect(
        result.warnings.some((w) => w.message.includes('Reflection prompt is too short')),
      ).toBe(true);
    });

    it('passes long enough reflection prompt', () => {
      const pkg = makePkg({
        nodes: [
          makeNode({
            relativePath: 'nodes/reflect.json',
            node: {
              type: 'reflection',
              prompt: 'What did you learn from this lesson and how will you apply it?',
            },
          }),
        ],
      });
      const result = lintPackage(pkg);
      const refIssues = result.warnings.filter((w) => w.file === 'nodes/reflect.json');
      expect(refIssues).toHaveLength(0);
    });
  });

  describe('workflow reachability', () => {
    it('warns when workflow node is unreachable from entry', () => {
      const pkg = makePkg({
        manifest: {
          id: 'test',
          title: 'Test',
          version: '0.1.0',
          author: 'Test',
          entry: 'nodes/start.md',
        },
        nodes: [
          makeNode({ relativePath: 'nodes/start.md' }),
          makeNode({ relativePath: 'nodes/middle.md' }),
          makeNode({ relativePath: 'nodes/orphan.md' }),
        ],
        workflow: {
          routing: {
            'nodes/start.md': { onComplete: 'nodes/middle.md' },
            'nodes/middle.md': { onComplete: 'COMPLETED' },
            'nodes/orphan.md': { onComplete: 'COMPLETED' },
          },
        },
      });
      const result = lintPackage(pkg);
      expect(result.warnings.some((w) => w.message.includes('unreachable from entry'))).toBe(true);
    });

    it('passes when all nodes reachable from entry', () => {
      const pkg = makePkg({
        manifest: {
          id: 'test',
          title: 'Test',
          version: '0.1.0',
          author: 'Test',
          entry: 'nodes/start.md',
        },
        nodes: [
          makeNode({ relativePath: 'nodes/start.md' }),
          makeNode({ relativePath: 'nodes/end.md' }),
        ],
        workflow: {
          routing: {
            'nodes/start.md': { onComplete: 'nodes/end.md' },
            'nodes/end.md': { onComplete: 'COMPLETED' },
          },
        },
      });
      const result = lintPackage(pkg);
      const reachabilityIssues = result.warnings.filter((w) => w.message.includes('unreachable'));
      expect(reachabilityIssues).toHaveLength(0);
    });
  });
});
