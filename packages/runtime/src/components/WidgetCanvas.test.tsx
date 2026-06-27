import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WidgetCanvas, formatWidgetName } from './WidgetCanvas';

describe('formatWidgetName', () => {
  it('formats widget ID with hyphens into title case', () => {
    expect(formatWidgetName('open-edu.multiple-choice')).toBe('Multiple Choice');
  });

  it('formats widget ID with single word', () => {
    expect(formatWidgetName('open-edu.exercise')).toBe('Exercise');
  });

  it('handles ID without dots', () => {
    expect(formatWidgetName('drag-drop')).toBe('Drag Drop');
  });

  it('returns fallback for empty string', () => {
    expect(formatWidgetName('')).toBe('');
  });

  it('handles ID with multiple hyphens', () => {
    expect(formatWidgetName('open-edu.place-value-chart')).toBe('Place Value Chart');
  });
});

describe('WidgetCanvas', () => {
  it('renders children', () => {
    render(
      <WidgetCanvas widgetId="open-edu.test">
        <p>Test content</p>
      </WidgetCanvas>,
    );
    expect(screen.getByText('Test content')).toBeDefined();
  });

  it('displays widget name from ID', () => {
    render(
      <WidgetCanvas widgetId="open-edu.multiple-choice">
        <p>Content</p>
      </WidgetCanvas>,
    );
    expect(screen.getByText('Multiple Choice')).toBeDefined();
  });

  it('uses custom widgetName when provided', () => {
    render(
      <WidgetCanvas widgetId="open-edu.test" widgetName="Custom Name">
        <p>Content</p>
      </WidgetCanvas>,
    );
    expect(screen.getByText('Custom Name')).toBeDefined();
  });

  it('has correct data-testid', () => {
    render(
      <WidgetCanvas widgetId="open-edu.test">
        <p>Content</p>
      </WidgetCanvas>,
    );
    expect(screen.getByTestId('widget-canvas')).toBeDefined();
  });

  it('has role="region" with aria-label', () => {
    render(
      <WidgetCanvas widgetId="open-edu.test" widgetName="My Widget">
        <p>Content</p>
      </WidgetCanvas>,
    );
    const region = screen.getByRole('region', { name: 'My Widget' });
    expect(region).toBeDefined();
  });

  it('renders with custom className', () => {
    render(
      <WidgetCanvas widgetId="open-edu.test" className="extra-class">
        <p>Content</p>
      </WidgetCanvas>,
    );
    const canvas = screen.getByTestId('widget-canvas');
    expect(canvas.className).toContain('extra-class');
  });

  it('renders with custom minHeight', () => {
    render(
      <WidgetCanvas widgetId="open-edu.test" minHeight={300}>
        <p>Content</p>
      </WidgetCanvas>,
    );
    const canvas = screen.getByTestId('widget-canvas');
    expect(canvas.style.minHeight).toBe('300px');
  });

  it('renders with default minHeight of 200', () => {
    render(
      <WidgetCanvas widgetId="open-edu.test">
        <p>Content</p>
      </WidgetCanvas>,
    );
    const canvas = screen.getByTestId('widget-canvas');
    expect(canvas.style.minHeight).toBe('200px');
  });
});
