export type StudioMode = 'creator' | 'developer';

export type StudioView = 'home' | 'outline' | 'edit-activity' | 'preview' | 'share' | 'ai-review';

export type ActivityKind = 'lesson' | 'quiz' | 'practice' | 'other';

export interface ActivitySummary {
  id: string;
  path: string;
  title: string;
  kind: ActivityKind;
}

export interface ReadyCheckItem {
  id: string;
  labelKey: string; // studio.* i18n key
  passed: boolean;
  detail?: string;
}

export interface TemplateMeta {
  id: string;
  titleKey: string;
  descriptionKey: string;
  /** Relative files written into a new/overwrite package dir */
  files: Record<string, string>;
}
