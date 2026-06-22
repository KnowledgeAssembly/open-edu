import type { CSSProperties } from 'react';

export interface PlaceholderRendererProps {
  nodeType: string;
  reason?: string;
}

export function PlaceholderRenderer({ nodeType, reason }: PlaceholderRendererProps): JSX.Element {
  const style: CSSProperties = {
    border: `1px dashed var(--oe-color-border, #e5e7eb)`,
    borderRadius: 'var(--oe-radius, 8px)',
    padding: 'calc(var(--oe-spacing, 1rem) * 1.5)',
    color: 'var(--oe-color-muted, #6b7280)',
    backgroundColor: 'color-mix(in srgb, var(--oe-color-border, #e5e7eb) 30%, transparent)',
  };

  return (
    <div role="status" aria-live="polite" data-testid="placeholder-renderer" style={style}>
      <p style={{ fontWeight: 600, marginTop: 0 }}>
        Unsupported node type: <code>{nodeType}</code>
      </p>
      <p style={{ marginBottom: 0 }}>
        {reason ?? 'This node type is not yet supported by the runtime renderer.'}
      </p>
    </div>
  );
}
