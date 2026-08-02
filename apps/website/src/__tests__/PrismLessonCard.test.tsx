import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it, vi } from 'vitest';
import { PrismLessonCard } from '../ui/PrismLessonCard';
import { dictionaries } from '../i18n-dictionaries';

const ROYGBIV = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'];

function renderCard(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <PrismLessonCard />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

function expectFeedbackVisible(text: RegExp): void {
  expect(screen.queryAllByText(text).length).toBeGreaterThan(0);
}

function expectNoFeedback(text: RegExp): void {
  expect(screen.queryAllByText(text)).toHaveLength(0);
}

function placeOrder(order: string[]): void {
  order.forEach((color, index) => {
    fireEvent.click(screen.getByRole('button', { name: `${color} tile` }));
    fireEvent.click(screen.getByRole('button', { name: `Slot ${index + 1}` }));
  });
}

describe('PrismLessonCard', () => {
  it('renders the question, instructions, and a disabled check button', () => {
    renderCard();
    expect(screen.getByText('Which order does light split into a rainbow?')).toBeInTheDocument();
    expect(screen.getByText('Drag each color tile into the correct slot.')).toBeInTheDocument();
    const check = screen.getByRole('button', { name: 'Check Answer' });
    expect(check).toBeInTheDocument();
    expect(check).toBeDisabled();
  });

  it('shows success feedback when tiles are placed in ROYGBIV order', () => {
    renderCard();
    placeOrder(ROYGBIV);
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    expectFeedbackVisible(/Correct!/);
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('shows error feedback when tiles are placed in the wrong order', () => {
    renderCard();
    placeOrder([...ROYGBIV].reverse());
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    expectFeedbackVisible(/Not quite/);
    expect(screen.getByRole('button', { name: 'Check Answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('resets slots and clears feedback when Try Again is clicked', () => {
    renderCard();
    placeOrder([...ROYGBIV].reverse());
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    expectFeedbackVisible(/Not quite/);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expectNoFeedback(/Not quite/);
    expect(screen.getByRole('button', { name: 'Check Answer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Red tile' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Slot 1' })).toBeInTheDocument();
  });

  it('returns a tile to the palette when a filled slot is clicked', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Red tile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Slot 1' }));
    expect(screen.getByRole('button', { name: 'Red tile' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Slot 1: Red tile' }));
    expect(screen.getByRole('button', { name: 'Red tile' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Slot 1' })).toBeInTheDocument();
  });

  it('places tiles via drag-and-drop and validates the ROYGBIV order', () => {
    renderCard();
    ROYGBIV.forEach((color, index) => {
      fireEvent.dragStart(screen.getByRole('button', { name: `${color} tile` }), {
        dataTransfer: { setData: vi.fn(), effectAllowed: 'move', dropEffect: 'move' },
      });
      fireEvent.drop(screen.getByRole('button', { name: `Slot ${index + 1}` }), {
        dataTransfer: { getData: () => color.toLowerCase() },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check Answer' }));
    expectFeedbackVisible(/Correct!/);
  });
});
