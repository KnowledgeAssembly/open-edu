import type { StudioView } from './types.js';

const VIEW_KEY = 'openedu.studio.view';
const PATH_KEY = 'openedu.studio.selectedPath';

const VALID_VIEWS: StudioView[] = [
  'home',
  'outline',
  'edit-activity',
  'preview',
  'share',
  'ai-review',
  'library',
  'unit-builder',
];

export function readStudioView(): StudioView {
  try {
    const value = sessionStorage.getItem(VIEW_KEY);
    return value && (VALID_VIEWS as string[]).includes(value) ? (value as StudioView) : 'home';
  } catch {
    return 'home';
  }
}

export function writeStudioView(view: StudioView): void {
  try {
    sessionStorage.setItem(VIEW_KEY, view);
  } catch {
    // storage unavailable
  }
}

export function readSelectedPath(): string | null {
  try {
    return sessionStorage.getItem(PATH_KEY);
  } catch {
    return null;
  }
}

export function writeSelectedPath(path: string): void {
  try {
    sessionStorage.setItem(PATH_KEY, path);
  } catch {
    // storage unavailable
  }
}
