import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BreakPage } from '../BreakPage';

describe('BreakPage', () => {
  it('renders Pipili (content mood)', () => {
    render(<BreakPage onBackToLearning={vi.fn()} />);
    expect(screen.getByRole('img', { name: /Pipili/i })).toHaveAttribute(
      'aria-label',
      'Pipili — content',
    );
  });

  it('renders Time to recharge heading', () => {
    render(<BreakPage onBackToLearning={vi.fn()} />);
    expect(screen.getByText('Time to recharge')).toBeInTheDocument();
  });

  it('renders suggestion chips', () => {
    render(<BreakPage onBackToLearning={vi.fn()} />);
    expect(screen.getByText('Drink water')).toBeInTheDocument();
    expect(screen.getByText('Stretch')).toBeInTheDocument();
    expect(screen.getByText('Rest eyes')).toBeInTheDocument();
    expect(screen.getByText('Breathe')).toBeInTheDocument();
  });

  it('renders Back to Learning button', () => {
    render(<BreakPage onBackToLearning={vi.fn()} />);
    expect(screen.getByText('Back to Learning')).toBeInTheDocument();
  });

  it('clicking Back to Learning calls onBackToLearning', () => {
    const onBackToLearning = vi.fn();
    render(<BreakPage onBackToLearning={onBackToLearning} />);
    fireEvent.click(screen.getByText('Back to Learning'));
    expect(onBackToLearning).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const axe = await import('axe-core');
    const { container } = render(<BreakPage onBackToLearning={vi.fn()} />);
    const results = await axe.default.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
