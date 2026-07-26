import { cn } from '@open-edu/design-system';
import type { HintLevel } from '@open-edu/ai-companion';

export interface HintControlsProps {
  currentLevel: HintLevel;
  onRequestLevel: (level: HintLevel) => void;
  disabled?: boolean;
  assessmentActive?: boolean;
  className?: string;
}

const HINT_LABELS: Record<HintLevel, string> = {
  1: 'Give me a hint',
  2: 'More specific hint',
  3: 'Walk me through it',
  4: 'Show full explanation',
};

const HINT_DESCRIPTIONS: Record<HintLevel, string> = {
  1: 'Point me in the right direction',
  2: 'Tell me the approach',
  3: 'Step-by-step guidance',
  4: 'Show me the complete solution',
};

export function HintControls({
  currentLevel,
  onRequestLevel,
  disabled = false,
  assessmentActive = false,
  className,
}: HintControlsProps): JSX.Element {
  const maxLevel = assessmentActive ? 3 : 4;
  const buttons: HintLevel[] = [1, 2, 3, 4];

  return (
    <div className={cn('flex flex-wrap gap-1', className)} data-testid="hint-controls">
      {buttons.map((level) => {
        const isAvailable = level <= maxLevel;
        const isNext = level === Math.min(currentLevel + 1, maxLevel);

        return (
          <button
            key={level}
            onClick={() => isAvailable && onRequestLevel(level)}
            disabled={disabled || !isAvailable}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              isAvailable
                ? 'bg-surface-container text-on-surface hover:bg-surface-container-hover'
                : 'cursor-not-allowed opacity-40',
              isNext && 'ring-primary ring-1',
            )}
            title={HINT_DESCRIPTIONS[level]}
            data-testid={`hint-level-${level}`}
          >
            {HINT_LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}
HintControls.displayName = 'HintControls';
