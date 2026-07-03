import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SilhouetteAssembly } from '../silhouette-assembly';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('SilhouetteAssembly', () => {
  it('renders with default proportion and palette', () => {
    render(<SilhouetteAssembly data-testid="fig" />);
    const el = screen.getByTestId('fig');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'img');
    expect(el).toHaveAttribute('aria-label', 'Person — med');
  });

  it('renders head and torso divs', () => {
    render(<SilhouetteAssembly data-testid="fig" />);
    const el = screen.getByTestId('fig');
    const children = el.querySelectorAll(':scope > div');
    expect(children.length).toBe(2);
  });

  it('renders all proportion variants', () => {
    const proportions = ['tall', 'med', 'short', 'wide', 'narrow'] as const;
    for (const prop of proportions) {
      const { unmount } = render(
        <SilhouetteAssembly proportion={prop} data-testid={`fig-${prop}`} />,
      );
      expect(screen.getByTestId(`fig-${prop}`)).toHaveAttribute('aria-label', `Person — ${prop}`);
      unmount();
    }
  });

  it('renders all palette variants', () => {
    const palettes = [1, 2, 3, 4, 5] as const;
    for (const pal of palettes) {
      const { unmount } = render(
        <SilhouetteAssembly proportion="med" palette={pal} data-testid={`fig-${pal}`} />,
      );
      const children = screen.getByTestId(`fig-${pal}`).querySelectorAll(':scope > div');
      expect(children.length).toBe(2);
      unmount();
    }
  });

  it('renders head as rounded-full', () => {
    render(<SilhouetteAssembly data-testid="fig" />);
    const head = screen.getByTestId('fig').querySelector(':scope > div:first-child');
    expect(head).toHaveClass('rounded-full');
  });

  it('renders torso with pill-like rounding', () => {
    render(<SilhouetteAssembly data-testid="fig" />);
    const torso = screen.getByTestId('fig').querySelector(':scope > div:last-child');
    expect(torso).toHaveClass('rounded-[50%_50%_30%_30%]');
  });

  it('applies custom className', () => {
    render(<SilhouetteAssembly className="mx-auto" data-testid="fig" />);
    expect(screen.getByTestId('fig')).toHaveClass('mx-auto');
  });

  describe('accessibility', () => {
    it('has no violations with default props', async () => {
      await checkAccessibility(<SilhouetteAssembly />);
    });

    it('has no violations with tall proportion', async () => {
      await checkAccessibility(<SilhouetteAssembly proportion="tall" />);
    });

    it('has no violations with palette 3', async () => {
      await checkAccessibility(<SilhouetteAssembly palette={3} />);
    });

    it('has no violations in a group portrait', async () => {
      await checkAccessibility(
        <div role="img" aria-label="A group of people">
          <SilhouetteAssembly proportion="tall" palette={1} />
          <SilhouetteAssembly proportion="med" palette={2} />
          <SilhouetteAssembly proportion="short" palette={3} />
        </div>,
      );
    });
  });
});
