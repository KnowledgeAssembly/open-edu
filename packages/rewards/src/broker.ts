import { randomUUID } from 'node:crypto';
import type { Subscription } from 'rxjs';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { RewardAction, BadgeAction, WebhookAction, ScriptAction } from '@open-edu/schemas';
import type { RewardBrokerOptions, RewardReceipt, RewardResult, ContextSnapshot } from './types';
import { BadgeTracker, handleBadgeAction, handleWebhookAction } from './handlers';
import { handleScriptAction } from './script-handler';
import { RewardConfigurationError } from './errors';
import { shouldFireAction, getDefaultContext } from './conditions';

export class RewardBroker {
  private options: RewardBrokerOptions;
  private badgeTracker: BadgeTracker;
  private subscription: Subscription | null = null;
  private _receipts: RewardReceipt[] = [];
  private _context: ContextSnapshot;

  constructor(options: RewardBrokerOptions) {
    this.options = options;
    this.badgeTracker = new BadgeTracker();
    this._context = options.context ?? getDefaultContext();
  }

  start(): void {
    if (this.isActive) return;
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

  get receipts(): readonly RewardReceipt[] {
    return this._receipts;
  }

  get results(): readonly RewardReceipt[] {
    return this._receipts;
  }

  get context(): ContextSnapshot {
    return { ...this._context };
  }

  updateContext(context: Partial<ContextSnapshot>): void {
    this._context = {
      scores: { ...this._context.scores, ...context.scores },
      skills: { ...this._context.skills, ...context.skills },
      completedNodes: [
        ...new Set([...this._context.completedNodes, ...(context.completedNodes ?? [])]),
      ],
    };
  }

  reset(): void {
    this._receipts = [];
  }

  private generateActionId(): string {
    return `reward-${randomUUID()}`;
  }

  private toReceipt(result: RewardResult, actionType: string): RewardReceipt {
    const now = Date.now();
    return {
      actionId: this.generateActionId(),
      actionType,
      dispatchedAt: now,
      status: result.success ? 'delivered' : 'failed',
      detail: result.detail,
      error: result.error?.message,
    };
  }

  private evaluateEvent(event: TelemetryEvent): void {
    for (const trigger of this.options.rewards.triggers) {
      if (trigger.onEvent !== event.event) continue;
      for (const action of trigger.rewards) {
        if (!shouldFireAction(action, this._context)) {
          this._receipts.push({
            actionId: this.generateActionId(),
            actionType: action.action,
            dispatchedAt: Date.now(),
            status: 'skipped',
            detail: `Condition not met for ${action.action}`,
          });
          continue;
        }
        this.executeAction(action, event);
      }
    }
  }

  private executeAction(action: RewardAction, event: TelemetryEvent): void {
    switch (action.action) {
      case 'badge.award':
        this._receipts.push(
          this.toReceipt(
            handleBadgeAction(action as BadgeAction, this.badgeTracker),
            action.action,
          ),
        );
        break;
      case 'webhook':
        handleWebhookAction(action as WebhookAction, event).then((r) =>
          this._receipts.push(this.toReceipt(r, action.action)),
        );
        break;
      case 'script': {
        if (!this.options.allowShellHooks) {
          this._receipts.push({
            actionId: this.generateActionId(),
            actionType: action.action,
            dispatchedAt: Date.now(),
            status: 'failed',
            detail: 'Script execution not allowed (set allowShellHooks: true)',
            error: new RewardConfigurationError('Script execution requires allowShellHooks: true')
              .message,
          });
          break;
        }
        handleScriptAction(action as ScriptAction).then((r) =>
          this._receipts.push(this.toReceipt(r, action.action)),
        );
        break;
      }
    }
  }
}
