import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import axe from 'axe-core';
import { I18nProvider } from '@open-edu/i18n';
import widgetsDict from '@open-edu/i18n/locales/en/widgets.json';
import { timer, timerConfigSchema } from './Timer';

(globalThis as { axe?: typeof axe }).axe = axe;

const WidgetComponent = timer.render;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { widgets: widgetsDict as Record<string, string> } }}>
      {children}
    </I18nProvider>
  );
}

function renderWidget(config: Record<string, unknown> = {}, storedState?: unknown) {
  const emitInteraction = vi.fn();
  const complete = vi.fn();
  const result = render(
    <WidgetComponent
      nodeId="test-node"
      config={config}
      emitInteraction={emitInteraction}
      complete={complete}
      storedState={storedState}
    />,
    { wrapper },
  );
  return { emitInteraction, complete, ...result };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('Timer widget definition', () => {
  it('has correct widget id', () => {
    expect(timer.id).toBe('core.timer');
  });

  it('has correct domain', () => {
    expect(timer.domain).toBe('core');
  });

  it('has stable status', () => {
    expect(timer.status).toBe('stable');
  });

  it('has a render function', () => {
    expect(typeof timer.render).toBe('function');
  });

  it('declares observe, keyboard, and accessibility support', () => {
    expect(timer.capabilities.supportsObserveMode).toBe(true);
    expect(timer.capabilities.supportsKeyboard).toBe(true);
    expect(timer.capabilities.supportsScreenReader).toBe(true);
  });

  it('declares reduced-motion accessibility', () => {
    expect(timer.accessibility.reducedMotion).toBe(true);
  });
});

describe('Timer schema', () => {
  it('defaults to a 120s countdown', () => {
    const parsed = timerConfigSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.duration).toBe(120);
      expect(parsed.data.mode).toBe('countdown');
      expect(parsed.data.autoStart).toBe(true);
      expect(parsed.data.interactive).toBe(false);
    }
  });

  it('rejects durations below 5 seconds', () => {
    const parsed = timerConfigSchema.safeParse({ duration: 2 });
    expect(parsed.success).toBe(false);
  });

  it('accepts warnings with atSeconds', () => {
    const parsed = timerConfigSchema.safeParse({
      duration: 300,
      warnings: [{ atSeconds: 60, message: 'One minute left' }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('Timer rendering', () => {
  it('renders with minimal config', () => {
    const { container } = renderWidget({ duration: 600, autoStart: false, interactive: true });
    expect(screen.getByTestId('timer')).toBeInTheDocument();
    expect(screen.getByTestId('timer-digital')).toHaveTextContent('10:00');
    expect(container.querySelector('[data-testid="timer-ring"]')).toBeTruthy();
  });

  it('renders the label when provided', () => {
    renderWidget({ label: 'Time for a stretch break', autoStart: false, interactive: true });
    expect(screen.getByTestId('timer-label')).toHaveTextContent('Time for a stretch break');
  });

  it('renders a horizontal bar visual', () => {
    renderWidget({ visual: 'bar', autoStart: false, interactive: true });
    expect(screen.getByTestId('timer-bar')).toBeInTheDocument();
  });

  it('renders discrete blocks visual', () => {
    const { container } = renderWidget({ visual: 'blocks', autoStart: false, interactive: true });
    expect(screen.getByTestId('timer-blocks')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="timer-blocks"] span').length).toBe(10);
  });

  it('hides the digital readout when showDigital is false', () => {
    renderWidget({ showDigital: false, autoStart: false, interactive: true });
    expect(screen.queryByTestId('timer-digital')).not.toBeInTheDocument();
  });

  it('shows config error for invalid config', () => {
    renderWidget({ duration: 2 });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders a start button in interactive idle mode', () => {
    renderWidget({ autoStart: false, interactive: true });
    expect(screen.getByTestId('timer-start')).toBeInTheDocument();
  });

  it('hides skip control when allowSkip is false', () => {
    renderWidget({ allowSkip: false, autoStart: false, interactive: true });
    expect(screen.queryByTestId('timer-skip')).not.toBeInTheDocument();
  });
});

describe('Timer countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-completes and routes when the timer reaches zero', () => {
    const { complete, emitInteraction } = renderWidget({ duration: 5 });
    expect(complete).not.toHaveBeenCalled();
    advance(5500);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ phase: 'completed', remaining: 0 }),
    );
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'complete', method: 'natural' }),
    );
    expect(screen.getByTestId('timer-complete')).toBeInTheDocument();
  });

  it('emits a start interaction when auto-started', () => {
    const { emitInteraction } = renderWidget({ duration: 5, autoStart: true });
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'start', mode: 'countdown', duration: 5, autoStart: true }),
    );
  });

  it('announces a warning at the configured threshold', () => {
    const { emitInteraction } = renderWidget({
      duration: 5,
      warnings: [{ atSeconds: 3, message: 'Three seconds left' }],
    });
    expect(emitInteraction).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'warning' }),
    );
    advance(2500);
    expect(screen.getByTestId('timer-announcement')).toHaveTextContent('Three seconds left');
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'warning', atSeconds: 3 }),
    );
  });

  it('throttles announcements — no per-second live updates while running', () => {
    renderWidget({ duration: 30 });
    advance(2000);
    expect(screen.getByTestId('timer-announcement')).toHaveTextContent('Timer started');
    advance(10000);
    expect(screen.getByTestId('timer-announcement')).toHaveTextContent('Timer started');
  });

  it('shows a calm completed state with no alarm', () => {
    renderWidget({ duration: 5, completeMessage: 'Ready to continue?' });
    advance(5500);
    expect(screen.getByTestId('timer-complete')).toHaveTextContent('Ready to continue?');
  });
});

describe('Timer skip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skipping advances the workflow and records skipped warnings', () => {
    const { complete, emitInteraction } = renderWidget({
      duration: 5,
      warnings: [{ atSeconds: 3, message: 'Three seconds left' }],
    });
    fireEvent.click(screen.getByTestId('timer-skip'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ phase: 'completed' }),
    );
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'skip', warningsSeen: 0, warningsSkipped: [3] }),
    );
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'complete', method: 'skipped' }),
    );
  });

  it('skipping after a warning fired only records the remaining warnings', () => {
    const { emitInteraction } = renderWidget({
      duration: 5,
      warnings: [
        { atSeconds: 4, message: 'Four seconds left' },
        { atSeconds: 2, message: 'Two seconds left' },
      ],
    });
    advance(1500);
    fireEvent.click(screen.getByTestId('timer-skip'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'skip', warningsSeen: 1, warningsSkipped: [2] }),
    );
  });
});

describe('Timer interactive controls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pauses and resumes without losing remaining time', () => {
    const { complete } = renderWidget({ duration: 5, interactive: true });
    advance(2000);
    fireEvent.click(screen.getByTestId('timer-pause'));
    expect(screen.getByTestId('timer-digital')).toHaveTextContent('0:03');
    advance(60000);
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('timer-resume'));
    advance(4000);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('restarts from the beginning of the duration', () => {
    renderWidget({ duration: 5, interactive: true });
    advance(2000);
    expect(screen.getByTestId('timer-digital')).toHaveTextContent('0:03');
    fireEvent.click(screen.getByTestId('timer-restart'));
    expect(screen.getByTestId('timer-digital')).toHaveTextContent('0:05');
  });

  it('hides pause control when allowPause is false', () => {
    renderWidget({ duration: 5, interactive: true, allowPause: false });
    expect(screen.queryByTestId('timer-pause')).not.toBeInTheDocument();
  });
});

describe('Timer count-up mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts up with no forced completion', () => {
    const { complete } = renderWidget({ duration: 5, mode: 'countup', interactive: true });
    advance(30000);
    expect(screen.getByTestId('timer-digital')).toHaveTextContent('0:30');
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('timer-done'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ phase: 'completed' }),
    );
  });

  it('shows a Done control in non-interactive count-up even when skip is disabled', () => {
    const { complete } = renderWidget({ mode: 'countup', interactive: false, allowSkip: false });
    expect(screen.getByTestId('timer-done')).toBeInTheDocument();
    expect(screen.queryByTestId('timer-skip')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('timer-done'));
    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe('Timer state restoration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resumes from a paused stored state instead of restarting', () => {
    const { complete } = renderWidget({ duration: 120 }, { phase: 'paused', remaining: 45 });
    expect(screen.getByTestId('timer-digital')).toHaveTextContent('0:45');
    advance(60000);
    expect(complete).not.toHaveBeenCalled();
  });

  it('resumes a running countdown from its remaining time', () => {
    const { complete } = renderWidget({ duration: 5 }, { phase: 'running', remaining: 2 });
    expect(screen.getByTestId('timer-digital')).toHaveTextContent('0:02');
    advance(3000);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe('Timer keyboard support', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Space toggles pause and resume', () => {
    renderWidget({ duration: 5, interactive: true });
    advance(2000);
    fireEvent.keyDown(screen.getByTestId('timer'), { key: ' ' });
    expect(screen.getByTestId('timer-resume')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('timer'), { key: ' ' });
    expect(screen.getByTestId('timer-pause')).toBeInTheDocument();
  });

  it('R restarts the timer', () => {
    renderWidget({ duration: 5, interactive: true });
    advance(2000);
    fireEvent.keyDown(screen.getByTestId('timer'), { key: 'r' });
    expect(screen.getByTestId('timer-digital')).toHaveTextContent('0:05');
  });

  it('Escape skips the timer', () => {
    const { complete } = renderWidget({ duration: 5 });
    fireEvent.keyDown(screen.getByTestId('timer'), { key: 'Escape' });
    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe('Timer accessibility', () => {
  it('uses role="timer"', () => {
    const { container } = renderWidget({ autoStart: false, interactive: true });
    expect(container.querySelector('[data-testid="timer"]')?.getAttribute('role')).toBe('timer');
  });

  it('passes axe-core audit for the running state', async () => {
    const { container } = renderWidget({ duration: 60 });
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toHaveLength(0);
  });

  it('passes axe-core audit for the completed state', async () => {
    vi.useFakeTimers();
    const { container } = renderWidget({
      duration: 5,
      completeMessage: 'Ready to continue?',
      warnings: [{ atSeconds: 3, message: 'Three seconds left' }],
    });
    advance(5500);
    expect(screen.getByTestId('timer-complete')).toBeInTheDocument();
    vi.useRealTimers();
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toHaveLength(0);
  });
});
