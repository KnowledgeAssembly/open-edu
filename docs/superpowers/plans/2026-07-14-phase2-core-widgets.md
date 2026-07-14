# Phase 2 Core Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 production-quality widgets (audio-player, video-player, flashcard, process-diagram, number-line, social-map) following existing WidgetDefinitionV2 patterns.

**Architecture:** Each widget is a self-contained directory under `packages/widgets/src/builtins/` with a `.tsx` component + `.test.tsx` co-located test. All widgets use Zod config parsing, `useObserveMode` hook, `WidgetDefinitionV2` metadata, and emit interactions via `emitInteraction`/`complete` props. No new architectural patterns — pure extension of existing infrastructure.

**Tech Stack:** React 18, TypeScript 5, Zod 3, Vitest, @testing-library/react, Tailwind CSS, @open-edu/design-system (Button, cn), @open-edu/widgets (useObserveMode, WidgetDefinitionV2)

---

## Scope Note

This spec defines 6 widgets with varying complexity. Widgets 1-3 (audio-player, video-player, flashcard) are medium complexity using standard HTML elements. Widgets 4-6 (process-diagram, number-line, social-map) are high complexity requiring SVG rendering. The plan is ordered by dependency: shared infrastructure first, then widgets from simplest to most complex.

---

## File Structure

### New Files (per widget)

```
packages/widgets/src/builtins/<WidgetName>/
  ├── <WidgetName>.tsx        # Component + Zod schema + WidgetDefinitionV2
  └── <WidgetName>.test.tsx   # Co-located tests
```

### New Files (shared)

```
packages/design-system/src/stories/<widget-name>.stories.tsx   # Storybook story
examples/<widget-example>/nodes/<widget>.json                  # Example course-spec node
examples/<widget-example>/workflow.json                        # Workflow for example
examples/<widget-example>/package.json                         # Package manifest
```

### Modified Files

```
packages/widgets/src/builtins/index.ts                    # Add new exports
packages/widgets/src/index.ts                             # Re-export new widgets
packages/widgets/src/registry.ts                          # Add to BUILTIN_WIDGETS array
packages/widgets/src/metadata/learning-intents.ts          # Add new intents + mappings
packages/pipeline/src/generate-activities/widget-schemas.ts # Add validation schemas
```

---

## Task 1: Extend LearningIntent Enum

**Files:**

- Modify: `packages/widgets/src/metadata/learning-intents.ts`
- Test: `packages/widgets/src/__tests__/domains.test.ts` (verify no breakage)

The spec references learning intents (Listen, Pronunciation, Storytelling, etc.) that go beyond the current enum. Add new values and map all 6 new widgets.

- [ ] **Step 1: Add new LearningIntent values**

In `packages/widgets/src/metadata/learning-intents.ts`, extend the enum:

```typescript
export enum LearningIntent {
  Assess = 'assess',
  Practice = 'practice',
  Observe = 'observe',
  Compare = 'compare',
  Explore = 'explore',
  Create = 'create',
  Reflect = 'reflect',
  Apply = 'apply',
  Listen = 'listen',
  Recall = 'recall',
  Understand = 'understand',
}
```

- [ ] **Step 2: Add widget intent mappings**

Append to `WIDGET_LEARNING_INTENTS`:

```typescript
// Phase 2 widgets
'core.audio-player': [LearningIntent.Observe, LearningIntent.Listen],
'core.video-player': [LearningIntent.Observe, LearningIntent.Understand],
'language.flashcard': [LearningIntent.Practice, LearningIntent.Recall],
'science.process-diagram': [LearningIntent.Observe, LearningIntent.Understand],
'math.number-line': [LearningIntent.Observe, LearningIntent.Practice, LearningIntent.Compare],
'social.map': [LearningIntent.Explore, LearningIntent.Observe],
```

- [ ] **Step 3: Run tests to verify no breakage**

Run: `pnpm --filter @open-edu/widgets test`
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/widgets/src/metadata/learning-intents.ts
git commit -m "feat(widgets): extend LearningIntent enum with Listen, Recall, Understand"
```

---

## Task 2: Widget 1 — core.audio-player

**Files:**

- Create: `packages/widgets/src/builtins/AudioPlayer/AudioPlayer.tsx`
- Create: `packages/widgets/src/builtins/AudioPlayer/AudioPlayer.test.tsx`

### Step 1: Create directory

```bash
mkdir -p packages/widgets/src/builtins/AudioPlayer
```

### Step 2: Create AudioPlayer.tsx

```tsx
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const audioPlayerSchema = z.object({
  audio: z.string().min(1),
  transcript: z.string().optional(),
  captions: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().optional(),
  autoplay: z.boolean().optional().default(false),
  loop: z.boolean().optional().default(false),
  playbackRate: z.number().optional().default(1),
  showTranscript: z.boolean().optional().default(false),
  showControls: z.boolean().optional().default(true),
  waveform: z.boolean().optional().default(false),
  interactive: z.boolean().optional().default(false),
  bookmarks: z.boolean().optional().default(false),
});

const AudioPlayerStateSchema = z.object({
  bookmarks: z.array(z.number()).optional(),
  playbackRate: z.number().optional(),
  lastPosition: z.number().optional(),
});

function AudioPlayerComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = audioPlayerSchema.safeParse(rawConfig);
  const parsedState = useMemo(() => {
    const result = AudioPlayerStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [bookmarks, setBookmarks] = useState<number[]>(parsedState?.bookmarks ?? []);
  const [rate, setRate] = useState(parsedState?.playbackRate ?? parsed?.data?.playbackRate ?? 1);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState<number | null>(null);

  const isObserve = parsed.success && !parsed.data.interactive;
  const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'core.audio-player',
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (parsed?.data?.captions) {
        const idx = parsed.data.captions.findIndex(
          (c) => audio.currentTime >= c.start && audio.currentTime <= c.end,
        );
        setActiveCaptionIndex(idx >= 0 ? idx : null);
      }
    };
    const handleLoadedMetadata = () => setTotalDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if (!parsed?.data?.loop) {
        emitInteraction({
          type: 'widget.interaction',
          widgetId: 'core.audio-player',
          action: 'ended',
          duration: audio.currentTime,
        });
      }
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [parsed, emitInteraction]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleBookmark = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Math.round(audio.currentTime * 10) / 10;
    if (!bookmarks.includes(time)) {
      const next = [...bookmarks, time].sort((a, b) => a - b);
      setBookmarks(next);
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'core.audio-player',
        action: 'bookmark',
        time,
      });
    }
  }, [bookmarks, emitInteraction]);

  const handleRateChange = useCallback(
    (newRate: number) => {
      const audio = audioRef.current;
      if (audio) audio.playbackRate = newRate;
      setRate(newRate);
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'core.audio-player',
        action: 'rate-change',
        rate: newRate,
      });
    },
    [emitInteraction],
  );

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const config = parsed.data;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div role="group" aria-label={config.title ?? 'Audio player'} data-testid="audio-player">
      <audio ref={audioRef} src={config.audio} loop={config.loop} preload="metadata" />

      {config.title && <h3 className="text-on-surface font-semibold">{config.title}</h3>}
      {config.description && (
        <p className="text-on-surface/70 mb-sm text-sm">{config.description}</p>
      )}

      {config.showControls && (
        <div className="gap-sm flex items-center">
          <Button variant="default" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '⏸' : '▶'}
          </Button>
          <span
            className="text-on-surface/70 text-sm"
            aria-label={`Current time ${formatTime(currentTime)} of ${formatTime(totalDuration)}`}
          >
            {formatTime(currentTime)} / {formatTime(totalDuration || (config.duration ?? 0))}
          </span>
          <input
            type="range"
            min={0}
            max={totalDuration || config.duration || 0}
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="flex-1"
            aria-label="Seek"
          />
          <select
            value={rate}
            onChange={(e) => handleRateChange(Number(e.target.value))}
            aria-label="Playback speed"
            className="text-on-surface bg-surface-container-lowest border-outline-variant px-xs py-xs rounded border text-sm"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      )}

      {config.bookmarks && parsed.data.interactive && (
        <Button
          variant="outline"
          onClick={handleBookmark}
          className="mt-sm"
          aria-label="Add bookmark"
        >
          🔖 Bookmark
        </Button>
      )}

      {config.captions && activeCaptionIndex !== null && (
        <div
          role="status"
          aria-live="polite"
          data-testid="active-caption"
          className="text-on-surface mt-sm text-center font-medium"
        >
          {config.captions[activeCaptionIndex]?.text}
        </div>
      )}

      {config.showTranscript && config.transcript && (
        <details className="mt-sm">
          <summary className="text-on-surface/70 cursor-pointer text-sm">Show Transcript</summary>
          <p className="text-on-surface/70 mt-xs whitespace-pre-wrap text-sm">
            {config.transcript}
          </p>
        </details>
      )}

      {isObserve && showAcknowledgeButton && (
        <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
          <Button variant="default" onClick={handleAcknowledge} data-testid="observe-acknowledge">
            Mark as seen ✓
          </Button>
        </div>
      )}
    </div>
  );
}

const AudioPlayerWidget: WidgetDefinitionV2 = {
  id: 'core.audio-player',
  name: 'Audio Player',
  description: 'Play educational audio with transcript, captions, and bookmarks',
  domain: 'core',
  version: '1.0.0',
  render: AudioPlayerComponent,
  learningIntents: [LearningIntent.Observe, LearningIntent.Listen],
  capabilities: {
    supportsObserveMode: true,
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsLocalization: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    captions: true,
    audioDescription: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackInteractions: true,
  },
  reward: {
    completionXP: 10,
    confetti: false,
    positiveMessage: 'Great listening!',
    achievement: 'first-listen',
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 5,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    recommendedAge: [5, 18],
    readingLevel: 'grade-2',
    subjectTags: ['language', 'music', 'general'],
    learningObjectives: [
      'Listen to educational audio content',
      'Follow along with transcript or captions',
      'Identify key information from audio',
    ],
    commonMisconceptions: [
      'Assuming audio content is complete after one listen',
      'Skipping captions when available',
    ],
    generationHints: [
      'Provide a clear transcript for accessibility',
      'Use captions for key moments rather than full text',
      'Keep audio segments under 5 minutes for engagement',
    ],
    authoringPrompt:
      'Create an audio playback activity for listening comprehension or pronunciation practice',
    exampleConfigs: [
      {
        audio: 'https://example.com/audio/hello.mp3',
        title: 'Greeting in Spanish',
        transcript: 'Hola, me llamo Maria. Buenos dias.',
        showTranscript: true,
        interactive: true,
        bookmarks: true,
      },
    ],
  },
  icon: 'headphones',
  keywords: ['audio', 'listen', 'sound', 'music', 'podcast', 'transcript'],
  status: 'stable',
};

export { AudioPlayerWidget as audioPlayer };
export default AudioPlayerWidget;
```

### Step 3: Create AudioPlayer.test.tsx

```tsx
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
```

### Step 4: Run tests

Run: `pnpm --filter @open-edu/widgets test -- AudioPlayer`
Expected: All tests pass.

### Step 5: Commit

```bash
git add packages/widgets/src/builtins/AudioPlayer/
git commit -m "feat(widgets): add core.audio-player widget"
```

---

## Task 3: Widget 2 — core.video-player

**Files:**

- Create: `packages/widgets/src/builtins/VideoPlayer/VideoPlayer.tsx`
- Create: `packages/widgets/src/builtins/VideoPlayer/VideoPlayer.test.tsx`

### Step 1: Create directory

```bash
mkdir -p packages/widgets/src/builtins/VideoPlayer
```

### Step 2: Create VideoPlayer.tsx

```tsx
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const chapterSchema = z.object({
  time: z.number(),
  title: z.string(),
});

const videoPlayerSchema = z.object({
  video: z.string().min(1),
  poster: z.string().optional(),
  title: z.string().optional(),
  captions: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).optional(),
  chapters: z.array(chapterSchema).optional(),
  transcript: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  showTranscript: z.boolean().optional().default(false),
  allowFullscreen: z.boolean().optional().default(true),
  interactive: z.boolean().optional().default(false),
});

const VideoPlayerStateSchema = z.object({
  lastPosition: z.number().optional(),
  watchedChapters: z.array(z.number()).optional(),
  bookmarks: z.array(z.number()).optional(),
});

function VideoPlayerComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = videoPlayerSchema.safeParse(rawConfig);
  const parsedState = useMemo(() => {
    const result = VideoPlayerStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState<number | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>(parsedState?.bookmarks ?? []);

  const isObserve = parsed.success && !parsed.data.interactive;
  const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'core.video-player',
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (parsed?.data?.captions) {
        const idx = parsed.data.captions.findIndex(
          (c) => video.currentTime >= c.start && video.currentTime <= c.end,
        );
        setActiveCaptionIndex(idx >= 0 ? idx : null);
      }
      if (parsed?.data?.chapters) {
        let chIdx = 0;
        for (let i = parsed.data.chapters.length - 1; i >= 0; i--) {
          if (video.currentTime >= parsed.data.chapters[i].time) {
            chIdx = i;
            break;
          }
        }
        if (chIdx !== activeChapterIndex) setActiveChapterIndex(chIdx);
      }
    };
    const handleLoadedMetadata = () => setTotalDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'core.video-player',
        action: 'ended',
        duration: video.currentTime,
      });
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [parsed, activeChapterIndex, emitInteraction]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = time;
  }, []);

  const handleBookmark = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const time = Math.round(video.currentTime * 10) / 10;
    if (!bookmarks.includes(time)) {
      setBookmarks((prev) => [...prev, time].sort((a, b) => a - b));
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'core.video-player',
        action: 'bookmark',
        time,
      });
    }
  }, [bookmarks, emitInteraction]);

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const config = parsed.data;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div role="group" aria-label={config.title ?? 'Video player'} data-testid="video-player">
      <video
        ref={videoRef}
        src={config.video}
        poster={config.poster}
        preload="metadata"
        className="w-full rounded-lg"
      />

      {config.title && <h3 className="text-on-surface mt-sm font-semibold">{config.title}</h3>}

      <div className="gap-sm mt-sm flex items-center">
        <Button variant="default" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶'}
        </Button>
        <span className="text-on-surface/70 text-sm">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
        <input
          type="range"
          min={0}
          max={totalDuration || 0}
          value={currentTime}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="flex-1"
          aria-label="Seek"
        />
        {config.interactive && (
          <Button variant="outline" onClick={handleBookmark} aria-label="Add bookmark">
            🔖
          </Button>
        )}
      </div>

      {config.chapters && activeChapterIndex !== null && (
        <div className="mt-sm gap-xs flex flex-wrap">
          {config.chapters.map((ch, idx) => (
            <Button
              key={idx}
              variant={idx === activeChapterIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => seekTo(ch.time)}
              aria-label={`Chapter: ${ch.title}`}
            >
              {ch.title}
            </Button>
          ))}
        </div>
      )}

      {config.captions && activeCaptionIndex !== null && (
        <div
          role="status"
          aria-live="polite"
          data-testid="active-caption"
          className="text-on-surface mt-sm text-center font-medium"
        >
          {config.captions[activeCaptionIndex]?.text}
        </div>
      )}

      {config.showTranscript && config.transcript && (
        <details className="mt-sm">
          <summary className="text-on-surface/70 cursor-pointer text-sm">Show Transcript</summary>
          <p className="text-on-surface/70 mt-xs whitespace-pre-wrap text-sm">
            {config.transcript}
          </p>
        </details>
      )}

      {isObserve && showAcknowledgeButton && (
        <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
          <Button variant="default" onClick={handleAcknowledge} data-testid="observe-acknowledge">
            Mark as seen ✓
          </Button>
        </div>
      )}
    </div>
  );
}

const VideoPlayerWidget: WidgetDefinitionV2 = {
  id: 'core.video-player',
  name: 'Video Player',
  description: 'Educational video playback with chapters, captions, and transcript',
  domain: 'core',
  version: '1.0.0',
  render: VideoPlayerComponent,
  learningIntents: [LearningIntent.Observe, LearningIntent.Understand],
  capabilities: {
    supportsObserveMode: true,
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsLocalization: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    captions: true,
    audioDescription: true,
    reducedMotion: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackInteractions: true,
  },
  reward: {
    completionXP: 10,
    confetti: false,
    positiveMessage: 'Great watching!',
    achievement: 'first-watch',
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 10,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    recommendedAge: [5, 18],
    readingLevel: 'grade-3',
    subjectTags: ['general', 'science', 'history'],
    learningObjectives: [
      'Watch and comprehend educational video content',
      'Navigate between video chapters',
      'Follow along with captions and transcript',
    ],
    commonMisconceptions: [
      'Watching without pausing to reflect on content',
      'Ignoring chapter markers that organize key concepts',
    ],
    generationHints: [
      'Break long videos into chapters with clear titles',
      'Provide captions for accessibility',
      'Include a transcript for reference',
    ],
    authoringPrompt: 'Create a video playback activity for demonstration or explanation content',
    exampleConfigs: [
      {
        video: 'https://example.com/video/photosynthesis.mp4',
        title: 'Photosynthesis Explained',
        chapters: [
          { time: 0, title: 'Introduction' },
          { time: 60, title: 'Light Reactions' },
          { time: 180, title: 'Calvin Cycle' },
        ],
        showTranscript: true,
        interactive: true,
      },
    ],
  },
  icon: 'play-circle',
  keywords: ['video', 'watch', 'play', 'chapters', 'captions', 'demonstration'],
  status: 'stable',
};

export { VideoPlayerWidget as videoPlayer };
export default VideoPlayerWidget;
```

### Step 3: Create VideoPlayer.test.tsx

```tsx
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
```

### Step 4: Run tests

Run: `pnpm --filter @open-edu/widgets test -- VideoPlayer`
Expected: All tests pass.

### Step 5: Commit

```bash
git add packages/widgets/src/builtins/VideoPlayer/
git commit -m "feat(widgets): add core.video-player widget"
```

---

## Task 4: Widget 3 — language.flashcard

**Files:**

- Create: `packages/widgets/src/builtins/Flashcard/Flashcard.tsx`
- Create: `packages/widgets/src/builtins/Flashcard/Flashcard.test.tsx`

### Step 1: Create directory

```bash
mkdir -p packages/widgets/src/builtins/Flashcard
```

### Step 2: Create Flashcard.tsx

```tsx
import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const cardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  image: z.string().optional(),
  audio: z.string().optional(),
  hint: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

const flashcardSchema = z.object({
  cards: z.array(cardSchema).min(1),
  mode: z.enum(['flip', 'multiple', 'spaced']).optional().default('flip'),
  interactive: z.boolean().optional().default(false),
  shuffle: z.boolean().optional().default(false),
});

const FlashcardStateSchema = z.object({
  currentIndex: z.number(),
  flipped: z.array(z.number()),
  correct: z.array(z.number()),
  incorrect: z.array(z.number()),
  confidence: z.record(z.number(), z.number()).optional(),
});

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function FlashcardComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = flashcardSchema.safeParse(rawConfig);
  const parsedState = useMemo(() => {
    const result = FlashcardStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [currentIndex, setCurrentIndex] = useState(parsedState?.currentIndex ?? 0);
  const [flipped, setFlipped] = useState(parsedState?.flipped ?? []);
  const [correctCards, setCorrectCards] = useState<number[]>(parsedState?.correct ?? []);
  const [incorrectCards, setIncorrectCards] = useState<number[]>(parsedState?.incorrect ?? []);
  const [showHint, setShowHint] = useState(false);

  const isObserve = parsed.success && !parsed.data.interactive;
  const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'language.flashcard',
  });

  const cards = useMemo(() => {
    if (!parsed.success) return [];
    return parsed.data.shuffle ? shuffleArray(parsed.data.cards, 42) : parsed.data.cards;
  }, [parsed]);

  const currentCard = cards[currentIndex];
  const isFlipped = flipped.includes(currentIndex);
  const totalCards = cards.length;
  const allReviewed = correctCards.length + incorrectCards.length >= totalCards;

  const handleFlip = useCallback(() => {
    if (isObserve) return;
    setFlipped((prev) => (prev.includes(currentIndex) ? prev : [...prev, currentIndex]));
    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'language.flashcard',
      action: 'flip',
      cardIndex: currentIndex,
    });
  }, [currentIndex, isObserve, emitInteraction]);

  const handleSelfAssess = useCallback(
    (isCorrect: boolean) => {
      const list = isCorrect ? correctCards : incorrectCards;
      if (!list.includes(currentIndex)) {
        if (isCorrect) setCorrectCards((prev) => [...prev, currentIndex]);
        else setIncorrectCards((prev) => [...prev, currentIndex]);
      }
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'language.flashcard',
        action: isCorrect ? 'correct' : 'incorrect',
        cardIndex: currentIndex,
      });
      if (currentIndex < totalCards - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowHint(false);
      } else {
        const score = ((correctCards.length + (isCorrect ? 1 : 0)) / totalCards) * 100;
        complete(score, {
          currentIndex,
          flipped,
          correct: isCorrect ? [...correctCards, currentIndex] : correctCards,
          incorrect: isCorrect ? incorrectCards : [...incorrectCards, currentIndex],
        });
      }
    },
    [currentIndex, correctCards, incorrectCards, flipped, totalCards, emitInteraction, complete],
  );

  const handleRetryIncorrect = useCallback(() => {
    const incorrectIndices = incorrectCards;
    if (incorrectIndices.length > 0) {
      setCurrentIndex(incorrectIndices[0]!);
      setFlipped((prev) => prev.filter((i) => !incorrectIndices.includes(i)));
      setIncorrectCards([]);
      setShowHint(false);
    }
  }, [incorrectCards]);

  if (!parsed.success || !currentCard) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  if (isObserve) {
    return (
      <div role="group" aria-label="Flashcard activity" data-testid="flashcard-observe">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="border-outline-variant bg-surface-container-lowest mb-sm p-md rounded-lg border"
          >
            <p className="text-on-surface font-semibold">{card.front}</p>
            <p className="text-on-surface/70 mt-xs">{card.back}</p>
          </div>
        ))}
        {showAcknowledgeButton && (
          <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
            <Button variant="default" onClick={handleAcknowledge} data-testid="observe-acknowledge">
              Mark as seen ✓
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div role="group" aria-label="Flashcard activity" data-testid="flashcard">
      <p className="text-on-surface/70 mb-sm text-sm">
        Card {currentIndex + 1} of {totalCards}
      </p>

      <div
        className={`border-outline-variant bg-surface-container-lowest p-lg flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border text-center transition-transform ${isFlipped ? '' : ''}`}
        onClick={handleFlip}
        role="button"
        aria-label={
          isFlipped
            ? 'Card back: ' + currentCard.back
            : 'Card front: ' + currentCard.front + '. Click to flip.'
        }
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFlip();
          }
        }}
        data-testid="flashcard-card"
      >
        {currentCard.image && (
          <img
            src={currentCard.image}
            alt=""
            className="mb-sm max-h-32 rounded"
            aria-hidden="true"
          />
        )}
        <p className="text-on-surface text-lg font-medium">
          {isFlipped ? currentCard.back : currentCard.front}
        </p>
        {!isFlipped && <p className="text-on-surface/50 mt-sm text-sm">Click to flip</p>}
      </div>

      {currentCard.hint && !isFlipped && (
        <div className="mt-sm text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowHint(!showHint)}>
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </Button>
          {showHint && <p className="text-on-surface/70 mt-xs text-sm">{currentCard.hint}</p>}
        </div>
      )}

      {isFlipped && (
        <div className="mt-md gap-sm flex justify-center">
          <Button
            variant="outline"
            onClick={() => handleSelfAssess(false)}
            data-testid="btn-incorrect"
          >
            ✗ Incorrect
          </Button>
          <Button
            variant="default"
            onClick={() => handleSelfAssess(true)}
            data-testid="btn-correct"
          >
            ✓ Correct
          </Button>
        </div>
      )}

      {allReviewed && (
        <div
          role="status"
          aria-live="assertive"
          data-testid="flashcard-complete"
          className="mt-md text-center"
        >
          <p className="text-on-surface font-semibold">
            Done! {correctCards.length} correct, {incorrectCards.length} incorrect.
          </p>
          {incorrectCards.length > 0 && (
            <Button
              variant="outline"
              onClick={handleRetryIncorrect}
              className="mt-sm"
              data-testid="btn-retry"
            >
              Retry Incorrect
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const FlashcardWidget: WidgetDefinitionV2 = {
  id: 'language.flashcard',
  name: 'Flashcard',
  description: 'Vocabulary and memory practice with flip cards',
  domain: 'language',
  version: '1.0.0',
  render: FlashcardComponent,
  learningIntents: [LearningIntent.Practice, LearningIntent.Recall],
  capabilities: {
    supportsObserveMode: true,
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsLocalization: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
    focusManagement: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackConfidence: true,
    trackInteractions: true,
    trackMistakes: true,
  },
  reward: {
    completionXP: 15,
    confetti: true,
    positiveMessage: 'Great memorization!',
    achievement: 'first-flashcard',
  },
  ai: {
    difficulty: 'easy',
    estimatedMinutes: 5,
    bloomsLevel: 'remember',
    cognitiveLoad: 'low',
    recommendedAge: [6, 18],
    readingLevel: 'grade-2',
    subjectTags: ['language', 'vocabulary'],
    learningObjectives: [
      'Recall vocabulary or concepts from flashcards',
      'Self-assess understanding through flip interaction',
      'Practice retrieval through spaced repetition metadata',
    ],
    commonMisconceptions: [
      'Confusing similar-looking words or concepts',
      'Overconfidence after seeing the answer',
    ],
    generationHints: [
      'Keep card fronts concise (1-5 words)',
      'Write clear, specific backs',
      'Add images for concrete nouns',
      'Include pronunciation guides for language cards',
    ],
    authoringPrompt: 'Create flashcard sets for vocabulary or concept memorization',
    exampleConfigs: [
      {
        cards: [
          { front: 'Hola', back: 'Hello', hint: 'Spanish greeting', category: 'Greetings' },
          { front: 'Gracias', back: 'Thank you', category: 'Greetings' },
          { front: 'Adios', back: 'Goodbye', category: 'Greetings' },
        ],
        mode: 'flip',
        interactive: true,
        shuffle: true,
      },
    ],
  },
  icon: 'layers',
  keywords: ['flashcard', 'vocabulary', 'memory', 'recall', 'flip', 'quiz'],
  status: 'stable',
};

export { FlashcardWidget as flashcard };
export default FlashcardWidget;
```

### Step 3: Create Flashcard.test.tsx

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { flashcard } from './Flashcard';

const WidgetComponent = flashcard.render;

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

const baseConfig = {
  cards: [
    { front: 'Hola', back: 'Hello' },
    { front: 'Gracias', back: 'Thank you' },
  ],
  interactive: true,
};

describe('Flashcard widget definition', () => {
  it('has correct widget id', () => {
    expect(flashcard.id).toBe('language.flashcard');
  });

  it('has correct domain', () => {
    expect(flashcard.domain).toBe('language');
  });

  it('has stable status', () => {
    expect(flashcard.status).toBe('stable');
  });
});

describe('Flashcard rendering', () => {
  it('renders with valid config', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Hola')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard')).toBeInTheDocument();
  });

  it('shows card progress', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
  });

  it('renders error for empty cards', () => {
    renderWidget({ cards: [], interactive: true });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('Flashcard flip interaction', () => {
  it('shows front side initially', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Hola')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('flips to back on click', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows correct/incorrect buttons after flip', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    expect(screen.getByTestId('btn-correct')).toBeInTheDocument();
    expect(screen.getByTestId('btn-incorrect')).toBeInTheDocument();
  });

  it('emits flip interaction', () => {
    const { emitInteraction } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'flip', cardIndex: 0 }),
    );
  });

  it('advances to next card on correct', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    expect(screen.getByText('Gracias')).toBeInTheDocument();
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
  });

  it('completes after last card', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows completion with scores', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    expect(screen.getByTestId('flashcard-complete')).toHaveTextContent('2 correct, 0 incorrect');
  });
});

describe('Flashcard hints', () => {
  it('shows hint button when hint is provided', () => {
    renderWidget({
      cards: [{ front: 'Test', back: 'Answer', hint: 'A helpful hint' }],
      interactive: true,
    });
    expect(screen.getByRole('button', { name: 'Show Hint' })).toBeInTheDocument();
  });

  it('toggles hint visibility', () => {
    renderWidget({
      cards: [{ front: 'Test', back: 'Answer', hint: 'A helpful hint' }],
      interactive: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show Hint' }));
    expect(screen.getByText('A helpful hint')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide Hint' }));
    expect(screen.queryByText('A helpful hint')).not.toBeInTheDocument();
  });
});

describe('Flashcard retry', () => {
  it('shows retry button when there are incorrect cards', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-incorrect'));
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    expect(screen.getByTestId('btn-retry')).toBeInTheDocument();
  });

  it('resets to incorrect cards on retry', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-incorrect'));
    fireEvent.click(screen.getByTestId('flashcard-card'));
    fireEvent.click(screen.getByTestId('btn-correct'));
    fireEvent.click(screen.getByTestId('btn-retry'));
    expect(screen.getByText('Hola')).toBeInTheDocument();
  });
});

describe('Flashcard observe mode', () => {
  it('shows all cards in observe mode', () => {
    renderWidget({
      cards: [
        { front: 'A', back: 'B' },
        { front: 'C', back: 'D' },
      ],
    });
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows acknowledge button in observe mode', () => {
    renderWidget({ cards: [{ front: 'A', back: 'B' }] });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });
});

describe('Flashcard accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget(baseConfig);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Flashcard activity');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('card is keyboard accessible', () => {
    renderWidget(baseConfig);
    const card = screen.getByTestId('flashcard-card');
    expect(card).toHaveAttribute('tabIndex', '0');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Step 4: Run tests

Run: `pnpm --filter @open-edu/widgets test -- Flashcard`
Expected: All tests pass.

### Step 5: Commit

```bash
git add packages/widgets/src/builtins/Flashcard/
git commit -m "feat(widgets): add language.flashcard widget"
```

---

## Task 5: Widget 4 — science.process-diagram

**Files:**

- Create: `packages/widgets/src/builtins/ProcessDiagram/ProcessDiagram.tsx`
- Create: `packages/widgets/src/builtins/ProcessDiagram/ProcessDiagram.test.tsx`

### Step 1: Create directory

```bash
mkdir -p packages/widgets/src/builtins/ProcessDiagram
```

### Step 2: Create ProcessDiagram.tsx

This is a complex SVG-based widget. The implementation renders nodes and connections in different layouts (horizontal, vertical, cycle, radial).

```tsx
import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const nodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
});

const connectionSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(['arrow', 'dashed', 'double', 'loop']).optional().default('arrow'),
  label: z.string().optional(),
});

const processDiagramSchema = z.object({
  nodes: z.array(nodeSchema).min(2),
  connections: z.array(connectionSchema).min(1),
  layout: z.enum(['horizontal', 'vertical', 'cycle', 'radial']).optional().default('horizontal'),
  title: z.string().optional(),
  interactive: z.boolean().optional().default(false),
  animate: z.boolean().optional().default(false),
  stepByStep: z.boolean().optional().default(false),
});

const ProcessDiagramStateSchema = z.object({
  revealedNodes: z.array(z.number()),
  currentStep: z.number(),
});

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;
const GAP = 80;

function computePositions(
  nodes: { id: string }[],
  layout: string,
  containerWidth: number,
  containerHeight: number,
) {
  const positions = new Map<string, { x: number; y: number }>();
  const cx = containerWidth / 2;
  const cy = containerHeight / 2;

  if (layout === 'horizontal') {
    const totalWidth = nodes.length * NODE_WIDTH + (nodes.length - 1) * GAP;
    const startX = (containerWidth - totalWidth) / 2;
    nodes.forEach((n, i) => {
      positions.set(n.id, { x: startX + i * (NODE_WIDTH + GAP), y: cy - NODE_HEIGHT / 2 });
    });
  } else if (layout === 'vertical') {
    const totalHeight = nodes.length * NODE_HEIGHT + (nodes.length - 1) * GAP;
    const startY = (containerHeight - totalHeight) / 2;
    nodes.forEach((n, i) => {
      positions.set(n.id, { x: cx - NODE_WIDTH / 2, y: startY + i * (NODE_HEIGHT + GAP) });
    });
  } else if (layout === 'cycle') {
    const radius = Math.min(cx, cy) - NODE_WIDTH;
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions.set(n.id, {
        x: cx + radius * Math.cos(angle) - NODE_WIDTH / 2,
        y: cy + radius * Math.sin(angle) - NODE_HEIGHT / 2,
      });
    });
  } else if (layout === 'radial') {
    const radius = Math.min(cx, cy) * 0.6;
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions.set(n.id, {
        x: cx + radius * Math.cos(angle) - NODE_WIDTH / 2,
        y: cy + radius * Math.sin(angle) - NODE_HEIGHT / 2,
      });
    });
  }

  return positions;
}

function renderArrowHead(defs: boolean, id: string) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 7"
      refX="10"
      refY="3.5"
      markerWidth="10"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <polygon points="0 0, 10 3.5, 0 7" fill="var(--oe-color-on-surface, #1c1b1f)" />
    </marker>
  );
}

function ProcessDiagramComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = processDiagramSchema.safeParse(rawConfig);
  const parsedState = useMemo(() => {
    const result = ProcessDiagramStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [revealedNodes, setRevealedNodes] = useState<number[]>(
    parsedState?.revealedNodes ??
      (parsed?.success && !parsed.data.stepByStep ? parsed.data.nodes.map((_, i) => i) : []),
  );
  const [currentStep, setCurrentStep] = useState(parsedState?.currentStep ?? 0);

  const isObserve = parsed.success && !parsed.data.interactive;
  const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'science.process-diagram',
  });

  const containerWidth = 600;
  const containerHeight = Math.max(300, (parsed?.data?.nodes.length ?? 2) * 80);

  const positions = useMemo(() => {
    if (!parsed.success) return new Map();
    return computePositions(parsed.data.nodes, parsed.data.layout, containerWidth, containerHeight);
  }, [parsed]);

  const handleRevealNext = useCallback(() => {
    if (!parsed.success) return;
    const nextIndex = revealedNodes.length;
    if (nextIndex < parsed.data.nodes.length) {
      setRevealedNodes([...revealedNodes, nextIndex]);
      setCurrentStep(nextIndex);
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'science.process-diagram',
        action: 'reveal',
        nodeIndex: nextIndex,
        nodeId: parsed.data.nodes[nextIndex]?.id,
      });
      if (nextIndex === parsed.data.nodes.length - 1) {
        complete(100, { revealedNodes: [...revealedNodes, nextIndex], currentStep: nextIndex });
      }
    }
  }, [parsed, revealedNodes, emitInteraction, complete]);

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const config = parsed.data;

  if (isObserve) {
    return (
      <div
        role="group"
        aria-label={config.title ?? 'Process diagram'}
        data-testid="process-diagram-observe"
      >
        {config.title && <h3 className="text-on-surface mb-sm font-semibold">{config.title}</h3>}
        <svg
          width={containerWidth}
          height={containerHeight}
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
          className="w-full"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="10"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--oe-color-on-surface, #1c1b1f)" />
            </marker>
          </defs>
          {config.connections.map((conn, i) => {
            const from = positions.get(conn.from);
            const to = positions.get(conn.to);
            if (!from || !to) return null;
            const x1 = from.x + NODE_WIDTH / 2;
            const y1 = from.y + NODE_HEIGHT / 2;
            const x2 = to.x + NODE_WIDTH / 2;
            const y2 = to.y + NODE_HEIGHT / 2;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--oe-color-on-surface, #1c1b1f)"
                strokeWidth={2}
                strokeDasharray={conn.type === 'dashed' ? '8 4' : undefined}
                markerEnd="url(#arrow)"
              />
            );
          })}
          {config.nodes.map((node, idx) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            return (
              <g key={node.id} role="listitem" aria-label={`Step ${idx + 1}: ${node.title}`}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  fill="var(--oe-color-primary-container, #e8def8)"
                  stroke="var(--oe-color-primary, #6750a4)"
                  strokeWidth={2}
                />
                <text
                  x={pos.x + NODE_WIDTH / 2}
                  y={pos.y + NODE_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--oe-color-on-primary-container, #1d192b)"
                  fontSize={13}
                  fontWeight={500}
                >
                  {node.title}
                </text>
              </g>
            );
          })}
        </svg>
        {showAcknowledgeButton && (
          <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
            <Button variant="default" onClick={handleAcknowledge} data-testid="observe-acknowledge">
              Mark as seen ✓
            </Button>
          </div>
        )}
      </div>
    );
  }

  const visibleNodes = config.stepByStep
    ? config.nodes.filter((_, i) => revealedNodes.includes(i))
    : config.nodes;

  return (
    <div role="group" aria-label={config.title ?? 'Process diagram'} data-testid="process-diagram">
      {config.title && <h3 className="text-on-surface mb-sm font-semibold">{config.title}</h3>}

      <div role="list" aria-label="Process steps" className="overflow-auto">
        <svg
          width={containerWidth}
          height={containerHeight}
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
          className="w-full"
        >
          <defs>
            <marker
              id="arrow-interactive"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="10"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--oe-color-on-surface, #1c1b1f)" />
            </marker>
          </defs>
          {config.connections.map((conn, i) => {
            const from = positions.get(conn.from);
            const to = positions.get(conn.to);
            if (!from || !to) return null;
            const fromIdx = config.nodes.findIndex((n) => n.id === conn.from);
            const toIdx = config.nodes.findIndex((n) => n.id === conn.to);
            if (!revealedNodes.includes(fromIdx) || !revealedNodes.includes(toIdx)) return null;
            const x1 = from.x + NODE_WIDTH / 2;
            const y1 = from.y + NODE_HEIGHT / 2;
            const x2 = to.x + NODE_WIDTH / 2;
            const y2 = to.y + NODE_HEIGHT / 2;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--oe-color-on-surface, #1c1b1f)"
                strokeWidth={2}
                strokeDasharray={conn.type === 'dashed' ? '8 4' : undefined}
                markerEnd="url(#arrow-interactive)"
              />
            );
          })}
          {config.nodes.map((node, idx) => {
            if (!revealedNodes.includes(idx)) return null;
            const pos = positions.get(node.id);
            if (!pos) return null;
            return (
              <g key={node.id} role="listitem" aria-label={`Step ${idx + 1}: ${node.title}`}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  fill={
                    idx === currentStep
                      ? 'var(--oe-color-primary, #6750a4)'
                      : 'var(--oe-color-primary-container, #e8def8)'
                  }
                  stroke="var(--oe-color-primary, #6750a4)"
                  strokeWidth={2}
                />
                <text
                  x={pos.x + NODE_WIDTH / 2}
                  y={pos.y + NODE_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={
                    idx === currentStep
                      ? 'var(--oe-color-on-primary, #fff)'
                      : 'var(--oe-color-on-primary-container, #1d192b)'
                  }
                  fontSize={13}
                  fontWeight={500}
                >
                  {node.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {config.stepByStep && revealedNodes.length < config.nodes.length && (
        <div className="mt-md text-center">
          <Button variant="default" onClick={handleRevealNext} data-testid="reveal-next">
            Reveal Next Step
          </Button>
          <p className="text-on-surface/70 mt-xs text-sm">
            Step {revealedNodes.length + 1} of {config.nodes.length}
          </p>
        </div>
      )}

      {config.stepByStep && revealedNodes.length >= config.nodes.length && (
        <div
          role="status"
          aria-live="assertive"
          data-testid="diagram-complete"
          className="mt-md text-center"
        >
          <p className="text-on-surface font-semibold">All steps revealed!</p>
        </div>
      )}
    </div>
  );
}

const ProcessDiagramWidget: WidgetDefinitionV2 = {
  id: 'science.process-diagram',
  name: 'Process Diagram',
  description: 'Visual explanation of systems and processes with nodes and connections',
  domain: 'science',
  version: '1.0.0',
  render: ProcessDiagramComponent,
  learningIntents: [LearningIntent.Observe, LearningIntent.Understand],
  capabilities: {
    supportsObserveMode: true,
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsAnimation: true,
    supportsLocalization: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    reducedMotion: true,
    ariaSupport: true,
    focusManagement: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackInteractions: true,
  },
  reward: {
    completionXP: 15,
    confetti: true,
    positiveMessage: 'Process understood!',
    achievement: 'first-process',
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 5,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    recommendedAge: [8, 18],
    readingLevel: 'grade-4',
    subjectTags: ['science', 'computer-science'],
    learningObjectives: [
      'Understand the sequence of steps in a process',
      'Identify relationships between process stages',
      'Predict the next step in a known process',
    ],
    commonMisconceptions: [
      'Assuming processes always follow a linear path',
      'Missing feedback loops in cyclical processes',
    ],
    generationHints: [
      'Use 3-8 nodes for clarity',
      'Label connections with transition descriptions',
      'Choose layout based on process shape (linear=horizontal, cyclical=cycle)',
    ],
    authoringPrompt:
      'Create a process diagram showing the stages of a natural or computational process',
    exampleConfigs: [
      {
        title: 'Water Cycle',
        nodes: [
          { id: 'evap', title: 'Evaporation' },
          { id: 'cond', title: 'Condensation' },
          { id: 'precip', title: 'Precipitation' },
          { id: 'collect', title: 'Collection' },
        ],
        connections: [
          { from: 'evap', to: 'cond', type: 'arrow' },
          { from: 'cond', to: 'precip', type: 'arrow' },
          { from: 'precip', to: 'collect', type: 'arrow' },
          { from: 'collect', to: 'evap', type: 'loop' },
        ],
        layout: 'cycle',
        interactive: true,
        stepByStep: true,
      },
    ],
  },
  icon: 'git-branch',
  keywords: ['process', 'diagram', 'flow', 'cycle', 'system', 'steps', 'science'],
  status: 'stable',
};

export { ProcessDiagramWidget as processDiagram };
export default ProcessDiagramWidget;
```

### Step 3: Create ProcessDiagram.test.tsx

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { processDiagram } from './ProcessDiagram';

const WidgetComponent = processDiagram.render;

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

const baseConfig = {
  nodes: [
    { id: 'a', title: 'Step A' },
    { id: 'b', title: 'Step B' },
    { id: 'c', title: 'Step C' },
  ],
  connections: [
    { from: 'a', to: 'b', type: 'arrow' },
    { from: 'b', to: 'c', type: 'arrow' },
  ],
  layout: 'horizontal',
  interactive: true,
  stepByStep: true,
};

describe('ProcessDiagram widget definition', () => {
  it('has correct widget id', () => {
    expect(processDiagram.id).toBe('science.process-diagram');
  });

  it('has correct domain', () => {
    expect(processDiagram.domain).toBe('science');
  });

  it('has stable status', () => {
    expect(processDiagram.status).toBe('stable');
  });
});

describe('ProcessDiagram rendering', () => {
  it('renders with valid config', () => {
    renderWidget(baseConfig);
    expect(screen.getByTestId('process-diagram')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    renderWidget({ ...baseConfig, title: 'Water Cycle' });
    expect(screen.getByText('Water Cycle')).toBeInTheDocument();
  });

  it('renders SVG nodes', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Step A')).toBeInTheDocument();
    expect(screen.getByText('Step B')).toBeInTheDocument();
    expect(screen.getByText('Step C')).toBeInTheDocument();
  });

  it('renders error for less than 2 nodes', () => {
    renderWidget({ nodes: [{ id: 'a', title: 'Only' }], connections: [] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('ProcessDiagram step-by-step', () => {
  it('shows reveal button initially', () => {
    renderWidget(baseConfig);
    expect(screen.getByTestId('reveal-next')).toBeInTheDocument();
  });

  it('shows step progress', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('reveals nodes one by one', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Step A')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(screen.getByText('Step B')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('emits reveal interaction', () => {
    const { emitInteraction } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'reveal', nodeIndex: 0 }),
    );
  });

  it('completes after revealing all nodes', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('shows completion message after all revealed', () => {
    renderWidget(baseConfig);
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    fireEvent.click(screen.getByTestId('reveal-next'));
    expect(screen.getByText('All steps revealed!')).toBeInTheDocument();
  });
});

describe('ProcessDiagram observe mode', () => {
  it('shows acknowledge button in observe mode', () => {
    renderWidget({ ...baseConfig, interactive: false });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });

  it('completes after acknowledge', () => {
    const { complete } = renderWidget({ ...baseConfig, interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
  });
});

describe('ProcessDiagram accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget({ ...baseConfig, title: 'My Process' });
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'My Process');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has role="list" for process steps', () => {
    renderWidget(baseConfig);
    expect(screen.getByRole('list', { name: 'Process steps' })).toBeInTheDocument();
  });

  it('has aria-label on each step', () => {
    renderWidget(baseConfig);
    expect(screen.getByRole('listitem', { name: 'Step 1: Step A' })).toBeInTheDocument();
  });
});
```

### Step 4: Run tests

Run: `pnpm --filter @open-edu/widgets test -- ProcessDiagram`
Expected: All tests pass.

### Step 5: Commit

```bash
git add packages/widgets/src/builtins/ProcessDiagram/
git commit -m "feat(widgets): add science.process-diagram widget"
```

---

## Task 6: Widget 5 — math.number-line

**Files:**

- Create: `packages/widgets/src/builtins/NumberLine/NumberLine.tsx`
- Create: `packages/widgets/src/builtins/NumberLine/NumberLine.test.tsx`

### Step 1: Create directory

```bash
mkdir -p packages/widgets/src/builtins/NumberLine
```

### Step 2: Create NumberLine.tsx

```tsx
import { useState, useCallback, useMemo, useRef } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const markerSchema = z.object({
  value: z.number(),
  label: z.string().optional(),
  color: z.string().optional(),
});

const numberLineSchema = z.object({
  min: z.number().optional().default(0),
  max: z.number().optional().default(10),
  step: z.number().optional().default(1),
  target: z.number().optional(),
  markers: z.array(markerSchema).optional(),
  showLabels: z.boolean().optional().default(true),
  showGrid: z.boolean().optional().default(false),
  mode: z
    .enum(['integers', 'decimals', 'fractions', 'negative', 'measurement'])
    .optional()
    .default('integers'),
  interactive: z.boolean().optional().default(false),
  tolerance: z.number().optional().default(0.5),
});

const NumberLineStateSchema = z.object({
  placedMarkers: z.array(z.number()),
  answeredCorrectly: z.boolean().optional(),
});

const PADDING = 40;
const LINE_HEIGHT = 120;

function NumberLineComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = numberLineSchema.safeParse(rawConfig);
  const parsedState = useMemo(() => {
    const result = NumberLineStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [userValue, setUserValue] = useState<number | null>(null);
  const [placedMarkers, setPlacedMarkers] = useState<number[]>(parsedState?.placedMarkers ?? []);
  const [answeredCorrectly, setAnsweredCorrectly] = useState(
    parsedState?.answeredCorrectly ?? false,
  );

  const isObserve = parsed.success && !parsed.data.interactive;
  const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'math.number-line',
  });

  const config = parsed.success
    ? parsed.data
    : {
        min: 0,
        max: 10,
        step: 1,
        showLabels: true,
        showGrid: false,
        mode: 'integers' as const,
        tolerance: 0.5,
      };
  const { min, max, step, markers, showLabels, showGrid, mode, target, tolerance } = config;

  const svgWidth = 600;
  const lineStart = PADDING;
  const lineEnd = svgWidth - PADDING;
  const lineLength = lineEnd - lineStart;

  const valueToX = useCallback(
    (val: number) => lineStart + ((val - min) / (max - min)) * lineLength,
    [min, max, lineStart, lineLength],
  );

  const xToValue = useCallback(
    (x: number) => {
      const raw = min + ((x - lineStart) / lineLength) * (max - min);
      return Math.round(raw / step) * step;
    },
    [min, max, step, lineStart, lineLength],
  );

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!parsed.success || !parsed.data.interactive) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * svgWidth;
      const value = xToValue(x);
      setUserValue(value);
      setPlacedMarkers((prev) => [...prev, value]);

      const isCorrect = target !== undefined && Math.abs(value - target) <= (tolerance ?? 0.5);
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'math.number-line',
        action: 'place',
        value,
        correct: isCorrect,
      });

      if (isCorrect && !answeredCorrectly) {
        setAnsweredCorrectly(true);
        complete(100, { placedMarkers: [...placedMarkers, value], answeredCorrectly: true });
      }
    },
    [
      parsed,
      xToValue,
      target,
      tolerance,
      placedMarkers,
      answeredCorrectly,
      emitInteraction,
      complete,
    ],
  );

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const tickValues: number[] = [];
  for (let v = min; v <= max; v = Math.round((v + step) * 1000) / 1000) {
    tickValues.push(v);
  }

  const formatLabel = (v: number) => {
    if (mode === 'fractions') {
      const whole = Math.floor(Math.abs(v));
      const frac = Math.abs(v) - whole;
      if (frac === 0) return v < 0 ? `-${whole}` : `${whole}`;
      return `${v < 0 ? '-' : ''}${whole || ''}${Math.round(frac * 100)}/100`;
    }
    if (mode === 'decimals') return v.toFixed(1);
    return v.toString();
  };

  return (
    <div role="group" aria-label="Number line" data-testid="number-line">
      {target !== undefined && parsed.data.interactive && (
        <p className="text-on-surface mb-sm font-semibold">
          Find {formatLabel(target)} on the number line
        </p>
      )}

      <svg
        ref={svgRef}
        width={svgWidth}
        height={LINE_HEIGHT + (showLabels ? 30 : 0)}
        viewBox={`0 0 ${svgWidth} ${LINE_HEIGHT + (showLabels ? 30 : 0)}`}
        className="w-full cursor-pointer"
        onClick={handleSvgClick}
        role={parsed.data.interactive ? 'application' : 'img'}
        aria-label={`Number line from ${min} to ${max}`}
      >
        {showGrid &&
          tickValues.map((v) => (
            <line
              key={`grid-${v}`}
              x1={valueToX(v)}
              y1={10}
              x2={valueToX(v)}
              y2={LINE_HEIGHT - 10}
              stroke="var(--oe-color-outline-variant, #e0e0e0)"
              strokeWidth={1}
            />
          ))}

        <line
          x1={lineStart}
          y1={LINE_HEIGHT / 2}
          x2={lineEnd}
          y2={LINE_HEIGHT / 2}
          stroke="var(--oe-color-on-surface, #1c1b1f)"
          strokeWidth={2}
        />
        <polygon
          points={`${lineEnd},${LINE_HEIGHT / 2 - 5} ${lineEnd + 10},${LINE_HEIGHT / 2} ${lineEnd},${LINE_HEIGHT / 2 + 5}`}
          fill="var(--oe-color-on-surface, #1c1b1f)"
        />

        {tickValues.map((v) => {
          const x = valueToX(v);
          return (
            <g key={v}>
              <line
                x1={x}
                y1={LINE_HEIGHT / 2 - 8}
                x2={x}
                y2={LINE_HEIGHT / 2 + 8}
                stroke="var(--oe-color-on-surface, #1c1b1f)"
                strokeWidth={2}
              />
              {showLabels && (
                <text
                  x={x}
                  y={LINE_HEIGHT / 2 + 25}
                  textAnchor="middle"
                  fill="var(--oe-color-on-surface, #1c1b1f)"
                  fontSize={12}
                >
                  {formatLabel(v)}
                </text>
              )}
            </g>
          );
        })}

        {markers?.map((m, i) => (
          <circle
            key={`marker-${i}`}
            cx={valueToX(m.value)}
            cy={LINE_HEIGHT / 2}
            r={6}
            fill={m.color ?? 'var(--oe-color-primary, #6750a4)'}
            aria-label={m.label ?? formatLabel(m.value)}
          />
        ))}

        {target !== undefined && isObserve && (
          <circle
            cx={valueToX(target)}
            cy={LINE_HEIGHT / 2}
            r={8}
            fill="var(--oe-color-primary, #6750a4)"
            stroke="var(--oe-color-on-primary, #fff)"
            strokeWidth={2}
            aria-label={`Target: ${formatLabel(target)}`}
          />
        )}

        {placedMarkers.map((v, i) => (
          <circle
            key={`placed-${i}`}
            cx={valueToX(v)}
            cy={LINE_HEIGHT / 2}
            r={6}
            fill={
              answeredCorrectly && v === target
                ? 'var(--oe-color-success, #16a34a)'
                : 'var(--oe-color-error, #dc2626)'
            }
            aria-label={`Placed at ${formatLabel(v)}`}
          />
        ))}
      </svg>

      {isObserve && showAcknowledgeButton && (
        <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
          <Button variant="default" onClick={handleAcknowledge} data-testid="observe-acknowledge">
            Mark as seen ✓
          </Button>
        </div>
      )}
    </div>
  );
}

const NumberLineWidget: WidgetDefinitionV2 = {
  id: 'math.number-line',
  name: 'Number Line',
  description: 'Visual number reasoning with interactive number line',
  domain: 'math',
  version: '1.0.0',
  render: NumberLineComponent,
  learningIntents: [LearningIntent.Observe, LearningIntent.Practice, LearningIntent.Compare],
  capabilities: {
    supportsObserveMode: true,
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsLocalization: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackInteractions: true,
    trackMistakes: true,
  },
  reward: {
    completionXP: 15,
    confetti: true,
    positiveMessage: 'Number sense strengthened!',
    achievement: 'first-numberline',
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 3,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    recommendedAge: [6, 14],
    readingLevel: 'grade-2',
    subjectTags: ['math', 'number-sense'],
    learningObjectives: [
      'Locate numbers on a number line',
      'Compare relative positions of numbers',
      'Estimate values between marked points',
    ],
    commonMisconceptions: [
      'Confusing the direction of negative numbers',
      'Assuming equal spacing between non-uniform intervals',
    ],
    generationHints: [
      'Use a reasonable range (0-10 for early learners, -10 to 10 for negatives)',
      'Include at least 5 tick marks for reference',
      'Place target values at non-obvious positions for challenge',
    ],
    authoringPrompt: 'Create a number line activity for locating or comparing numbers',
    exampleConfigs: [
      {
        min: 0,
        max: 10,
        step: 1,
        target: 7,
        showLabels: true,
        interactive: true,
        mode: 'integers',
      },
      {
        min: -5,
        max: 5,
        step: 1,
        target: -3,
        showLabels: true,
        interactive: true,
        mode: 'negative',
      },
    ],
  },
  icon: 'ruler',
  keywords: ['number-line', 'math', 'integers', 'decimals', 'fractions', 'estimate'],
  status: 'stable',
};

export { NumberLineWidget as numberLine };
export default NumberLineWidget;
```

### Step 3: Create NumberLine.test.tsx

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { numberLine } from './NumberLine';

const WidgetComponent = numberLine.render;

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

describe('NumberLine widget definition', () => {
  it('has correct widget id', () => {
    expect(numberLine.id).toBe('math.number-line');
  });

  it('has correct domain', () => {
    expect(numberLine.domain).toBe('math');
  });

  it('has stable status', () => {
    expect(numberLine.status).toBe('stable');
  });
});

describe('NumberLine rendering', () => {
  it('renders with default config', () => {
    renderWidget({});
    expect(screen.getByTestId('number-line')).toBeInTheDocument();
  });

  it('renders number line with tick labels', () => {
    renderWidget({ min: 0, max: 5, step: 1, showLabels: true });
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders target instruction when interactive with target', () => {
    renderWidget({ min: 0, max: 10, target: 7, interactive: true });
    expect(screen.getByText('Find 7 on the number line')).toBeInTheDocument();
  });

  it('renders error for invalid range', () => {
    renderWidget({ min: 10, max: 0 });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('NumberLine observe mode', () => {
  it('shows acknowledge button in observe mode', () => {
    renderWidget({ min: 0, max: 10 });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });

  it('completes after acknowledge', () => {
    const { complete } = renderWidget({ min: 0, max: 10 });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
  });
});

describe('NumberLine interactive mode', () => {
  it('does not show acknowledge button when interactive', () => {
    renderWidget({ min: 0, max: 10, interactive: true });
    expect(screen.queryByTestId('observe-acknowledge')).not.toBeInTheDocument();
  });

  it('emits interaction on click', () => {
    const { emitInteraction } = renderWidget({ min: 0, max: 10, interactive: true });
    const svg = screen.getByTestId('number-line').querySelector('svg');
    fireEvent.click(svg!, { clientX: 300 });
    expect(emitInteraction).toHaveBeenCalledWith(expect.objectContaining({ action: 'place' }));
  });

  it('completes when clicking near target', () => {
    const { complete } = renderWidget({
      min: 0,
      max: 10,
      target: 5,
      interactive: true,
      tolerance: 1,
    });
    const svg = screen.getByTestId('number-line').querySelector('svg');
    fireEvent.click(svg!, { clientX: 320 });
    expect(complete).toHaveBeenCalled();
  });
});

describe('NumberLine accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget({ min: 0, max: 10 });
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Number line');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({ min: 10, max: 0 });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-label on SVG', () => {
    renderWidget({ min: 0, max: 10 });
    expect(screen.getByRole('img', { name: 'Number line from 0 to 10' })).toBeInTheDocument();
  });
});
```

### Step 4: Run tests

Run: `pnpm --filter @open-edu/widgets test -- NumberLine`
Expected: All tests pass.

### Step 5: Commit

```bash
git add packages/widgets/src/builtins/NumberLine/
git commit -m "feat(widgets): add math.number-line widget"
```

---

## Task 7: Widget 6 — social.map

**Files:**

- Create: `packages/widgets/src/builtins/SocialMap/SocialMap.tsx`
- Create: `packages/widgets/src/builtins/SocialMap/SocialMap.test.tsx`

### Step 1: Create directory

```bash
mkdir -p packages/widgets/src/builtins/SocialMap
```

### Step 2: Create SocialMap.tsx

This widget renders an interactive SVG map with colored regions, tooltips, and zoom.

```tsx
import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const regionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  tooltip: z.string().optional(),
  image: z.string().optional(),
  path: z.string().optional(),
});

const markerSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  icon: z.string().optional(),
});

const legendItemSchema = z.object({
  color: z.string(),
  label: z.string(),
});

const socialMapSchema = z.object({
  map: z.string().optional(),
  regions: z.array(regionSchema).min(1),
  labels: z.boolean().optional().default(true),
  legend: z.array(legendItemSchema).optional(),
  markers: z.array(markerSchema).optional(),
  zoom: z.boolean().optional().default(false),
  projection: z.string().optional(),
  title: z.string().optional(),
  interactive: z.boolean().optional().default(false),
  targetRegion: z.string().optional(),
});

const SocialMapStateSchema = z.object({
  selectedRegion: z.string().optional(),
  foundRegions: z.array(z.string()),
  zoomLevel: z.number().optional(),
});

function SocialMapComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = socialMapSchema.safeParse(rawConfig);
  const parsedState = useMemo(() => {
    const result = SocialMapStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(
    parsedState?.selectedRegion ?? null,
  );
  const [foundRegions, setFoundRegions] = useState<string[]>(parsedState?.foundRegions ?? []);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(parsedState?.zoomLevel ?? 1);

  const isObserve = parsed.success && !parsed.data.interactive;
  const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'social.map',
  });

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const config = parsed.data;

  const handleRegionClick = useCallback(
    (regionId: string) => {
      if (!parsed.data.interactive) return;
      setSelectedRegion(regionId);

      const isCorrect = parsed.data.targetRegion === regionId;
      if (isCorrect && !foundRegions.includes(regionId)) {
        const next = [...foundRegions, regionId];
        setFoundRegions(next);
        emitInteraction({
          type: 'widget.interaction',
          widgetId: 'social.map',
          action: 'found',
          regionId,
        });
        if (parsed.data.targetRegion) {
          complete(100, { selectedRegion: regionId, foundRegions: next });
        }
      } else {
        emitInteraction({
          type: 'widget.interaction',
          widgetId: 'social.map',
          action: 'select',
          regionId,
        });
      }
    },
    [parsed, foundRegions, emitInteraction, complete],
  );

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(z + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  }, []);

  const selected = config.regions.find((r) => r.id === selectedRegion);
  const hovered = config.regions.find((r) => r.id === hoveredRegion);

  return (
    <div role="group" aria-label={config.title ?? 'Interactive map'} data-testid="social-map">
      {config.title && <h3 className="text-on-surface mb-sm font-semibold">{config.title}</h3>}

      {config.interactive && parsed.data.targetRegion && (
        <p className="text-on-surface/70 mb-sm text-sm">
          Find:{' '}
          {config.regions.find((r) => r.id === parsed.data.targetRegion)?.name ??
            parsed.data.targetRegion}
        </p>
      )}

      {config.zoom && (
        <div className="gap-xs mb-sm flex">
          <Button variant="outline" size="sm" onClick={handleZoomIn} aria-label="Zoom in">
            +
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut} aria-label="Zoom out">
            −
          </Button>
          <span className="text-on-surface/70 self-center text-sm">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      )}

      <div
        className="border-outline-variant bg-surface-container-lowest overflow-auto rounded-lg border"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
      >
        <svg
          width="100%"
          height="400"
          viewBox="0 0 600 400"
          role={parsed.data.interactive ? 'application' : 'img'}
          aria-label={config.title ?? 'Map'}
        >
          {config.regions.map((region) => (
            <g
              key={region.id}
              onClick={() => handleRegionClick(region.id)}
              onMouseEnter={() => setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion(null)}
              className="cursor-pointer"
              role={parsed.data.interactive ? 'button' : 'img'}
              aria-label={region.name}
              tabIndex={parsed.data.interactive ? 0 : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRegionClick(region.id);
                }
              }}
            >
              {region.path ? (
                <path
                  d={region.path}
                  fill={region.color ?? 'var(--oe-color-primary-container, #e8def8)'}
                  stroke={
                    selectedRegion === region.id
                      ? 'var(--oe-color-primary, #6750a4)'
                      : 'var(--oe-color-outline, #79747e)'
                  }
                  strokeWidth={selectedRegion === region.id ? 3 : 1}
                />
              ) : (
                <rect
                  x={config.regions.indexOf(region) * 100}
                  y={100}
                  width={80}
                  height={80}
                  rx={4}
                  fill={region.color ?? 'var(--oe-color-primary-container, #e8def8)'}
                  stroke={
                    selectedRegion === region.id
                      ? 'var(--oe-color-primary, #6750a4)'
                      : 'var(--oe-color-outline, #79747e)'
                  }
                  strokeWidth={selectedRegion === region.id ? 3 : 1}
                />
              )}
              {config.labels && (
                <text
                  x={region.path ? 300 : config.regions.indexOf(region) * 100 + 40}
                  y={region.path ? 200 : 140}
                  textAnchor="middle"
                  fill="var(--oe-color-on-surface, #1c1b1f)"
                  fontSize={12}
                  fontWeight={500}
                  aria-hidden="true"
                >
                  {region.name}
                </text>
              )}
            </g>
          ))}

          {config.markers?.map((m) => (
            <g key={m.id}>
              <circle cx={m.x} cy={m.y} r={6} fill="var(--oe-color-error, #dc2626)" />
              <text
                x={m.x}
                y={m.y - 10}
                textAnchor="middle"
                fill="var(--oe-color-on-surface, #1c1b1f)"
                fontSize={10}
                aria-hidden="true"
              >
                {m.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {(hovered || selected) && (
        <div
          className="border-outline-variant bg-surface-container p-sm mt-sm rounded-lg border"
          role="status"
          aria-live="polite"
        >
          <p className="text-on-surface font-medium">{(hovered ?? selected)?.name}</p>
          {(hovered ?? selected)?.description && (
            <p className="text-on-surface/70 text-sm">{(hovered ?? selected)?.description}</p>
          )}
        </div>
      )}

      {config.legend && config.legend.length > 0 && (
        <div className="gap-sm mt-sm flex flex-wrap" role="list" aria-label="Map legend">
          {config.legend.map((item, i) => (
            <div key={i} role="listitem" className="gap-xs flex items-center">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-on-surface/70 text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {isObserve && showAcknowledgeButton && (
        <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
          <Button variant="default" onClick={handleAcknowledge} data-testid="observe-acknowledge">
            Mark as seen ✓
          </Button>
        </div>
      )}
    </div>
  );
}

const SocialMapWidget: WidgetDefinitionV2 = {
  id: 'social.map',
  name: 'Interactive Map',
  description: 'Interactive educational maps for geography and history',
  domain: 'social',
  version: '1.0.0',
  render: SocialMapComponent,
  learningIntents: [LearningIntent.Explore, LearningIntent.Observe],
  capabilities: {
    supportsObserveMode: true,
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsLocalization: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    ariaSupport: true,
    focusManagement: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackInteractions: true,
  },
  reward: {
    completionXP: 15,
    confetti: true,
    positiveMessage: 'Geography explored!',
    achievement: 'first-map',
  },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 5,
    bloomsLevel: 'understand',
    cognitiveLoad: 'moderate',
    recommendedAge: [8, 18],
    readingLevel: 'grade-4',
    subjectTags: ['geography', 'history', 'social-studies'],
    learningObjectives: [
      'Identify regions on an interactive map',
      'Explore geographical relationships',
      'Locate specific features using map references',
    ],
    commonMisconceptions: [
      'Confusing similar-sounding region names',
      'Misreading map scale and relative distances',
    ],
    generationHints: [
      'Use SVG paths for accurate region boundaries',
      'Provide clear labels and distinct colors',
      'Include a legend for color-coded regions',
      'Add markers for key locations',
    ],
    authoringPrompt: 'Create an interactive map activity for geography or history education',
    exampleConfigs: [
      {
        title: 'Indian States',
        regions: [
          { id: 'mh', name: 'Maharashtra', color: '#e8def8', description: 'Western India' },
          { id: 'ka', name: 'Karnataka', color: '#d0bcff', description: 'Southern India' },
          { id: 'tn', name: 'Tamil Nadu', color: '#b69df8', description: 'Southeast India' },
        ],
        labels: true,
        interactive: true,
        targetRegion: 'ka',
        legend: [
          { color: '#e8def8', label: 'Western Region' },
          { color: '#d0bcff', label: 'Southern Region' },
          { color: '#b69df8', label: 'Southeastern Region' },
        ],
      },
    ],
  },
  icon: 'map',
  keywords: ['map', 'geography', 'regions', 'countries', 'states', 'explore'],
  status: 'stable',
};

export { SocialMapWidget as socialMap };
export default SocialMapWidget;
```

### Step 3: Create SocialMap.test.tsx

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { socialMap } from './SocialMap';

const WidgetComponent = socialMap.render;

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

const baseConfig = {
  regions: [
    { id: 'r1', name: 'Region A', color: '#e8def8' },
    { id: 'r2', name: 'Region B', color: '#d0bcff' },
  ],
  labels: true,
  interactive: true,
  targetRegion: 'r2',
};

describe('SocialMap widget definition', () => {
  it('has correct widget id', () => {
    expect(socialMap.id).toBe('social.map');
  });

  it('has correct domain', () => {
    expect(socialMap.domain).toBe('social');
  });

  it('has stable status', () => {
    expect(socialMap.status).toBe('stable');
  });
});

describe('SocialMap rendering', () => {
  it('renders with valid config', () => {
    renderWidget(baseConfig);
    expect(screen.getByTestId('social-map')).toBeInTheDocument();
  });

  it('renders title', () => {
    renderWidget({ ...baseConfig, title: 'World Map' });
    expect(screen.getByText('World Map')).toBeInTheDocument();
  });

  it('renders region labels', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Region A')).toBeInTheDocument();
    expect(screen.getByText('Region B')).toBeInTheDocument();
  });

  it('renders legend', () => {
    renderWidget({
      ...baseConfig,
      legend: [{ color: '#e8def8', label: 'Type A' }],
    });
    expect(screen.getByText('Type A')).toBeInTheDocument();
  });

  it('renders error for no regions', () => {
    renderWidget({ regions: [] });
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });

  it('renders error for no config', () => {
    renderWidget({});
    expect(screen.getByTestId('widget-config-error')).toBeInTheDocument();
  });
});

describe('SocialMap interactive mode', () => {
  it('shows target instruction when targetRegion is set', () => {
    renderWidget(baseConfig);
    expect(screen.getByText('Find: Region B')).toBeInTheDocument();
  });

  it('emits select interaction on region click', () => {
    const { emitInteraction } = renderWidget(baseConfig);
    fireEvent.click(screen.getByRole('button', { name: 'Region A' }));
    expect(emitInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'select', regionId: 'r1' }),
    );
  });

  it('completes when target region is found', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByRole('button', { name: 'Region B' }));
    expect(complete).toHaveBeenCalledWith(100, expect.any(Object));
  });

  it('does not complete when wrong region is clicked', () => {
    const { complete } = renderWidget(baseConfig);
    fireEvent.click(screen.getByRole('button', { name: 'Region A' }));
    expect(complete).not.toHaveBeenCalled();
  });
});

describe('SocialMap observe mode', () => {
  it('shows acknowledge button in observe mode', () => {
    renderWidget({ ...baseConfig, interactive: false });
    expect(screen.getByTestId('observe-acknowledge')).toBeInTheDocument();
  });

  it('completes after acknowledge', () => {
    const { complete } = renderWidget({ ...baseConfig, interactive: false });
    fireEvent.click(screen.getByTestId('observe-acknowledge'));
    expect(complete).toHaveBeenCalledWith(100);
  });
});

describe('SocialMap zoom', () => {
  it('shows zoom controls when zoom is enabled', () => {
    renderWidget({ ...baseConfig, zoom: true });
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
  });

  it('does not show zoom controls by default', () => {
    renderWidget(baseConfig);
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
  });
});

describe('SocialMap accessibility', () => {
  it('has role="group" with aria-label', () => {
    renderWidget({ ...baseConfig, title: 'My Map' });
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'My Map');
  });

  it('has role="alert" for config errors', () => {
    renderWidget({});
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has keyboard accessible regions', () => {
    renderWidget(baseConfig);
    const region = screen.getByRole('button', { name: 'Region A' });
    fireEvent.keyDown(region, { key: 'Enter' });
    expect(region).toBeInTheDocument();
  });

  it('has aria-label on legend', () => {
    renderWidget({
      ...baseConfig,
      legend: [{ color: '#e8def8', label: 'Type A' }],
    });
    expect(screen.getByRole('list', { name: 'Map legend' })).toBeInTheDocument();
  });
});
```

### Step 4: Run tests

Run: `pnpm --filter @open-edu/widgets test -- SocialMap`
Expected: All tests pass.

### Step 5: Commit

```bash
git add packages/widgets/src/builtins/SocialMap/
git commit -m "feat(widgets): add social.map widget"
```

---

## Task 8: Register All Widgets

**Files:**

- Modify: `packages/widgets/src/builtins/index.ts`
- Modify: `packages/widgets/src/index.ts`
- Modify: `packages/widgets/src/registry.ts`

### Step 1: Add exports to builtins/index.ts

Append to `packages/widgets/src/builtins/index.ts`:

```typescript
export { audioPlayer } from './AudioPlayer/AudioPlayer';
export { videoPlayer } from './VideoPlayer/VideoPlayer';
export { flashcard } from './Flashcard/Flashcard';
export { processDiagram } from './ProcessDiagram/ProcessDiagram';
export { numberLine } from './NumberLine/NumberLine';
export { socialMap } from './SocialMap/SocialMap';
```

### Step 2: Add re-exports to index.ts

In `packages/widgets/src/index.ts`, add to the builtins re-export block:

```typescript
export {
  // ... existing exports ...
  audioPlayer,
  videoPlayer,
  flashcard,
  processDiagram,
  numberLine,
  socialMap,
} from './builtins/index.js';
```

### Step 3: Add to registry.ts

In `packages/widgets/src/registry.ts`, import the new widgets and add to `BUILTIN_WIDGETS`:

```typescript
import {
  // ... existing imports ...
  audioPlayer,
  videoPlayer,
  flashcard,
  processDiagram,
  numberLine,
  socialMap,
} from './builtins';

const BUILTIN_WIDGETS: WidgetDefinition[] = [
  // ... existing widgets ...
  audioPlayer,
  videoPlayer,
  flashcard,
  processDiagram,
  numberLine,
  socialMap,
];
```

### Step 4: Run registry tests

Run: `pnpm --filter @open-edu/widgets test -- registry`
Expected: All registry tests pass, including `registry-stubs.test.ts` which verifies all builtins register.

### Step 5: Run full test suite

Run: `pnpm --filter @open-edu/widgets test`
Expected: All 27 widgets (21 existing + 6 new) pass.

### Step 6: Commit

```bash
git add packages/widgets/src/builtins/index.ts packages/widgets/src/index.ts packages/widgets/src/registry.ts
git commit -m "feat(widgets): register all Phase 2 widgets in builtins, index, and registry"
```

---

## Task 9: Add Pipeline Widget Schemas

**Files:**

- Modify: `packages/pipeline/src/generate-activities/widget-schemas.ts`

### Step 1: Add validation schemas for new widgets

Append to `packages/pipeline/src/generate-activities/widget-schemas.ts`:

```typescript
const audioPlayerSchema = z.object({
  audio: z.string().min(1),
  title: z.string().optional(),
  transcript: z.string().optional(),
  captions: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).optional(),
  showTranscript: z.boolean().optional(),
  interactive: z.boolean().optional(),
  bookmarks: z.boolean().optional(),
});

const videoPlayerSchema = z.object({
  video: z.string().min(1),
  title: z.string().optional(),
  poster: z.string().optional(),
  chapters: z.array(z.object({ time: z.number(), title: z.string() })).optional(),
  transcript: z.string().optional(),
  showTranscript: z.boolean().optional(),
  interactive: z.boolean().optional(),
});

const flashcardSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
        hint: z.string().optional(),
        image: z.string().optional(),
      }),
    )
    .min(1),
  mode: z.enum(['flip', 'multiple', 'spaced']).optional(),
  interactive: z.boolean().optional(),
  shuffle: z.boolean().optional(),
});

const processDiagramSchema = z.object({
  nodes: z
    .array(z.object({ id: z.string(), title: z.string(), description: z.string().optional() }))
    .min(2),
  connections: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        type: z.enum(['arrow', 'dashed', 'double', 'loop']).optional(),
      }),
    )
    .min(1),
  layout: z.enum(['horizontal', 'vertical', 'cycle', 'radial']).optional(),
  title: z.string().optional(),
  interactive: z.boolean().optional(),
  stepByStep: z.boolean().optional(),
});

const numberLineSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  target: z.number().optional(),
  markers: z.array(z.object({ value: z.number(), label: z.string().optional() })).optional(),
  showLabels: z.boolean().optional(),
  mode: z.enum(['integers', 'decimals', 'fractions', 'negative', 'measurement']).optional(),
  interactive: z.boolean().optional(),
});

const socialMapSchema = z.object({
  regions: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .min(1),
  labels: z.boolean().optional(),
  legend: z.array(z.object({ color: z.string(), label: z.string() })).optional(),
  markers: z
    .array(z.object({ id: z.string(), label: z.string(), x: z.number(), y: z.number() }))
    .optional(),
  title: z.string().optional(),
  interactive: z.boolean().optional(),
  targetRegion: z.string().optional(),
});
```

### Step 2: Register in WIDGET_SCHEMAS

Add to the `WIDGET_SCHEMAS` record:

```typescript
const WIDGET_SCHEMAS: Record<string, z.ZodType> = {
  // ... existing entries ...
  'core.audio-player': audioPlayerSchema,
  'core.video-player': videoPlayerSchema,
  'language.flashcard': flashcardSchema,
  'science.process-diagram': processDiagramSchema,
  'math.number-line': numberLineSchema,
  'social.map': socialMapSchema,
};
```

### Step 3: Run pipeline tests

Run: `pnpm --filter @open-edu/pipeline test`
Expected: All tests pass.

### Step 4: Commit

```bash
git add packages/pipeline/src/generate-activities/widget-schemas.ts
git commit -m "feat(pipeline): add validation schemas for Phase 2 widgets"
```

---

## Task 10: Add Storybook Stories

**Files:**

- Create: `packages/design-system/src/stories/audio-player.stories.tsx`
- Create: `packages/design-system/src/stories/video-player.stories.tsx`
- Create: `packages/design-system/src/stories/flashcard.stories.tsx`
- Create: `packages/design-system/src/stories/process-diagram.stories.tsx`
- Create: `packages/design-system/src/stories/number-line.stories.tsx`
- Create: `packages/design-system/src/stories/social-map.stories.tsx`

### Step 1: Create audio-player.stories.tsx

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { audioPlayer } from '@open-edu/widgets';

const AudioPlayerComponent = audioPlayer.render;

function StoryWrapper(props: { config?: Record<string, unknown> }) {
  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <AudioPlayerComponent
        nodeId="story-node"
        config={props.config ?? {}}
        emitInteraction={() => {}}
        complete={() => {}}
      />
    </div>
  );
}

const meta: Meta<typeof StoryWrapper> = {
  title: 'Widgets/Audio Player',
  component: StoryWrapper,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StoryWrapper>;

export const Default: Story = {
  args: {
    config: {
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      title: 'Sample Audio',
      description: 'A sample audio track for demonstration',
      showTranscript: true,
      transcript: 'This is a sample transcript for the audio player widget.',
      showControls: true,
      interactive: true,
      bookmarks: true,
    },
  },
};

export const WithCaptions: Story = {
  args: {
    config: {
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      title: 'Audio with Captions',
      captions: [
        { start: 0, end: 3, text: 'Welcome to the lesson' },
        { start: 3, end: 6, text: 'Today we will learn about fractions' },
      ],
      showControls: true,
      interactive: true,
    },
  },
};

export const ObserveMode: Story = {
  args: {
    config: {
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      title: 'Listen Only',
    },
  },
};
```

### Step 2: Create remaining stories (follow same pattern)

Create similar story files for:

- `video-player.stories.tsx` — with chapters, captions examples
- `flashcard.stories.tsx` — with vocabulary cards, different modes
- `process-diagram.stories.tsx` — water cycle, food chain examples
- `number-line.stories.tsx` — integers, negatives, target finding
- `social-map.stories.tsx` — Indian states, world regions

### Step 3: Build design-system to verify stories compile

Run: `pnpm --filter @open-edu/design-system build`
Expected: Build succeeds.

### Step 4: Commit

```bash
git add packages/design-system/src/stories/audio-player.stories.tsx packages/design-system/src/stories/video-player.stories.tsx packages/design-system/src/stories/flashcard.stories.tsx packages/design-system/src/stories/process-diagram.stories.tsx packages/design-system/src/stories/number-line.stories.tsx packages/design-system/src/stories/social-map.stories.tsx
git commit -m "docs(stories): add Storybook stories for all Phase 2 widgets"
```

---

## Task 11: Add Example Course-Spec Nodes

**Files:**

- Create: `examples/phase2-showcase/nodes/audio-player.json`
- Create: `examples/phase2-showcase/nodes/video-player.json`
- Create: `examples/phase2-showcase/nodes/flashcard.json`
- Create: `examples/phase2-showcase/nodes/process-diagram.json`
- Create: `examples/phase2-showcase/nodes/number-line.json`
- Create: `examples/phase2-showcase/nodes/social-map.json`
- Create: `examples/phase2-showcase/nodes/intro.md`
- Create: `examples/phase2-showcase/nodes/outro.md`
- Create: `examples/phase2-showcase/workflow.json`
- Create: `examples/phase2-showcase/package.json`

### Step 1: Create example nodes

**audio-player.json:**

```json
{
  "type": "exercise",
  "title": "Listen to Spanish Greetings",
  "widget": "core.audio-player",
  "config": {
    "audio": "https://example.com/audio/spanish-greetings.mp3",
    "title": "Spanish Greetings",
    "transcript": "Hola, Buenos dias, Como estas?",
    "showTranscript": true,
    "interactive": true,
    "bookmarks": true,
    "captions": [
      { "start": 0, "end": 2, "text": "Hola" },
      { "start": 2, "end": 4, "text": "Buenos dias" },
      { "start": 4, "end": 6, "text": "Como estas?" }
    ]
  }
}
```

**video-player.json:**

```json
{
  "type": "exercise",
  "title": "Photosynthesis Video",
  "widget": "core.video-player",
  "config": {
    "video": "https://example.com/video/photosynthesis.mp4",
    "title": "Understanding Photosynthesis",
    "chapters": [
      { "time": 0, "title": "Introduction" },
      { "time": 60, "title": "Light Reactions" },
      { "time": 180, "title": "Calvin Cycle" }
    ],
    "showTranscript": true,
    "interactive": true
  }
}
```

**flashcard.json:**

```json
{
  "type": "exercise",
  "title": "Spanish Vocabulary",
  "widget": "language.flashcard",
  "config": {
    "cards": [
      { "front": "Hola", "back": "Hello", "hint": "Common greeting", "category": "Greetings" },
      { "front": "Gracias", "back": "Thank you", "category": "Politeness" },
      { "front": "Adios", "back": "Goodbye", "category": "Greetings" },
      { "front": "Por favor", "back": "Please", "category": "Politeness" }
    ],
    "mode": "flip",
    "interactive": true,
    "shuffle": true
  }
}
```

**process-diagram.json:**

```json
{
  "type": "exercise",
  "title": "Water Cycle",
  "widget": "science.process-diagram",
  "config": {
    "title": "The Water Cycle",
    "nodes": [
      { "id": "evap", "title": "Evaporation" },
      { "id": "cond", "title": "Condensation" },
      { "id": "precip", "title": "Precipitation" },
      { "id": "collect", "title": "Collection" }
    ],
    "connections": [
      { "from": "evap", "to": "cond", "type": "arrow" },
      { "from": "cond", "to": "precip", "type": "arrow" },
      { "from": "precip", "to": "collect", "type": "arrow" },
      { "from": "collect", "to": "evap", "type": "loop" }
    ],
    "layout": "cycle",
    "interactive": true,
    "stepByStep": true
  }
}
```

**number-line.json:**

```json
{
  "type": "exercise",
  "title": "Locate Numbers on Number Line",
  "widget": "math.number-line",
  "config": {
    "min": 0,
    "max": 10,
    "step": 1,
    "target": 7,
    "showLabels": true,
    "interactive": true,
    "mode": "integers"
  }
}
```

**social-map.json:**

```json
{
  "type": "exercise",
  "title": "Indian States Map",
  "widget": "social.map",
  "config": {
    "title": "States of India",
    "regions": [
      {
        "id": "mh",
        "name": "Maharashtra",
        "color": "#e8def8",
        "description": "Western India, capital Mumbai"
      },
      {
        "id": "ka",
        "name": "Karnataka",
        "color": "#d0bcff",
        "description": "Southern India, capital Bangalore"
      },
      {
        "id": "tn",
        "name": "Tamil Nadu",
        "color": "#b69df8",
        "description": "Southeast India, capital Chennai"
      }
    ],
    "labels": true,
    "interactive": true,
    "targetRegion": "ka",
    "legend": [
      { "color": "#e8def8", "label": "Western" },
      { "color": "#d0bcff", "label": "Southern" },
      { "color": "#b69df8", "label": "Southeastern" }
    ]
  }
}
```

### Step 2: Create workflow.json and package.json

**workflow.json:**

```json
{
  "steps": [
    { "ref": "nodes/intro.md" },
    { "ref": "nodes/audio-player.json" },
    { "ref": "nodes/video-player.json" },
    { "ref": "nodes/flashcard.json" },
    { "ref": "nodes/process-diagram.json" },
    { "ref": "nodes/number-line.json" },
    { "ref": "nodes/social-map.json" },
    { "ref": "nodes/outro.md" },
    "COMPLETED"
  ]
}
```

**package.json:**

```json
{
  "name": "@open-edu/example-phase2-showcase",
  "version": "1.0.0",
  "description": "Showcase of Phase 2 core widgets",
  "openEdu": {
    "type": "package",
    "title": "Phase 2 Widget Showcase",
    "description": "Demonstrates all 6 new Phase 2 widgets"
  }
}
```

### Step 3: Commit

```bash
git add examples/phase2-showcase/
git commit -m "feat(examples): add Phase 2 widget showcase example package"
```

---

## Task 12: Run Full Verification

### Step 1: Type check

Run: `pnpm typecheck`
Expected: No type errors.

### Step 2: Lint

Run: `pnpm lint`
Expected: No lint errors.

### Step 3: Format check

Run: `pnpm format:check`
Expected: No formatting issues.

### Step 4: Full test suite

Run: `pnpm test`
Expected: All tests pass across all packages.

### Step 5: Build all packages

Run: `pnpm build`
Expected: All packages build successfully.

### Step 6: Regenerate dev-server CSS (if runtime changes were made)

Run: `pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css`
Expected: CSS regenerated without errors.

### Step 7: Final commit (if any fixes needed)

```bash
git add -A
git commit -m "fix(widgets): address verification feedback for Phase 2 widgets"
```

---

## Summary

| Widget          | ID                        | Domain   | Complexity | Key Features                                                     |
| --------------- | ------------------------- | -------- | ---------- | ---------------------------------------------------------------- |
| Audio Player    | `core.audio-player`       | core     | Medium     | HTML5 audio, transcript sync, captions, bookmarks, playback rate |
| Video Player    | `core.video-player`       | core     | Medium     | HTML5 video, chapters, captions, transcript, fullscreen          |
| Flashcard       | `language.flashcard`      | language | Medium     | Flip animation, self-assess, shuffle, retry, hints               |
| Process Diagram | `science.process-diagram` | science  | High       | SVG nodes/connections, 4 layouts, step-by-step reveal            |
| Number Line     | `math.number-line`        | math     | High       | SVG number line, click-to-place, target finding, zoom            |
| Interactive Map | `social.map`              | social   | High       | SVG regions, click selection, zoom, legend, tooltips             |

### Deliverables per widget:

- [ ] React component (`.tsx`)
- [ ] Co-located tests (`.test.tsx`)
- [ ] WidgetDefinitionV2 with full metadata
- [ ] Registry registration
- [ ] Pipeline validation schema
- [ ] Storybook story
- [ ] Example course-spec node
- [ ] LearningIntent mapping
