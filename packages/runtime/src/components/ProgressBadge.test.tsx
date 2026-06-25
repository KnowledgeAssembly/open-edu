import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBadge } from './ProgressBadge';

describe('ProgressBadge', () => {
  it('renders "Not started" at 0% not completed', () => {
    render(<ProgressBadge percentComplete={0} isCompleted={false} />);
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it('renders "In progress" at 50% not completed', () => {
    render(<ProgressBadge percentComplete={50} isCompleted={false} />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('renders "Complete" at 0% completed', () => {
    render(<ProgressBadge percentComplete={0} isCompleted={true} />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });
});
