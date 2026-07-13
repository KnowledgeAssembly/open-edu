export const WIDGETS_VERSION = '0.2.0';

export type {
  WidgetRenderProps,
  WidgetDefinition,
  WidgetDefinitionV2,
  WidgetRegistry,
  WidgetSearchFilters,
  RemoteWidgetManifest,
  RemoteWidgetRegistration,
} from './types';
export { WidgetRegistrationError } from './types';
export { createWidgetRegistry, registerAllBuiltins, createDefaultRegistry } from './registry';
export { RemoteWidgetLoader } from './remote-loader';
export type { RemoteWidgetLoadResult, EvaluateModule } from './remote-loader';
export { useRemoteWidget } from './use-remote-widget';
export type { UseRemoteWidgetResult } from './use-remote-widget';
export { Button } from '@open-edu/design-system';
export type { ButtonProps } from '@open-edu/design-system';
export { useObserveMode } from './use-observe-mode';
export type { ObserveModeOptions } from './use-observe-mode';
export {
  multipleChoicePractice,
  multipleChoice,
  visualCounting,
  matching,
  dragDrop,
  sequencing,
  fillBlank,
  storyQuestion,
  realWorld,
  fractionVisual,
  chartReader,
  gridArea,
  placeValueChart,
  measurementScale,
  clockTime,
  callout,
  imageCompare,
  hotspot,
  timeline,
  labelDiagram,
  imageLabel,
} from './builtins';

export {
  WidgetDomain,
  WIDGET_ALIAS_MAP,
  resolveWidgetId,
  migrateWidgetId,
  getDomainPrefix,
} from './domains';

export {
  LearningIntent,
  WIDGET_LEARNING_INTENTS,
  getLearningIntentsForWidget,
  getWidgetsByLearningIntent,
} from './metadata/learning-intents';

export type {
  WidgetCapabilities,
  AccessibilityMetadata,
  AnalyticsMetadata,
  RewardMetadata,
  AIMetadata,
  BloomsLevel,
  CognitiveLoad,
  DifficultyLevel,
} from './metadata';
