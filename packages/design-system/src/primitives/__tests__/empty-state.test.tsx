import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state.jsx';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No results" description="Try a different search" />);
    expect(screen.getByText('No results')).toBeDefined();
    expect(screen.getByText('Try a different search')).toBeDefined();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="Empty" action={<button>Action</button>} />);
    expect(screen.getByText('Action')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(EmptyState.displayName).toBe('EmptyState');
  });
});
