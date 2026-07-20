import { useEffect, useRef, useState } from 'react';
import { Award } from 'lucide-react';
import { cn, ConfettiBurst, GlowPulse } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';

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
  const { t } = useTranslation();
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
          ? 'pointer-events-none translate-y-4 opacity-0'
          : isAnimatingIn
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0',
      )}
      data-testid="badge-toast"
    >
      <div className="relative">
        <div className="pointer-events-none absolute -left-4 -top-4">
          <ConfettiBurst particleCount={12} duration={1.2} />
        </div>
        <div className="bg-surface border-outline-variant flex items-start gap-3 rounded-xl border p-4 shadow-lg">
          <GlowPulse duration={1.5}>
            <div className="from-tertiary/20 to-tertiary/10 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br">
              <Award className="text-tertiary h-5 w-5" />
            </div>
          </GlowPulse>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-tertiary text-sm font-semibold">{t('learner.badge.achievement_unlocked')}</span>
            <span className="text-on-surface truncate text-sm">{badgeName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

BadgeToast.displayName = 'BadgeToast';
