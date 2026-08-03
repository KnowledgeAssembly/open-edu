import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiCompanionDemo } from '../components/sections/AiCompanionDemo';
import { dictionaries } from '../i18n-dictionaries';

function renderDemo(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <AiCompanionDemo />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('AiCompanionDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the greeting, section copy, and the two suggested-question chips', () => {
    renderDemo();

    expect(
      screen.getByText(/Hi! I'm Pipili\. Ask me anything about what you're learning/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /A learning companion that never runs out of patience/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Why is the sky blue?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How do volcanoes form?' })).toBeInTheDocument();
  });

  it('sends the sky question, shows the typing indicator, then shows the AI response', () => {
    renderDemo();

    fireEvent.click(screen.getByRole('button', { name: 'Why is the sky blue?' }));

    expect(screen.getAllByText('Why is the sky blue?')).toHaveLength(2);

    const typing = screen.getByRole('status', { name: /Pipili is typing/ });
    expect(typing).toBeInTheDocument();

    const volcanoesChip = screen.getByRole('button', { name: 'How do volcanoes form?' });
    expect(volcanoesChip).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByText(/Sunlight is a mix of colors/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How do volcanoes form?' })).toBeEnabled();
  });

  it('sends the volcanoes question and shows its AI response', () => {
    renderDemo();

    fireEvent.click(screen.getByRole('button', { name: 'How do volcanoes form?' }));
    expect(screen.getAllByText('How do volcanoes form?')).toHaveLength(2);
    expect(screen.getByRole('status', { name: /Pipili is typing/ })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByText(/Deep underground, hot molten rock/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
