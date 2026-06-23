import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadgeTracker, handleBadgeAction, handleWebhookAction } from './handlers';
import type { BadgeAction, WebhookAction, TelemetryEvent } from '@open-edu/schemas';

describe('BadgeTracker', () => {
  let tracker: BadgeTracker;

  beforeEach(() => {
    tracker = new BadgeTracker();
  });

  it('should award a badge', () => {
    expect(tracker.award('expert')).toBe(true);
    expect(tracker.awardedBadges).toEqual(['expert']);
  });

  it('should not award the same badge twice', () => {
    tracker.award('expert');
    expect(tracker.award('expert')).toBe(false);
  });

  it('should check if badge has been awarded', () => {
    expect(tracker.hasBeenAwarded('expert')).toBe(false);
    tracker.award('expert');
    expect(tracker.hasBeenAwarded('expert')).toBe(true);
  });
});

describe('handleBadgeAction', () => {
  it('should award a badge successfully', async () => {
    const tracker = new BadgeTracker();
    const action: BadgeAction = { action: 'badge.award', badge: 'star-learner' };
    const result = await handleBadgeAction(action, tracker);
    expect(result.success).toBe(true);
    expect(result.detail).toContain('star-learner');
    expect(tracker.awardedBadges).toContain('star-learner');
  });

  it('should handle duplicate badge award', async () => {
    const tracker = new BadgeTracker();
    const action: BadgeAction = { action: 'badge.award', badge: 'star-learner' };
    tracker.award('star-learner');
    const result = await handleBadgeAction(action, tracker);
    expect(result.success).toBe(true);
    expect(result.detail).toContain('already awarded');
  });
});

describe('handleWebhookAction', () => {
  const event: TelemetryEvent = { event: 'node_open', nodeId: 'n1', timestamp: 1000 };

  it('should POST to the webhook URL successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    vi.stubGlobal('fetch', mockFetch);

    const action: WebhookAction = { action: 'webhook', url: 'https://example.com/hook' };
    const result = await handleWebhookAction(action, event);
    expect(result.success).toBe(true);
    expect(result.detail).toContain('200');
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  });

  it('should handle non-OK response', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
    vi.stubGlobal('fetch', mockFetch);

    const action: WebhookAction = { action: 'webhook', url: 'https://example.com/hook' };
    const result = await handleWebhookAction(action, event);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const action: WebhookAction = { action: 'webhook', url: 'https://example.com/hook' };
    const result = await handleWebhookAction(action, event);
    expect(result.success).toBe(false);
    expect(result.detail).toContain('Network error');
  });
});
