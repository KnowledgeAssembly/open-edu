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

  it('renders all five style pills', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Simple' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detailed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exam' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Child-Friendly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Autism-Friendly' })).toBeInTheDocument();
  });

  it('defaults to Detailed', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('selecting a style updates aria-pressed and persists to localStorage', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Exam' }));
    expect(screen.getByRole('button', { name: 'Exam' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(localStorage.getItem('oe-explanation-style')).toBe('exam');
  });
});
