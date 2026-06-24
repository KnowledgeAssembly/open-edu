export const WIDGETS_VERSION = '0.1.0';

export type { WidgetRenderProps, WidgetDefinition, WidgetRegistry } from './types';
export { WidgetRegistrationError } from './types';
export { createWidgetRegistry } from './registry';
export { multipleChoicePractice } from './builtins';
export { validateWidgetPackage } from './cli-utils';
export type { WidgetPackageValidation } from './cli-utils';
