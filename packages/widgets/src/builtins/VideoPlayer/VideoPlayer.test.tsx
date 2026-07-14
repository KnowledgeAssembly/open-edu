import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { videoPlayer } from './VideoPlayer';

const WidgetComponent = videoPlayer.render;

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

describe('VideoPlayer widget definition', () => {
  it('has correct widget id', () => {
    expect(videoPlayer.id).toBe('core.video-player');
  });

  it('has a render function', () => {
    expect(typeof videoPlayer.render).toBe('function');
  });

  it('has correct domain', () => {
    expect(videoPlayer.domain).toBe('core');
  });

  it('has stable status', () => {
    expect(videoPlayer.status).toBe('stable');
  });
});

describe('VideoPlayer rendering', () => {
  it('renders with valid config', () => {
    renderWidget({ video: 'https://example.com/test.mp4', title: 'Test Video' });
    expect(screen.getByText('Test Video')).toBeInTheDocument();
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
  });

  it('renders play button', () => {
    renderWidget({ video: 'https://example.com/test.mp4' });
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('renders error for missing video URL', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders chapter buttons when chapters provided', () => {
    renderWidget({
      video: 'https://example.com/test.mp4',
      chapters: [
        { time: 0, title: 'Intro' },
        { time: 60, title: 'Main' },
      ],
    });
    expect(screen.getByRole('button', { name: 'Chapter: Intro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chapter: Main' })).toBeInTheDocument();
  });

  it('renders transcript toggle when showTranscript is true', () => {
    renderWidget({
      video: 'https://example.com/test.mp4',
      transcript: 'Full transcript',
      showTranscript: true,
    });
    expect(screen.getByText('Show Transcript')).toBeInTheDocument();
  });
});

describe('VideoPlayer observe mode', () => {
  it('shows acknowledge button in observe mode', () => {
    renderWidget({ video: 'https://example.com/test.mp4' });
    expect(screen.getByTestId('observe-acknowledge')).toHaveTextContent('Mark as seen');
  });

  it('completes after acknowledge', () => {
    const { complete } = renderWidget({ video: 'https://example.com/test.mp4' });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
  });
});

describe('VideoPlayer interactive mode', () => {
  it('does not show acknowledge button when interactive', () => {
    renderWidget({ video: 'https://example.com/test.mp4', interactive: true });
    expect(screen.queryByTestId('observe-acknowledge')).not.toBeInTheDocument();
  });

  it('shows bookmark button when interactive', () => {
    renderWidget({ video: 'https://example.com/test.mp4', interactive: true });
    expect(screen.getByRole('button', { name: 'Add bookmark' })).toBeInTheDocument();
  });
});

describe('VideoPlayer accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget({ video: 'https://example.com/test.mp4', title: 'My Video' });
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'My Video');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-label on seek slider', () => {
    renderWidget({ video: 'https://example.com/test.mp4' });
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
  });
});
