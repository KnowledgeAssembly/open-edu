export interface ElevationToken {
  boxShadow: string;
}

export const elevationScale: Record<string, ElevationToken> = {
  flat: { boxShadow: 'none' },
  raised: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  overlay: { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
  modal: { boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  sticky: { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
};
