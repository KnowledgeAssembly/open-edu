import type { Subscription } from 'rxjs';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { RewardAction, BadgeAction, WebhookAction, ScriptAction } from '@open-edu/schemas';
import type { RewardBrokerOptions, RewardResult } from './types';
import { BadgeTracker, handleBadgeAction, handleWebhookAction } from './handlers';
import { handleScriptAction } from './script-handler';
import { RewardConfigurationError } from './errors';

export class RewardBroker {
  private options: RewardBrokerOptions;
  private badgeTracker: BadgeTracker;
  private subscription: Subscription | null = null;
  private _results: RewardResult[] = [];

  constructor(options: RewardBrokerOptions) {
    this.options = options;
    this.badgeTracker = new BadgeTracker();
  }

  start(): void {
    this.subscription = this.options.source.subscribe({
      next: (event) => this.evaluateEvent(event),
    });
  }

  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  get isActive(): boolean {
    return this.subscription !== null;
  }

  get awardedBadges(): string[] {
    return this.badgeTracker.awardedBadges;
  }

  get results(): readonly RewardResult[] {
    return this._results;
  }

  reset(): void {
    this._results = [];
  }

  private evaluateEvent(event: TelemetryEvent): void {
    for (const trigger of this.options.rewards.triggers) {
      if (trigger.onEvent !== event.event) continue;
      for (const action of trigger.rewards) {
        this.executeAction(action, event);
      }
    }
  }

  private executeAction(action: RewardAction, event: TelemetryEvent): void {
    switch (action.action) {
      case 'badge.award':
        this._results.push(handleBadgeAction(action as BadgeAction, this.badgeTracker));
        break;
      case 'webhook':
        handleWebhookAction(action as WebhookAction, event).then((r) => this._results.push(r));
        break;
      case 'script': {
        if (!this.options.allowShellHooks) {
          this._results.push({
            success: false,
            action: 'script',
            detail: 'Script execution not allowed (set allowShellHooks: true)',
            error: new RewardConfigurationError('Script execution requires allowShellHooks: true'),
          });
          break;
        }
        handleScriptAction(action as ScriptAction).then((r) => this._results.push(r));
        break;
      }
    }
  }
}
