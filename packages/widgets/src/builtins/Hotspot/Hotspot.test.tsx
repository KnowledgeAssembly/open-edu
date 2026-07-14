import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { hotspot } from './Hotspot';

const WidgetComponent = hotspot.render;

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

const defaultConfig = {
  image: 'assets/images/map.png',
  altText: 'A map with regions',
  hotspots: [
    {
      id: 'mh',
      x: 45,
      y: 55,
      radius: 8,
      label: 'Maharashtra',
      correct: true,
      description: 'Capital: Mumbai',
    },
    { id: 'ka', x: 42, y: 65, radius: 8, label: 'Karnataka', correct: false },
    { id: 'dl', x: 48, y: 30, radius: 8, label: 'Delhi', correct: false },
  ],
  mode: 'single',
};

describe('Hotspot schema', () => {
  it('has correct widget id', () => {
    expect(hotspot.id).toBe('core.hotspot');
  });

  it('has a render function', () => {
    expect(typeof hotspot.render).toBe('function');
  });

  it('renders image with alt text', () => {
    renderWidget({ ...defaultConfig, interactive: false });
    const img = screen.getByTestId('hotspot-image');
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('A map with regions');
  });

  it('validates minimum 1 hotspot', () => {
    renderWidget({ image: 'test.png', altText: 'test', hotspots: [], interactive: false });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows error for missing image', () => {
    renderWidget({
      altText: 'test',
      hotspots: [{ id: 'a', x: 50, y: 50, label: 'A' }],
      interactive: false,
    });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows error for missing altText', () => {
    renderWidget({
      image: 'test.png',
      hotspots: [{ id: 'a', x: 50, y: 50, label: 'A' }],
      interactive: false,
    });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('Hotspot observe mode', () => {
  const observeConfig = { ...defaultConfig, interactive: false };

  it('renders the image', () => {
    renderWidget(observeConfig);
    expect(screen.getByTestId('hotspot-image')).toBeTruthy();
  });

  it('shows correct hotspots highlighted', () => {
    renderWidget(observeConfig);
    const correctHotspot = screen.getByTestId('observe-hotspot-mh');
    expect(correctHotspot).toBeTruthy();
  });

  it('shows descriptions for correct hotspots', () => {
    renderWidget(observeConfig);
    expect(screen.getByTestId('observe-description-mh')).toBeTruthy();
    expect(screen.getByText('Capital: Mumbai')).toBeTruthy();
  });

  it('completes after clicking acknowledge', () => {
    const { complete, emitInteraction } = renderWidget(observeConfig);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after acknowledge', () => {
    renderWidget(observeConfig);
    fireEvent.click(screen.getByText('Acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });

  it('shows config error for invalid config', () => {
    renderWidget({ interactive: false });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('Hotspot interactive single mode', () => {
  const interactiveConfig = { ...defaultConfig, mode: 'single', interactive: true };

  it('renders hotspot buttons', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('hotspot-mh')).toBeTruthy();
    expect(screen.getByTestId('hotspot-ka')).toBeTruthy();
    expect(screen.getByTestId('hotspot-dl')).toBeTruthy();
  });

  it('clicking correct hotspot calls complete with 100', () => {
    const { complete, emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'core.hotspot' }),
    );
  });

  it('clicking correct hotspot shows success feedback', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Correct!');
  });

  it('clicking wrong hotspot shows try again message', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('hotspot-ka'));
    expect(screen.getByTestId('feedback')).toHaveTextContent(/Try again/);
  });

  it('clicking wrong hotspot increments attempt count', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('hotspot-ka'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('hotspot-dl'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('hotspot-ka'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('after max attempts, reveals correct answer and completes with 0', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('hotspot-ka'));
    fireEvent.click(screen.getByTestId('hotspot-dl'));
    fireEvent.click(screen.getByTestId('hotspot-ka'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
    expect(screen.getByTestId('feedback')).toHaveTextContent(/No more attempts/);
  });

  it('shows selected label after clicking', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    expect(screen.getByText(/Selected: Maharashtra/)).toBeTruthy();
  });
});

describe('Hotspot interactive multiple mode', () => {
  const multipleConfig = {
    image: 'assets/images/map.png',
    altText: 'A map with regions',
    hotspots: [
      { id: 'mh', x: 45, y: 55, radius: 8, label: 'Maharashtra', correct: true },
      { id: 'ka', x: 42, y: 65, radius: 8, label: 'Karnataka', correct: true },
      { id: 'dl', x: 48, y: 30, radius: 8, label: 'Delhi', correct: false },
    ],
    mode: 'multiple',
    interactive: true,
  };

  it('renders submit button', () => {
    renderWidget(multipleConfig);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('submit button is disabled when nothing selected', () => {
    renderWidget(multipleConfig);
    expect(screen.getByText('Submit')).toBeDisabled();
  });

  it('clicking hotspot toggles selection', () => {
    renderWidget(multipleConfig);
    const mh = screen.getByTestId('hotspot-mh');
    fireEvent.click(mh);
    expect(mh.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(mh);
    expect(mh.getAttribute('aria-pressed')).toBe('false');
  });

  it('submit enabled when at least one selected', () => {
    renderWidget(multipleConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('scores proportionally for multiple mode', () => {
    const { complete } = renderWidget(multipleConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    fireEvent.click(screen.getByTestId('hotspot-dl'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(50, expect.any(Object));
  });

  it('scores 100 when all correct selected', () => {
    const { complete } = renderWidget(multipleConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    fireEvent.click(screen.getByTestId('hotspot-ka'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows feedback after submission', () => {
    renderWidget(multipleConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
  });

  it('submit button removed after submission', () => {
    renderWidget(multipleConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('shows selected info in multiple mode', () => {
    renderWidget(multipleConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    expect(screen.getByTestId('selected-info')).toBeTruthy();
  });
});

describe('Hotspot keyboard accessibility', () => {
  const interactiveConfig = { ...defaultConfig, interactive: true };

  it('hotspots have role button', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('hotspot-mh').getAttribute('role')).toBe('button');
  });

  it('hotspots have tabIndex 0', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('hotspot-mh').getAttribute('tabindex')).toBe('0');
  });

  it('hotspots have aria-label with label text', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByLabelText('Maharashtra')).toBeTruthy();
    expect(screen.getByLabelText('Karnataka')).toBeTruthy();
  });

  it('supports Enter key to select', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.keyDown(screen.getByTestId('hotspot-mh'), { key: 'Enter' });
    expect(complete).toHaveBeenCalled();
  });

  it('supports Space key to select', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.keyDown(screen.getByTestId('hotspot-mh'), { key: ' ' });
    expect(complete).toHaveBeenCalled();
  });

  it('aria-pressed reflects selection state', () => {
    renderWidget({ ...interactiveConfig, mode: 'multiple' });
    const mh = screen.getByTestId('hotspot-mh');
    expect(mh.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(mh);
    expect(mh.getAttribute('aria-pressed')).toBe('true');
  });

  it('container has role group and aria label', () => {
    renderWidget({ ...defaultConfig, interactive: false });
    const container = screen.getByTestId('hotspot');
    expect(container.getAttribute('role')).toBe('group');
    expect(container.getAttribute('aria-label')).toBe('Hotspot regions');
  });

  it('has live region for feedback', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    expect(screen.getByTestId('feedback').getAttribute('aria-live')).toBe('assertive');
  });
});

describe('Hotspot edge cases', () => {
  it('defaults to observe mode when interactive not specified', () => {
    renderWidget({ ...defaultConfig });
    expect(screen.queryByTestId('hotspot-mh')?.getAttribute('role')).not.toBe('button');
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget({ ...defaultConfig, interactive: false });
    expect(complete).not.toHaveBeenCalled();
  });

  it('handles single hotspot', () => {
    const { complete } = renderWidget({
      image: 'test.png',
      altText: 'test',
      hotspots: [{ id: 'only', x: 50, y: 50, label: 'Only', correct: true }],
      interactive: true,
      mode: 'single',
    });
    fireEvent.click(screen.getByTestId('hotspot-only'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('handles many hotspots', () => {
    const manyHotspots = Array.from({ length: 8 }, (_, i) => ({
      id: `h${i}`,
      x: 10 + i * 10,
      y: 50,
      radius: 5,
      label: `Hotspot ${i}`,
      correct: i === 0,
    }));
    renderWidget({
      image: 'test.png',
      altText: 'test',
      hotspots: manyHotspots,
      interactive: false,
    });
    const items = screen.getAllByTestId(/^observe-hotspot-/);
    expect(items).toHaveLength(8);
  });

  it('clicking in observe mode does nothing', () => {
    renderWidget({ ...defaultConfig, interactive: false });
    const observeHotspot = screen.getByTestId('observe-hotspot-mh');
    fireEvent.click(observeHotspot);
    expect(screen.queryByTestId('feedback')).toBeNull();
  });

  it('emits interaction on correct click in single mode', () => {
    const { emitInteraction } = renderWidget({ ...defaultConfig, interactive: true });
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'click', hotspotId: 'mh', widgetId: 'core.hotspot' }),
    );
  });

  it('emits interaction on submit in multiple mode', () => {
    const { emitInteraction } = renderWidget({
      ...defaultConfig,
      mode: 'multiple',
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('hotspot-mh'));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'submit', widgetId: 'core.hotspot' }),
    );
  });
});

describe('Hotspot hints', () => {
  const hintConfig = {
    ...defaultConfig,
    interactive: true,
    hints: ['Look at the western coast', 'Consider the geography'],
  };

  it('renders hint text when provided', () => {
    renderWidget(hintConfig);
    expect(screen.getByText('Look at the western coast')).toBeTruthy();
  });

  it('renders More help button for multiple hints', () => {
    renderWidget(hintConfig);
    expect(screen.getByText('More help')).toBeTruthy();
    fireEvent.click(screen.getByText('More help'));
    expect(screen.getByText('Consider the geography')).toBeTruthy();
    expect(screen.queryByText('More help')).toBeNull();
  });
});

describe('Hotspot multi-mode edge cases', () => {
  it('scores 0 when no correct selected in multiple mode', () => {
    const { complete } = renderWidget({
      image: 'test.png',
      altText: 'test',
      hotspots: [
        { id: 'a', x: 50, y: 50, label: 'A', correct: true },
        { id: 'b', x: 30, y: 30, label: 'B', correct: false },
      ],
      mode: 'multiple',
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('hotspot-b'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('scores proportionally with partial correct', () => {
    const { complete } = renderWidget({
      image: 'test.png',
      altText: 'test',
      hotspots: [
        { id: 'a', x: 50, y: 50, label: 'A', correct: true },
        { id: 'b', x: 30, y: 30, label: 'B', correct: true },
        { id: 'c', x: 70, y: 70, label: 'C', correct: false },
      ],
      mode: 'multiple',
      interactive: true,
    });
    fireEvent.click(screen.getByTestId('hotspot-a'));
    fireEvent.click(screen.getByTestId('hotspot-c'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(50, expect.any(Object));
  });
});
