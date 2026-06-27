import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { clockTime } from './ClockTime';

const WidgetComponent = clockTime.render;

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

describe('ClockTime widget definition', () => {
  it('has correct widget id', () => {
    expect(clockTime.id).toBe('open-edu.clock-time');
  });

  it('has a render function', () => {
    expect(typeof clockTime.render).toBe('function');
  });
});

describe('ClockTime config validation', () => {
  it('renders error for invalid config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error when hour is out of range', () => {
    renderWidget({ hour: 25, minute: 0 });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders clock for valid config', () => {
    renderWidget({ hour: 10, minute: 30 });
    expect(screen.getByTestId('clock-svg')).toBeInTheDocument();
  });
});

describe('ClockTime observe mode', () => {
  const observeConfig = {
    hour: 10,
    minute: 30,
    size: 250,
  };

  it('renders clock SVG in observe mode', () => {
    renderWidget(observeConfig);
    expect(screen.getByTestId('clock-svg')).toBeInTheDocument();
  });

  it('shows time in live region when showDigital is true', () => {
    renderWidget({ ...observeConfig, showDigital: true });
    expect(screen.getByTestId('time-live-region')).toHaveTextContent('10:30');
  });

  it('completes after clicking acknowledge in observe mode', () => {
    const { complete, emitInteraction } = renderWidget(observeConfig);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('observe-acknowledge-btn'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete state after acknowledge', () => {
    renderWidget(observeConfig);
    fireEvent.click(screen.getByTestId('observe-acknowledge-btn'));
    expect(screen.getByTestId('observe-complete')).toHaveTextContent('Content acknowledged.');
  });
});

describe('ClockTime interactive read mode', () => {
  const readConfig = {
    hour: 10,
    minute: 15,
    mode: 'read' as const,
    interactive: true,
    size: 250,
  };

  it('renders clickable hour markers', () => {
    renderWidget(readConfig);
    expect(screen.getByTestId('hour-marker-10')).toBeInTheDocument();
    expect(screen.getByTestId('hour-marker-3')).toBeInTheDocument();
  });

  it('selects hour and shows confirm button without completing', () => {
    const { complete } = renderWidget(readConfig);
    fireEvent.click(screen.getByTestId('hour-marker-10'));
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-btn')).toBeInTheDocument();
  });

  it('scores correct when confirming matching hour', () => {
    const { complete, emitInteraction } = renderWidget(readConfig);
    fireEvent.click(screen.getByTestId('hour-marker-10'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'read', selectedHour: 10, displayedHour: 10, correct: true }),
    );
  });

  it('scores 0 when confirming wrong hour', () => {
    const { complete, emitInteraction } = renderWidget(readConfig);
    fireEvent.click(screen.getByTestId('hour-marker-3'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(complete).toHaveBeenCalledWith(0);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'read', selectedHour: 3, displayedHour: 10, correct: false }),
    );
  });

  it('allows changing selection before confirming', () => {
    const { complete } = renderWidget(readConfig);
    fireEvent.click(screen.getByTestId('hour-marker-3'));
    expect(screen.getByText(/You selected 3 o'clock/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hour-marker-10'));
    expect(screen.getByText(/You selected 10 o'clock/)).toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
  });

  it('shows correct feedback after confirm', () => {
    renderWidget(readConfig);
    fireEvent.click(screen.getByTestId('hour-marker-10'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Correct!');
  });

  it('shows incorrect feedback with expected hour', () => {
    renderWidget(readConfig);
    fireEvent.click(screen.getByTestId('hour-marker-3'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Not quite. The hour shown was 10.');
  });

  it('handles 12-hour conversion for hour 0', () => {
    renderWidget({ ...readConfig, hour: 0 });
    fireEvent.click(screen.getByTestId('hour-marker-12'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Correct!');
  });

  it('handles 12-hour conversion for hour 12', () => {
    renderWidget({ ...readConfig, hour: 12 });
    fireEvent.click(screen.getByTestId('hour-marker-12'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Correct!');
  });
});

describe('ClockTime interactive set mode', () => {
  const setConfig = {
    hour: 9,
    minute: 0,
    mode: 'set' as const,
    interactive: true,
    showDigital: true,
    targetTime: { hour: 10, minute: 15 },
    size: 250,
  };

  it('renders up/down buttons for hour and minute', () => {
    renderWidget(setConfig);
    expect(screen.getByTestId('hour-up')).toBeInTheDocument();
    expect(screen.getByTestId('hour-down')).toBeInTheDocument();
    expect(screen.getByTestId('minute-up')).toBeInTheDocument();
    expect(screen.getByTestId('minute-down')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWidget(setConfig);
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  it('shows current hour and minute values', () => {
    renderWidget(setConfig);
    expect(screen.getByTestId('set-hour-display')).toHaveTextContent('9');
    expect(screen.getByTestId('set-minute-display')).toHaveTextContent('00');
  });

  it('increments hour on up click', () => {
    renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('hour-up'));
    expect(screen.getByTestId('set-hour-display')).toHaveTextContent('10');
  });

  it('decrements hour on down click', () => {
    renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('hour-down'));
    expect(screen.getByTestId('set-hour-display')).toHaveTextContent('8');
  });

  it('increments minute on up click', () => {
    renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('minute-up'));
    expect(screen.getByTestId('set-minute-display')).toHaveTextContent('01');
  });

  it('decrements minute on down click', () => {
    renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('minute-down'));
    expect(screen.getByTestId('set-minute-display')).toHaveTextContent('59');
  });

  it('wraps hour from 23 to 0', () => {
    renderWidget({ ...setConfig, hour: 23 });
    fireEvent.click(screen.getByTestId('hour-up'));
    expect(screen.getByTestId('set-hour-display')).toHaveTextContent('12');
  });

  it('wraps hour from 0 to 23 on decrement', () => {
    renderWidget({ ...setConfig, hour: 0 });
    fireEvent.click(screen.getByTestId('hour-down'));
    expect(screen.getByTestId('set-hour-display')).toHaveTextContent('11');
  });

  it('shows correct digital time in set mode', () => {
    renderWidget(setConfig);
    expect(screen.getByTestId('time-live-region')).toHaveTextContent('9:00');
  });

  it('renders Hour and Minute toggle buttons', () => {
    renderWidget(setConfig);
    expect(screen.getByTestId('mode-hour')).toBeInTheDocument();
    expect(screen.getByTestId('mode-minute')).toBeInTheDocument();
  });

  it('Hour button has aria-pressed true when hour mode is active', () => {
    renderWidget(setConfig);
    expect(screen.getByTestId('mode-hour').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('mode-minute').getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking Minute button switches mode', () => {
    renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('mode-minute'));
    expect(screen.getByTestId('mode-minute').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('mode-hour').getAttribute('aria-pressed')).toBe('false');
  });

  it('always shows digital readout in set mode', () => {
    renderWidget({ ...setConfig, showDigital: false });
    expect(screen.getByTestId('digital-readout')).toHaveTextContent('9:00');
  });

  it('scores correct when hour matches and minutes within tolerance', () => {
    const { complete } = renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('hour-up'));
    for (let i = 0; i < 15; i++) {
      fireEvent.click(screen.getByTestId('minute-up'));
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('scores 0 when hour does not match', () => {
    const { complete } = renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).toHaveBeenCalledWith(0);
  });

  it('scores 0 when minutes exceed ±5 tolerance', () => {
    const { complete } = renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('hour-up'));
    for (let i = 0; i < 21; i++) {
      fireEvent.click(screen.getByTestId('minute-up'));
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).toHaveBeenCalledWith(0);
  });

  it('gives 50% credit when within 2 minutes', () => {
    const { complete } = renderWidget({
      ...setConfig,
      targetTime: { hour: 10, minute: 15 },
    });
    fireEvent.click(screen.getByTestId('hour-up'));
    for (let i = 0; i < 17; i++) {
      fireEvent.click(screen.getByTestId('minute-up'));
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).toHaveBeenCalledWith(50);
  });

  it('gives 25% credit when within 5 minutes', () => {
    const { complete } = renderWidget({
      ...setConfig,
      targetTime: { hour: 10, minute: 15 },
    });
    fireEvent.click(screen.getByTestId('hour-up'));
    for (let i = 0; i < 19; i++) {
      fireEvent.click(screen.getByTestId('minute-up'));
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(complete).toHaveBeenCalledWith(25);
  });

  it('shows correct feedback on correct answer', () => {
    renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('hour-up'));
    for (let i = 0; i < 15; i++) {
      fireEvent.click(screen.getByTestId('minute-up'));
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Correct!');
  });

  it('shows expected value on incorrect answer', () => {
    renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('Expected 10:15');
  });

  it('shows partial credit feedback for close answers', () => {
    renderWidget({
      ...setConfig,
      targetTime: { hour: 10, minute: 15 },
    });
    fireEvent.click(screen.getByTestId('hour-up'));
    for (let i = 0; i < 17; i++) {
      fireEvent.click(screen.getByTestId('minute-up'));
    }
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(screen.getByTestId('feedback')).toHaveTextContent('50% credit');
  });

  it('disables controls after submit', () => {
    renderWidget(setConfig);
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(screen.queryByTestId('submit-btn')).toBeNull();
    expect(screen.queryByTestId('hour-up')).toBeNull();
  });
});

describe('ClockTime set mode keyboard navigation', () => {
  const setConfig = {
    hour: 9,
    minute: 0,
    mode: 'set' as const,
    interactive: true,
    targetTime: { hour: 10, minute: 15 },
  };

  it('ArrowUp increases hour', () => {
    renderWidget(setConfig);
    const svg = screen.getByTestId('clock-svg');
    fireEvent.keyDown(svg, { key: 'ArrowUp' });
    expect(screen.getByTestId('set-hour-display')).toHaveTextContent('10');
  });

  it('ArrowDown decreases hour', () => {
    renderWidget(setConfig);
    const svg = screen.getByTestId('clock-svg');
    fireEvent.keyDown(svg, { key: 'ArrowDown' });
    expect(screen.getByTestId('set-hour-display')).toHaveTextContent('8');
  });

  it('Enter key submits', () => {
    const { complete } = renderWidget(setConfig);
    const svg = screen.getByTestId('clock-svg');
    fireEvent.keyDown(svg, { key: 'Enter' });
    expect(complete).toHaveBeenCalled();
  });

  it('Tab key does not switch mode (normal tab behavior)', () => {
    renderWidget(setConfig);
    const svg = screen.getByTestId('clock-svg');
    fireEvent.keyDown(svg, { key: 'Tab' });
    expect(screen.getByTestId('mode-hour')).toBeInTheDocument();
    expect(screen.getByTestId('mode-minute')).toBeInTheDocument();
  });
});

describe('ClockTime accessibility', () => {
  const readConfig = {
    hour: 10,
    minute: 30,
    mode: 'read' as const,
    interactive: true,
  };

  it('has live region for time announcement', () => {
    renderWidget(readConfig);
    const liveRegion = screen.getByTestId('time-live-region');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('uses aria-live for feedback after submit', () => {
    renderWidget(readConfig);
    fireEvent.click(screen.getByTestId('hour-marker-10'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    const feedback = screen.getByTestId('feedback');
    expect(feedback.getAttribute('aria-live')).toBe('assertive');
  });

  it('has aria-label on SVG', () => {
    renderWidget(readConfig);
    const svg = screen.getByTestId('clock-svg');
    expect(svg.getAttribute('aria-label')).toContain('Analog clock showing');
  });

  it('has aria-labels on hour markers', () => {
    renderWidget(readConfig);
    expect(screen.getByTestId('hour-marker-3')).toHaveAttribute('aria-label', "3 o'clock");
  });

  it('has keyboard help text above the clock in set mode', () => {
    renderWidget({
      hour: 9,
      minute: 0,
      mode: 'set' as const,
      interactive: true,
      targetTime: { hour: 10, minute: 15 },
    });
    expect(screen.getByText('Use arrow keys to adjust, Enter to submit')).toBeInTheDocument();
  });

  it('has role="group" on mode toggle buttons', () => {
    renderWidget({
      hour: 9,
      minute: 0,
      mode: 'set' as const,
      interactive: true,
      targetTime: { hour: 10, minute: 15 },
    });
    const group = screen.getByRole('group', { name: 'Time adjustment mode' });
    expect(group).toBeInTheDocument();
  });
});
