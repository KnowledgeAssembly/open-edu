import { type CSSProperties } from 'react';
import { ProgressBadge } from './ProgressBadge.js';
import type { PackageManifest, ProgressSnapshot } from '@open-edu/schemas';

export interface CourseCardProps {
  manifest: PackageManifest;
  nodeCount: number;
  badgeCount: number;
  earnedBadgeCount: number;
  progress: ProgressSnapshot | null;
  onStart: (packageDir: string) => void;
}

export function CourseCard({
  manifest,
  nodeCount,
  badgeCount,
  earnedBadgeCount,
  progress,
  onStart,
}: CourseCardProps): JSX.Element {
  const percentComplete = progress
    ? Math.round((progress.visitedNodes.length / Math.max(nodeCount, 1)) * 100)
    : 0;
  const isCompleted = progress?.isCompleted ?? false;

  const cardStyle: CSSProperties = {
    border: `1px solid var(--oe-color-border, #e5e7eb)`,
    borderRadius: '8px',
    padding: '1rem',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
  };

  const titleStyle: CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: '0 0 0.25rem',
  };

  const authorStyle: CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--oe-color-muted, #6b7280)',
    margin: '0 0 0.75rem',
  };

  const metaStyle: CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--oe-color-muted, #6b7280)',
    margin: 0,
  };

  const buttonBase: CSSProperties = {
    border: 'none',
    borderRadius: 'var(--oe-radius, 8px)',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: isCompleted ? 'default' : 'pointer',
    marginTop: '0.75rem',
  };

  let buttonStyle: CSSProperties;
  let buttonLabel: string;
  let disabled = false;

  if (progress === null) {
    buttonStyle = {
      ...buttonBase,
      backgroundColor: 'var(--oe-color-primary, #2563eb)',
      color: '#ffffff',
    };
    buttonLabel = 'Start';
  } else if (isCompleted) {
    buttonStyle = {
      ...buttonBase,
      backgroundColor: 'var(--oe-color-success, #16a34a)',
      color: '#ffffff',
      opacity: 0.7,
    };
    buttonLabel = 'Completed';
    disabled = true;
  } else {
    buttonStyle = { ...buttonBase, backgroundColor: '#d97706', color: '#ffffff' };
    buttonLabel = 'Continue';
  }

  return (
    <article style={cardStyle} data-testid="course-card">
      <h2 style={titleStyle}>{manifest.title}</h2>
      <p style={authorStyle}>{manifest.author}</p>
      <p style={metaStyle}>{nodeCount} lessons</p>
      {badgeCount > 0 && (
        <p style={metaStyle}>
          {earnedBadgeCount > 0
            ? `${earnedBadgeCount} earned / ${badgeCount}`
            : `${badgeCount} badges available`}
        </p>
      )}
      <div style={{ marginTop: '0.5rem' }}>
        <ProgressBadge percentComplete={percentComplete} isCompleted={isCompleted} />
      </div>
      <button
        type="button"
        style={buttonStyle}
        disabled={disabled}
        aria-label={`${buttonLabel} ${manifest.title}`}
        onClick={() => onStart(manifest.entry)}
      >
        {buttonLabel}
      </button>
    </article>
  );
}
