import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpenModule } from '../open-module';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('OpenModule', () => {
  it('renders with default size and satellites', () => {
    render(<OpenModule data-testid="module" />);
    const el = screen.getByTestId('module');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders with sm size', () => {
    render(<OpenModule size="sm" satellites={2} data-testid="module" />);
    const el = screen.getByTestId('module');
    const svg = el.querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
  });

  it('renders with lg size and 6 satellites', () => {
    render(<OpenModule size="lg" satellites={6} data-testid="module" />);
    const el = screen.getByTestId('module');
    const circles = el.querySelectorAll('svg > circle');
    // 1 orbit + 6 satellites + 1 core = 8 circles
    expect(circles.length).toBe(8);
  });

  it('clamps satellites to 2 minimum', () => {
    render(<OpenModule satellites={0} data-testid="module" />);
    const el = screen.getByTestId('module');
    const satellites = el.querySelectorAll('svg > circle');
    // Removing orbit, ring, and core: 1 orbit + 2 sats + 1 core = 4
    expect(satellites.length).toBe(4);
  });

  it('renders active state with ring', () => {
    render(<OpenModule state="active" data-testid="module" />);
    const el = screen.getByTestId('module');
    const circles = el.querySelectorAll('svg > circle');
    // 1 orbit + 3 sats + 1 ring + 1 core = 6
    expect(circles.length).toBe(6);
  });

  it('applies custom className', () => {
    render(<OpenModule className="inline-block" data-testid="module" />);
    expect(screen.getByTestId('module')).toHaveClass('inline-block');
  });

  describe('accessibility', () => {
    it('has no violations with default props', async () => {
      await checkAccessibility(<OpenModule />);
    });

    it('has no violations at sm size', async () => {
      await checkAccessibility(<OpenModule size="sm" satellites={2} />);
    });

    it('has no violations at lg size', async () => {
      await checkAccessibility(<OpenModule size="lg" satellites={6} />);
    });

    it('has no violations with active state', async () => {
      await checkAccessibility(<OpenModule state="active" />);
    });
  });
});
