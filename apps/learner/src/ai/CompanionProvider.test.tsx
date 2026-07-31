import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanionProvider, useCompanion } from './CompanionProvider';

function TestConsumer(): JSX.Element {
  const {
    panelState,
    setPanelState,
    explanationStyle,
    setExplanationStyle,
    emojiMode,
    setEmojiMode,
    messages,
    isLoading,
    clearConversation,
    pendingReward,
    rewardMessages,
    addRewardMessage,
    clearPendingReward,
  } = useCompanion();
  return (
    <div>
      <div data-testid="panel-state">{panelState}</div>
      <div data-testid="explanation-style">{explanationStyle}</div>
      <div data-testid="emoji-mode">{emojiMode}</div>
      <div data-testid="msg-count">{messages.length}</div>
      <div data-testid="is-loading">{String(isLoading)}</div>
      <div data-testid="pending-reward">{String(pendingReward)}</div>
      <div data-testid="reward-count">{rewardMessages.length}</div>
      <button data-testid="set-style-exam" onClick={() => setExplanationStyle('exam')}>
        Set Exam
      </button>
      <button data-testid="set-mode-openmoji" onClick={() => setEmojiMode('openmoji')}>
        Set OpenMoji
      </button>
      <button data-testid="toggle" onClick={() => setPanelState('floating')}>
        Toggle
      </button>
      <button data-testid="send" onClick={() => clearConversation()}>
        Send
      </button>
      <button data-testid="clear" onClick={clearConversation}>
        Clear
      </button>
      <button
        data-testid="add-badge"
        onClick={() =>
          addRewardMessage({
            id: 'b1',
            type: 'badge',
            badgeName: 'Test Badge',
            timestamp: Date.now(),
          })
        }
      >
        Add Badge
      </button>
      <button
        data-testid="add-card"
        onClick={() =>
          addRewardMessage({
            id: 'c1',
            type: 'card',
            cardTitle: 'Test Card',
            cardType: 'knowledge',
            cardLevel: 1,
            cardMaxLevel: 3,
            timestamp: Date.now(),
          })
        }
      >
        Add Card
      </button>
      <button data-testid="clear-reward" onClick={clearPendingReward}>
        Clear Reward
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

  it('addRewardMessage adds a reward and sets pendingReward to true', () => {
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    expect(screen.getByTestId('pending-reward')).toHaveTextContent('false');
    expect(screen.getByTestId('reward-count')).toHaveTextContent('0');
    fireEvent.click(screen.getByTestId('add-badge'));
    expect(screen.getByTestId('pending-reward')).toHaveTextContent('true');
    expect(screen.getByTestId('reward-count')).toHaveTextContent('1');
  });

  it('clearPendingReward resets pendingReward to false', () => {
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    fireEvent.click(screen.getByTestId('add-badge'));
    expect(screen.getByTestId('pending-reward')).toHaveTextContent('true');
    fireEvent.click(screen.getByTestId('clear-reward'));
    expect(screen.getByTestId('pending-reward')).toHaveTextContent('false');
  });

  it('addRewardMessage supports multiple reward types', () => {
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    fireEvent.click(screen.getByTestId('add-badge'));
    fireEvent.click(screen.getByTestId('add-card'));
    expect(screen.getByTestId('reward-count')).toHaveTextContent('2');
  });

  it('defaults explanationStyle to detailed and emojiMode to native', () => {
    localStorage.clear();
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    expect(screen.getByTestId('explanation-style')).toHaveTextContent('detailed');
    expect(screen.getByTestId('emoji-mode')).toHaveTextContent('native');
  });

  it('updates explanationStyle and persists it to localStorage', () => {
    localStorage.clear();
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    fireEvent.click(screen.getByTestId('set-style-exam'));
    expect(screen.getByTestId('explanation-style')).toHaveTextContent('exam');
    expect(localStorage.getItem('oe-explanation-style')).toBe('exam');
  });

  it('updates emojiMode and persists it to localStorage', () => {
    localStorage.clear();
    render(
      <CompanionProvider>
        <TestConsumer />
      </CompanionProvider>,
    );
    fireEvent.click(screen.getByTestId('set-mode-openmoji'));
    expect(screen.getByTestId('emoji-mode')).toHaveTextContent('openmoji');
    expect(localStorage.getItem('oe-emoji-pack')).toBe('openmoji');
  });
});
