import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaggerReveal } from '../StaggerReveal';

describe('StaggerReveal', () => {
  it('renders all children', () => {
    render(
      <StaggerReveal>
        <div>one</div>
        <div>two</div>
        <div>three</div>
      </StaggerReveal>,
    );
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
  });

  it('has stagger-reveal testid', () => {
    render(
      <StaggerReveal>
        <div>child</div>
      </StaggerReveal>,
    );
    expect(screen.getByTestId('stagger-reveal')).toBeInTheDocument();
  });

  it('has displayName set', () => {
    expect(StaggerReveal.displayName).toBe('StaggerReveal');
  });

  it('applies className prop', () => {
    render(
      <StaggerReveal className="custom-class">
        <div>child</div>
      </StaggerReveal>,
    );
    const container = screen.getByTestId('stagger-reveal');
    expect(container.className).toContain('custom-class');
  });

  it('applies delayMs to staggered children', () => {
    render(
      <StaggerReveal delayMs={200}>
        <div>one</div>
        <div>two</div>
      </StaggerReveal>,
    );
    const container = screen.getByTestId('stagger-reveal');
    const first = container.children[1] as HTMLElement;
    const second = container.children[2] as HTMLElement;
    expect(first.getAttribute('style')).toContain('0ms');
    expect(second.getAttribute('style')).toContain('200ms');
  });

  it('uses default delayMs of 100', () => {
    render(
      <StaggerReveal>
        <div>one</div>
        <div>two</div>
      </StaggerReveal>,
    );
    const container = screen.getByTestId('stagger-reveal');
    const second = container.children[2] as HTMLElement;
    expect(second.getAttribute('style')).toContain('100ms');
  });

  it('applies initialOpacity prop', () => {
    render(
      <StaggerReveal initialOpacity={0.5}>
        <div>child</div>
      </StaggerReveal>,
    );
    const container = screen.getByTestId('stagger-reveal');
    const wrapper = container.children[1] as HTMLElement;
    expect(wrapper.getAttribute('style')).toContain('0.5');
  });

  it('applies initialTranslateY prop', () => {
    render(
      <StaggerReveal initialTranslateY={20}>
        <div>child</div>
      </StaggerReveal>,
    );
    const container = screen.getByTestId('stagger-reveal');
    const wrapper = container.children[1] as HTMLElement;
    expect(wrapper.getAttribute('style')).toContain('20px');
  });

  it('handles empty children gracefully', () => {
    render(<StaggerReveal>{null}</StaggerReveal>);
    const container = screen.getByTestId('stagger-reveal');
    expect(container).toBeInTheDocument();
  });

  it('renders a single child', () => {
    render(
      <StaggerReveal>
        <div>only</div>
      </StaggerReveal>,
    );
    expect(screen.getByText('only')).toBeInTheDocument();
  });
});
