import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AICallout } from '../AICallout.js';

const lightbulb = '\uD83D\uDCA1';

describe('AICallout', () => {
  it('renders title and children', () => {
    render(<AICallout title="Tip">Click the button to continue.</AICallout>);
    expect(screen.getByText('Tip')).toBeInTheDocument();
    expect(screen.getByText('Click the button to continue.')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <AICallout icon={lightbulb} title="Idea">
        Great idea!
      </AICallout>,
    );
    expect(container.textContent).toContain(lightbulb);
  });

  it('has complementary role', () => {
    render(
      <AICallout title="Tip">
        <p>Content</p>
      </AICallout>,
    );
    const el = screen.getByTestId('ai-callout');
    expect(el.getAttribute('role')).toBe('complementary');
  });

  it('has aria-label matching title', () => {
    render(
      <AICallout title="Learning Tip">
        <p>Content</p>
      </AICallout>,
    );
    const el = screen.getByTestId('ai-callout');
    expect(el.getAttribute('aria-label')).toBe('Learning Tip');
  });
});
