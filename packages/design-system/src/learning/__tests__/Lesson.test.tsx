import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Lesson } from '../Lesson.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Lesson', () => {
  it('renders title', () => {
    render(<Lesson title="Introduction">Content</Lesson>);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Lesson title="Test">
        <p>Child content</p>
      </Lesson>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(
      <Lesson title="Test" className="custom-class">
        Content
      </Lesson>,
    );
    expect(screen.getByTestId('lesson')).toHaveClass('custom-class');
  });

  it('renders icon when provided', () => {
    render(
      <Lesson title="Test" icon="🔬">
        Content
      </Lesson>,
    );
    expect(screen.getByText('🔬')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<Lesson title="Test">Accessible content</Lesson>);
  });
});
