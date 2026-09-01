const KEY = 'openedu.studio.devtools';

export type DevtoolsTab = 'telemetry' | 'logs' | 'rewards' | 'accessibility' | 'bundle';

export interface DevtoolsState {
  open: boolean;
  tab: DevtoolsTab;
}

const DEFAULT_STATE: DevtoolsState = { open: false, tab: 'telemetry' };

export function readDevtoolsState(): DevtoolsState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<DevtoolsState>;
    const tab = parsed.tab && isValidTab(parsed.tab) ? parsed.tab : DEFAULT_STATE.tab;
    return { open: parsed.open === true, tab };
  } catch {
    return DEFAULT_STATE;
  }
}

export function writeDevtoolsState(state: DevtoolsState): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable
  }
}

function isValidTab(tab: string): tab is DevtoolsTab {
  return ['telemetry', 'logs', 'rewards', 'accessibility', 'bundle'].includes(tab);
}
