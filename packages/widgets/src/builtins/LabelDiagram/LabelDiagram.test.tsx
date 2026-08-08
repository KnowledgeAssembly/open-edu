import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { labelDiagram } from './LabelDiagram';

const WidgetComponent = labelDiagram.render;

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
  image: 'assets/images/plant-anatomy.png',
  altText: 'Diagram of a plant',
  labels: [
    { id: 'roots', text: 'Roots', target: { x: 50, y: 90 }, hint: 'Below the soil' },
    { id: 'stem', text: 'Stem', target: { x: 50, y: 60 }, hint: 'Supports the plant' },
    { id: 'leaves', text: 'Leaves', target: { x: 30, y: 40 }, hint: 'Green and flat' },
    { id: 'flower', text: 'Flower', target: { x: 50, y: 20 }, hint: 'Colorful top' },
  ],
  interactive: false,
};

describe('LabelDiagram schema', () => {
  it('has correct widget id', () => {
    expect(labelDiagram.id).toBe('science.label-diagram');
  });

  it('has a render function', () => {
    expect(typeof labelDiagram.render).toBe('function');
  });

  it('has stable status', () => {
    expect(labelDiagram.status).toBe('stable');
  });

  it('has correct domain', () => {
    expect(labelDiagram.domain).toBe('science');
  });
});

describe('LabelDiagram observe mode', () => {
  it('renders the image', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('label-diagram-image')).toBeTruthy();
  });

  it('renders all target markers', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('observe-target-0')).toBeTruthy();
    expect(screen.getByTestId('observe-target-1')).toBeTruthy();
    expect(screen.getByTestId('observe-target-2')).toBeTruthy();
    expect(screen.getByTestId('observe-target-3')).toBeTruthy();
  });

  it('renders pre-placed labels with text', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('observe-label-0')).toHaveTextContent('Roots');
    expect(screen.getByTestId('observe-label-1')).toHaveTextContent('Stem');
    expect(screen.getByTestId('observe-label-2')).toHaveTextContent('Leaves');
    expect(screen.getByTestId('observe-label-3')).toHaveTextContent('Flower');
  });

  it('renders descriptions below labels', () => {
    const configWithDesc = {
      ...defaultConfig,
      labels: [
        { id: 'roots', text: 'Roots', target: { x: 50, y: 90 }, description: 'Anchors the plant' },
        { id: 'stem', text: 'Stem', target: { x: 50, y: 60 } },
      ],
    };
    renderWidget(configWithDesc);
    expect(screen.getByTestId('observe-label-0')).toHaveTextContent('Anchors the plant');
  });

  it('shows acknowledge button', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('observe-acknowledge')).toBeTruthy();
  });

  it('clicking acknowledge completes with score 100', () => {
    const { complete } = renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
  });

  it('shows observe complete state after acknowledge', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });

  it('does not allow interaction in observe mode', () => {
    renderWidget(defaultConfig);
    const target = screen.getByTestId('observe-target-0');
    expect(target).toBeTruthy();
  });

  it('uses correct image src', () => {
    renderWidget(defaultConfig);
    const img = screen.getByTestId('label-diagram-image');
    expect(img.getAttribute('src')).toContain('plant-anatomy.png');
  });
});

describe('LabelDiagram interactive mode', () => {
  const interactiveConfig = {
    ...defaultConfig,
    interactive: true,
  };

  it('renders image in interactive mode', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('label-diagram-image')).toBeTruthy();
  });

  it('renders label bank', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('label-bank')).toBeTruthy();
  });

  it('renders all labels in bank', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('unplaced-label-roots')).toHaveTextContent('Roots');
    expect(screen.getByTestId('unplaced-label-stem')).toHaveTextContent('Stem');
    expect(screen.getByTestId('unplaced-label-leaves')).toHaveTextContent('Leaves');
    expect(screen.getByTestId('unplaced-label-flower')).toHaveTextContent('Flower');
  });

  it('renders all target markers', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('label-target-0')).toBeTruthy();
    expect(screen.getByTestId('label-target-1')).toBeTruthy();
    expect(screen.getByTestId('label-target-2')).toBeTruthy();
    expect(screen.getByTestId('label-target-3')).toBeTruthy();
  });

  it('clicking label selects it', () => {
    renderWidget(interactiveConfig);
    const label = screen.getByTestId('unplaced-label-roots');
    fireEvent.click(label);
    expect(label.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking same label deselects it', () => {
    renderWidget(interactiveConfig);
    const label = screen.getByTestId('unplaced-label-roots');
    fireEvent.click(label);
    expect(label.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(label);
    expect(label.getAttribute('aria-selected')).toBe('false');
  });

  it('clicking target after selecting label places it', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    expect(screen.getByTestId('placed-label-0')).toHaveTextContent('Roots');
    expect(screen.queryByTestId('unplaced-label-roots')).toBeNull();
  });

  it('removes previous label from target when new label placed', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    expect(screen.getByTestId('placed-label-0')).toHaveTextContent('Roots');
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    expect(screen.getByTestId('placed-label-0')).toHaveTextContent('Stem');
  });

  it('remove button returns label to bank', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    expect(screen.getByTestId('placed-label-0')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Remove Roots from target 1'));
    expect(screen.queryByTestId('placed-label-0')).toBeNull();
    expect(screen.getByTestId('unplaced-label-roots')).toBeTruthy();
  });

  it('submit button disabled until all labels placed', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('submit-button')).toBeDisabled();
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    expect(screen.getByTestId('submit-button')).toBeDisabled();
  });

  it('submit enabled when all labels placed', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-1'));
    fireEvent.click(screen.getByTestId('unplaced-label-leaves'));
    fireEvent.click(screen.getByTestId('label-target-2'));
    fireEvent.click(screen.getByTestId('unplaced-label-flower'));
    fireEvent.click(screen.getByTestId('label-target-3'));
    expect(screen.getByTestId('submit-button')).toBeEnabled();
  });

  it('submit scores 100 for all correct', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-1'));
    fireEvent.click(screen.getByTestId('unplaced-label-leaves'));
    fireEvent.click(screen.getByTestId('label-target-2'));
    fireEvent.click(screen.getByTestId('unplaced-label-flower'));
    fireEvent.click(screen.getByTestId('label-target-3'));
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
    expect(screen.getByTestId('feedback')).toHaveTextContent('All labels placed correctly!');
  });

  it('submit scores partial correctness', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-1'));
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('unplaced-label-leaves'));
    fireEvent.click(screen.getByTestId('label-target-2'));
    fireEvent.click(screen.getByTestId('unplaced-label-flower'));
    fireEvent.click(screen.getByTestId('label-target-3'));
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(50, expect.any(Object));
  });

  it('shows placement status', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    expect(screen.getByTestId('placement-status')).toHaveTextContent('1 of 4 labels placed');
  });

  it('shows retry button after submission', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-1'));
    fireEvent.click(screen.getByTestId('unplaced-label-leaves'));
    fireEvent.click(screen.getByTestId('label-target-2'));
    fireEvent.click(screen.getByTestId('unplaced-label-flower'));
    fireEvent.click(screen.getByTestId('label-target-3'));
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(screen.getByTestId('retry-button')).toBeTruthy();
  });

  it('retry resets all labels to bank', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-1'));
    fireEvent.click(screen.getByTestId('unplaced-label-leaves'));
    fireEvent.click(screen.getByTestId('label-target-2'));
    fireEvent.click(screen.getByTestId('unplaced-label-flower'));
    fireEvent.click(screen.getByTestId('label-target-3'));
    fireEvent.click(screen.getByTestId('submit-button'));
    fireEvent.click(screen.getByTestId('retry-button'));
    expect(screen.getByTestId('unplaced-label-roots')).toBeTruthy();
    expect(screen.getByTestId('unplaced-label-stem')).toBeTruthy();
    expect(screen.getByTestId('unplaced-label-leaves')).toBeTruthy();
    expect(screen.getByTestId('unplaced-label-flower')).toBeTruthy();
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-1'));
    fireEvent.click(screen.getByTestId('unplaced-label-leaves'));
    fireEvent.click(screen.getByTestId('label-target-2'));
    fireEvent.click(screen.getByTestId('unplaced-label-flower'));
    fireEvent.click(screen.getByTestId('label-target-3'));
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'science.label-diagram' }),
    );
  });

  it('shows "All labels placed" in bank when all placed', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-1'));
    fireEvent.click(screen.getByTestId('unplaced-label-leaves'));
    fireEvent.click(screen.getByTestId('label-target-2'));
    fireEvent.click(screen.getByTestId('unplaced-label-flower'));
    fireEvent.click(screen.getByTestId('label-target-3'));
    expect(screen.getByText('All labels placed')).toBeTruthy();
  });

  it('shows hints when provided', () => {
    renderWidget({
      ...interactiveConfig,
      hints: ['Hint 1', 'Hint 2'],
    });
    expect(screen.getByTestId('hint-text')).toHaveTextContent('Hint 1');
  });

  it('shows More help when multiple hints', () => {
    renderWidget({
      ...interactiveConfig,
      hints: ['Hint 1', 'Hint 2'],
    });
    expect(screen.getByText('More help')).toBeTruthy();
    fireEvent.click(screen.getByText('More help'));
    expect(screen.getByTestId('hint-text')).toHaveTextContent('Hint 2');
  });
});

describe('LabelDiagram keyboard accessibility', () => {
  const interactiveConfig = {
    ...defaultConfig,
    interactive: true,
  };

  it('labels have role button and tabIndex 0', () => {
    renderWidget(interactiveConfig);
    const label = screen.getByTestId('unplaced-label-roots');
    expect(label.getAttribute('role')).toBe('button');
    expect(label.getAttribute('tabindex')).toBe('0');
  });

  it('labels have aria-label', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByLabelText('Drag label: Roots')).toBeTruthy();
    expect(screen.getByLabelText('Drag label: Stem')).toBeTruthy();
  });

  it('targets have role button', () => {
    renderWidget(interactiveConfig);
    const target = screen.getByTestId('label-target-0');
    expect(target.getAttribute('role')).toBe('button');
  });

  it('targets have aria-label', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByLabelText('Target 1: drop label here')).toBeTruthy();
  });

  it('Enter key selects label', () => {
    renderWidget(interactiveConfig);
    const label = screen.getByTestId('unplaced-label-roots');
    fireEvent.keyDown(label, { key: 'Enter' });
    expect(label.getAttribute('aria-selected')).toBe('true');
  });

  it('Space key selects label', () => {
    renderWidget(interactiveConfig);
    const label = screen.getByTestId('unplaced-label-roots');
    fireEvent.keyDown(label, { key: ' ' });
    expect(label.getAttribute('aria-selected')).toBe('true');
  });

  it('placed label has aria-label', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    expect(screen.getByLabelText('Roots placed at target 1')).toBeTruthy();
  });

  it('container has aria-label', () => {
    renderWidget(interactiveConfig);
    const container = screen.getByTestId('label-diagram');
    expect(container.getAttribute('aria-label')).toBe('Label diagram activity');
  });

  it('label bank has aria-label', () => {
    renderWidget(interactiveConfig);
    const bank = screen.getByTestId('label-bank');
    expect(bank.getAttribute('aria-label')).toBe('Label bank');
  });

  it('image has alt text', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByAltText('Diagram of a plant')).toBeTruthy();
  });

  it('has live region for placement status', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    const status = screen.getByTestId('placement-status');
    expect(status.closest('[aria-live]')).toBeTruthy();
  });
});

describe('LabelDiagram edge cases', () => {
  it('shows config error for missing image', () => {
    renderWidget({ labels: [{ id: 'r1', text: 'Roots', target: { x: 50, y: 90 } }] });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for empty labels', () => {
    renderWidget({ image: 'test.png', labels: [] });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for invalid config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('handles single label', () => {
    const { complete } = renderWidget({
      image: 'test.png',
      labels: [{ id: 'r1', text: 'Roots', target: { x: 50, y: 90 } }],
      interactive: true,
    });
    expect(screen.getByTestId('unplaced-label-r1')).toHaveTextContent('Roots');
    fireEvent.click(screen.getByTestId('unplaced-label-r1'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('submit-button'));
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('continue-button'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('defaults to interactive mode when interactive not specified', () => {
    const config = { ...defaultConfig };
    delete (config as Record<string, unknown>).interactive;
    renderWidget(config);
    expect(screen.getByTestId('label-target-0')).toBeTruthy();
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget(defaultConfig);
    expect(complete).not.toHaveBeenCalled();
  });

  it('handles label with description in interactive mode', () => {
    renderWidget({
      ...defaultConfig,
      interactive: true,
      labels: [
        { id: 'r1', text: 'Roots', target: { x: 50, y: 90 }, description: 'Under the soil' },
      ],
    });
    expect(screen.getByTestId('unplaced-label-r1')).toHaveTextContent('Roots');
  });

  it('all labels placed message shows when bank empty', () => {
    const cfg = { ...defaultConfig, interactive: true };
    renderWidget(cfg);
    fireEvent.click(screen.getByTestId('unplaced-label-roots'));
    fireEvent.click(screen.getByTestId('label-target-0'));
    fireEvent.click(screen.getByTestId('unplaced-label-stem'));
    fireEvent.click(screen.getByTestId('label-target-1'));
    fireEvent.click(screen.getByTestId('unplaced-label-leaves'));
    fireEvent.click(screen.getByTestId('label-target-2'));
    fireEvent.click(screen.getByTestId('unplaced-label-flower'));
    fireEvent.click(screen.getByTestId('label-target-3'));
    expect(screen.getByText('All labels placed')).toBeTruthy();
  });
});
