import { createContext, useContext, useState, useCallback } from 'react';
import type { StudioContextSnapshot } from './context';
import { 
  getAssistantPanelOpen, 
  setAssistantPanelOpen, 
  getAssistantPanelWidth, 
  setAssistantPanelWidth 
} from './assistantStorage';
import { isAssistantEnabled } from './assistantFlags';

interface StudioAssistantContextType {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  panelWidth: number;
  setPanelWidth: (width: number) => void;
  context: StudioContextSnapshot | null;
  setContext: (ctx: StudioContextSnapshot) => void;
  enabled: boolean;
  setEnabled: (val: boolean) => void;
}

const StudioAssistantContext = createContext<StudioAssistantContextType | null>(null);

export function StudioAssistantProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [panelOpen, setPanelOpenState] = useState(getAssistantPanelOpen());
  const [panelWidth, setPanelWidthState] = useState(getAssistantPanelWidth());
  const [context, setContextState] = useState<StudioContextSnapshot | null>(null);
  const [enabled, setEnabledState] = useState(isAssistantEnabled);

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