import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../context/RuntimeContext', () => ({
  useRuntime: () => ({
    loadedPackage: {
      manifest: { title: 'Test Course' },
      nodes: [],
    },
  }),
}));

vi.mock('./SkillSummary', () => ({
  SkillSummary: () => <div data-testid="skill-summary-mock" />,
}));

import { CompletionScreen } from './CompletionScreen';

describe('CompletionScreen', () => {
  it('renders completion message with course title', () => {
    render(<CompletionScreen onBack={vi.fn()} />);
    expect(screen.getByText('You finished Test Course!')).toBeInTheDocument();
  });

  it('shows badge list when badges provided', () => {
    render(<CompletionScreen onBack={vi.fn()} badges={['Badge 1', 'Badge 2']} />);
    expect(screen.getByText('Badge 1')).toBeInTheDocument();
    expect(screen.getByText('Badge 2')).toBeInTheDocument();
  });

  it('omits badges section when badges undefined', () => {
    render(<CompletionScreen onBack={vi.fn()} />);
    expect(screen.queryByText('Badges earned')).toBeNull();
  });

  it('calls onBack when button clicked', () => {
    const onBack = vi.fn();
    render(<CompletionScreen onBack={onBack} />);
    fireEvent.click(screen.getByTestId('back-to-catalog'));
    expect(onBack).toHaveBeenCalled();
  });
});
