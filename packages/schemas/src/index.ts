export { PackageManifestSchema, SkillsSchema } from './manifest.js';
export type { PackageManifest } from './manifest.js';

export {
  ContentNodeSchema,
  LessonNodeSchema,
  QuizNodeSchema,
  ReflectionNodeSchema,
  ExerciseNodeSchema,
  WidgetNodeSchema,
  NodeTypeSchema,
} from './nodes.js';
export type {
  ContentNode,
  LessonNode,
  QuizNode,
  ReflectionNode,
  ExerciseNode,
  WidgetNode,
  NodeType,
} from './nodes.js';

export { WorkflowSchema, RouteDefinitionSchema } from './workflow.js';
export type { Workflow, RouteDefinition, Condition } from './workflow.js';

export { ProgressSnapshotSchema } from './progress.js';
export type { ProgressSnapshot } from './progress.js';

export {
  RewardsSchema,
  TriggerSchema,
  RewardActionSchema,
  BadgeActionSchema,
  WebhookActionSchema,
  ScriptActionSchema,
  RewardConditionSchema,
} from './rewards.js';
export type {
  Rewards,
  Trigger,
  RewardAction,
  BadgeAction,
  WebhookAction,
  ScriptAction,
  RewardCondition,
} from './rewards.js';

export {
  TelemetryEventSchema,
  NodeOpenEventSchema,
  NodeCompleteEventSchema,
  QuizAnsweredEventSchema,
  HintTriggeredEventSchema,
  WidgetInteractionEventSchema,
  RouteTriggeredEventSchema,
  TelemetryEventEnum,
} from './telemetry.js';
export type {
  TelemetryEvent,
  NodeOpenEvent,
  NodeCompleteEvent,
  QuizAnsweredEvent,
  HintTriggeredEvent,
  WidgetInteractionEvent,
  RouteTriggeredEvent,
} from './telemetry.js';

export const SCHEMAS_VERSION = '0.1.0';

export { toJsonSchema } from './json-schema.js';
