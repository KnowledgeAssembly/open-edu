export interface ReadingRulerProps {
  visible: boolean;
}

export function ReadingRuler({ visible }: ReadingRulerProps): JSX.Element | null {
  if (!visible) return null;
  return (
    <div
      className="fixed left-0 right-0 top-1/2 z-50 h-[1.5em] -translate-y-1/2 pointer-events-none bg-primary-container/20 border-t-2 border-b-2 border-primary/40"
      role="presentation"
      aria-hidden="true"
      data-testid="reading-ruler"
    />
  );
}
