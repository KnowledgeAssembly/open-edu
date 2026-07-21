import { cn } from '@open-edu/design-system';
import { useRuntime } from '../context/RuntimeContext';
import { getMasteryLabel, getMasteryColor } from '../context/skills';

export interface SkillSummaryProps {
  compact?: boolean;
}

export function SkillSummary({ compact = false }: SkillSummaryProps): JSX.Element | null {
  const { skillGraph, skillScores } = useRuntime();

  if (!skillGraph || skillGraph.skills.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Skill mastery summary"
      data-testid="skill-summary"
      className={cn(
        'flex flex-col',
        compact ? 'text-caption gap-1 px-2 py-1' : 'text-body-ui gap-2 px-3 py-2',
      )}
    >
      {skillGraph.skills.map((skill) => {
        const score = skillScores[skill.id] ?? 0;
        const mastery =
          score >= 90
            ? 'mastered'
            : score >= 75
              ? 'achieved'
              : score >= 50
                ? 'in_progress'
                : 'not_attempted';
        return (
          <div key={skill.id} className="flex items-center gap-2">
            <span
              className="shrink-0 rounded-full"
              style={{
                width: compact ? '6px' : '8px',
                height: compact ? '6px' : '8px',
                backgroundColor: getMasteryColor(mastery),
              }}
              data-testid={`skill-dot-${skill.id}`}
            />
            <span className="font-medium">{skill.name}</span>
            {!compact && (
              <span className="text-on-surface-variant text-caption">
                {score}% &middot; {getMasteryLabel(mastery)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
