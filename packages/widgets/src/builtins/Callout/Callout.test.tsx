import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { callout } from './Callout';

const WidgetComponent = callout.render;

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
  content: 'This is a callout message.',
};

describe('Callout schema', () => {
  it('has correct widget id', () => {
    expect(callout.id).toBe('core.callout');
  });

  it('has a render function', () => {
    expect(typeof callout.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(callout.domain).toBe('core');
  });

  it('has stable status', () => {
    expect(callout.status).toBe('stable');
  });
});

describe('Callout rendering', () => {
  it('renders with minimal config', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('callout')).toBeTruthy();
    expect(screen.getByTestId('callout-content')).toHaveTextContent('This is a callout message.');
  });

  it('renders with title', () => {
    renderWidget({ ...defaultConfig, title: 'Note Title' });
    expect(screen.getByText('Note Title')).toBeTruthy();
  });

  it('renders with custom icon', () => {
    renderWidget({ ...defaultConfig, icon: '?' });
    const icon = screen.getByTestId('callout-icon');
    expect(icon).toHaveTextContent('?');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders default icon based on type', () => {
    renderWidget({ ...defaultConfig, type: 'tip' });
    const icon = screen.getByTestId('callout-icon');
    expect(icon).toHaveTextContent('\ud83d\udca1');
  });

  it('renders all callout type variants', () => {
    const types = [
      'note',
      'tip',
      'warning',
      'important',
      'definition',
      'example',
      'fun-fact',
      'quote',
      'success',
      'question',
    ] as const;
    for (const type of types) {
      const { unmount } = renderWidget({ ...defaultConfig, type });
      expect(screen.getByTestId('callout')).toBeTruthy();
      unmount();
    }
  });

  it('renders with optional fields', () => {
    renderWidget({
      ...defaultConfig,
      type: 'success',
      title: 'Great Job!',
      content: 'You completed the task.',
      colorVariant: 'success',
    });
    expect(screen.getByTestId('callout')).toBeTruthy();
    expect(screen.getByText('Great Job!')).toBeTruthy();
    expect(screen.getByText('You completed the task.')).toBeTruthy();
  });
});

describe('Callout collapsible', () => {
  it('shows content when defaultExpanded is true', () => {
    renderWidget({ ...defaultConfig, collapsible: true, defaultExpanded: true });
    expect(screen.getByTestId('callout-content')).toBeTruthy();
    expect(screen.getByTestId('callout-toggle')).toBeTruthy();
  });

  it('hides content when defaultExpanded is false', () => {
    renderWidget({ ...defaultConfig, collapsible: true, defaultExpanded: false });
    const content = screen.getByTestId('callout-content');
    expect(content.style.display).toBe('none');
  });

  it('toggle button expands collapsed content', () => {
    renderWidget({ ...defaultConfig, collapsible: true, defaultExpanded: false });
    const toggle = screen.getByTestId('callout-toggle');
    expect(screen.getByTestId('callout-content').style.display).toBe('none');
    fireEvent.click(toggle);
    expect(screen.getByTestId('callout-content').style.display).not.toBe('none');
  });

  it('toggle button collapses expanded content', () => {
    renderWidget({ ...defaultConfig, collapsible: true, defaultExpanded: true });
    const toggle = screen.getByTestId('callout-toggle');
    expect(screen.getByTestId('callout-content').style.display).not.toBe('none');
    fireEvent.click(toggle);
    expect(screen.getByTestId('callout-content').style.display).toBe('none');
  });

  it('toggle button has aria-expanded attribute', () => {
    renderWidget({ ...defaultConfig, collapsible: true, defaultExpanded: true });
    const toggle = screen.getByTestId('callout-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggle button has aria-controls attribute', () => {
    renderWidget({ ...defaultConfig, collapsible: true });
    const toggle = screen.getByTestId('callout-toggle');
    expect(toggle.getAttribute('aria-controls')).toBe('callout-content-test-node');
  });

  it('supports keyboard toggling (Enter key)', () => {
    renderWidget({ ...defaultConfig, collapsible: true, defaultExpanded: true });
    const toggle = screen.getByTestId('callout-toggle');
    fireEvent.click(toggle);
    expect(screen.getByTestId('callout-content').style.display).toBe('none');
    fireEvent.click(toggle);
    expect(screen.getByTestId('callout-content').style.display).not.toBe('none');
  });
});

describe('Callout observe mode (interactive: false)', () => {
  it('shows Mark as seen button', () => {
    renderWidget({ ...defaultConfig, interactive: false });
    expect(screen.getByTestId('observe-acknowledge')).toBeTruthy();
  });

  it('auto-completes on acknowledge', () => {
    const { complete, emitInteraction } = renderWidget({ ...defaultConfig, interactive: false });
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows observe complete after acknowledge', () => {
    renderWidget({ ...defaultConfig, interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });
});

describe('Callout interactive mode (interactive: true)', () => {
  it('shows Got it button in interactive mode', () => {
    renderWidget({ ...defaultConfig, interactive: true });
    expect(screen.getByTestId('callout-got-it')).toBeTruthy();
  });

  it('completes on Got it click', () => {
    const { complete, emitInteraction } = renderWidget({ ...defaultConfig, interactive: true });
    fireEvent.click(screen.getByTestId('callout-got-it'));
    expect(complete).toHaveBeenCalledWith(100, expect.objectContaining({ acknowledged: true }));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'acknowledge', widgetId: 'core.callout' }),
    );
  });

  it('shows acknowledged state after Got it', () => {
    renderWidget({ ...defaultConfig, interactive: true });
    fireEvent.click(screen.getByTestId('callout-got-it'));
    expect(screen.getByTestId('callout-acknowledged')).toBeTruthy();
  });
});

describe('Callout accessibility', () => {
  it('uses role="note" for informational types', () => {
    renderWidget({ ...defaultConfig, type: 'note' });
    expect(screen.getByTestId('callout').getAttribute('role')).toBe('note');
  });

  it('uses role="alert" for warning types', () => {
    renderWidget({ ...defaultConfig, type: 'warning' });
    expect(screen.getByTestId('callout').getAttribute('role')).toBe('alert');
  });

  it('uses role="alert" for important types', () => {
    renderWidget({ ...defaultConfig, type: 'important' });
    expect(screen.getByTestId('callout').getAttribute('role')).toBe('alert');
  });

  it('icons have aria-hidden="true"', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('callout-icon').getAttribute('aria-hidden')).toBe('true');
  });

  it('collapsible toggle has aria-expanded and aria-controls', () => {
    renderWidget({ ...defaultConfig, collapsible: true });
    const toggle = screen.getByTestId('callout-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('callout-content-test-node');
  });
});

describe('Callout edge cases', () => {
  it('shows config error for missing content', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('defaults to note type when type is invalid', () => {
    renderWidget({ ...defaultConfig, type: 'invalid-type' });
    expect(screen.getByTestId('callout')).toBeTruthy();
    expect(screen.getByTestId('callout-icon')).toHaveTextContent('\u2139\ufe0f');
  });

  it('defaults to note type when type not specified', () => {
    renderWidget(defaultConfig);
    const icon = screen.getByTestId('callout-icon');
    expect(icon).toHaveTextContent('\u2139\ufe0f');
  });
});
