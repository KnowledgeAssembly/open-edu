import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '../HeroSection';

describe('HeroSection', () => {
  it('renders default variant with expected padding', () => {
    const { container } = render(<HeroSection>Content</HeroSection>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('px-10');
    expect(el.className).toContain('py-12');
  });

  it('renders editorial variant', () => {
    const { container } = render(<HeroSection variant="editorial">Content</HeroSection>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('px-12');
    expect(el.className).toContain('py-16');
  });

  it('editorial with showIllustration renders OpenModule SVG', () => {
    const { container } = render(
      <HeroSection variant="editorial" showIllustration>
        Content
      </HeroSection>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('AssemblyFlow has aria-hidden="true"', () => {
    const { container } = render(<HeroSection>Content</HeroSection>);
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).toBeInTheDocument();
  });

  it('has data-testid="hero-section"', () => {
    render(<HeroSection>Content</HeroSection>);
    expect(screen.getByTestId('hero-section')).toBeInTheDocument();
  });
});
