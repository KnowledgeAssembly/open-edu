import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressCard } from '../ProgressCard.js';
import type { ProgressCardProps } from '../ProgressCard.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

function makeProps(overrides: Partial<ProgressCardProps> = {}): ProgressCardProps {
  return {
    title: 'Intro to JavaScript',
    status: 'in-progress',
    currentSteps: 3,
    totalSteps: 8,
    percent: 37,
    lastTitle: 'Variables',
    lastStudied: '2 hours ago',
    badgeCount: 0,
    onContinue: vi.fn(),
    ...overrides,
  };
}

describe('ProgressCard', () => {
  it('renders title', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByText('Intro to JavaScript')).toBeInTheDocument();
  });

  it('shows Continue button for in-progress', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByRole('button', { name: /continue/i })).toHaveTextContent('Continue');
  });

  it('shows Completed badge when completed', () => {
    render(<ProgressCard {...makeProps({ status: 'completed' })} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows Review button when completed with onReview', () => {
    render(<ProgressCard {...makeProps({ status: 'completed', onReview: vi.fn() })} />);
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('shows step count', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByText('3 of 8 steps')).toBeInTheDocument();
  });

  it('shows last studied time', () => {
    render(<ProgressCard {...makeProps()} />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('shows badge count when present', () => {
    render(<ProgressCard {...makeProps({ badgeCount: 3 })} />);
    expect(screen.getByText('3 badges')).toBeInTheDocument();
  });

  it('calls onContinue when Continue clicked', () => {
    const onContinue = vi.fn();
    render(<ProgressCard {...makeProps({ onContinue })} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('calls onReview when Review clicked', () => {
    const onReview = vi.fn();
    render(<ProgressCard {...makeProps({ status: 'completed', onReview })} />);
    fireEvent.click(screen.getByText('Review'));
    expect(onReview).toHaveBeenCalledOnce();
  });

  it('calls onContinue when card clicked', () => {
    const onContinue = vi.fn();
    render(<ProgressCard {...makeProps({ onContinue })} />);
    fireEvent.click(screen.getByTestId('progress-card'));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('applies shadow styling for card appearance', () => {
    const { container } = render(<ProgressCard {...makeProps()} />);
    expect(container.firstChild).toHaveClass('shadow-elevation-raised');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<ProgressCard {...makeProps()} />);
  });
});
