import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanionPanel } from './CompanionPanel';
import { CompanionProvider } from './CompanionProvider';

function renderWithProvider(ui: React.ReactElement) {
  return render(<CompanionProvider>{ui}</CompanionProvider>);
}

describe('CompanionPanel', () => {
  it('renders without crashing, hidden by default', () => {
    renderWithProvider(<CompanionPanel />);
    expect(screen.queryByTestId('companion-panel')).not.toBeInTheDocument();
  });
});
