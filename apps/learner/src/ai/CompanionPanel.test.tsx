import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanionPanel } from './CompanionPanel';

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    append: vi.fn(),
    reload: vi.fn(),
    status: 'ready',
    error: undefined,
    stop: vi.fn(),
    setMessages: vi.fn(),
  }),
}));
import { CompanionProvider, useCompanion } from './CompanionProvider';
import { PipiliChatProvider } from './PipiliChatProvider';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <CompanionProvider>
        <PipiliChatProvider>{ui}</PipiliChatProvider>
      </CompanionProvider>
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
          <PipiliChatProvider>
            <OpenStateWrapper>
              <CompanionPanel />
            </OpenStateWrapper>
          </PipiliChatProvider>
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
