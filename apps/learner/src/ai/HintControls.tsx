import * as React from 'react';
import { Button, cn } from '@open-edu/design-system';
import type { HintLevel } from '@open-edu/ai-companion';
import { useTranslation } from '@open-edu/i18n';

export interface HintControlsProps {
  currentLevel: HintLevel;
  onRequestLevel: (level: HintLevel) => void;
  disabled?: boolean;
  assessmentActive?: boolean;
  className?: string;
}

const HINT_LABEL_KEYS: Record<HintLevel, string> = {
  1: 'learner.pipili.hint.level_1',
  2: 'learner.pipili.hint.level_2',
  3: 'learner.pipili.hint.level_3',
  4: 'learner.pipili.hint.level_4',
};

const HINT_DESCRIPTION_KEYS: Record<HintLevel, string> = {
  1: 'learner.pipili.hint.level_1',
  2: 'learner.pipili.hint.level_2',
  3: 'learner.pipili.hint.level_3',
  4: 'learner.pipili.hint.level_4',
};

export const HintControls = React.forwardRef<HTMLDivElement, HintControlsProps>(
  function HintControls(
    { currentLevel, onRequestLevel, disabled = false, assessmentActive = false, className },
    ref,
  ): JSX.Element {
    const { t } = useTranslation();
    const maxLevel = assessmentActive ? 3 : 4;
    const buttons: HintLevel[] = [1, 2, 3, 4];

    return (
      <div ref={ref} className={cn('flex flex-wrap gap-1', className)} data-testid="hint-controls">
        {buttons.map((level) => {
          const isAvailable = level <= maxLevel;
          const isNext = level === Math.min(currentLevel + 1, maxLevel);

          return (
            <Button
              key={level}
              type="button"
              variant={isNext ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => isAvailable && onRequestLevel(level)}
              disabled={disabled || !isAvailable}
              title={t(HINT_DESCRIPTION_KEYS[level])}
              aria-label={t(HINT_LABEL_KEYS[level])}
              className={cn(
                'h-auto px-2 py-1 text-caption font-medium',
                !isAvailable && 'cursor-not-allowed opacity-40',
                isNext && 'ring-primary ring-1',
              )}
              data-testid={`hint-level-${level}`}
            >
              {t(HINT_LABEL_KEYS[level])}
            </Button>
          );
        })}
      </div>
    );
  },
);
HintControls.displayName = 'HintControls';
