import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RuntimeThemeProvider, themeIds } from '@open-edu/runtime';
import type { ThemeId } from '@open-edu/runtime';
import axe from 'axe-core';
import { CatalogPage } from '../CatalogPage';
import { CourseHomePage } from '../CourseHomePage';
import { LessonPage } from '../LessonPage';
import { AssessmentPage } from '../AssessmentPage';
import { CodePage } from '../CodePage';
import { ProgressPage } from '../ProgressPage';
import type { LoadedPackage } from '@open-edu/core';
import type { ContentNode } from '@open-edu/schemas';
import type { PackageSummary } from '@open-edu/core';

vi.mock('../progressStorage', () => ({
  getAllProgress: vi.fn(() => ({})),
  getProgress: vi.fn(() => null),
  saveProgress: vi.fn(),
}));

vi.mock('../buildModules', () => ({
  buildModules: vi.fn(() => [
    {
      title: 'Getting Started',
      isLocked: false,
      lessons: [{ id: 'nodes/lesson-01.md', title: 'Lesson 1' }],
    },
    {
      title: 'Advanced Topics',
      isLocked: true,
      lessons: [{ id: 'nodes/lesson-02.md', title: 'Lesson 2' }],
    },
  ]),
}));

const samplePackage: LoadedPackage = {
  rootDir: '/test/course',
  manifest: {
    id: 'test-course',
    title: 'Test Course',
    version: '1.0.0',
    author: 'Test Author',
    entry: 'nodes/lesson-01.md',
  },
  workflow: null,
  rewards: null,
  nodes: [
    {
      path: '/test/course/nodes/lesson-01.md',
      relativePath: 'nodes/lesson-01.md',
      content: '# Lesson 1\n\nContent here.',
      node: { type: 'lesson', title: 'Lesson 1' } as unknown as ContentNode,
    },
    {
      path: '/test/course/nodes/quiz-01.md',
      relativePath: 'nodes/quiz-01.md',
      content: '# Quiz 1',
      node: {
        type: 'quiz',
        title: 'Quiz 1',
        question: 'What is 2+2?',
        options: [
          { id: 'a', text: '3', correct: false },
          { id: 'b', text: '4', correct: true },
        ],
      } as unknown as ContentNode,
    },
  ],
  assetPaths: [],
};

const samplePackages: PackageSummary[] = [
  {
    manifest: {
      id: 'course-1',
      title: 'Course One',
      version: '1.0.0',
      author: 'Author One',
      entry: 'nodes/lesson-01.md',
    },
    nodeCount: 3,
    availableBadges: 1,
    rootDir: '/test/courses/course-1',
  },
];

function renderWithTheme(ui: React.ReactElement, themeId: ThemeId) {
  return render(<RuntimeThemeProvider themeId={themeId}>{ui}</RuntimeThemeProvider>);
}

const themes = themeIds as readonly ThemeId[];

describe.each(themes)('Accessibility in %s theme', (themeId) => {
  async function expectNoViolations(container: HTMLElement) {
    const result = await axe.run(container);
    if (result.violations.length > 0) {
      const details = result.violations.map(
        (v: { id: string; help: string; nodes: Array<{ html: string }> }) =>
          `\n  [${v.id}] ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
      );
      expect(result.violations, details.join('')).toHaveLength(0);
    }
  }

  it('CatalogPage has no axe violations', async () => {
    const { container } = renderWithTheme(
      <CatalogPage packages={samplePackages} onStartCourse={vi.fn()} />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('CourseHomePage has no axe violations', async () => {
    const { container } = renderWithTheme(
      <CourseHomePage
        pkg={samplePackage}
        onNavigate={vi.fn()}
        currentThemeId={themeId}
        onThemeChange={vi.fn()}
      />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('LessonPage has no axe violations', async () => {
    const { container } = renderWithTheme(
      <LessonPage
        pkg={samplePackage}
        nodeId="nodes/lesson-01.md"
        onNavigate={vi.fn()}
        currentThemeId={themeId}
        onThemeChange={vi.fn()}
      />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('AssessmentPage has no axe violations', async () => {
    const { container } = renderWithTheme(
      <AssessmentPage pkg={samplePackage} nodeId="nodes/quiz-01.md" onNavigate={vi.fn()} />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('CodePage has no axe violations', async () => {
    const { container } = renderWithTheme(
      <CodePage
        pkg={samplePackage}
        nodeId="nodes/lesson-01.md"
        onNavigate={vi.fn()}
        currentThemeId={themeId}
        onThemeChange={vi.fn()}
      />,
      themeId,
    );
    await expectNoViolations(container);
  });

  it('ProgressPage has no axe violations', async () => {
    const { container } = renderWithTheme(
      <ProgressPage
        pkg={samplePackage}
        onNavigate={vi.fn()}
        currentThemeId={themeId}
        onThemeChange={vi.fn()}
      />,
      themeId,
    );
    await expectNoViolations(container);
  });
});
