import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExplanationStylePicker } from '../ExplanationStylePicker.js';
import { CompanionProvider } from '../CompanionProvider.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderPicker() {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <CompanionProvider>
        <ExplanationStylePicker />
      </CompanionProvider>
    </I18nProvider>,
  );
}

describe('ExplanationStylePicker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a compact select showing the current style', () => {
    renderPicker();
    const select = screen.getByRole('combobox', { name: 'Explanation style' });
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent('Detailed');
  });

  it('defaults to Detailed', () => {
    renderPicker();
    expect(screen.getByRole('combobox', { name: 'Explanation style' })).toHaveTextContent(
      'Detailed',
    );
  });

  it('selecting a style from the menu updates the trigger and persists to localStorage', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('combobox', { name: 'Explanation style' }));
    fireEvent.click(screen.getByRole('option', { name: 'Exam' }));
    expect(screen.getByRole('combobox', { name: 'Explanation style' })).toHaveTextContent('Exam');
    expect(localStorage.getItem('oe-explanation-style')).toBe('exam');
  });
});
