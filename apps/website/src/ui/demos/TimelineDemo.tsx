import { useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { cn } from '@open-edu/design-system';

interface Milestone {
  year: string;
  descriptionKey: string;
}

const MILESTONES: Milestone[] = [
  { year: '1947', descriptionKey: 'website.timeline.milestone_1947_desc' },
  { year: '1965', descriptionKey: 'website.timeline.milestone_1965_desc' },
  { year: '1991', descriptionKey: 'website.timeline.milestone_1991_desc' },
  { year: '2000', descriptionKey: 'website.timeline.milestone_2000_desc' },
];

export function TimelineDemo(): JSX.Element {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const active = MILESTONES[activeIndex];

  return (
    <div>
      <p id="timeline-instructions" className="text-on-surface-variant text-sm">
        {t('website.timeline.instruction')}
      </p>

      <div role="group" aria-labelledby="timeline-instructions" className="relative mt-6">
        <div
          aria-hidden="true"
          className="bg-primary-container absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 rounded-full"
        />
        <div className="relative flex justify-between">
          {MILESTONES.map((milestone, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={milestone.year}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-pressed={isActive}
                className={cn(
                  'h-10 w-16 rounded-full border-2 text-sm font-semibold transition-colors',
                  'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
                  isActive
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline bg-surface text-on-surface hover:border-primary',
                )}
              >
                {milestone.year}
              </button>
            );
          })}
        </div>
      </div>

      {active ? (
        <p
          role="status"
          className="text-on-surface-variant bg-surface-container-low mt-5 rounded-lg px-4 py-3 text-sm"
        >
          <span className="text-on-surface font-semibold">{active.year}</span> —{' '}
          {t(active.descriptionKey)}
        </p>
      ) : null}
    </div>
  );
}

TimelineDemo.displayName = 'TimelineDemo';
