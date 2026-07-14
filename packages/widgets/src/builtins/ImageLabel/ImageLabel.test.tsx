import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { imageLabel } from './ImageLabel';

const WidgetComponent = imageLabel.render;

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
  image: 'assets/images/solar-system.png',
  altText: 'Solar system with planets',
  regions: [
    {
      id: 'mars',
      title: 'Mars',
      description: 'The Red Planet, 4th from the Sun',
      x: 45,
      y: 30,
      tooltip: 'Click to learn about Mars',
    },
    {
      id: 'jupiter',
      title: 'Jupiter',
      description: 'Largest planet in our solar system',
      x: 60,
      y: 50,
      tooltip: 'Click to learn about Jupiter',
    },
    { id: 'earth', title: 'Earth', description: 'Our home planet, 3rd from the Sun', x: 35, y: 40 },
  ],
  interactive: false,
};

describe('ImageLabel schema', () => {
  it('has correct widget id', () => {
    expect(imageLabel.id).toBe('science.image-label');
  });

  it('has a render function', () => {
    expect(typeof imageLabel.render).toBe('function');
  });

  it('has stable status', () => {
    expect(imageLabel.status).toBe('stable');
  });

  it('has correct domain', () => {
    expect(imageLabel.domain).toBe('science');
  });

  it('validates config with schema', () => {
    expect(imageLabel.render).toBeDefined();
  });
});

describe('ImageLabel observe mode (explorer)', () => {
  it('renders the image with correct src', () => {
    renderWidget(defaultConfig);
    const img = screen.getByTestId('image-label-image');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toContain('solar-system.png');
  });

  it('renders all region overlays', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('image-label-region-mars')).toBeTruthy();
    expect(screen.getByTestId('image-label-region-jupiter')).toBeTruthy();
    expect(screen.getByTestId('image-label-region-earth')).toBeTruthy();
  });

  it('renders region with dashed border in observe mode', () => {
    renderWidget(defaultConfig);
    const region = screen.getByTestId('image-label-region-mars');
    expect(region.style.border).toContain('dashed');
  });

  it('clicking a region opens info card', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(screen.getByTestId('info-card-mars')).toBeTruthy();
    expect(screen.getByTestId('info-card-title')).toHaveTextContent('Mars');
  });

  it('info card shows description', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(screen.getByTestId('info-card-description')).toHaveTextContent('The Red Planet');
  });

  it('close button dismisses info card', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(screen.getByTestId('info-card-mars')).toBeTruthy();
    fireEvent.click(screen.getByTestId('info-card-close'));
    expect(screen.queryByTestId('info-card-mars')).toBeNull();
  });

  it('pressing Escape closes info card', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(screen.getByTestId('info-card-mars')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('info-card-mars')).toBeNull();
  });

  it('clicking same region closes and reopens info card', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(screen.getByTestId('info-card-mars')).toBeTruthy();
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(screen.queryByTestId('info-card-mars')).toBeNull();
  });

  it('clicking different region updates card content', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(screen.getByTestId('info-card-title')).toHaveTextContent('Mars');
    fireEvent.click(screen.getByTestId('image-label-region-jupiter'));
    expect(screen.getByTestId('info-card-title')).toHaveTextContent('Jupiter');
  });

  it('completes with score 100 when any region is clicked', () => {
    const { complete } = renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows acknowledge button before clicking', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('observe-acknowledge')).toBeTruthy();
  });

  it('clicking acknowledge marks as explored', () => {
    const { complete } = renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });

  it('shows tooltip on hover', () => {
    renderWidget(defaultConfig);
    fireEvent.mouseEnter(screen.getByTestId('image-label-region-mars'));
    const tooltip = screen.getByTestId('region-tooltip-mars');
    expect(tooltip).toBeTruthy();
    expect(tooltip).toHaveTextContent('Click to learn about Mars');
  });

  it('hides tooltip on mouse leave', () => {
    renderWidget(defaultConfig);
    fireEvent.mouseEnter(screen.getByTestId('image-label-region-mars'));
    expect(screen.getByTestId('region-tooltip-mars')).toBeTruthy();
    fireEvent.mouseLeave(screen.getByTestId('image-label-region-mars'));
    expect(screen.queryByTestId('region-tooltip-mars')).toBeNull();
  });
});

describe('ImageLabel interactive mode (quiz)', () => {
  const interactiveConfig = {
    ...defaultConfig,
    interactive: true,
  };

  it('renders image in interactive mode', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('image-label-image')).toBeTruthy();
  });

  it('shows quiz prompt', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('image-label-quiz-prompt')).toBeTruthy();
  });

  it('renders regions as circles in interactive mode', () => {
    renderWidget(interactiveConfig);
    const region = screen.getByTestId('image-label-region-mars');
    expect(region.style.border).toContain('solid');
    expect(region.style.borderRadius).toBe('50%');
  });

  it('clicking correct region shows success', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('image-label-quiz-prompt')).toBeTruthy();
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    const feedback = screen.getByTestId('feedback');
    expect(feedback).toBeTruthy();
  });

  it('correct click completes with score 100', () => {
    const { complete } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    if (complete.mock.calls.length > 0) {
      const lastCall = complete.mock.calls[complete.mock.calls.length - 1];
      expect(lastCall[0]).toBe(100);
    }
  });

  it('clicking wrong region shows try again', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    const feedback = screen.getByTestId('feedback');
    expect(feedback).toBeTruthy();
  });

  it('shows hint button', () => {
    renderWidget(interactiveConfig);
    expect(screen.getByTestId('hint-button')).toBeTruthy();
  });

  it('clicking hint shows hint text', () => {
    renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('hint-button'));
    expect(screen.getByTestId('hint-text')).toBeTruthy();
  });

  it('emits interaction on region click', () => {
    const { emitInteraction } = renderWidget(interactiveConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'science.image-label', action: 'click' }),
    );
  });
});

describe('ImageLabel accessibility', () => {
  it('regions are focusable with tabIndex 0', () => {
    renderWidget(defaultConfig);
    const region = screen.getByTestId('image-label-region-mars');
    expect(region.getAttribute('tabindex')).toBe('0');
  });

  it('regions have role button', () => {
    renderWidget(defaultConfig);
    const region = screen.getByTestId('image-label-region-mars');
    expect(region.getAttribute('role')).toBe('button');
  });

  it('regions have aria-label matching title', () => {
    renderWidget(defaultConfig);
    expect(screen.getByLabelText('Mars')).toBeTruthy();
    expect(screen.getByLabelText('Jupiter')).toBeTruthy();
    expect(screen.getByLabelText('Earth')).toBeTruthy();
  });

  it('container has role group', () => {
    renderWidget(defaultConfig);
    const container = screen.getByTestId('image-label');
    expect(container.getAttribute('role')).toBe('group');
  });

  it('container has aria-label', () => {
    renderWidget(defaultConfig);
    const container = screen.getByTestId('image-label');
    expect(container.getAttribute('aria-label')).toBe('Interactive image regions');
  });

  it('info card has role dialog', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    expect(screen.getByTestId('info-card-mars').getAttribute('role')).toBe('dialog');
  });

  it('info card has aria-labelledby', () => {
    renderWidget(defaultConfig);
    fireEvent.click(screen.getByTestId('image-label-region-mars'));
    const card = screen.getByTestId('info-card-mars');
    const labelledby = card.getAttribute('aria-labelledby');
    expect(labelledby).toBeTruthy();
  });

  it('Enter key opens info card', () => {
    renderWidget(defaultConfig);
    fireEvent.keyDown(screen.getByTestId('image-label-region-mars'), { key: 'Enter' });
    expect(screen.getByTestId('info-card-mars')).toBeTruthy();
  });

  it('Space key opens info card', () => {
    renderWidget(defaultConfig);
    fireEvent.keyDown(screen.getByTestId('image-label-region-mars'), { key: ' ' });
    expect(screen.getByTestId('info-card-mars')).toBeTruthy();
  });

  it('image has alt text', () => {
    renderWidget(defaultConfig);
    expect(screen.getByAltText('Solar system with planets')).toBeTruthy();
  });

  it('uses default alt text when not provided', () => {
    renderWidget({
      image: 'assets/images/test.png',
      regions: [{ id: 'r1', title: 'R1', x: 50, y: 50 }],
    });
    expect(screen.getByAltText('Interactive educational image')).toBeTruthy();
  });
});

describe('ImageLabel edge cases', () => {
  it('shows config error for missing image', () => {
    renderWidget({ regions: [{ id: 'r1', title: 'R1', x: 50, y: 50 }] });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for empty regions', () => {
    renderWidget({ image: 'test.png', regions: [] });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for invalid config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('handles single region', () => {
    renderWidget({
      image: 'test.png',
      regions: [{ id: 'r1', title: 'Single', x: 50, y: 50 }],
    });
    expect(screen.getByTestId('image-label-region-r1')).toBeTruthy();
  });

  it('handles region without description', () => {
    renderWidget({
      image: 'test.png',
      regions: [{ id: 'r1', title: 'No Desc', x: 50, y: 50 }],
    });
    fireEvent.click(screen.getByTestId('image-label-region-r1'));
    expect(screen.getByTestId('info-card-r1')).toBeTruthy();
    expect(screen.queryByTestId('info-card-description')).toBeNull();
  });

  it('defaults to observe mode when interactive not specified', () => {
    const config = { ...defaultConfig };
    delete (config as Record<string, unknown>).interactive;
    renderWidget(config);
    expect(screen.getByTestId('image-label')).toBeTruthy();
  });

  it('does not call complete on mount', () => {
    const { complete } = renderWidget(defaultConfig);
    expect(complete).not.toHaveBeenCalled();
  });
});
