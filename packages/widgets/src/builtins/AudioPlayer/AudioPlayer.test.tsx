import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { audioPlayer } from './AudioPlayer';

const WidgetComponent = audioPlayer.render;

function renderWidget(config: Record<string, unknown> = {}) {
  const emitInteraction = vi.fn();
  const complete = vi.fn();
  const result = render(
    <WidgetComponent
      nodeId="test-node"
      config={config}
      emitInteraction={emitInteraction}
      complete={complete}
    />,
  );
  return { emitInteraction, complete, ...result };
}

describe('AudioPlayer widget definition', () => {
  it('has correct widget id', () => {
    expect(audioPlayer.id).toBe('core.audio-player');
  });

  it('has a render function', () => {
    expect(typeof audioPlayer.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(audioPlayer.domain).toBe('core');
  });

  it('has stable status', () => {
    expect(audioPlayer.status).toBe('stable');
  });
});

describe('AudioPlayer rendering', () => {
  it('renders with valid config', () => {
    renderWidget({ audio: 'https://example.com/test.mp3', title: 'Test Audio' });
    expect(screen.getByText('Test Audio')).toBeInTheDocument();
    expect(screen.getByTestId('audio-player')).toBeInTheDocument();
  });

  it('renders play button', () => {
    renderWidget({ audio: 'https://example.com/test.mp3' });
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('renders error for missing audio URL', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders title and description', () => {
    renderWidget({
      audio: 'https://example.com/test.mp3',
      title: 'My Audio',
      description: 'A test audio file',
    });
    expect(screen.getByText('My Audio')).toBeInTheDocument();
    expect(screen.getByText('A test audio file')).toBeInTheDocument();
  });

  it('hides controls when showControls is false', () => {
    renderWidget({ audio: 'https://example.com/test.mp3', showControls: false });
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
  });
});

describe('AudioPlayer observe mode', () => {
  it('shows acknowledge button in observe mode', () => {
    renderWidget({ audio: 'https://example.com/test.mp3' });
    expect(screen.getByTestId('observe-acknowledge')).toHaveTextContent('Mark as seen');
  });

  it('completes after acknowledge in observe mode', () => {
    const { complete, emitInteraction } = renderWidget({ audio: 'https://example.com/test.mp3' });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'observe', observed: true }),
    );
  });
});

describe('AudioPlayer interactive mode', () => {
  it('does not show acknowledge button when interactive', () => {
    renderWidget({ audio: 'https://example.com/test.mp3', interactive: true });
    expect(screen.queryByTestId('observe-acknowledge')).not.toBeInTheDocument();
  });

  it('shows bookmark button when interactive and bookmarks enabled', () => {
    renderWidget({ audio: 'https://example.com/test.mp3', interactive: true, bookmarks: true });
    expect(screen.getByRole('button', { name: 'Add bookmark' })).toBeInTheDocument();
  });
});

describe('AudioPlayer accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget({ audio: 'https://example.com/test.mp3', title: 'Test' });
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'Test');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-label on play button', () => {
    renderWidget({ audio: 'https://example.com/test.mp3' });
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('has aria-label on seek slider', () => {
    renderWidget({ audio: 'https://example.com/test.mp3' });
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
  });

  it('has aria-label on speed selector', () => {
    renderWidget({ audio: 'https://example.com/test.mp3' });
    expect(screen.getByRole('combobox', { name: 'Playback speed' })).toBeInTheDocument();
  });
});

describe('AudioPlayer captions', () => {
  it('renders caption container when captions provided', () => {
    renderWidget({
      audio: 'https://example.com/test.mp3',
      captions: [{ start: 0, end: 2, text: 'Hello' }],
    });
    const audio = document.querySelector('audio')!;
    Object.defineProperty(audio, 'currentTime', { value: 1, writable: true });
    fireEvent(audio, new Event('timeupdate'));
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

describe('AudioPlayer transcript', () => {
  it('renders collapsible transcript when showTranscript is true', () => {
    renderWidget({
      audio: 'https://example.com/test.mp3',
      transcript: 'Full transcript text',
      showTranscript: true,
    });
    expect(screen.getByText('Show Transcript')).toBeInTheDocument();
  });
});
