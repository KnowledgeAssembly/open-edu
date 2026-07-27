import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import { HintControls } from '../HintControls.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('HintControls', () => {
  it('renders all 4 hint level buttons', () => {
    renderWithI18n(<HintControls currentLevel={1} onRequestLevel={vi.fn()} />);
    expect(screen.getByTestId('hint-level-1')).toBeInTheDocument();
    expect(screen.getByTestId('hint-level-2')).toBeInTheDocument();
    expect(screen.getByTestId('hint-level-3')).toBeInTheDocument();
    expect(screen.getByTestId('hint-level-4')).toBeInTheDocument();
  });

  it('button for currentLevel + 1 has highlight ring', () => {
    renderWithI18n(<HintControls currentLevel={1} onRequestLevel={vi.fn()} />);
    // Level 2 is the "next" level; it uses the outline variant which carries a ring.
    const nextButton = screen.getByTestId('hint-level-2');
    expect(nextButton.className).toContain('ring-1');
  });

  it('level 4 is disabled when assessmentActive is true', () => {
    renderWithI18n(<HintControls currentLevel={1} onRequestLevel={vi.fn()} assessmentActive />);
    expect(screen.getByTestId('hint-level-4')).toBeDisabled();
  });

  it('disabled prop disables all buttons', () => {
    renderWithI18n(<HintControls currentLevel={1} onRequestLevel={vi.fn()} disabled />);
    expect(screen.getByTestId('hint-level-1')).toBeDisabled();
    expect(screen.getByTestId('hint-level-2')).toBeDisabled();
    expect(screen.getByTestId('hint-level-3')).toBeDisabled();
    expect(screen.getByTestId('hint-level-4')).toBeDisabled();
  });

  it('clicking available button calls onRequestLevel with correct level', () => {
    const onRequestLevel = vi.fn();
    renderWithI18n(<HintControls currentLevel={1} onRequestLevel={onRequestLevel} />);
    fireEvent.click(screen.getByTestId('hint-level-2'));
    expect(onRequestLevel).toHaveBeenCalledWith(2);
  });

  it('clicking disabled button does not call onRequestLevel', () => {
    const onRequestLevel = vi.fn();
    renderWithI18n(
      <HintControls currentLevel={1} onRequestLevel={onRequestLevel} assessmentActive />,
    );
    fireEvent.click(screen.getByTestId('hint-level-4'));
    expect(onRequestLevel).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithI18n(
      <HintControls currentLevel={1} onRequestLevel={vi.fn()} />,
    );
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
