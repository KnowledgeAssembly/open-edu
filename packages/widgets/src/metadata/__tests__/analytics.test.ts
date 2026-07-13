import { describe, it, expect } from 'vitest';
import type { AnalyticsMetadata } from '../analytics';

describe('AnalyticsMetadata', () => {
  it('has all analytics fields as optional booleans', () => {
    const analytics: AnalyticsMetadata = {};
    expect(analytics.trackAttempts).toBeUndefined();
    expect(analytics.trackHints).toBeUndefined();
    expect(analytics.trackRetries).toBeUndefined();
    expect(analytics.trackMistakes).toBeUndefined();
    expect(analytics.trackCompletionTime).toBeUndefined();
    expect(analytics.trackSuccessRate).toBeUndefined();
    expect(analytics.trackConfidence).toBeUndefined();
    expect(analytics.trackInteractions).toBeUndefined();
  });

  it('allows partial analytics declarations', () => {
    const analytics: AnalyticsMetadata = {
      trackAttempts: true,
      trackCompletionTime: true,
      trackSuccessRate: true,
    };
    expect(analytics.trackAttempts).toBe(true);
    expect(analytics.trackHints).toBeUndefined();
  });
});