import { describe, it, expect, vi } from 'vitest';

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    status: 'ready',
    error: undefined,
    stop: vi.fn(),
    clearError: vi.fn(),
    setMessages: vi.fn(),
  }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { CompanionPanel } from '../CompanionPanel';
import { CompanionProvider, PipiliChatProvider } from '../index';
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

describe('CompanionPanel', () => {
  it('renders the close button', () => {
    renderWithProvider(<CompanionPanel />);
    expect(screen.getByRole('button', { name: /close sidebar/i })).toBeInTheDocument();
  });

  it('shows a tooltip on the close button when focused', async () => {
    renderWithProvider(<CompanionPanel />);
    fireEvent.focus(screen.getByRole('button', { name: /close sidebar/i }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Close sidebar');
  });
});
