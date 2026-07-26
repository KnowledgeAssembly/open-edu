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

export {
  ProgressSnapshotSchema,
  ModuleProgressSnapshotSchema,
  BundleProgressSnapshotSchema,
  QuizAnswerSchema,
  ReflectionAnswerSchema,
  WidgetAnswerSchema,
  NodeAnswerSchema,
} from './progress.js';
export type {
  ProgressSnapshot,
  ModuleProgressSnapshot,
  BundleProgressSnapshot,
  QuizAnswer,
  ReflectionAnswer,
  WidgetAnswer,
  NodeAnswer,
} from './progress.js';

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

export { RemoteWidgetManifestSchema } from './widget-manifest.js';
export type { RemoteWidgetManifest } from './widget-manifest.js';

export {
  SkillGraphSchema,
  SkillDefinitionSchema,
  SkillAssessmentSchema,
  MasteryLevelSchema,
  validateSkillGraph,
} from './skills.js';
export type {
  SkillGraph,
  SkillDefinition,
  SkillAssessment,
  MasteryLevel,
  ValidationResult,
} from './skills.js';

export { BundleManifestSchema, BundleModuleRefSchema } from './bundle.js';

export {
  DistributionManifestSchema,
  ChecksumSchema,
  SignatureStatusSchema,
  OEP_FORMAT,
  OEP_FORMAT_VERSION,
} from './distribution-manifest.js';
export type {
  DistributionManifest,
  DistributionChecksum,
  SignatureStatus,
} from './distribution-manifest.js';

export { CatalogSchema, CatalogPackageEntrySchema, CatalogVersionEntrySchema } from './catalog.js';
export type { Catalog, CatalogPackageEntry, CatalogVersionEntry } from './catalog.js';
export type { BundleManifest, BundleModuleRef } from './bundle.js';

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

export {
  CardTypeSchema,
  CardDifficultySchema,
  CardDefinitionSchema,
  CardDefinitionsSchema,
} from './cards.js';
export type { CardType, CardDifficulty, CardDefinition, CardDefinitions } from './cards.js';

export const SCHEMAS_VERSION = '0.1.0';

export { LocalizedSchema, localizedField, isLocalized, extractLocalized } from './localized.js';
export type { Localized } from './localized.js';

export { toJsonSchema } from './json-schema.js';
