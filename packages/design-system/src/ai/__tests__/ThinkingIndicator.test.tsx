import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThinkingIndicator } from '../ThinkingIndicator.jsx';

describe('ThinkingIndicator', () => {
  it('shows default label', () => {
    render(<ThinkingIndicator />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('shows custom label', () => {
    render(<ThinkingIndicator label="Processing..." />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('has data-testid', () => {
    render(<ThinkingIndicator />);
    expect(screen.getByTestId('thinking-indicator')).toBeInTheDocument();
  });
});
