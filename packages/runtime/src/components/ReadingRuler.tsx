export interface ReadingRulerProps {
  visible: boolean;
}

export function ReadingRuler({ visible }: ReadingRulerProps): JSX.Element | null {
  if (!visible) return null;
  return (
    <div
      className="bg-primary-container/20 border-primary/40 pointer-events-none fixed inset-x-0 top-1/2 z-50 h-[1.5em] -translate-y-1/2 border-y-2"
      role="presentation"
      aria-hidden="true"
      data-testid="reading-ruler"
    />
  );
}
