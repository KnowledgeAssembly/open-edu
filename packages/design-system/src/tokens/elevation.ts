export interface ElevationToken {
  boxShadow: string;
}

export const elevationScale: Record<string, ElevationToken> = {
  flat: { boxShadow: 'none' },
  raised: { boxShadow: '0 1px 2px rgba(31,28,24,0.08)' },
  overlay: { boxShadow: '0 4px 12px rgba(31,28,24,0.10)' },
  modal: { boxShadow: '0 8px 24px rgba(31,28,24,0.14)' },
  sticky: { boxShadow: '0 2px 6px rgba(31,28,24,0.08)' },
};
