import { type CSSProperties } from 'react';
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

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    padding: '2rem',
    textAlign: 'center',
    fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
  };

  const headingStyle: CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--oe-color-fg, #1a1a1a)',
    margin: '0 0 1.5rem',
  };

  const sectionStyle: CSSProperties = {
    marginBottom: '1.5rem',
    width: '100%',
    maxWidth: '400px',
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--oe-color-fg, #1a1a1a)',
    margin: '0 0 0.75rem',
  };

  const badgeListStyle: CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  };

  const badgeItemStyle: CSSProperties = {
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--oe-color-muted, #f3f4f6)',
    borderRadius: 'var(--oe-radius, 8px)',
    fontSize: '0.875rem',
  };

  const backButtonStyle: CSSProperties = {
    backgroundColor: 'var(--oe-color-primary, #2563eb)',
    color: 'var(--oe-color-primary-fg, #ffffff)',
    border: 'none',
    borderRadius: 'var(--oe-radius, 8px)',
    padding: '0.625rem 1.25rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div className={className} style={containerStyle} data-testid="completion-screen">
      <h1 style={headingStyle}>You finished {title}!</h1>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Skills achieved</h2>
        <SkillSummary />
      </div>

      {badges && badges.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Badges earned</h2>
          <ul style={badgeListStyle}>
            {badges.map((badge) => (
              <li key={badge} style={badgeItemStyle} data-testid={`badge-${badge}`}>
                {badge}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={onBack} style={backButtonStyle} data-testid="back-to-catalog">
        Back to catalog
      </button>
    </div>
  );
}
