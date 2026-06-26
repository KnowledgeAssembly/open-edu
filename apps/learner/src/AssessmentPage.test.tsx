import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssessmentPage } from './AssessmentPage';
import type { LoadedPackage } from '@open-edu/core';
import type { ContentNode } from '@open-edu/schemas';

vi.mock('@open-edu/runtime', () => ({
  QuizRenderer: ({ onSubmit }: { onSubmit: (score: number, optionId: string) => void }) => (
    <div data-testid="quiz-renderer">
      <button onClick={() => onSubmit(100, 'opt-1')} data-testid="mock-submit">
        Submit
      </button>
    </div>
  ),
  AICallout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="ai-callout">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}));

const mockGetProgress = vi.hoisted(() => vi.fn(() => null));
const mockSaveProgress = vi.hoisted(() => vi.fn());
vi.mock('./progressStorage', () => ({
  getProgress: mockGetProgress,
  saveProgress: mockSaveProgress,
}));

const samplePackage: LoadedPackage = {
  rootDir: '/test/course',
  manifest: {
    id: 'test-course',
    title: 'Test Course',
    version: '1.0.0',
    author: 'Test Author',
    entry: 'nodes/quiz-01.md',
  },
  workflow: null,
  rewards: null,
  nodes: [
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
          { id: 'c', text: '5', correct: false },
        ],
      } as unknown as ContentNode,
    },
  ],
  assetPaths: [],
};

describe('AssessmentPage', () => {
  it('renders quiz header with title', () => {
    render(<AssessmentPage pkg={samplePackage} nodeId="nodes/quiz-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByText('Quiz 1')).toBeInTheDocument();
  });

  it('renders QuizRenderer', () => {
    render(<AssessmentPage pkg={samplePackage} nodeId="nodes/quiz-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('quiz-renderer')).toBeInTheDocument();
  });

  it('renders quiz question text', () => {
    render(<AssessmentPage pkg={samplePackage} nodeId="nodes/quiz-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
  });

  it('renders Exit Quiz button', () => {
    render(<AssessmentPage pkg={samplePackage} nodeId="nodes/quiz-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('Exit Quiz')).toBeInTheDocument();
  });

  it('shows not-a-quiz message for non-quiz node', () => {
    const pkg: LoadedPackage = {
      ...samplePackage,
      nodes: [
        {
          path: '/test/course/nodes/lesson-01.md',
          relativePath: 'nodes/lesson-01.md',
          content: '# Lesson',
          node: { type: 'lesson', title: 'Lesson' } as unknown as ContentNode,
        },
      ],
    };
    render(<AssessmentPage pkg={pkg} nodeId="nodes/lesson-01.md" onNavigate={vi.fn()} />);
    expect(screen.getByText(/not a quiz/)).toBeInTheDocument();
  });

  it('saves score via saveProgress on submit', () => {
    mockGetProgress.mockReturnValue(null);
    render(<AssessmentPage pkg={samplePackage} nodeId="nodes/quiz-01.md" onNavigate={vi.fn()} />);
    screen.getByTestId('mock-submit').click();
    expect(mockSaveProgress).toHaveBeenCalledWith(
      'test-course',
      expect.objectContaining({
        scores: { 'nodes/quiz-01.md': 100 },
      }),
    );
  });

  it('shows not found for invalid nodeId', () => {
    render(<AssessmentPage pkg={samplePackage} nodeId="nodes/invalid.md" onNavigate={vi.fn()} />);
    expect(screen.getByText(/not found/)).toBeInTheDocument();
  });
});
