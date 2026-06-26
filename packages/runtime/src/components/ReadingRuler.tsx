import { type CSSProperties } from 'react';

export interface ReadingRulerProps {
  visible: boolean;
}

const rulerStyle: CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: 0,
  right: 0,
  height: '1.5em',
  backgroundColor: 'rgba(255, 255, 150, 0.25)',
  borderTop: '2px solid rgba(255, 200, 0, 0.5)',
  borderBottom: '2px solid rgba(255, 200, 0, 0.5)',
  pointerEvents: 'none',
  zIndex: 9998,
  transform: 'translateY(-50%)',
};

export function ReadingRuler({ visible }: ReadingRulerProps): JSX.Element | null {
  if (!visible) return null;
  return (
    <div style={rulerStyle} role="presentation" aria-hidden="true" data-testid="reading-ruler" />
  );
}
