import { useMemo } from 'react';
import { OasAnimationWrapper } from '@open-edu/runtime';
import { Pipili, type PipiliMood } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { useReducedMotion } from '@open-edu/design-system';
import {
  DEFAULT_PIPILI_OAS_BINDINGS,
  type PipiliAnimationState,
  type PipiliOasBindings,
} from './types.js';

export interface PipiliMascotAnimationProps {
  state: PipiliAnimationState;
  bindings?: PipiliOasBindings;
  assetBaseUrl?: string;
  size?: number;
  reducedMotion?: boolean;
  onComplete?: () => void;
}

const stateToMood: Record<PipiliAnimationState, PipiliMood> = {
  idle: 'idle',
  thinking: 'thinking',
  celebrating: 'content',
  hinting: 'curious',
};

const stateAriaKey: Record<PipiliAnimationState, string> = {
  idle: 'learner.pipili.state_idle',
  thinking: 'learner.pipili.state_thinking',
  celebrating: 'learner.pipili.state_celebrating',
  hinting: 'learner.pipili.state_hinting',
};

export function PipiliMascotAnimation({
  state,
  bindings = DEFAULT_PIPILI_OAS_BINDINGS,
  assetBaseUrl,
  size = 40,
  reducedMotion,
  onComplete,
}: PipiliMascotAnimationProps): JSX.Element {
  const { t } = useTranslation();
  const osReducedMotion = useReducedMotion();
  const staticPose = reducedMotion ?? osReducedMotion;

  const config = useMemo(() => {
    const binding = bindings.bindings.find((b) => b.state === state);
    if (binding) return binding.animation;
    return bindings.fallback;
  }, [bindings, state]);

  const ariaLabel = t(stateAriaKey[state]);

  if (staticPose) {
    return (
      <Pipili
        size={sizeToPipiliSize(size)}
        mood={stateToMood[state]}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <div role="img" aria-label={ariaLabel}>
      <OasAnimationWrapper
        config={config}
        assetBaseUrl={assetBaseUrl}
        onComplete={onComplete}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}

function sizeToPipiliSize(size: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  if (size <= 24) return 'xs';
  if (size <= 32) return 'sm';
  if (size <= 48) return 'md';
  if (size <= 64) return 'lg';
  return 'xl';
}
