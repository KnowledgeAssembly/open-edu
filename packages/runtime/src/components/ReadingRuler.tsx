export interface ReadingRulerProps {
  visible: boolean;
}

export function ReadingRuler({ visible }: ReadingRulerProps): JSX.Element | null {
  if (!visible) return null;
  return (
    <div
      className="fixed left-0 right-0 top-1/2 z-50 h-[1.5em] -translate-y-1/2 pointer-events-none"
      style={{
        backgroundColor: 'rgba(255, 255, 150, 0.25)',
        borderTop: '2px solid rgba(255, 200, 0, 0.5)',
        borderBottom: '2px solid rgba(255, 200, 0, 0.5)',
      }}
      role="presentation"
      aria-hidden="true"
      data-testid="reading-ruler"
    />
  );
}
