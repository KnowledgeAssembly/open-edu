import type { Observable } from 'rxjs';
import type { TelemetryEvent } from '@open-edu/schemas';
import type {
  Rewards,
  RewardAction,
  BadgeAction,
  WebhookAction,
  ScriptAction,
} from '@open-edu/schemas';

export interface RewardResult {
  success: boolean;
  action: string;
  detail?: string;
  error?: Error;
}

export interface RewardBrokerOptions {
  rewards: Rewards;
  source: Observable<TelemetryEvent>;
  allowShellHooks?: boolean;
}

export interface RewardHandler<T> {
  execute(action: T, context?: TelemetryEvent): Promise<RewardResult>;
}

export type { Rewards, RewardAction, BadgeAction, WebhookAction, ScriptAction };
