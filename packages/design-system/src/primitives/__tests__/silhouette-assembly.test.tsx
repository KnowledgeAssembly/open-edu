import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SilhouetteAssembly, paletteColors } from '../silhouette-assembly.js';

describe('SilhouetteAssembly', () => {
  const palettes = [1, 2, 3, 4, 5] as const;
  const proportions = ['tall', 'med', 'short', 'wide', 'narrow'] as const;

  it('palette colors match Visual DNA spec', () => {
    expect(paletteColors[1]).toBe('var(--oe-color-primary)');
    expect(paletteColors[2]).toBe('var(--oe-color-accent)');
    expect(paletteColors[3]).toBe('var(--oe-color-tertiary)');
    expect(paletteColors[4]).toBe('var(--oe-color-primary-light)');
    expect(paletteColors[5]).toBe('var(--oe-color-success)');
  });

  it('renders all 5 palettes without error', () => {
    for (const palette of palettes) {
      const { container } = render(<SilhouetteAssembly palette={palette} />);
      expect(container.firstChild).toBeTruthy();
    }
  });

  it('renders all 5 proportions without error', () => {
    for (const proportion of proportions) {
      const { container } = render(<SilhouetteAssembly proportion={proportion} />);
      expect(container.firstChild).toBeTruthy();
    }
  });

  it('renders with correct aria label', () => {
    render(<SilhouetteAssembly proportion="tall" />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Person — tall');
  });

  it('renders as img role for accessibility', () => {
    const { container } = render(<SilhouetteAssembly />);
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute('role')).toBe('img');
  });

  it('applies custom className', () => {
    const { container } = render(<SilhouetteAssembly className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
