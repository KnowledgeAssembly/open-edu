import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { fractionVisual } from './FractionVisual';

const WidgetComponent = fractionVisual.render;

function renderWidget(config: Record<string, unknown> = {}) {
  const emitInteraction = vi.fn();
  const complete = vi.fn();
  const result = render(
    <WidgetComponent
      nodeId="test-node"
      config={config}
      emitInteraction={emitInteraction}
      complete={complete}
    />,
  );
  return { emitInteraction, complete, ...result };
}

function getShaded(container: HTMLElement, segment: string): Element[] {
  return Array.from(container.querySelectorAll(`[data-testid="${segment}"][data-shaded="true"]`));
}

function getUnshaded(container: HTMLElement, segment: string): Element[] {
  return Array.from(container.querySelectorAll(`[data-testid="${segment}"][data-shaded="false"]`));
}

describe('FractionVisual schema', () => {
  it('has correct widget id', () => {
    expect(fractionVisual.id).toBe('open-edu.fraction-visual');
  });

  it('has a render function', () => {
    expect(typeof fractionVisual.render).toBe('function');
  });
});

describe('FractionVisual observe mode', () => {
  it('renders a bar fraction with shaded parts', () => {
    const { container } = renderWidget({ numerator: 3, denominator: 5, mode: 'bar' });
    expect(screen.getByTestId('fraction-bar')).toBeTruthy();
    expect(screen.getAllByTestId('bar-segment')).toHaveLength(5);
    expect(getShaded(container, 'bar-segment')).toHaveLength(3);
  });

  it('renders a circle fraction with shaded parts', () => {
    const { container } = renderWidget({ numerator: 1, denominator: 4, mode: 'circle' });
    expect(screen.getByTestId('fraction-circle')).toBeTruthy();
    expect(getShaded(container, 'circle-segment')).toHaveLength(1);
    expect(getUnshaded(container, 'circle-segment')).toHaveLength(3);
  });

  it('shows fraction label', () => {
    renderWidget({ numerator: 3, denominator: 5, mode: 'bar', label: 'My Fraction' });
    expect(screen.getByText('My Fraction')).toBeTruthy();
  });

  it('does not show label when showLabel is false', () => {
    renderWidget({
      numerator: 3,
      denominator: 5,
      mode: 'bar',
      label: 'My Fraction',
      showLabel: false,
    });
    expect(screen.queryByText('My Fraction')).toBeNull();
  });

  it('completes when acknowledge button is clicked', () => {
    const { complete, emitInteraction } = renderWidget({
      numerator: 1,
      denominator: 4,
      mode: 'bar',
    });
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows content acknowledged after acknowledge click', () => {
    renderWidget({ numerator: 1, denominator: 4, mode: 'bar' });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });
});

describe('FractionVisual interactive mode', () => {
  it('renders clickable segments', () => {
    renderWidget({ numerator: 2, denominator: 4, mode: 'bar', interactive: true });
    expect(screen.getByTestId('fraction-bar')).toBeTruthy();
    expect(screen.getAllByTestId('bar-segment')).toHaveLength(4);
  });

  it('allows clicking segments to toggle shading', () => {
    const { container } = renderWidget({
      numerator: 2,
      denominator: 4,
      mode: 'bar',
      interactive: true,
    });
    expect(getShaded(container, 'bar-segment')).toHaveLength(2);
    const segments = screen.getAllByTestId('bar-segment');
    fireEvent.click(segments[2]!);
    expect(getShaded(container, 'bar-segment')).toHaveLength(3);
    fireEvent.click(segments[2]!);
    expect(getShaded(container, 'bar-segment')).toHaveLength(2);
  });

  it('submits with correct score when shaded matches numerator', () => {
    const { container, complete, emitInteraction } = renderWidget({
      numerator: 2,
      denominator: 4,
      mode: 'circle',
      interactive: true,
    });
    expect(getShaded(container, 'circle-segment')).toHaveLength(2);
    fireEvent.click(screen.getByText('Submit')!);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, shaded: 2 }),
    );
  });

  it('submits with incorrect score when shaded does not match numerator', () => {
    const { container, complete, emitInteraction } = renderWidget({
      numerator: 2,
      denominator: 4,
      mode: 'bar',
      interactive: true,
    });
    const segments = screen.getAllByTestId('bar-segment');
    fireEvent.click(segments[2]!);
    expect(getShaded(container, 'bar-segment')).toHaveLength(3);
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false, shaded: 3 }),
    );
  });

  it('submit button disabled when no segments have been clicked', () => {
    renderWidget({ numerator: 0, denominator: 4, mode: 'bar', interactive: true });
    expect(screen.getByText('Submit')).toBeDisabled();
  });

  it('shows result feedback after submission', () => {
    renderWidget({ numerator: 2, denominator: 4, mode: 'bar', interactive: true });
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Correct!')).toBeTruthy();
  });
});

describe('FractionVisual compare mode', () => {
  it('renders two fractions side by side with equals sign', () => {
    renderWidget({
      numerator: 1,
      denominator: 2,
      mode: 'bar',
      interactive: true,
      compare: { numerator: 2, denominator: 4 },
    });
    expect(screen.getByTestId('fraction-compare')).toBeTruthy();
    const bars = screen.getAllByTestId('fraction-bar');
    expect(bars).toHaveLength(2);
    expect(screen.getByText('=')).toBeTruthy();
  });

  it('shows < sign when compare fraction is smaller', () => {
    renderWidget({
      numerator: 3,
      denominator: 4,
      mode: 'bar',
      interactive: true,
      compare: { numerator: 1, denominator: 4 },
    });
    expect(screen.getByText('>')).toBeTruthy();
  });

  it('shows > sign when compare fraction is larger', () => {
    renderWidget({
      numerator: 1,
      denominator: 4,
      mode: 'bar',
      interactive: true,
      compare: { numerator: 3, denominator: 4 },
    });
    expect(screen.getByText('<')).toBeTruthy();
  });

  it('submits with score based on compare result', () => {
    const { complete } = renderWidget({
      numerator: 1,
      denominator: 2,
      mode: 'bar',
      interactive: true,
      compare: { numerator: 2, denominator: 4 },
    });
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100);
  });
});

describe('FractionVisual edge cases', () => {
  it('shows "too many parts" message for denominator > 12', () => {
    renderWidget({ numerator: 5, denominator: 15, mode: 'bar' });
    expect(screen.getByText('This fraction has too many parts to display visually.')).toBeTruthy();
  });

  it('shows config error for missing numerator', () => {
    renderWidget({ denominator: 4, mode: 'bar' });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for missing denominator', () => {
    renderWidget({ numerator: 1, mode: 'bar' });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for denominator less than 1', () => {
    renderWidget({ numerator: 1, denominator: 0, mode: 'bar' });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for invalid mode', () => {
    renderWidget({ numerator: 1, denominator: 4, mode: 'triangle' });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('defaults to bar mode', () => {
    renderWidget({ numerator: 1, denominator: 4 });
    expect(screen.getByTestId('fraction-bar')).toBeTruthy();
  });

  it('applies custom size with bar aspect ratio', () => {
    renderWidget({ numerator: 1, denominator: 4, mode: 'bar', size: 300 });
    const svg = screen.getByTestId('fraction-bar');
    expect(svg.getAttribute('width')).toBe('300');
    expect(svg.getAttribute('height')).toBe('75');
  });

  it('bar SVG is wider than tall', () => {
    renderWidget({ numerator: 1, denominator: 4, mode: 'bar', size: 200 });
    const svg = screen.getByTestId('fraction-bar');
    const width = parseInt(svg.getAttribute('width')!);
    const height = parseInt(svg.getAttribute('height')!);
    expect(width).toBeGreaterThan(height);
  });

  it('circle SVG remains square', () => {
    renderWidget({ numerator: 1, denominator: 4, mode: 'circle', size: 200 });
    const svg = screen.getByTestId('fraction-circle');
    const width = parseInt(svg.getAttribute('width')!);
    const height = parseInt(svg.getAttribute('height')!);
    expect(width).toBe(height);
  });
});

describe('FractionVisual accessibility', () => {
  it('has accessible SVG with aria-label', () => {
    renderWidget({ numerator: 1, denominator: 4, mode: 'bar' });
    const svg = screen.getByTestId('fraction-bar');
    expect(svg.getAttribute('aria-label')).toBeTruthy();
  });

  it('has live region for fraction value', () => {
    renderWidget({ numerator: 1, denominator: 4, mode: 'bar' });
    const liveRegion = screen.getByTestId('fraction-live-region');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.textContent).toContain('1');
    expect(liveRegion.textContent).toContain('4');
  });

  it('has aria-labels per segment', () => {
    renderWidget({ numerator: 1, denominator: 4, mode: 'bar' });
    const segments = screen.getAllByTestId('bar-segment');
    expect(segments[0]?.getAttribute('aria-label')).toBeTruthy();
  });

  it('renders fraction notation as numerator over denominator', () => {
    renderWidget({ numerator: 3, denominator: 5, mode: 'bar' });
    const liveRegion = screen.getByTestId('fraction-live-region');
    expect(liveRegion.textContent).toContain('3');
    expect(liveRegion.textContent).toContain('5');
  });
});

describe('FractionVisual hover states', () => {
  it('segments have cursor-pointer class in interactive mode', () => {
    renderWidget({ numerator: 2, denominator: 4, mode: 'bar', interactive: true });
    const segments = screen.getAllByTestId('bar-segment');
    const className = segments[0]?.getAttribute('class');
    expect(className).toContain('cursor-pointer');
  });

  it('segments do not have cursor-pointer in observe mode', () => {
    renderWidget({ numerator: 2, denominator: 4, mode: 'bar' });
    const segments = screen.getAllByTestId('bar-segment');
    const className = segments[0]?.getAttribute('class');
    expect(className).toBeFalsy();
  });
});

describe('FractionVisual feedback improvements', () => {
  it('shows specific feedback with shaded count on incorrect answer', () => {
    renderWidget({
      numerator: 2,
      denominator: 4,
      mode: 'bar',
      interactive: true,
    });
    const segments = screen.getAllByTestId('bar-segment');
    fireEvent.click(segments[2]!);
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('You shaded 3 out of 2 segments.')).toBeTruthy();
  });

  it('shows "Correct!" on correct answer', () => {
    renderWidget({ numerator: 2, denominator: 4, mode: 'bar', interactive: true });
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Correct!')).toBeTruthy();
  });
});
