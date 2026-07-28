import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { placeValueChart } from './PlaceValueChart';

const WidgetComponent = placeValueChart.render;

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

describe('PlaceValueChart schema', () => {
  it('has correct widget id', () => {
    expect(placeValueChart.id).toBe('math.place-value-chart');
  });

  it('has a render function', () => {
    expect(typeof placeValueChart.render).toBe('function');
  });
});

describe('PlaceValueChart observe mode', () => {
  it('renders lakh columns by default', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: false });
    expect(screen.getByTestId('column-L')).toBeTruthy();
    expect(screen.getByTestId('column-TTh')).toBeTruthy();
    expect(screen.getByTestId('column-Th')).toBeTruthy();
    expect(screen.getByTestId('column-H')).toBeTruthy();
    expect(screen.getByTestId('column-T')).toBeTruthy();
    expect(screen.getByTestId('column-O')).toBeTruthy();
  });

  it('renders crore columns', () => {
    renderWidget({ maxPlaces: 'crore', interactive: false });
    expect(screen.getByTestId('column-Cr')).toBeTruthy();
    expect(screen.getByTestId('column-TL')).toBeTruthy();
    expect(screen.getByTestId('column-L')).toBeTruthy();
    expect(screen.getByTestId('column-TTh')).toBeTruthy();
    expect(screen.getByTestId('column-Th')).toBeTruthy();
    expect(screen.getByTestId('column-H')).toBeTruthy();
    expect(screen.getByTestId('column-T')).toBeTruthy();
    expect(screen.getByTestId('column-O')).toBeTruthy();
  });

  it('shows labels by default', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: false });
    expect(screen.getByText('Lakh')).toBeTruthy();
    expect(screen.getByText('Ten Th.')).toBeTruthy();
    expect(screen.getByText('Thousand')).toBeTruthy();
    expect(screen.getByText('Hundred')).toBeTruthy();
    expect(screen.getByText('Tens')).toBeTruthy();
    expect(screen.getByText('Ones')).toBeTruthy();
  });

  it('hides labels when showLabels is false', () => {
    renderWidget({ maxPlaces: 'lakh', showLabels: false, interactive: false });
    expect(screen.queryByText('Lakh')).toBeNull();
  });

  it('renders pre-placed digits right-aligned in lakh mode', () => {
    renderWidget({ maxPlaces: 'lakh', digits: [1, 2, 3, 4], interactive: false });
    expect(screen.getByTestId('slot-L')).toHaveTextContent('');
    expect(screen.getByTestId('slot-TTh')).toHaveTextContent('');
    expect(screen.getByTestId('slot-Th')).toHaveTextContent('1');
    expect(screen.getByTestId('slot-H')).toHaveTextContent('2');
    expect(screen.getByTestId('slot-T')).toHaveTextContent('3');
    expect(screen.getByTestId('slot-O')).toHaveTextContent('4');
  });

  it('renders pre-placed digits right-aligned in crore mode', () => {
    renderWidget({ maxPlaces: 'crore', digits: [1, 2, 3, 4], interactive: false });
    expect(screen.getByTestId('slot-Cr')).toHaveTextContent('');
    expect(screen.getByTestId('slot-TL')).toHaveTextContent('');
    expect(screen.getByTestId('slot-L')).toHaveTextContent('');
    expect(screen.getByTestId('slot-TTh')).toHaveTextContent('');
    expect(screen.getByTestId('slot-Th')).toHaveTextContent('1');
    expect(screen.getByTestId('slot-H')).toHaveTextContent('2');
    expect(screen.getByTestId('slot-T')).toHaveTextContent('3');
    expect(screen.getByTestId('slot-O')).toHaveTextContent('4');
  });

  it('completes when acknowledge button is clicked', () => {
    const { complete, emitInteraction } = renderWidget({ maxPlaces: 'lakh', digits: [5], interactive: false });
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true, correct: true }),
    );
  });

  it('shows content acknowledged after acknowledge click', () => {
    renderWidget({ maxPlaces: 'lakh', digits: [5], interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(screen.getByTestId('observe-complete')).toBeTruthy();
  });

  it('renders description', () => {
    renderWidget({ maxPlaces: 'lakh', description: 'Place the digits correctly', interactive: false });
    expect(screen.getByText('Place the digits correctly')).toBeTruthy();
  });

  it('shows config error for invalid config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});

describe('PlaceValueChart interactive mode', () => {
  it('renders digit bank with default 0-9', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByTestId(`bank-digit-${i}`)).toBeTruthy();
    }
  });

  it('renders digit bank with custom digits', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true, draggableDigits: [1, 2, 3] });
    expect(screen.getByTestId('bank-digit-1')).toBeTruthy();
    expect(screen.getByTestId('bank-digit-2')).toBeTruthy();
    expect(screen.getByTestId('bank-digit-3')).toBeTruthy();
    expect(screen.queryByTestId('bank-digit-0')).toBeNull();
  });

  it('clicking digit selects it', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    const digit5 = screen.getByTestId('bank-digit-5');
    fireEvent.click(digit5);
    expect(digit5.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking selected digit deselects it', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    const digit5 = screen.getByTestId('bank-digit-5');
    fireEvent.click(digit5);
    expect(digit5.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(digit5);
    expect(digit5.getAttribute('aria-selected')).toBe('false');
  });

  it('clicking slot after selecting digit places it', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    expect(screen.getByTestId('slot-O')).toHaveTextContent('5');
  });

  it('clicking placed digit removes it', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    expect(screen.getByTestId('slot-O')).toHaveTextContent('5');
    fireEvent.click(screen.getByTestId('slot-O'));
    expect(screen.getByTestId('slot-O')).toHaveTextContent('');
  });

  it('shows selected digit status', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    fireEvent.click(screen.getByTestId('bank-digit-3'));
    expect(screen.getByTestId('selected-digit-status')).toHaveTextContent(
      'Selected: 3 → click a column to place it',
    );
  });

  it('submit button disabled when no digits placed', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    expect(screen.getByText('Submit')).toBeDisabled();
  });

  it('submit button enabled after placing a digit', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    expect(screen.getByText('Submit')).toBeEnabled();
  });

  it('submit button disabled after submission', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true, targetNumber: 5 });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('scores 100 when placed digits match target number', () => {
    const { complete } = renderWidget({
      maxPlaces: 'lakh',
      interactive: true,
      targetNumber: 42,
    });
    fireEvent.click(screen.getByTestId('bank-digit-4'));
    fireEvent.click(screen.getByTestId('slot-T'));
    fireEvent.click(screen.getByTestId('bank-digit-2'));
    fireEvent.click(screen.getByTestId('slot-O'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('scores 0 when placed digits do not match target number', () => {
    const { complete } = renderWidget({
      maxPlaces: 'lakh',
      interactive: true,
      targetNumber: 42,
    });
    fireEvent.click(screen.getByTestId('bank-digit-2'));
    fireEvent.click(screen.getByTestId('slot-O'));
    fireEvent.click(screen.getByText('Submit'));
    expect(complete).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('shows feedback after submission with target number', () => {
    renderWidget({
      maxPlaces: 'lakh',
      interactive: true,
      targetNumber: 5,
    });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByTestId('feedback')).toBeTruthy();
  });

  it('shows correct feedback when match', () => {
    renderWidget({
      maxPlaces: 'lakh',
      interactive: true,
      targetNumber: 5,
    });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Correct! The number matches.')).toBeTruthy();
  });

  it('shows incorrect feedback when mismatch', () => {
    renderWidget({
      maxPlaces: 'lakh',
      interactive: true,
      targetNumber: 42,
    });
    fireEvent.click(screen.getByTestId('bank-digit-2'));
    fireEvent.click(screen.getByTestId('slot-O'));
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText(/expected 42/)).toBeTruthy();
  });

  it('replaces filled slot when digit is selected and slot is occupied', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    expect(screen.getByTestId('slot-O')).toHaveTextContent('5');
    fireEvent.click(screen.getByTestId('bank-digit-8'));
    fireEvent.click(screen.getByTestId('slot-O'));
    expect(screen.getByTestId('slot-O')).toHaveTextContent('8');
  });

  it('clears slot when no digit is selected and slot is occupied', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    expect(screen.getByTestId('slot-O')).toHaveTextContent('5');
    fireEvent.click(screen.getByTestId('slot-O'));
    expect(screen.getByTestId('slot-O')).toHaveTextContent('');
  });
});

describe('PlaceValueChart digit bank narrowing', () => {
  it('derives digits from targetNumber 1234', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true, targetNumber: 1234 });
    expect(screen.getByTestId('bank-digit-1')).toBeTruthy();
    expect(screen.getByTestId('bank-digit-2')).toBeTruthy();
    expect(screen.getByTestId('bank-digit-3')).toBeTruthy();
    expect(screen.getByTestId('bank-digit-4')).toBeTruthy();
    expect(screen.queryByTestId('bank-digit-5')).toBeNull();
    expect(screen.queryByTestId('bank-digit-6')).toBeNull();
    expect(screen.queryByTestId('bank-digit-7')).toBeNull();
    expect(screen.queryByTestId('bank-digit-8')).toBeNull();
    expect(screen.queryByTestId('bank-digit-9')).toBeNull();
    expect(screen.queryByTestId('bank-digit-0')).toBeNull();
  });

  it('derives digits from targetNumber 500', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true, targetNumber: 500 });
    expect(screen.getByTestId('bank-digit-0')).toBeTruthy();
    expect(screen.getByTestId('bank-digit-5')).toBeTruthy();
    expect(screen.queryByTestId('bank-digit-1')).toBeNull();
  });

  it('uses draggableDigits when provided even with targetNumber', () => {
    renderWidget({
      maxPlaces: 'lakh',
      interactive: true,
      targetNumber: 1234,
      draggableDigits: [0, 9],
    });
    expect(screen.getByTestId('bank-digit-0')).toBeTruthy();
    expect(screen.getByTestId('bank-digit-9')).toBeTruthy();
    expect(screen.queryByTestId('bank-digit-1')).toBeNull();
  });

  it('defaults to all digits 0-9 when no targetNumber', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByTestId(`bank-digit-${i}`)).toBeTruthy();
    }
  });
});

describe('PlaceValueChart keyboard accessibility', () => {
  it('columns have columnheader role', () => {
    renderWidget({ maxPlaces: 'lakh' });
    expect(screen.getByTestId('column-L').getAttribute('role')).toBe('columnheader');
    expect(screen.getByTestId('column-O').getAttribute('role')).toBe('columnheader');
  });

  it('slots have button role in interactive mode', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    expect(screen.getByTestId('slot-O').getAttribute('role')).toBe('button');
  });

  it('slots do not have button role in observe mode', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: false });
    expect(screen.getByTestId('slot-O').getAttribute('role')).toBeNull();
  });

  it('has tabIndex 0 on slots in interactive mode', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    expect(screen.getByTestId('slot-O').getAttribute('tabindex')).toBe('0');
  });

  it('digit bank items have button role', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    expect(screen.getByTestId('bank-digit-0').getAttribute('role')).toBe('button');
  });

  it('digit bank items have aria-selected', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    const digit = screen.getByTestId('bank-digit-3');
    expect(digit.getAttribute('aria-selected')).toBe('false');
    fireEvent.click(digit);
    expect(digit.getAttribute('aria-selected')).toBe('true');
  });

  it('supports Enter key on digit bank', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    const digit = screen.getByTestId('bank-digit-5');
    fireEvent.keyDown(digit, { key: 'Enter' });
    expect(digit.getAttribute('aria-selected')).toBe('true');
  });

  it('supports Space key on digit bank', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    const digit = screen.getByTestId('bank-digit-5');
    fireEvent.keyDown(digit, { key: ' ' });
    expect(digit.getAttribute('aria-selected')).toBe('true');
  });

  it('supports Enter key on slot', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.keyDown(screen.getByTestId('slot-O'), { key: 'Enter' });
    expect(screen.getByTestId('slot-O')).toHaveTextContent('5');
  });

  it('slots have descriptive aria-labels', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: true });
    const slot = screen.getByTestId('slot-O');
    expect(slot.getAttribute('aria-label')).toContain('Ones');
  });

  it('widget has aria-label', () => {
    renderWidget({ maxPlaces: 'lakh' });
    expect(screen.getByTestId('place-value-chart').getAttribute('aria-label')).toBe(
      'Place value chart',
    );
  });
});

describe('PlaceValueChart edge cases', () => {
  it('shows digit bank in interactive mode by default', () => {
    renderWidget({ maxPlaces: 'lakh' });
    expect(screen.getByTestId('digit-bank')).toBeTruthy();
  });

  it('does not show digit bank when interactive is false', () => {
    renderWidget({ maxPlaces: 'lakh', interactive: false });
    expect(screen.queryByTestId('digit-bank')).toBeNull();
  });

  it('emits interaction with widget ID on submit', () => {
    const { emitInteraction } = renderWidget({
      maxPlaces: 'lakh',
      interactive: true,
      targetNumber: 5,
    });
    fireEvent.click(screen.getByTestId('bank-digit-5'));
    fireEvent.click(screen.getByTestId('slot-O'));
    fireEvent.click(screen.getByText('Submit'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'math.place-value-chart' }),
    );
  });

  it('shows config error for invalid config', () => {
    renderWidget({ interactive: true });
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });

  it('shows config error for empty object', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeTruthy();
  });
});
