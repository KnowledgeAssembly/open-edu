import { z } from 'zod';

export const RewardConditionSchema = z.lazy(
  (): z.ZodTypeAny =>
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('score'),
        nodeId: z.string().min(1).max(512),
        minScore: z.number().min(0),
      }),
      z.object({
        type: z.literal('skill'),
        skillId: z.string().min(1).max(128),
        minLevel: z.enum(['achieved', 'mastered']),
      }),
      z.object({
        type: z.literal('chain'),
        completedNodeIds: z.array(z.string().min(1).max(512)).min(1),
      }),
      z.object({ type: z.literal('and'), conditions: z.array(RewardConditionSchema).min(1) }),
      z.object({ type: z.literal('or'), conditions: z.array(RewardConditionSchema).min(1) }),
    ]),
);

export const BadgeActionSchema = z.object({
  action: z.literal('badge.award'),
  badge: z.string().min(1).max(256),
  condition: RewardConditionSchema.optional(),
});

export const WebhookActionSchema = z.object({
  action: z.literal('webhook'),
  url: z.string().min(1).url().max(2048),
  condition: RewardConditionSchema.optional(),
});

export const ScriptActionSchema = z.object({
  action: z.literal('script'),
  exec: z.string().min(1).max(4096),
  condition: RewardConditionSchema.optional(),
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

export type RewardCondition = z.infer<typeof RewardConditionSchema>;
export type BadgeAction = z.infer<typeof BadgeActionSchema>;
export type WebhookAction = z.infer<typeof WebhookActionSchema>;
export type ScriptAction = z.infer<typeof ScriptActionSchema>;
export type RewardAction = z.infer<typeof RewardActionSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type Rewards = z.infer<typeof RewardsSchema>;
