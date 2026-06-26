import { type CSSProperties, type ReactNode } from 'react';

export interface AICalloutProps {
  icon?: string;
  title: string;
  children: ReactNode;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: 'var(--oe-space-md, 24px)',
  backgroundColor: 'var(--oe-color-tertiary-container, #ffd8e4)',
  border: '1px solid var(--oe-color-tertiary-container, #ffd8e4)',
  borderRadius: 'var(--oe-radius-lg, 12px)',
  fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
};

const iconStyle: CSSProperties = {
  flexShrink: 0,
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.25rem',
  color: 'var(--oe-color-on-tertiary-container, #31111d)',
};

const contentStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 600,
  margin: '0 0 4px',
  color: 'var(--oe-color-on-tertiary-container, #31111d)',
  lineHeight: 1.3,
};

const bodyStyle: CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--oe-color-on-tertiary-container, #31111d)',
  lineHeight: 1.5,
  margin: 0,
};

export function AICallout({ icon, title, children }: AICalloutProps): JSX.Element {
  return (
    <div style={containerStyle} data-testid="ai-callout" role="complementary" aria-label={title}>
      {icon && (
        <span style={iconStyle} aria-hidden="true">
          {icon}
        </span>
      )}
      <div style={contentStyle}>
        <h2 style={titleStyle}>{title}</h2>
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>
  );
}
