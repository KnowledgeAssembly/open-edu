import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { flashcard } from './Flashcard';

const WidgetComponent = flashcard.render;

function renderWidget(config: Record<string, unknown> = {}) {
  const emitInteraction = vi.fn();
  const complete = vi.fn();
  const result = render(
    <WidgetComponent
      nodeId="test-node"
      config={config}
      emitInteraction={emitInteraction}
      complete={complete}
    />,
  );
  return { emitInteraction, complete, ...result };
}

const baseConfig = {
  cards: [
    { front: 'Hola', back: 'Hello' },
    { front: 'Gracias', back: 'Thank you' },
  ],
  interactive: true,
};

describe('Flashcard widget definition', () => {
  it('has correct widget id', () => {
    expect(flashcard.id).toBe('language.flashcard');
  });

  it('has correct domain', () => {
    expect(flashcard.domain).toBe('language');
  });

  it('has stable status', () => {
    expect(flashcard.status).toBe('stable');
  });
});

describe('Flashcard rendering', () => {
  it('renders with valid config', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Hola')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard')).toBeInTheDocument();
  });

  it('shows card progress', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
  });

  it('renders error for empty cards', () => {
    renderWidget({ cards: [], interactive: true });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('Flashcard flip interaction', () => {
  it('shows front side initially', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Hola')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('flips to back on click', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows correct/incorrect buttons after flip', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    expect(screen.getByTestId('btn-correct')).toBeInTheDocument();
    expect(screen.getByTestId('btn-incorrect')).toBeInTheDocument();
  });

  it('emits flip interaction', () => {
    const { emitInteraction } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'flip', cardIndex: 0 }),
    );
  });

  it('advances to next card on correct', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    expect(screen.getByText('Gracias')).toBeInTheDocument();
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
  });

  it('completes after last card', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows completion with scores', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    expect(screen.getByTestId('flashcard-complete')).toHaveTextContent('2 correct, 0 incorrect');
  });
});

describe('Flashcard hints', () => {
  it('shows hint button when hint is provided', () => {
    renderWidget({
      cards: [{ front: 'Test', back: 'Answer', hint: 'A helpful hint' }],
      interactive: true,
    });
    expect(screen.getByRole('button', { name: 'Show Hint' })).toBeInTheDocument();
  });

  it('toggles hint visibility', () => {
    renderWidget({
      cards: [{ front: 'Test', back: 'Answer', hint: 'A helpful hint' }],
      interactive: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show Hint' }));
    expect(screen.getByText('A helpful hint')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide Hint' }));
    expect(screen.queryByText('A helpful hint')).not.toBeInTheDocument();
  });
});

describe('Flashcard retry', () => {
  it('shows retry button when there are incorrect cards', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-incorrect'));
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    expect(screen.getByTestId('btn-retry')).toBeInTheDocument();
  });

  it('resets to incorrect cards on retry', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-incorrect'));
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    fireEvent.click(screen.getByTestId('btn-retry'));
    expect(screen.getByText('Hola')).toBeInTheDocument();
  });
});

describe('Flashcard observe mode', () => {
  it('shows all cards in observe mode', () => {
    renderWidget({
      cards: [
        { front: 'A', back: 'B' },
        { front: 'C', back: 'D' },
      ],
    });
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows acknowledge button in observe mode', () => {
    renderWidget({ cards: [{ front: 'A', back: 'B' }] });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });
});

describe('Flashcard accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget(baseConfig);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Flashcard activity');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('card is keyboard accessible', () => {
    renderWidget(baseConfig);
    const card = screen.getByTestId('flashcard-card');
    expect(card).toHaveAttribute('tabIndex', '0');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
