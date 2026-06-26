import { useRuntime } from '../context/RuntimeContext.js';
import { SkillSummary } from './SkillSummary.js';

export interface CompletionScreenProps {
  badges?: string[];
  onBack: () => void;
  className?: string;
}

export function CompletionScreen({
  badges,
  onBack,
  className,
}: CompletionScreenProps): JSX.Element {
  const { loadedPackage } = useRuntime();
  const title = loadedPackage.manifest.title ?? '';

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-full p-xl text-center font-body-md ${className ?? ''}`}
      data-testid="completion-screen"
    >
      <h1 className="text-[1.75rem] font-bold text-on-surface m-0 mb-6">You finished {title}!</h1>

      <div className="mb-6 w-full max-w-[400px]">
        <h2 className="text-lg font-semibold text-on-surface m-0 mb-3">Skills achieved</h2>
        <SkillSummary />
      </div>

      {badges && badges.length > 0 && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-lg font-semibold text-on-surface m-0 mb-3">Badges earned</h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-sm">
            {badges.map((badge) => (
              <li
                key={badge}
                className="px-3 py-2 bg-on-surface-variant/10 rounded-lg text-body-ui"
                data-testid={`badge-${badge}`}
              >
                {badge}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="bg-primary text-on-primary border-none rounded-lg px-5 py-2.5 text-base font-semibold cursor-pointer"
        data-testid="back-to-catalog"
      >
        Back to catalog
      </button>
    </div>
  );
}
