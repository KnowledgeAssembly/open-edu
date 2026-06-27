export const WIDGETS_VERSION = '0.1.0';

export type {
  WidgetRenderProps,
  WidgetDefinition,
  WidgetRegistry,
  RemoteWidgetManifest,
  RemoteWidgetRegistration,
} from './types';
export { WidgetRegistrationError } from './types';
export { createWidgetRegistry, registerAllBuiltins, createDefaultRegistry } from './registry';
export { RemoteWidgetLoader } from './remote-loader';
export type { RemoteWidgetLoadResult, EvaluateModule } from './remote-loader';
export { useRemoteWidget } from './use-remote-widget';
export type { UseRemoteWidgetResult } from './use-remote-widget';
export { ThemedButton } from './themed-button';
export type { ThemedButtonProps } from './themed-button';
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
} from './builtins';
