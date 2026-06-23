import type { BadgeAction, WebhookAction, TelemetryEvent } from '@open-edu/schemas';
import type { RewardResult } from './types';
import { RewardExecutionError } from './errors';

export class BadgeTracker {
  private awarded: Set<string> = new Set();

  award(badge: string): boolean {
    if (this.awarded.has(badge)) return false;
    this.awarded.add(badge);
    return true;
  }

  get awardedBadges(): string[] {
    return Array.from(this.awarded);
  }

  hasBeenAwarded(badge: string): boolean {
    return this.awarded.has(badge);
  }
}

export function handleBadgeAction(action: BadgeAction, tracker: BadgeTracker): RewardResult {
  const awarded = tracker.award(action.badge);
  if (awarded) {
    return { success: true, action: 'badge.award', detail: `Badge "${action.badge}" awarded` };
  }
  return {
    success: true,
    action: 'badge.award',
    detail: `Badge "${action.badge}" already awarded`,
  };
}

export async function handleWebhookAction(
  action: WebhookAction,
  event: TelemetryEvent,
): Promise<RewardResult> {
  try {
    const response = await fetch(action.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      throw new RewardExecutionError(
        `Webhook returned status ${response.status}: ${response.statusText}`,
      );
    }
    return { success: true, action: 'webhook', detail: `POST ${action.url} → ${response.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      action: 'webhook',
      detail: `Webhook failed: ${message}`,
      error: err instanceof Error ? err : new Error(message),
    };
  }
}
