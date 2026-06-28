import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestedQuestions } from '../SuggestedQuestions.jsx';

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
});
