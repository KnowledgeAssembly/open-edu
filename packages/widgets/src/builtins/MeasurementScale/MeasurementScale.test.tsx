import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { measurementScale } from './MeasurementScale';

const WidgetComponent = measurementScale.render;

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

describe('MeasurementScale widget definition', () => {
  it('has correct widget id', () => {
    expect(measurementScale.id).toBe('math.measurement-scale');
  });

  it('has a render function', () => {
    expect(typeof measurementScale.render).toBe('function');
  });
});

describe('MeasurementScale config validation', () => {
  it('renders error for invalid config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for missing type', () => {
    renderWidget({ min: 0, max: 10, step: 1, unit: 'cm' });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for missing unit', () => {
    renderWidget({ type: 'ruler', min: 0, max: 10, step: 1 });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('MeasurementScale observe mode', () => {
  const observeConfig = {
    type: 'ruler' as const,
    min: 0,
    max: 10,
    step: 1,
    unit: 'cm',
    value: 5,
    showReading: true,
    interactive: false,
  };

  it('renders ruler SVG in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.getByTestId('ruler-svg')).toBeInTheDocument();
  });

  it('shows current reading in live region', () => {
    renderWidget(observeConfig);
    expect(screen.getByTestId('reading-live-region')).toHaveTextContent('5cm');
  });

  it('completes when acknowledge button is clicked', () => {
    const { complete, emitInteraction } = renderWidget(observeConfig);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows content acknowledged after acknowledge click', () => {
    renderWidget(observeConfig);
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByTestId('observe-complete')).toHaveTextContent('Content acknowledged.');
  });
});

describe('MeasurementScale thermometer observe mode', () => {
  it('renders thermometer SVG', () => {
    renderWidget({
      type: 'thermometer',
      min: 0,
      max: 100,
      step: 1,
      unit: '°C',
      value: 37,
      interactive: false,
    });
    expect(screen.getByTestId('thermometer-svg')).toBeInTheDocument();
  });
});

describe('MeasurementScale cylinder observe mode', () => {
  it('renders cylinder SVG', () => {
    renderWidget({
      type: 'cylinder',
      min: 0,
      max: 100,
      step: 1,
      unit: 'mL',
      value: 50,
      interactive: false,
    });
    expect(screen.getByTestId('cylinder-svg')).toBeInTheDocument();
  });
});

describe('MeasurementScale interactive mode', () => {
  const interactiveConfig = {
    type: 'ruler' as const,
    min: 0,
    max: 10,
    step: 1,
    unit: 'cm',
    interactive: true,
    targetValue: 5,
    showReading: true,
    showLabels: true,
  };

  it('renders submit button in interactive mode', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  it('starts with min value when no value given', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('reading-live-region')).toHaveTextContent('0cm');
  });

  it('allows arrow key navigation', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(screen.getByTestId('reading-live-region')).toHaveTextContent('1cm');
    fireEvent.keyDown(svg, { key: 'ArrowLeft' });
    expect(screen.getByTestId('reading-live-region')).toHaveTextContent('0cm');
  });

  it('submits correct score when value matches target', () => {
    const { complete, emitInteraction } = renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');

    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    fireEvent.keyDown(svg, { key: 'ArrowRight' });

    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'submit', value: 5, targetValue: 5, correct: true }),
    );
  });

  it('submits score 0 when value does not match target', () => {
    const { complete, emitInteraction } = renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });

    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'submit', value: 1, targetValue: 5, correct: false }),
    );
  });

  it('shows correct feedback on correct answer', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(svg, { key: 'ArrowRight' });
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Correct!');
  });

  it('shows expected value on incorrect answer', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Expected 5cm');
  });

  it('allows Enter key to submit', () => {
    const { complete } = renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(svg, { key: 'ArrowRight' });
    }
    fireEvent.keyDown(svg, { key: 'Enter' });
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('allows Space key to submit', () => {
    const { complete } = renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(svg, { key: 'ArrowRight' });
    }
    fireEvent.keyDown(svg, { key: ' ' });
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('disables interaction after submit', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(svg, { key: 'ArrowRight' });
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(screen.queryByTestId('submit-btn')).toBeNull();
  });

  it('updates value on click', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    const rect = svg.getBoundingClientRect();
    const midX = rect.left + rect.width * 0.5;
    fireEvent.click(svg, { clientX: midX, clientY: rect.top + rect.height / 2 });
    expect(screen.getByTestId('reading-live-region')).not.toHaveTextContent('0cm');
  });
});

describe('MeasurementScale touch support', () => {
  const interactiveConfig = {
    type: 'ruler' as const,
    min: 0,
    max: 10,
    step: 1,
    unit: 'cm',
    interactive: true,
    targetValue: 5,
    showReading: true,
  };

  it('updates value on touch start', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    const rect = svg.getBoundingClientRect();
    const midX = rect.left + rect.width * 0.5;
    fireEvent.touchStart(svg, {
      touches: [{ clientX: midX, clientY: rect.top + rect.height / 2 }],
    });
    expect(screen.getByTestId('reading-live-region')).not.toHaveTextContent('0cm');
  });

  it('updates value on touch move', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    const rect = svg.getBoundingClientRect();
    fireEvent.touchStart(svg, {
      touches: [{ clientX: rect.left, clientY: rect.top }],
    });
    fireEvent.touchMove(svg, {
      touches: [{ clientX: rect.left + rect.width * 0.7, clientY: rect.top + rect.height / 2 }],
    });
    expect(screen.getByTestId('reading-live-region')).not.toHaveTextContent('0cm');
  });

  it('thermometer responds to touch', () => {
    renderWidget({
      type: 'thermometer',
      min: 0,
      max: 100,
      step: 1,
      unit: '°C',
      interactive: true,
      value: 0,
    });
    const svg = screen.getByTestId('thermometer-svg');
    const rect = svg.getBoundingClientRect();
    fireEvent.touchStart(svg, {
      touches: [{ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height * 0.3 }],
    });
    expect(screen.getByTestId('reading-live-region')).not.toHaveTextContent('0°C');
  });
});

describe('MeasurementScale floating reading label', () => {
  it('shows reading inside ruler SVG in interactive mode', () => {
    renderWidget({
      type: 'ruler',
      min: 0,
      max: 10,
      step: 1,
      unit: 'cm',
      interactive: true,
      value: 5,
      showReading: true,
    });
    const svg = screen.getByTestId('ruler-svg');
    const textElements = svg.querySelectorAll('text');
    const readingText = Array.from(textElements).find((t) => t.textContent === '5cm');
    expect(readingText).toBeTruthy();
  });

  it('shows reading inside thermometer SVG in interactive mode', () => {
    renderWidget({
      type: 'thermometer',
      min: 0,
      max: 100,
      step: 1,
      unit: '°C',
      interactive: true,
      value: 37,
      showReading: true,
    });
    const svg = screen.getByTestId('thermometer-svg');
    const textElements = svg.querySelectorAll('text');
    const readingText = Array.from(textElements).find((t) => t.textContent === '37°C');
    expect(readingText).toBeTruthy();
  });

  it('shows reading inside cylinder SVG in interactive mode', () => {
    renderWidget({
      type: 'cylinder',
      min: 0,
      max: 100,
      step: 1,
      unit: 'mL',
      interactive: true,
      value: 50,
      showReading: true,
    });
    const svg = screen.getByTestId('cylinder-svg');
    const textElements = svg.querySelectorAll('text');
    const readingText = Array.from(textElements).find((t) => t.textContent === '50mL');
    expect(readingText).toBeTruthy();
  });
});

describe('MeasurementScale indicator color', () => {
  it('uses blue (not red) as default indicator color for ruler', () => {
    renderWidget({
      type: 'ruler',
      min: 0,
      max: 10,
      step: 1,
      unit: 'cm',
      interactive: true,
      value: 5,
    });
    const svg = screen.getByTestId('ruler-svg');
    const polygon = svg.querySelector('polygon');
    expect(polygon).toBeTruthy();
    const fill = polygon?.getAttribute('fill');
    expect(fill).not.toBe('#ef4444');
    expect(fill).toContain('oe-color-primary');
  });

  it('uses blue (not red) as default indicator color for thermometer', () => {
    renderWidget({
      type: 'thermometer',
      min: 0,
      max: 100,
      step: 1,
      unit: '°C',
      interactive: true,
      value: 37,
    });
    const svg = screen.getByTestId('thermometer-svg');
    const circles = svg.querySelectorAll('circle');
    const bulb = circles[0];
    expect(bulb).toBeTruthy();
    const fill = bulb?.getAttribute('fill');
    expect(fill).not.toBe('#ef4444');
    expect(fill).toContain('oe-color-primary');
  });

  it('uses green indicator color after submission', () => {
    renderWidget({
      type: 'ruler',
      min: 0,
      max: 10,
      step: 1,
      unit: 'cm',
      interactive: true,
      targetValue: 5,
      value: 5,
    });
    fireEvent.click(screen.getByTestId('submit-btn'));
    const svg = screen.getByTestId('ruler-svg');
    const polygon = svg.querySelector('polygon');
    expect(polygon?.getAttribute('fill')).toContain('oe-color-success');
  });
});

describe('MeasurementScale scoring tolerance', () => {
  it('scores correct when within step tolerance', () => {
    const { complete } = renderWidget({
      type: 'ruler',
      min: 0,
      max: 10,
      step: 1,
      unit: 'cm',
      interactive: true,
      targetValue: 5,
      value: 6,
    });
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('scores incorrect when outside step tolerance', () => {
    const { complete } = renderWidget({
      type: 'ruler',
      min: 0,
      max: 10,
      step: 1,
      unit: 'cm',
      interactive: true,
      targetValue: 5,
      value: 3,
    });
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });
});

describe('MeasurementScale accessibility', () => {
  const interactiveConfig = {
    type: 'ruler' as const,
    min: 0,
    max: 10,
    step: 1,
    unit: 'cm',
    interactive: true,
    targetValue: 5,
  };

  it('has live region for current reading', () => {
    renderWidget(interactiveConfig);
    const liveRegion = screen.getByTestId('reading-live-region');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('uses aria-live for feedback after submit', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(svg, { key: 'ArrowRight' });
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    const feedback = screen.getByTestId('feedback');
    expect(feedback.getAttribute('aria-live')).toBe('assertive');
  });

  it('has aria-label on SVG', () => {
    renderWidget(interactiveConfig);
    const svg = screen.getByTestId('ruler-svg');
    expect(svg.getAttribute('aria-label')).toContain('Ruler scale');
  });

  it('thermometer has aria-label', () => {
    renderWidget({
      type: 'thermometer',
      min: 0,
      max: 100,
      step: 1,
      unit: '°C',
      interactive: true,
      targetValue: 37,
    });
    const svg = screen.getByTestId('thermometer-svg');
    expect(svg.getAttribute('aria-label')).toContain('Thermometer scale');
  });

  it('cylinder has aria-label', () => {
    renderWidget({
      type: 'cylinder',
      min: 0,
      max: 100,
      step: 1,
      unit: 'mL',
      interactive: true,
      targetValue: 50,
    });
    const svg = screen.getByTestId('cylinder-svg');
    expect(svg.getAttribute('aria-label')).toContain('Graduated cylinder');
  });
});

describe('MeasurementScale description', () => {
  it('renders description when provided', () => {
    renderWidget({
      type: 'ruler',
      min: 0,
      max: 10,
      step: 1,
      unit: 'cm',
      description: 'Measure the line',
    });
    expect(screen.getByText('Measure the line')).toBeInTheDocument();
  });

  it('hides reading when showReading is false', () => {
    renderWidget({
      type: 'ruler',
      min: 0,
      max: 10,
      step: 1,
      unit: 'cm',
      value: 5,
      showReading: false,
    });
    expect(screen.getByTestId('reading-live-region')).toHaveTextContent('');
  });
});
