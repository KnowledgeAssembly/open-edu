import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanionProvider, useCompanion } from './CompanionProvider';

function TestConsumer(): JSX.Element {
  const { panelState, setPanelState, messages, isLoading, clearConversation } = useCompanion();
  return (
    <div>
      <div data-testid="panel-state">{panelState}</div>
      <div data-testid="msg-count">{messages.length}</div>
      <div data-testid="is-loading">{String(isLoading)}</div>
      <button data-testid="toggle" onClick={() => setPanelState('floating')}>
        Toggle
      </button>
      <button data-testid="send" onClick={() => clearConversation()}>
        Send
      </button>
      <button data-testid="clear" onClick={clearConversation}>
        Clear
      </button>
    </div>
  );
}

describe('CompanionProvider', () => {
  it('provides default values to consumers', () => {
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    expect(screen.getByTestId('panel-state')).toHaveTextContent('closed');
    expect(screen.getByTestId('msg-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  it('updates panel state', () => {
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('panel-state')).toHaveTextContent('floating');
  });

  it('useCompanion throws outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useCompanion');
  });

  it('provides contextManager instance', () => {
    let captured: unknown = null;
    function Capture(): null {
      const { contextManager } = useCompanion();
      captured = contextManager;
      return null;
    }
    render(
      <CompanionProvider>
        <Capture />
      </CompanionProvider>,
    );
    expect(captured).toBeDefined();
    expect(typeof (captured as Record<string, unknown>).getCurrentContext).toBe('function');
  });
});
