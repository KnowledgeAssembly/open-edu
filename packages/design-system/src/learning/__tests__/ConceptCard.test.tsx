import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConceptCard } from '../ConceptCard.js';

describe('ConceptCard', () => {
  it('renders title', () => {
    render(<ConceptCard title="Key Concept">Explanation text</ConceptCard>);
    expect(screen.getByText('Key Concept')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <ConceptCard title="Concept">
        <p>Description</p>
      </ConceptCard>,
    );
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('shows icon when provided', () => {
    render(
      <ConceptCard title="Concept" icon="💡">
        Content
      </ConceptCard>,
    );
    expect(screen.getByText('💡')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(
      <ConceptCard title="Concept" className="custom-class">
        Content
      </ConceptCard>,
    );
    expect(screen.getByTestId('concept-card')).toHaveClass('custom-class');
  });
});
