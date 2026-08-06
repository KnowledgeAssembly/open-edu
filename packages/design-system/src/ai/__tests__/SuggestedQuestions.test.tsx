import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestedQuestions } from '../SuggestedQuestions.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('SuggestedQuestions', () => {
  it('renders all questions', () => {
    const questions = ['What is X?', 'How does Y work?', 'Why Z?'];
    render(<SuggestedQuestions questions={questions} onSelect={() => {}} />);
    questions.forEach((q) => {
      expect(screen.getByText(q)).toBeDefined();
    });
  });

  it('clicking a question calls onSelect', () => {
    const onSelect = vi.fn();
    render(<SuggestedQuestions questions={['Click me']} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Click me'));
    expect(onSelect).toHaveBeenCalledWith('Click me');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<SuggestedQuestions questions={['Question 1']} onSelect={vi.fn()} />);
  });

  it('renders compact variant with flex-wrap layout', () => {
    render(
      <SuggestedQuestions
        questions={['Short question', 'Another one']}
        onSelect={() => {}}
        variant="compact"
      />,
    );
    expect(screen.getByTestId('suggested-questions-compact')).toBeInTheDocument();
  });
});
