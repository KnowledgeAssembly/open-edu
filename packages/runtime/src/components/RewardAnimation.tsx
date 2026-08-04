import { useMemo } from 'react';
import { useTranslation } from '@open-edu/i18n';
import type { AnimationConfigInput } from '@open-edu/schemas';
import { OasAnimationWrapper } from './OasAnimationWrapper';

export type RewardAnimationType = 'badge-unlock' | 'confetti' | 'xp-gain' | 'milestone';

export interface RewardAnimationProps {
  type: RewardAnimationType;
  badgeName?: string;
  xpAmount?: number;
  onComplete?: () => void;
}

const rewardConfigs: Record<RewardAnimationType, AnimationConfigInput> = {
  'badge-unlock': {
    backend: 'lottie',
    src: 'assets/rewards/badge-unlock.lottie',
    trigger: 'lesson-complete',
    effects: [{ target: 'badge', effect: 'badge' }],
    reducedMotion: 'static-steps',
  },
  confetti: {
    backend: 'lottie',
    src: 'assets/rewards/confetti.lottie',
    trigger: 'lesson-complete',
    effects: [{ target: 'canvas', effect: 'confetti' }],
    reducedMotion: 'instant',
  },
  'xp-gain': {
    backend: 'lottie',
    src: 'assets/rewards/xp-gain.lottie',
    trigger: 'answer-correct',
    effects: [{ target: 'xp', effect: 'sparkle' }],
    reducedMotion: 'instant',
  },
  milestone: {
    backend: 'lottie',
    src: 'assets/rewards/milestone.lottie',
    trigger: 'lesson-complete',
    effects: [{ target: 'milestone', effect: 'celebrate' }],
    reducedMotion: 'static-pose',
  },
};

export function RewardAnimation({
  type,
  badgeName,
  xpAmount,
  onComplete,
}: RewardAnimationProps): JSX.Element {
  const { t } = useTranslation();

  const config = useMemo(() => {
    const base = rewardConfigs[type];
    const ariaLabel = badgeName
      ? t('runtime.reward.badge_unlocked', { name: badgeName })
      : xpAmount
        ? t('runtime.reward.xp_gained', { amount: String(xpAmount) })
        : t('runtime.reward.generic', { type });
    return { ...base, ariaLabel };
  }, [type, badgeName, xpAmount, t]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="reward-animation"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
    >
      <OasAnimationWrapper config={config} onComplete={onComplete} ariaLabel={config.ariaLabel} />
    </div>
  );
}
