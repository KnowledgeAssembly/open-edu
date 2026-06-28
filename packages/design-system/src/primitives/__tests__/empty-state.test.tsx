import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('EmptyState', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<EmptyState title="Empty" />);
  });
  it('renders title and description', () => {
    render(<EmptyState title="No results" description="Try a different search" />);
    expect(screen.getByText('No results')).toBeDefined();
    expect(screen.getByText('Try a different search')).toBeDefined();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="Empty" action={<button>Action</button>} />);
    expect(screen.getByText('Action')).toBeDefined();
  });

  it('passes through HTML attributes', () => {
    const { container } = render(<EmptyState title="Test" data-testid="empty" id="my-id" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('data-testid')).toBe('empty');
    expect(root.getAttribute('id')).toBe('my-id');
  });

  it('sets displayName', () => {
    expect(EmptyState.displayName).toBe('EmptyState');
  });
});
