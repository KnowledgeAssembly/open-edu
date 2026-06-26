export interface PlaceholderRendererProps {
  nodeType: string;
  reason?: string;
}

export function PlaceholderRenderer({ nodeType, reason }: PlaceholderRendererProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="placeholder-renderer"
      className="border border-dashed border-outline-variant rounded-lg p-[calc(var(--oe-space-md)*1.5)] text-on-surface-variant bg-outline-variant/30"
    >
      <p className="font-semibold mt-0">
        Unsupported node type: <code>{nodeType}</code>
      </p>
      <p className="mb-0">
        {reason ?? 'This node type is not yet supported by the runtime renderer.'}
      </p>
    </div>
  );
}
