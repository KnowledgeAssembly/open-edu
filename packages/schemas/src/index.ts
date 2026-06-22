export { PackageManifestSchema, SkillsSchema } from './manifest';
export type { PackageManifest } from './manifest';

export {
  ContentNodeSchema,
  LessonNodeSchema,
  QuizNodeSchema,
  ReflectionNodeSchema,
  ExerciseNodeSchema,
  WidgetNodeSchema,
  NodeTypeSchema,
} from './nodes';
export type {
  ContentNode,
  LessonNode,
  QuizNode,
  ReflectionNode,
  ExerciseNode,
  WidgetNode,
  NodeType,
} from './nodes';

export { WorkflowSchema, RouteDefinitionSchema } from './workflow';
export type { Workflow, RouteDefinition, Condition } from './workflow';

export {
  RewardsSchema,
  TriggerSchema,
  RewardActionSchema,
  BadgeActionSchema,
  WebhookActionSchema,
  ScriptActionSchema,
} from './rewards';
export type {
  Rewards,
  Trigger,
  RewardAction,
  BadgeAction,
  WebhookAction,
  ScriptAction,
} from './rewards';

export {
  TelemetryEventSchema,
  NodeOpenEventSchema,
  NodeCompleteEventSchema,
  QuizAnsweredEventSchema,
  HintTriggeredEventSchema,
  WidgetInteractionEventSchema,
  RouteTriggeredEventSchema,
  TelemetryEventEnum,
} from './telemetry';
export type {
  TelemetryEvent,
  NodeOpenEvent,
  NodeCompleteEvent,
  QuizAnsweredEvent,
  HintTriggeredEvent,
  WidgetInteractionEvent,
  RouteTriggeredEvent,
} from './telemetry';

export const SCHEMAS_VERSION = '0.1.0';

export { toJsonSchema } from './json-schema';
