import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AICallout } from '../AICallout.jsx';

describe('AICallout', () => {
  it('renders title and children', () => {
    render(
      <AICallout title="Test Title">
        <p>Test content</p>
      </AICallout>,
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows icon when provided', () => {
    render(
      <AICallout title="Title" icon="💡">
        Content
      </AICallout>,
    );
    expect(screen.getByText('💡')).toBeInTheDocument();
  });

  it('does not render icon when not provided', () => {
    render(<AICallout title="Title">Content</AICallout>);
    expect(screen.queryByText('💡')).not.toBeInTheDocument();
  });

  it('has role="complementary"', () => {
    render(<AICallout title="Title">Content</AICallout>);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('has aria-label matching title', () => {
    render(<AICallout title="My Callout">Content</AICallout>);
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'My Callout');
  });
});
