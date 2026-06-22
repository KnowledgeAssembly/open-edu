import { z } from 'zod';

const ConditionSchema = z.object({
  if: z.string().min(1).max(512),
  then: z.string().min(1).max(256),
});

const SimpleRouteSchema = z.object({
  onComplete: z.string().min(1).max(256),
  conditions: z.undefined().optional(),
});

const ConditionalRouteSchema = z.object({
  onComplete: z.undefined().optional(),
  conditions: z.array(ConditionSchema).min(1),
});

export const RouteDefinitionSchema = z.union([SimpleRouteSchema, ConditionalRouteSchema]);

export const WorkflowSchema = z.object({
  routing: z.record(RouteDefinitionSchema),
});

export type Condition = z.infer<typeof ConditionSchema>;
export type RouteDefinition = z.infer<typeof RouteDefinitionSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
