import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanionPanel } from './CompanionPanel';
import { CompanionProvider, useCompanion } from './CompanionProvider';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <CompanionProvider>{ui}</CompanionProvider>
    </I18nProvider>,
  );
}

function OpenStateWrapper({ children }: { children: React.ReactNode }): JSX.Element {
  const { setPanelState } = useCompanion();
  return (
    <>
      <button data-testid="open-panel" onClick={() => setPanelState('floating')}>
        Open
      </button>
      {children}
    </>
  );
}

describe('CompanionPanel', () => {
  it('is rendered in DOM but translated off-screen when panel is closed', () => {
    renderWithProvider(<CompanionPanel />);
    const panel = screen.getByTestId('companion-panel');
    expect(panel).toBeInTheDocument();
    expect(panel.className).toContain('translate-x-full');
  });

  it('renders panel content visible on screen when panel is open', () => {
    render(
      <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
        <CompanionProvider>
          <OpenStateWrapper>
            <CompanionPanel />
          </OpenStateWrapper>
        </CompanionProvider>
      </I18nProvider>,
    );
    fireEvent.click(screen.getByTestId('open-panel'));
    const panel = screen.getByTestId('companion-panel');
    expect(panel.className).toContain('translate-x-0');
    expect(screen.getByText('AI Companion')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask a question about this lesson...')).toBeInTheDocument();
  });
});
