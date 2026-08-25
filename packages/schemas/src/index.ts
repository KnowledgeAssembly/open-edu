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
  WidgetManifestSchema,
  WidgetCapabilitySchema,
  PROTOCOL_API_VERSION,
} from './community-widget-manifest.js';
export type { WidgetManifest, WidgetCapability } from './community-widget-manifest.js';

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
  OEP_BUNDLE_CONTENT_ROOT,
} from './distribution-manifest.js';
export type {
  DistributionManifest,
  DistributionChecksum,
  SignatureStatus,
} from './distribution-manifest.js';

export { CatalogSchema, CatalogPackageEntrySchema, CatalogVersionEntrySchema } from './catalog.js';
export type { Catalog, CatalogPackageEntry, CatalogVersionEntry } from './catalog.js';
export type { BundleManifest, BundleModuleRef } from './bundle.js';

export { RegistryMetadataSchema } from './registry.js';
export type { RegistryMetadata } from './registry.js';

export {
  WidgetPolicySchema,
  DEFAULT_WIDGET_POLICY,
  TrustTierSchema,
  isTrustTierEnabled,
} from './widget-policy.js';
export type { WidgetPolicy, TrustTier } from './widget-policy.js';

export {
  TelemetryEventSchema,
  NodeOpenEventSchema,
  NodeCompleteEventSchema,
  QuizAnsweredEventSchema,
  HintTriggeredEventSchema,
  WidgetInteractionEventSchema,
  RouteTriggeredEventSchema,
  ModuleCompleteEventSchema,
  BundleCompleteEventSchema,
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
  ModuleCompleteEvent,
  BundleCompleteEvent,
} from './telemetry.js';

export {
  CardTypeSchema,
  CardDifficultySchema,
  CardDefinitionSchema,
  CardDefinitionsSchema,
} from './cards.js';
export type { CardType, CardDifficulty, CardDefinition, CardDefinitions } from './cards.js';

export {
  AnimationBackendEnum,
  AnimationEffectEnum,
  AnimationTriggerEnum,
  AnimationReducedMotionEnum,
  AnimationEffectConfigSchema,
  AnimationConfigSchema,
} from './animation.js';
export type {
  AnimationBackend,
  AnimationEffect,
  AnimationTrigger,
  AnimationReducedMotion,
  AnimationEffectConfig,
  AnimationConfig,
  AnimationConfigInput,
  AnimationEffectConfigInput,
} from './animation.js';

export const SCHEMAS_VERSION = '0.1.0';

export { LocalizedSchema, localizedField, isLocalized, extractLocalized } from './localized.js';
export type { Localized } from './localized.js';

export { toJsonSchema, toJsonSchemaDraft7 } from './json-schema.js';
