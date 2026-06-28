import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBadge } from '../ProgressBadge.js';

describe('ProgressBadge', () => {
  it('shows "Complete" when isCompleted', () => {
    render(<ProgressBadge percentComplete={100} isCompleted />);
    expect(screen.getByTestId('progress-badge')).toHaveTextContent('Complete');
  });

  it('shows "In progress" when percentComplete > 0', () => {
    render(<ProgressBadge percentComplete={50} isCompleted={false} />);
    expect(screen.getByTestId('progress-badge')).toHaveTextContent('In progress');
  });

  it('shows "Not started" when percentComplete === 0', () => {
    render(<ProgressBadge percentComplete={0} isCompleted={false} />);
    expect(screen.getByTestId('progress-badge')).toHaveTextContent('Not started');
  });
});
