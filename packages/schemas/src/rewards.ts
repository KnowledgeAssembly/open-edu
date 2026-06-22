import { z } from 'zod';

export const BadgeActionSchema = z.object({
  action: z.literal('badge.award'),
  badge: z.string().min(1).max(256),
});

export const WebhookActionSchema = z.object({
  action: z.literal('webhook'),
  url: z.string().url().max(2048),
});

export const ScriptActionSchema = z.object({
  action: z.literal('script'),
  exec: z.string().min(1).max(4096),
});

export const RewardActionSchema = z.discriminatedUnion('action', [
  BadgeActionSchema,
  WebhookActionSchema,
  ScriptActionSchema,
]);

export const TriggerSchema = z.object({
  onEvent: z.string().min(1).max(256),
  rewards: z.array(RewardActionSchema).min(1),
});

export const RewardsSchema = z.object({
  triggers: z.array(TriggerSchema).min(1),
});

export type BadgeAction = z.infer<typeof BadgeActionSchema>;
export type WebhookAction = z.infer<typeof WebhookActionSchema>;
export type ScriptAction = z.infer<typeof ScriptActionSchema>;
export type RewardAction = z.infer<typeof RewardActionSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type Rewards = z.infer<typeof RewardsSchema>;
