import { useMemo, useEffect, useState, type ReactNode } from 'react';
import { Button } from '../primitives/button.js';

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
    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-md text-center">
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <p className="text-h2 font-display font-bold text-on-surface m-0 mt-1">{value}</p>
      <p className="text-body-ui text-on-surface-variant m-0">{label}</p>
    </div>
  );
}

function ConfettiParticles(): JSX.Element {
  const prefersReducedMotion = useMemo(() => {
    try {
      return typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
    } catch {
      return false;
    }
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: [
          'var(--oe-color-error, #dc2626)',
          'var(--oe-color-warning, #e7c365)',
          'var(--oe-color-success, #16a34a)',
          'var(--oe-color-info, #003eb3)',
          'var(--oe-color-primary, #6750a4)',
        ][i % 5],
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        size: 6 + Math.random() * 6,
      })),
    [],
  );

  if (prefersReducedMotion) return <></>;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
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
      className={`flex flex-col items-center justify-center min-h-full p-xl text-center font-body-md ${className ?? ''}`}
      data-testid="completion-screen"
    >
      {showConfetti && <ConfettiParticles />}

      <h1 className="text-[1.75rem] font-bold text-on-surface m-0 mb-2">You finished {title}!</h1>
      <p className="text-body-ui text-on-surface-variant m-0 mb-lg">
        Great work on completing this course.
      </p>

      {skillSummary && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-lg font-semibold text-on-surface m-0 mb-3">Skills achieved</h2>
          {skillSummary}
        </div>
      )}

      {badges && badges.length > 0 && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-lg font-semibold text-on-surface m-0 mb-3">Badges earned</h2>
          <div className="grid grid-cols-2 gap-md">
            {badges.map((badge) => (
              <div
                key={badge}
                className="bg-primary-container/30 border border-primary-container rounded-xl p-md text-center"
                data-testid={`badge-${badge}`}
              >
                <span className="text-3xl" aria-hidden="true">
                  🏆
                </span>
                <h3 className="font-semibold mt-sm text-on-surface text-sm">{badge}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasStats && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-lg font-semibold text-on-surface m-0 mb-3">Your progress</h2>
          <div className="grid grid-cols-2 gap-md">
            <StatCard icon="📝" value={displayStats.stepsCompleted} label="Steps completed" />
            <StatCard icon="✅" value={displayStats.quizzesAnswered} label="Quizzes answered" />
            <StatCard
              icon="✍️"
              value={displayStats.reflectionsWritten}
              label="Reflections written"
            />
            <StatCard icon="⏱️" value={displayStats.timeSpentMinutes} label="Minutes spent" />
          </div>
        </div>
      )}

      {recommendedCourses && recommendedCourses.length > 0 && (
        <div className="mb-6 w-full max-w-[400px]">
          <h2 className="text-lg font-semibold text-on-surface m-0 mb-3">You might also like</h2>
          <div className="flex flex-col gap-sm">
            {recommendedCourses.slice(0, 2).map((course) => (
              <div
                key={course.manifest.id}
                className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg p-md"
              >
                <div className="text-left">
                  <h3 className="font-semibold text-on-surface text-sm m-0">
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
