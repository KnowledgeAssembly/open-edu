import { useEffect, useRef, useState } from 'react';
import { Award } from 'lucide-react';
import { cn, ConfettiBurst, GlowPulse } from '@open-edu/design-system';

export interface BadgeToastProps {
  badgeName: string;
  visible: boolean;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export function BadgeToast({
  badgeName,
  visible,
  onDismiss,
  autoDismissMs = 4000,
}: BadgeToastProps): JSX.Element | null {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      setIsAnimatingIn(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, shouldRender]);

  useEffect(() => {
    if (!visible || !shouldRender) return;
    const timer = setTimeout(() => {
      onDismissRef.current?.();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [visible, shouldRender, autoDismissMs]);

  useEffect(() => {
    if (shouldRender && !isAnimatingOut) {
      const raf = requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [shouldRender, isAnimatingOut]);

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Badge earned: ${badgeName}`}
      className={cn(
        'max-w-xs',
        'motion-safe:transition-all motion-safe:duration-300',
        isAnimatingOut
          ? 'translate-y-4 opacity-0 pointer-events-none'
          : isAnimatingIn
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0',
      )}
      data-testid="badge-toast"
    >
      <div className="relative">
        <div className="absolute -top-4 -left-4 pointer-events-none">
          <ConfettiBurst particleCount={12} duration={1.2} />
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl shadow-lg bg-surface border border-outline-variant">
          <GlowPulse duration={1.5}>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-500/10">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
          </GlowPulse>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-sm font-semibold text-amber-600">Achievement Unlocked!</span>
            <span className="text-sm text-on-surface truncate">{badgeName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

BadgeToast.displayName = 'BadgeToast';
