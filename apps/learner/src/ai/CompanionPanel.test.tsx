import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanionPanel } from './CompanionPanel';
import { CompanionProvider, useCompanion } from './CompanionProvider';

function renderWithProvider(ui: React.ReactElement) {
  return render(<CompanionProvider>{ui}</CompanionProvider>);
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
  it('is hidden by default when panel is closed', () => {
    renderWithProvider(<CompanionPanel />);
    expect(screen.queryByTestId('companion-panel')).not.toBeInTheDocument();
  });

  it('renders panel content when panel is open', () => {
    render(
      <CompanionProvider>
        <OpenStateWrapper>
          <CompanionPanel />
        </OpenStateWrapper>
      </CompanionProvider>,
    );
    fireEvent.click(screen.getByTestId('open-panel'));
    expect(screen.getByTestId('companion-panel')).toBeInTheDocument();
    expect(screen.getByText('AI Companion')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask a question about this lesson...')).toBeInTheDocument();
  });
});
