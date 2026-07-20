import { Button, Pipili, AssemblyFlow } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';

export interface BreakPageProps {
  onBackToLearning: () => void;
}

const suggestionChips = [
  { label: 'Drink water', color: 'bg-primary-light' },
  { label: 'Stretch', color: 'bg-success' },
  { label: 'Rest eyes', color: 'bg-tertiary' },
  { label: 'Breathe', color: 'bg-secondary' },
];

export function BreakPage({ onBackToLearning }: BreakPageProps): JSX.Element {
  const { t } = useTranslation('learner');
  return (
    <div className="bg-surface flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md" aria-hidden="true">
        <AssemblyFlow density="medium" className="opacity-[0.15]" />
      </div>

      <div className="relative my-8 flex items-center justify-center">
        {/* Orbital ring */}
        <svg width="140" height="140" viewBox="0 0 140 140" className="absolute" aria-hidden="true">
          <circle
            cx="70"
            cy="70"
            r="58"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="text-primary"
            style={{ opacity: 0.18 }}
          />
        </svg>
        <Pipili size="xl" mood="content" animated />
      </div>

      <h1 className="font-display text-primary text-3xl font-semibold">{t('learner.break.time_to_recharge')}</h1>
      <p className="text-on-surface-variant mt-2 text-center text-base">
        Take a moment for yourself. Your brain will thank you.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {suggestionChips.map((chip) => (
          <div
            key={chip.label}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
          >
            <span className={`h-2 w-2 rounded-full ${chip.color}`} />
            {chip.label}
          </div>
        ))}
      </div>

      {/* Timer ring (decorative) */}
      <div className="mt-8 flex items-center gap-3">
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-outline-variant"
            opacity={0.3}
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="125.6"
            strokeDashoffset="31.4"
            className="text-primary"
            transform="rotate(-90 24 24)"
            style={{ opacity: 0.6 }}
          />
        </svg>
        <span className="text-on-surface-variant font-mono text-lg">2:00</span>
      </div>

      <Button className="mt-8" onClick={onBackToLearning}>
        Back to Learning
      </Button>

      <div className="mt-auto w-full max-w-md" aria-hidden="true">
        <AssemblyFlow density="medium" className="rotate-180 opacity-[0.15]" />
      </div>
    </div>
  );
}
