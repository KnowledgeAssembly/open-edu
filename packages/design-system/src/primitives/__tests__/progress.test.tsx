import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from '../progress.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Progress', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Progress value={50} label="Loading progress" />);
  });
  it('renders with value', () => {
    render(<Progress value={50} />);
    const root = screen.getByRole('progressbar');
    expect(root).toBeDefined();
  });

  it('renders with current and total', () => {
    render(<Progress current={3} total={10} />);
    const root = screen.getByRole('progressbar');
    expect(root).toHaveAttribute('aria-valuenow', '3');
    expect(root).toHaveAttribute('aria-valuemax', '10');
  });

  it('renders label when showLabel is true', () => {
    render(<Progress current={3} total={10} showLabel />);
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });

  it('computes correct percentage from current/total', () => {
    render(<Progress current={1} total={4} />);
    const indicator = screen.getByRole('progressbar').querySelector('[class*="bg-primary"]');
    expect(indicator?.getAttribute('style')).toContain('translateX(-75%)');
  });

  it('clamps current to [0, total]', () => {
    render(<Progress current={-5} total={4} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles zero total safely', () => {
    render(<Progress current={0} total={0} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '0');
  });

  it('hides numeric label when showLabel is false', () => {
    const { container } = render(<Progress current={3} total={10} showLabel={false} />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(0);
  });

  it('sets displayName', () => {
    expect(Progress.displayName).toBe('Progress');
  });
});
