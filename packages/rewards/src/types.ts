import type { Observable } from 'rxjs';
import type { TelemetryEvent, RewardCondition } from '@open-edu/schemas';
import type {
  Rewards,
  RewardAction,
  BadgeAction,
  WebhookAction,
  ScriptAction,
} from '@open-edu/schemas';

export type ReceiptStatus = 'delivered' | 'failed' | 'skipped';

export interface RewardReceipt {
  actionId: string;
  actionType: string;
  dispatchedAt: number;
  status: ReceiptStatus;
  detail?: string;
  error?: string;
}

export interface RewardResult {
  success: boolean;
  action: string;
  detail?: string;
  error?: Error;
}

export interface ContextSnapshot {
  scores: Record<string, number>;
  skills: Record<string, 'achieved' | 'mastered'>;
  completedNodes: string[];
}

export interface RewardBrokerOptions {
  rewards: Rewards;
  source: Observable<TelemetryEvent>;
  allowShellHooks?: boolean;
  context?: ContextSnapshot;
}

export interface RewardHandler<T> {
  execute(action: T, context?: TelemetryEvent): Promise<RewardResult>;
}

export type { Rewards, RewardAction, BadgeAction, WebhookAction, ScriptAction, RewardCondition };
