import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetErrorFallback } from './WidgetErrorFallback';

describe('WidgetErrorFallback', () => {
  it('renders default error message', () => {
    render(<WidgetErrorFallback widgetId="test-widget" />);
    expect(screen.getByText("This activity couldn't load. Try refreshing the page.")).toBeDefined();
  });

  it('renders custom message', () => {
    render(<WidgetErrorFallback widgetId="test-widget" message="Custom error" />);
    expect(screen.getByText('Custom error')).toBeDefined();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<WidgetErrorFallback widgetId="test-widget" onRetry={onRetry} />);
    expect(screen.getByTestId('widget-retry-button')).toBeDefined();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<WidgetErrorFallback widgetId="test-widget" />);
    expect(screen.queryByTestId('widget-retry-button')).toBeNull();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<WidgetErrorFallback widgetId="test-widget" onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('widget-retry-button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has role="alert"', () => {
    render(<WidgetErrorFallback widgetId="test-widget" />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('has correct data-testid', () => {
    render(<WidgetErrorFallback widgetId="test-widget" />);
    expect(screen.getByTestId('widget-error-fallback')).toBeDefined();
  });

  it('shows dev details in development mode', () => {
    render(
      <WidgetErrorFallback
        widgetId="test-widget"
        isDevMode={true}
        devDetails="Error: something went wrong"
      />,
    );
    expect(screen.getByText('Technical details')).toBeDefined();
    expect(screen.getByTestId('widget-error-details')).toBeDefined();
  });

  it('hides dev details in production mode', () => {
    render(
      <WidgetErrorFallback
        widgetId="test-widget"
        isDevMode={false}
        devDetails="Error: something went wrong"
      />,
    );
    expect(screen.queryByText('Technical details')).toBeNull();
  });

  it('hides dev details when devDetails is not provided', () => {
    render(<WidgetErrorFallback widgetId="test-widget" isDevMode={true} />);
    expect(screen.queryByText('Technical details')).toBeNull();
  });
});
