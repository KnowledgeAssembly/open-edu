import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '../primitives/button.js';
import { StaggerReveal } from '../effects/StaggerReveal.js';
import { GlowPulse } from '../effects/GlowPulse.js';
import { ConfettiBurst } from '../effects/ConfettiBurst.js';
import { useReducedMotion } from '../tokens/motion.js';

interface PackageManifest {
  id: string;
  title: string;
  version: string;
  author: string;
  entry: string;
  tags?: string[];
}

interface PackageSummary {
  manifest: PackageManifest;
  nodeCount: number;
  rootDir: string;
}

export interface CompletionStats {
  stepsCompleted: number;
  quizzesAnswered: number;
  reflectionsWritten: number;
  timeSpentMinutes: number;
}

export interface CompletionScreenProps {
  title: string;
  badges?: string[];
  onBack: () => void;
  className?: string;
  stats?: CompletionStats;
  recommendedCourses?: PackageSummary[];
  onNavigateToCourse?: (packageDir: string) => void;
  skillSummary?: ReactNode;
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="bg-surface-container-low border-outline-variant p-md rounded-lg border text-center">
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <p className="text-h2 font-display text-on-surface m-0 mt-1 font-bold">{value}</p>
      <p className="text-body-ui text-on-surface-variant m-0">{label}</p>
    </div>
  );
}

export function CompletionScreen({
  title,
  badges,
  onBack,
  className,
  stats,
  recommendedCourses,
  onNavigateToCourse,
  skillSummary,
}: CompletionScreenProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const displayStats = stats ?? {
    stepsCompleted: 0,
    quizzesAnswered: 0,
    reflectionsWritten: 0,
    timeSpentMinutes: 0,
  };
  const hasStats = stats !== undefined;

  return (
    <div
      className={`p-xl font-body-md flex min-h-full flex-col items-center justify-center text-center ${className ?? ''}`}
      data-testid="completion-screen"
    >
      {showConfetti && !prefersReducedMotion && <ConfettiBurst variant="fall" particleCount={30} />}

      <h1 className="text-on-surface m-0 mb-2 text-[1.75rem] font-bold">You finished {title}!</h1>
      <p className="text-body-ui text-on-surface-variant mb-lg m-0">
        Great work on completing this course.
      </p>

      {skillSummary && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-on-surface m-0 mb-3 text-lg font-semibold">Skills achieved</h2>
          {skillSummary}
        </div>
      )}

      {badges && badges.length > 0 && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-on-surface m-0 mb-3 text-lg font-semibold">Badges earned</h2>
          <StaggerReveal delayMs={200} className="gap-md grid grid-cols-2">
            {badges.map((badge) => (
              <div
                key={badge}
                className="bg-primary-container/30 border-primary-container p-md rounded-xl border text-center"
                data-testid={`badge-${badge}`}
              >
                <GlowPulse duration={0.8}>
                  <span className="text-3xl" aria-hidden="true">
                    🏆
                  </span>
                </GlowPulse>
                <h3 className="mt-sm text-on-surface text-sm font-semibold">{badge}</h3>
              </div>
            ))}
          </StaggerReveal>
        </div>
      )}

      {hasStats && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-on-surface m-0 mb-3 text-lg font-semibold">Your progress</h2>
          <StaggerReveal delayMs={150} className="gap-md grid grid-cols-2">
            <StatCard icon="📝" value={displayStats.stepsCompleted} label="Steps completed" />
            <StatCard icon="✅" value={displayStats.quizzesAnswered} label="Quizzes answered" />
            <StatCard
              icon="✍️"
              value={displayStats.reflectionsWritten}
              label="Reflections written"
            />
            <StatCard icon="⏱️" value={displayStats.timeSpentMinutes} label="Minutes spent" />
          </StaggerReveal>
        </div>
      )}

      {recommendedCourses && recommendedCourses.length > 0 && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-on-surface m-0 mb-3 text-lg font-semibold">You might also like</h2>
          <div className="gap-sm flex flex-col">
            {recommendedCourses.slice(0, 2).map((course) => (
              <div
                key={course.manifest.id}
                className="bg-surface-container-low border-outline-variant p-md flex items-center justify-between rounded-lg border"
              >
                <div className="text-left">
                  <h3 className="text-on-surface m-0 text-sm font-semibold">
                    {course.manifest.title}
                  </h3>
                  <p className="text-body-ui text-on-surface-variant m-0">
                    {course.nodeCount} lessons
                  </p>
                </div>
                {onNavigateToCourse && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onNavigateToCourse(course.rootDir)}
                    data-testid="view-course-btn"
                  >
                    View Course
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button variant="default" onClick={onBack} data-testid="back-to-catalog">
        Back to catalog
      </Button>
    </div>
  );
}
