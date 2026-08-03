import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { timeline } from './Timeline';

const WidgetComponent = timeline.render;

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

const defaultEvents = [
  { id: 'evap', title: 'Evaporation', icon: '☀️', description: 'Water rises as vapor' },
  { id: 'cond', title: 'Condensation', icon: '☁️', description: 'Vapor cools and forms clouds' },
  { id: 'rain', title: 'Rain', icon: '🌧️', description: 'Water falls as precipitation' },
  { id: 'collect', title: 'Collection', icon: '🌊', description: 'Water collects in oceans' },
];

function getEventIdsFromDom(): string[] {
  const items = screen.getAllByTestId(/^timeline-event-/);
  return items.map((el) => {
    const testId = el.getAttribute('data-testid')!;
    return testId.replace('timeline-event-', '');
  });
}

function expectedScore(order: string[], correct: string[]): number {
  const correctCount = order.filter((id, i) => id === correct[i]).length;
  return Math.round((correctCount / correct.length) * 100);
}

describe('Timeline schema', () => {
  it('has correct widget id', () => {
    expect(timeline.id).toBe('core.timeline');
  });

  it('has a render function', () => {
    expect(typeof timeline.render).toBe('function');
  });

  it('validates minimum 2 events', () => {
    renderWidget({ events: [{ id: 'only', title: 'Only' }] });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('defaults layout to vertical', () => {
    renderWidget({ events: defaultEvents, interactive: false });
    expect(screen.getByTestId('timeline')).toBeTruthy();
  });

  it('accepts an animation config', () => {
    renderWidget({
      events: defaultEvents,
      interactive: false,
      animation: {
        backend: 'lottie',
        src: 'assets/animations/timeline.lottie',
        reducedMotion: 'static-steps',
      },
    });
    expect(screen.getByTestId('timeline')).toBeTruthy();
  });
});

describe('Timeline vertical layout', () => {
  const observeConfig = {
    events: defaultEvents,
    interactive: false,
    layout: 'vertical',
  };

  it('renders all events in correct order', () => {
    renderWidget(observeConfig);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Evaporation');
    expect(items[3]).toHaveTextContent('Collection');
  });

  it('renders connecting line and event dots', () => {
    renderWidget(observeConfig);
    const dots = document.querySelectorAll('[style*="border-radius: 50%"]');
    expect(dots.length).toBeGreaterThanOrEqual(4);
  });

  it('renders event descriptions', () => {
    renderWidget(observeConfig);
    expect(screen.getByText('Water rises as vapor')).toBeTruthy();
    expect(screen.getByText('Water falls as precipitation')).toBeTruthy();
  });

  it('renders event icons', () => {
    renderWidget(observeConfig);
    expect(screen.getByText('☀️')).toBeTruthy();
    expect(screen.getByText('🌊')).toBeTruthy();
  });

  it('renders title when provided', () => {
    renderWidget({ ...observeConfig, title: 'The Water Cycle' });
    expect(screen.getByText('The Water Cycle')).toBeTruthy();
  });

  it('does not render dates when showDates is false', () => {
    renderWidget({
      events: [
        { id: 'a', title: 'A', date: '1900' },
        { id: 'b', title: 'B', date: '2000' },
      ],
      interactive: false,
      showDates: false,
    });
    expect(screen.queryByText('1900')).toBeNull();
  });

  it('renders dates when showDates is true', () => {
    renderWidget({
      events: [
        { id: 'a', title: 'A', date: '1900' },
        { id: 'b', title: 'B', date: '2000' },
      ],
      interactive: false,
      showDates: true,
    });
    expect(screen.getByText('1900')).toBeTruthy();
  });
});

describe('Timeline horizontal layout', () => {
  const config = {
    events: defaultEvents,
    interactive: false,
    layout: 'horizontal',
  };

  it('renders events in a row', () => {
    renderWidget(config);
    const container = screen.getByRole('list');
    expect(container).toBeTruthy();
    expect(container.style.display).toBe('flex');
  });

  it('renders all events', () => {
    renderWidget(config);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('events have min-width for horizontal layout', () => {
    renderWidget(config);
    const items = screen.getAllByRole('listitem');
    items.forEach((item) => {
      expect(item.style.minWidth).toBe('180px');
    });
  });
});

describe('Timeline compact layout', () => {
  const config = {
    events: defaultEvents,
    interactive: false,
    layout: 'compact',
  };

  it('renders events as text with arrow separators', () => {
    renderWidget(config);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(4);
  });

  it('shows arrow separators between events', () => {
    renderWidget(config);
    const arrows = document.querySelectorAll('[aria-hidden="true"]');
    expect(arrows.length).toBeGreaterThanOrEqual(3);
  });

  it('renders event titles in compact mode', () => {
    renderWidget(config);
    expect(screen.getByText('Evaporation')).toBeTruthy();
    expect(screen.getByText('Rain')).toBeTruthy();
  });
});

describe('Timeline observe mode', () => {
  const observeConfig = {
    events: defaultEvents,
    interactive: false,
  };

  it('renders items in correct order', () => {
    renderWidget(observeConfig);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Evaporation');
    expect(items[1]).toHaveTextContent('Condensation');
    expect(items[2]).toHaveTextContent('Rain');
    expect(items[3]).toHaveTextContent('Collection');
  });

  it('does not show sortable list in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.queryByTestId('timeline-sortable')).toBeNull();
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

describe('Timeline interactive mode', () => {
  const interactiveConfig = {
    events: defaultEvents,
    interactive: true,
  };

  it('renders sortable list with all events', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('timeline-sortable')).toBeTruthy();
    const events = screen.getAllByTestId(/^timeline-event-/);
    expect(events).toHaveLength(4);
  });

  it('shows timeline status live region', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('timeline-status')).toHaveTextContent('4 of 4 events in sequence');
  });

  it('submit button is enabled', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('renders title in interactive mode', () => {
    renderWidget({ ...interactiveConfig, title: 'Sort the timeline' });
    expect(screen.getByText('Sort the timeline')).toBeTruthy();
  });
});

describe('Timeline submit and scoring', () => {
  const interactiveConfig = {
    events: defaultEvents,
    interactive: true,
  };

  it('calls complete with score on submit', () => {
    const { complete, emitInteraction } = renderWidget(interactiveConfig);
    const order = getEventIdsFromDom();
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).not.toHaveBeenCalled();
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'core.timeline' }),
    );
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      expectedScore(order, ['evap', 'cond', 'rain', 'collect']),
      expect.any(Object),
    );
  });

  it('shows result and Continue button after submit without completing', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByTestId('feedback')).toBeTruthy();
    expect(screen.getByTestId('continue-button')).toBeVisible();
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('shows feedback after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
  });

  it('submit button is removed after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'core.timeline' }),
    );
  });
});

describe('Timeline hints', () => {
  const hintConfig = {
    events: defaultEvents,
    interactive: true,
    hints: ['Think about the water cycle', 'Consider what happens first'],
  };

  it('renders hint text when provided', () => {
    renderWidget(hintConfig);
    expect(screen.getByText('Think about the water cycle')).toBeTruthy();
  });

  it('renders More help button for multiple hints', () => {
    renderWidget(hintConfig);
    expect(screen.getByText('More help')).toBeTruthy();
    fireEvent.click(screen.getByText('More help'));
    expect(screen.getByText('Consider what happens first')).toBeTruthy();
    expect(screen.queryByText('More help')).toBeNull();
  });
});

describe('Timeline accessibility', () => {
  const observeConfig = {
    events: defaultEvents,
    interactive: false,
  };

  it('container has role list', () => {
    renderWidget(observeConfig);
    expect(screen.getByRole('list')).toBeTruthy();
  });

  it('each event has role listitem', () => {
    renderWidget(observeConfig);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('events have aria labels', () => {
    renderWidget(observeConfig);
    expect(screen.getByLabelText('Event 1: Evaporation')).toBeTruthy();
    expect(screen.getByLabelText('Event 2: Condensation')).toBeTruthy();
  });

  it('has live region for timeline status', () => {
    renderWidget({ ...observeConfig, interactive: true });
    const status = screen.getByTestId('timeline-status');
    expect(status.closest('[aria-live]')).toBeTruthy();
  });
});

describe('Timeline edge cases', () => {
  it('defaults to observe mode when interactive not specified', () => {
    renderWidget({ events: defaultEvents });
    expect(screen.queryByTestId('timeline-sortable')).toBeNull();
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget({ events: defaultEvents, interactive: false });
    expect(complete).not.toHaveBeenCalled();
  });

  it('shows error for less than 2 events', () => {
    renderWidget({
      events: [{ id: 'only', title: 'Only' }],
      interactive: false,
    });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows error for empty config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('Timeline correct/incorrect feedback', () => {
  const interactiveConfig = {
    events: defaultEvents,
    interactive: true,
  };

  it('shows correct/incorrect markers after submit', () => {
    renderWidget(interactiveConfig);
    const order = getEventIdsFromDom();
    fireEvent.click(screen.getByText('Submit'));
    order.forEach((id, index) => {
      const item = screen.getByTestId(`timeline-event-${id}`);
      if (id === ['evap', 'cond', 'rain', 'collect'][index]) {
        expect(item.textContent).toContain('✓');
      } else {
        expect(item.textContent).toContain('✗');
      }
    });
  });

  it('shows correction hints for wrong positions', () => {
    renderWidget(interactiveConfig);
    const order = getEventIdsFromDom();
    fireEvent.click(screen.getByText('Submit'));
    order.forEach((id, index) => {
      const correctId = ['evap', 'cond', 'rain', 'collect'][index];
      if (id !== correctId) {
        const correctEvent = defaultEvents.find((e) => e.id === correctId);
        if (correctEvent) {
          expect(screen.getByText(new RegExp(`Correct:.*${correctEvent.title}`))).toBeTruthy();
        }
      }
    });
  });
});
