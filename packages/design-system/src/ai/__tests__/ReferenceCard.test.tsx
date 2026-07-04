import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReferenceCard } from '../ReferenceCard.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('ReferenceCard', () => {
  it('renders title', () => {
    render(<ReferenceCard title="My Reference" />);
    expect(screen.getByText('My Reference')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(<ReferenceCard title="Ref" description="A description" />);
    expect(screen.getByText('A description')).toBeDefined();
  });

  it('shows link when url provided', () => {
    render(<ReferenceCard title="Ref" url="https://example.com" />);
    const link = screen.getByRole('link');
    expect(link).toBeDefined();
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('does not show link when url not provided', () => {
    render(<ReferenceCard title="Ref" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<ReferenceCard title="Test Reference" />);
  });
});
