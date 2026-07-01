export const motionTokens = {
  durationFast: '100ms',
  durationNormal: '200ms',
  durationSlow: '300ms',
  easingEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingEaseOut: 'cubic-bezier(0, 0, 0.15, 1)',
  easingEaseIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const motionSafe = (animations: string) => `
@media (prefers-reduced-motion: no-preference) {
  ${animations}
}
`;
