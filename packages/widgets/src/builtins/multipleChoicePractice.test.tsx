import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PracticeWidget, { multipleChoicePractice } from './multipleChoicePractice';

describe('multipleChoicePractice', () => {
  const baseConfig = {
    prompt: 'What is 2 + 2?',
    options: [
      { id: 'a', text: '3', correct: false },
      { id: 'b', text: '4', correct: true },
      { id: 'c', text: '5', correct: false },
    ],
  };

  const WidgetComponent = PracticeWidget.render;

  it('renders prompt and options', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByLabelText('3')).toBeInTheDocument();
    expect(screen.getByLabelText('4')).toBeInTheDocument();
    expect(screen.getByLabelText('5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('completes with score 100 on correct answer', () => {
    const complete = vi.fn();
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={complete}
      />,
    );

    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByTestId('feedback')).toHaveTextContent('Correct!');
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('completes with score 0 on incorrect answer', () => {
    const complete = vi.fn();
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={complete}
      />,
    );

    fireEvent.click(screen.getByLabelText('3'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByTestId('feedback')).toHaveTextContent('Incorrect');
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('shows explanation after submission', () => {
    const config = { ...baseConfig, explanation: '2 + 2 equals 4.' };

    render(
      <WidgetComponent
        nodeId="test-node"
        config={config}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByText('2 + 2 equals 4.')).toBeInTheDocument();
  });

  it('renders error message for invalid config', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={{ prompt: '' }}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('disables inputs after submission', () => {
    render(
      <WidgetComponent
        nodeId="test-node"
        config={baseConfig}
        emitInteraction={vi.fn()}
        complete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('4'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByLabelText('3')).toBeDisabled();
    expect(screen.getByLabelText('4')).toBeDisabled();
    expect(screen.getByLabelText('5')).toBeDisabled();
  });

  it('named export matches default export', () => {
    expect(multipleChoicePractice).toBe(PracticeWidget);
  });
});
