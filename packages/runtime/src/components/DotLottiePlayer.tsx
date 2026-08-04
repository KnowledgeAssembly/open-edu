import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DotLottiePlayer as DotLottiePlayerImpl,
  PlayerEvents,
  type DotLottieCommonPlayer,
} from '@dotlottie/react-player';
import type { OasAnimationStatus } from './useOasAnimation';

export interface OasDotLottiePlayerProps {
  src: string;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  segments?: [number, number];
  staticFallback?: ReactNode;
  themeColors?: Record<string, string>;
  ariaLabel: string;
  className?: string;
  onEvent?: (status: OasAnimationStatus) => void;
  onError?: (err: unknown) => void;
}

function mapPlayerEvent(name: PlayerEvents): OasAnimationStatus | null {
  switch (name) {
    case PlayerEvents.Play:
    case PlayerEvents.Ready:
    case PlayerEvents.DataReady:
      return 'started';
    case PlayerEvents.Pause:
    case PlayerEvents.Stop:
      return 'paused';
    case PlayerEvents.Complete:
      return 'completed';
    default:
      return null;
  }
}

export function DotLottiePlayer({
  src,
  autoplay = false,
  loop = false,
  speed = 1,
  segments,
  staticFallback,
  themeColors,
  ariaLabel,
  className,
  onEvent,
  onError,
}: OasDotLottiePlayerProps): JSX.Element {
  const playerRef = useRef<DotLottieCommonPlayer | null>(null);
  const [ready, setReady] = useState(false);

  const handleEvent = useCallback(
    (name: PlayerEvents) => {
      if (name === PlayerEvents.DataReady) {
        setReady(true);
      }
      const status = mapPlayerEvent(name);
      if (status) {
        onEvent?.(status);
      }
      if (name === PlayerEvents.Error) {
        onError?.(new Error('dotLottie player error'));
      }
    },
    [onEvent, onError],
  );

  const onRef = useCallback((player: DotLottieCommonPlayer | null) => {
    playerRef.current = player;
  }, []);

  useEffect(() => {
    if (segments && playerRef.current && ready) {
      playerRef.current.playSegments(segments);
    }
  }, [segments, ready]);

  const content = (
    <DotLottiePlayerImpl
      ref={onRef}
      src={src}
      autoplay={autoplay}
      loop={loop}
      speed={speed}
      onEvent={handleEvent}
      className={className}
      testId="oas-dotlottie-player"
    />
  );

  if (staticFallback) {
    return (
      <div role="img" aria-label={ariaLabel} className={className}>
        {staticFallback}
      </div>
    );
  }

  const themeStyle = themeColors && Object.keys(themeColors).length > 0 ? themeColors : undefined;

  return (
    <div role="img" aria-label={ariaLabel} className={className} style={themeStyle}>
      {content}
    </div>
  );
}
