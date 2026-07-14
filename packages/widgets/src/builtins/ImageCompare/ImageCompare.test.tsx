import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { imageCompare } from './ImageCompare';

const WidgetComponent = imageCompare.render;

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
  leftImage: 'assets/images/left.png',
  rightImage: 'assets/images/right.png',
  altText: { left: 'Left image', right: 'Right image' },
};

describe('ImageCompare schema', () => {
  it('has correct widget id', () => {
    expect(imageCompare.id).toBe('core.image-compare');
  });

  it('has a render function', () => {
    expect(typeof imageCompare.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(imageCompare.domain).toBe('core');
  });

  it('has stable status', () => {
    expect(imageCompare.status).toBe('stable');
  });

  it('defaults to slider mode', () => {
    renderWidget(defaultConfig);
    expect(screen.getByTestId('image-compare-slider')).toBeTruthy();
  });

  it('validates config with missing altText', () => {
    renderWidget({
      leftImage: 'img.png',
      rightImage: 'img2.png',
    });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('ImageCompare slider mode', () => {
  it('renders slider container with role="slider"', () => {
    renderWidget({ ...defaultConfig, mode: 'slider' });
    const slider = screen.getByTestId('image-compare-slider');
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('role')).toBe('slider');
  });

  it('renders both images', () => {
    renderWidget({ ...defaultConfig, mode: 'slider' });
    expect(screen.getByTestId('image-compare-left')).toBeTruthy();
    expect(screen.getByTestId('image-compare-right')).toBeTruthy();
  });

  it('has correct aria-valuemin and aria-valuemax', () => {
    renderWidget({ ...defaultConfig, mode: 'slider' });
    const slider = screen.getByTestId('image-compare-slider');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
  });

  it('renders slider position indicator', () => {
    renderWidget({ ...defaultConfig, mode: 'slider' });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 50%');
  });

  it('shows labels when showLabels is true', () => {
    renderWidget({
      ...defaultConfig,
      mode: 'slider',
      leftLabel: 'Before',
      rightLabel: 'After',
      showLabels: true,
    });
    expect(screen.getByText('Before')).toBeTruthy();
    expect(screen.getByText('After')).toBeTruthy();
  });

  it('hides labels when showLabels is false', () => {
    renderWidget({
      ...defaultConfig,
      mode: 'slider',
      leftLabel: 'Before',
      rightLabel: 'After',
      showLabels: false,
    });
    expect(screen.queryByText('Before')).toBeNull();
    expect(screen.queryByText('After')).toBeNull();
  });

  it('defaults label text when labels not provided', () => {
    renderWidget({ ...defaultConfig, mode: 'slider' });
    expect(screen.getByText('Left')).toBeTruthy();
    expect(screen.getByText('Right')).toBeTruthy();
  });

  it('handles keyboard arrow keys', () => {
    renderWidget({ ...defaultConfig, mode: 'slider', interactive: true });
    const slider = screen.getByTestId('image-compare-slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 55%');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 50%');
  });

  it('is locked in observe mode', () => {
    renderWidget({ ...defaultConfig, mode: 'slider', interactive: false });
    const slider = screen.getByTestId('image-compare-slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 50%');
  });

  it('respects custom sliderPosition in config', () => {
    renderWidget({ ...defaultConfig, mode: 'slider', sliderPosition: 75 });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 75%');
  });
});

describe('ImageCompare side-by-side mode', () => {
  it('renders side-by-side layout', () => {
    renderWidget({ ...defaultConfig, mode: 'side-by-side' });
    expect(screen.getByTestId('image-compare-left')).toBeTruthy();
    expect(screen.getByTestId('image-compare-right')).toBeTruthy();
  });

  it('renders labels when provided', () => {
    renderWidget({
      ...defaultConfig,
      mode: 'side-by-side',
      leftLabel: 'Original',
      rightLabel: 'Edited',
      showLabels: true,
    });
    expect(screen.getByText('Original')).toBeTruthy();
    expect(screen.getByText('Edited')).toBeTruthy();
  });

  it('renders caption', () => {
    renderWidget({ ...defaultConfig, mode: 'side-by-side', caption: 'Comparison' });
    expect(screen.getByText('Comparison')).toBeTruthy();
  });

  it('has role="img" with aria-label', () => {
    renderWidget({ ...defaultConfig, mode: 'side-by-side', caption: 'Side by side view' });
    const container = screen.getByTestId('image-compare');
    expect(container.getAttribute('role')).toBe('img');
    expect(container.getAttribute('aria-label')).toContain('Side by side view');
  });
});

describe('ImageCompare overlay mode', () => {
  it('renders overlay mode with images', () => {
    renderWidget({ ...defaultConfig, mode: 'overlay' });
    expect(screen.getByTestId('image-compare-overlay-top')).toBeTruthy();
  });

  it('renders overlay range slider in interactive mode', () => {
    renderWidget({ ...defaultConfig, mode: 'overlay', interactive: true });
    expect(screen.getByTestId('image-compare-overlay-slider')).toBeTruthy();
  });

  it('does not render overlay slider in observe mode', () => {
    renderWidget({ ...defaultConfig, mode: 'overlay', interactive: false });
    expect(screen.queryByTestId('image-compare-overlay-slider')).toBeNull();
  });
});

describe('ImageCompare before-after mode', () => {
  it('renders slider in before-after mode', () => {
    renderWidget({ ...defaultConfig, mode: 'before-after' });
    expect(screen.getByTestId('image-compare-slider')).toBeTruthy();
  });

  it('shows Before/After labels by default', () => {
    renderWidget({
      ...defaultConfig,
      mode: 'before-after',
      leftLabel: 'Before',
      rightLabel: 'After',
    });
    expect(screen.getByText('Before')).toBeTruthy();
    expect(screen.getByText('After')).toBeTruthy();
  });
});

describe('ImageCompare accessibility', () => {
  it('container has role="img" with descriptive aria-label', () => {
    renderWidget({
      ...defaultConfig,
      caption: 'Compare these images',
      leftLabel: 'Left view',
      altText: { left: 'First image', right: 'Second image' },
    });
    const container = screen.getByTestId('image-compare');
    expect(container.getAttribute('role')).toBe('img');
    expect(container.getAttribute('aria-label')).toContain('Compare these images');
    expect(container.getAttribute('aria-label')).toContain('First image');
  });

  it('slider has slider role and value attributes', () => {
    renderWidget({ ...defaultConfig, mode: 'slider' });
    const slider = screen.getByTestId('image-compare-slider');
    expect(slider.getAttribute('role')).toBe('slider');
    expect(slider.getAttribute('aria-valuenow')).toBe('50');
  });

  it('images have proper alt attributes', () => {
    renderWidget({
      ...defaultConfig,
      mode: 'side-by-side',
      altText: { left: 'Healthy leaf', right: 'Diseased leaf' },
    });
    expect(screen.getByTestId('image-compare-left').getAttribute('alt')).toBe('Healthy leaf');
    expect(screen.getByTestId('image-compare-right').getAttribute('alt')).toBe('Diseased leaf');
  });

  it('has live region for slider position', () => {
    renderWidget({ ...defaultConfig, mode: 'slider' });
    const status = screen.getByTestId('slider-position');
    expect(status.closest('[aria-live="polite"]')).toBeTruthy();
  });

  it('has role="img" on side-by-side container', () => {
    renderWidget({ ...defaultConfig, mode: 'side-by-side' });
    const container = screen.getByTestId('image-compare');
    expect(container.getAttribute('role')).toBe('img');
  });
});

describe('ImageCompare observe mode', () => {
  it('shows Mark as seen button in observe mode', () => {
    renderWidget({ ...defaultConfig, interactive: false });
    expect(screen.getByTestId('observe-acknowledge')).toBeTruthy();
  });

  it('completes on acknowledge', () => {
    const { complete, emitInteraction } = renderWidget({ ...defaultConfig, interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', widgetId: 'core.image-compare' }),
    );
  });
});

describe('ImageCompare interactive mode', () => {
  it('shows Got it button in interactive mode', () => {
    renderWidget({ ...defaultConfig, interactive: true });
    expect(screen.getByTestId('image-compare-got-it')).toBeTruthy();
  });

  it('completes on Got it click', () => {
    const { complete, emitInteraction } = renderWidget({ ...defaultConfig, interactive: true });
    fireEvent.click(screen.getByTestId('image-compare-got-it'));
    expect(complete).toHaveBeenCalledWith(100, expect.objectContaining({ sliderPosition: 50 }));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'acknowledge', widgetId: 'core.image-compare' }),
    );
  });

  it('preserves slider position in completion state', () => {
    const { complete } = renderWidget({ ...defaultConfig, interactive: true });
    const slider = screen.getByTestId('image-compare-slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('image-compare-got-it'));
    expect(complete).toHaveBeenCalledWith(100, expect.objectContaining({ sliderPosition: 55 }));
  });
});

describe('ImageCompare edge cases', () => {
  it('shows config error for missing leftImage', () => {
    renderWidget({
      rightImage: 'right.png',
      altText: { left: 'Left', right: 'Right' },
    });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for missing rightImage', () => {
    renderWidget({
      leftImage: 'left.png',
      altText: { left: 'Left', right: 'Right' },
    });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for missing alt text left', () => {
    renderWidget({
      leftImage: 'left.png',
      rightImage: 'right.png',
      altText: { right: 'Right' },
    });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('renders caption when provided', () => {
    renderWidget({ ...defaultConfig, caption: 'A visual comparison' });
    expect(screen.getByText('A visual comparison')).toBeTruthy();
  });

  it('uses correct image paths', () => {
    renderWidget({ ...defaultConfig, mode: 'side-by-side' });
    const leftImg = screen.getByTestId('image-compare-left');
    const rightImg = screen.getByTestId('image-compare-right');
    expect(leftImg.getAttribute('src')).toBe('/assets/images/left.png');
    expect(rightImg.getAttribute('src')).toBe('/assets/images/right.png');
  });
});

describe('ImageCompare keyboard accessibility', () => {
  it('slider responds to ArrowUp key', () => {
    renderWidget({ ...defaultConfig, mode: 'slider', interactive: true });
    const slider = screen.getByTestId('image-compare-slider');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 55%');
  });

  it('slider responds to ArrowDown key', () => {
    renderWidget({ ...defaultConfig, mode: 'slider', interactive: true });
    const slider = screen.getByTestId('image-compare-slider');
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 45%');
  });

  it('does not go below 0 on ArrowLeft', () => {
    renderWidget({ ...defaultConfig, mode: 'slider', sliderPosition: 2, interactive: true });
    const slider = screen.getByTestId('image-compare-slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 0%');
  });

  it('does not exceed 100 on ArrowRight', () => {
    renderWidget({ ...defaultConfig, mode: 'slider', sliderPosition: 98, interactive: true });
    const slider = screen.getByTestId('image-compare-slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByTestId('slider-position')).toHaveTextContent('Position: 100%');
  });
});
