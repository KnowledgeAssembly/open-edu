import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders a progressbar role with aria value attributes', () => {
    const { getByRole } = render(<ProgressBar current={2} total={5} />);
    const bar = getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
  });

  it('default aria-label describes current and total', () => {
    const { getByRole } = render(<ProgressBar current={1} total={4} />);
    expect(getByRole('progressbar').getAttribute('aria-label')).toContain('1 of 4');
  });

  it('uses a custom aria-label when provided', () => {
    const { getByRole } = render(<ProgressBar current={3} total={10} label="Step progress" />);
    expect(getByRole('progressbar').getAttribute('aria-label')).toBe('Step progress');
  });

  it('fills to the correct percentage', () => {
    const { container } = render(<ProgressBar current={1} total={4} />);
    const fill = container.querySelector('[role="progressbar"] > div');
    expect(fill?.getAttribute('style')).toContain('translateX(-75%)');
  });

  it('clamps current to [0, total]', () => {
    const { getByRole: getBarLow } = render(<ProgressBar current={-5} total={4} />);
    expect(getBarLow('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('clamps current above total down to total', () => {
    const { getByRole, getByText } = render(<ProgressBar current={99} total={4} />);
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('4');
    expect(getByText('4 / 4')).toBeInTheDocument();
  });

  it('shows a numeric label by default', () => {
    const { getByText } = render(<ProgressBar current={2} total={7} />);
    expect(getByText('2 / 7')).toBeInTheDocument();
  });

  it('hides the numeric label when showLabel is false', () => {
    const { container } = render(<ProgressBar current={2} total={7} showLabel={false} />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(0);
  });

  it('handles zero total safely', () => {
    const { getByRole } = render(<ProgressBar current={0} total={0} />);
    const bar = getByRole('progressbar');
    expect(bar.getAttribute('aria-valuemax')).toBe('0');
  });
});
