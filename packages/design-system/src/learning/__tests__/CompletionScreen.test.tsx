import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompletionScreen } from '../CompletionScreen.js';
import { checkAccessibility } from '../../test-utils/a11y.js';

const mockCourse = {
  manifest: { id: 'test', title: 'Test Course', version: '1.0', author: 'Test', entry: 'test.md' },
  nodeCount: 5,
  rootDir: '/test',
};

describe('CompletionScreen', () => {
  it('renders title', () => {
    render(<CompletionScreen title="Test Course" onBack={vi.fn()} />);
    expect(screen.getByText('You finished Test Course!')).toBeInTheDocument();
  });

  it('renders back button and calls onBack', () => {
    const onBack = vi.fn();
    render(<CompletionScreen title="Test" onBack={onBack} />);
    const btn = screen.getByTestId('back-to-catalog');
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(onBack).toHaveBeenCalled();
  });

  it('renders skillSummary when provided', () => {
    render(
      <CompletionScreen
        title="Test"
        onBack={vi.fn()}
        skillSummary={<div data-testid="skills">Skills</div>}
      />,
    );
    expect(screen.getByTestId('skills')).toBeInTheDocument();
  });

  it('renders badges when provided', () => {
    render(<CompletionScreen title="Test" onBack={vi.fn()} badges={['Gold', 'Silver']} />);
    expect(screen.getByTestId('badge-Gold')).toBeInTheDocument();
    expect(screen.getByTestId('badge-Silver')).toBeInTheDocument();
  });

  it('renders stats when provided', () => {
    render(
      <CompletionScreen
        title="Test"
        onBack={vi.fn()}
        stats={{
          stepsCompleted: 10,
          quizzesAnswered: 5,
          reflectionsWritten: 3,
          timeSpentMinutes: 30,
        }}
      />,
    );
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders recommended courses when provided', () => {
    render(
      <CompletionScreen
        title="Test"
        onBack={vi.fn()}
        recommendedCourses={[mockCourse]}
        onNavigateToCourse={vi.fn()}
      />,
    );
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    expect(screen.getByText('5 lessons')).toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(
      <CompletionScreen title="Test" onBack={vi.fn()} className="custom" />,
    );
    expect(container.firstChild).toHaveClass('custom');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<CompletionScreen title="Test" onBack={vi.fn()} />);
  });
});
