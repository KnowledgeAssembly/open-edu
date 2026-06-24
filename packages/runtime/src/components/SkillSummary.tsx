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
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '4px' : '8px',
        padding: compact ? '4px 8px' : '8px 12px',
        fontSize: compact ? '12px' : '14px',
      }}
    >
      {skillGraph.skills.map((skill) => {
        const score = skillScores[skill.id] ?? 0;
        const mastery = score >= 90 ? 'mastered' : score >= 75 ? 'achieved' : score >= 50 ? 'in_progress' : 'not_attempted';
        return (
          <div
            key={skill.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                width: compact ? '6px' : '8px',
                height: compact ? '6px' : '8px',
                borderRadius: '50%',
                backgroundColor: getMasteryColor(mastery),
                flexShrink: 0,
              }}
              data-testid={`skill-dot-${skill.id}`}
            />
            <span style={{ fontWeight: 500 }}>
              {skill.name}
            </span>
            {!compact && (
              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                {score}% &middot; {getMasteryLabel(mastery)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
