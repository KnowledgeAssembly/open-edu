import { createContext, useContext, useState, useCallback } from 'react';
import type { StudioContextSnapshot } from './context';
import type { AiQualityItem, DraftItem } from './types';
import type { SuggestionChip } from './suggestions';
import {
  getAssistantPanelOpen,
  setAssistantPanelOpen,
  getAssistantPanelWidth,
  setAssistantPanelWidth,
} from './assistantStorage';
import { isAssistantEnabled } from './assistantFlags';

export type DraftApplyMode = 'file' | 'buffer';

export interface PendingDraft {
  items: DraftItem[];
  source: 'intent' | 'chat' | 'outline';
  applyMode: DraftApplyMode;
  context: {
    kind?: 'lesson' | 'quiz' | 'practice';
    path?: string;
  };
}

export interface SpecAttachPreset {
  name: string;
  content: string;
  ext: '.json' | '.md';
}

interface StudioAssistantContextType {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  panelWidth: number;
  setPanelWidth: (width: number) => void;
  context: StudioContextSnapshot | null;
  setContext: (ctx: StudioContextSnapshot) => void;
  enabled: boolean;
  setEnabled: (val: boolean) => void;
  pendingDrafts: PendingDraft | null;
  setPendingDrafts: (drafts: PendingDraft | null) => void;
  openWithPreset: (preset: {
    kind?: 'lesson' | 'quiz' | 'practice';
    message?: string;
    spec?: SpecAttachPreset;
  }) => void;
  ephemeralSuggestions: SuggestionChip[] | null;
  setEphemeralSuggestions: (chips: SuggestionChip[] | null) => void;
  lastCourseQuality: AiQualityItem[] | null;
  setLastCourseQuality: (items: AiQualityItem[] | null) => void;
}

const StudioAssistantContext = createContext<StudioAssistantContextType | null>(null);

export function StudioAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [panelOpen, setPanelOpenState] = useState(getAssistantPanelOpen());
  const [panelWidth, setPanelWidthState] = useState(getAssistantPanelWidth());
  const [context, setContextState] = useState<StudioContextSnapshot | null>(null);
  const [enabled, setEnabledState] = useState(isAssistantEnabled);
  const [pendingDrafts, setPendingDrafts] = useState<PendingDraft | null>(null);
  const [ephemeralSuggestions, setEphemeralSuggestions] = useState<SuggestionChip[] | null>(
    null,
  );
  const [lastCourseQuality, setLastCourseQuality] = useState<AiQualityItem[] | null>(null);

  const setPanelOpen = useCallback((open: boolean) => {
    setPanelOpenState(open);
    setAssistantPanelOpen(open);
  }, []);

  const setPanelWidth = useCallback((width: number) => {
    setPanelWidthState(width);
    setAssistantPanelWidth(width);
  }, []);

  const setContext = useCallback((ctx: StudioContextSnapshot) => {
    setContextState(ctx);
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    localStorage.setItem('openedu.studio.assistant.enabled', String(val));
    setEnabledState(val);
  }, []);

  const openWithPreset = useCallback(
    (preset: {
      kind?: 'lesson' | 'quiz' | 'practice';
      message?: string;
      spec?: SpecAttachPreset;
    }) => {
      setPanelOpen(true);
      if (preset.spec) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('studio:assistant:spec', { detail: preset.spec }),
          );
        }, 100);
        return;
      }
      if (preset.message) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('studio:assistant:preset', { detail: preset }),
          );
        }, 100);
      }
    },
    [setPanelOpen],
  );

  return (
    <StudioAssistantContext.Provider
      value={{
        panelOpen,
        setPanelOpen,
        panelWidth,
        setPanelWidth,
        context,
        setContext,
        enabled,
        setEnabled,
        pendingDrafts,
        setPendingDrafts,
        openWithPreset,
        ephemeralSuggestions,
        setEphemeralSuggestions,
        lastCourseQuality,
        setLastCourseQuality,
      }}
    >
      {children}
    </StudioAssistantContext.Provider>
  );
}

export function useStudioAssistant() {
  const ctx = useContext(StudioAssistantContext);
  if (!ctx) {
    throw new Error('useStudioAssistant must be used within a StudioAssistantProvider');
  }
  return ctx;
}
