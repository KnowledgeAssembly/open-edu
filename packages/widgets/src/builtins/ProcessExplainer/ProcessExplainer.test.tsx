import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import axe from 'axe-core';
import { I18nProvider } from '@open-edu/i18n';
import widgetsDict from '@open-edu/i18n/locales/en/widgets.json';
import { processExplainer } from './ProcessExplainer';

(globalThis as { axe?: typeof axe }).axe = axe;

const WidgetComponent = processExplainer.render;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider dictionaries={{ en: { widgets: widgetsDict as Record<string, string> } }}>
      {children}
    </I18nProvider>
  );
}

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
    { wrapper },
  );
  return { emitInteraction, complete, ...result };
}

const baseConfig = {
  steps: [
    { id: 'a', title: 'Evaporation', description: 'Sun heats water' },
    { id: 'b', title: 'Condensation', description: 'Vapor forms clouds' },
    { id: 'c', title: 'Precipitation', description: 'Water falls as rain' },
  ],
  stepByStep: true,
  interactive: true,
};

describe('ProcessExplainer widget definition', () => {
  it('has correct widget id', () => {
    expect(processExplainer.id).toBe('core.process-explainer');
  });

  it('has correct domain', () => {
    expect(processExplainer.domain).toBe('core');
  });

  it('has stable status', () => {
    expect(processExplainer.status).toBe('stable');
  });

  it('declares animation capability', () => {
    expect(processExplainer.capabilities.supportsAnimation).toBe(true);
  });
});

describe('ProcessExplainer rendering', () => {
  it('renders with valid config', () => {
    renderWidget(baseConfig);
    expect(screen.getByTestId('process-explainer')).toBeInTheDocument();
  });

  it('renders step titles', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Evaporation')).toBeInTheDocument();
    expect(screen.getByText('Condensation')).toBeInTheDocument();
    expect(screen.getByText('Precipitation')).toBeInTheDocument();
  });

  it('reveals steps progressively in stepByStep mode', () => {
    renderWidget(baseConfig);
    expect(screen.queryByText('Sun heats water')).not.toBeInTheDocument();
    expect(screen.getByTestId('reveal-next')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(screen.getByText('Sun heats water')).toBeInTheDocument();
    expect(screen.queryByText('Vapor forms clouds')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(screen.getByText('Vapor forms clouds')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(screen.getByText('Water falls as rain')).toBeInTheDocument();
  });

  it('calls complete when finished', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(screen.getByTestId('explainer-complete')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('finish-button'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('emits interaction telemetry on reveal', () => {
    const { emitInteraction } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'core.process-explainer', action: 'reveal' }),
    );
  });

  it('renders error for less than 2 steps', () => {
    renderWidget({ steps: [{ id: 'a', title: 'Only' }] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders observe mode acknowledge button', () => {
    renderWidget({ steps: baseConfig.steps, stepByStep: true, interactive: false });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });

  it('accepts an animation config without breaking rendering', () => {
    renderWidget({
      ...baseConfig,
      animation: {
        backend: 'lottie',
        src: 'assets/animations/water-cycle.lottie',
        trigger: 'step',
      },
    });
    expect(screen.getByTestId('process-explainer')).toBeInTheDocument();
  });

  it('passes axe-core accessibility audit', async () => {
    const { container } = renderWidget(baseConfig);
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toHaveLength(0);
  });
});
