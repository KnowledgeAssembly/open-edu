import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

export interface FocusContextValue {
  activeDescendantId: string | null;
  setActiveDescendantId: (id: string | null) => void;
  registerNavigableGroup: (id: string, ref: RefObject<HTMLElement | null>) => void;
  unregisterNavigableGroup: (id: string) => void;
  getNavigableGroup: (id: string) => HTMLElement | null;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export interface FocusProviderProps {
  children: ReactNode;
}

export function FocusProvider({ children }: FocusProviderProps): JSX.Element {
  const [activeDescendantId, setActiveDescendantId] = useState<string | null>(null);
  const groupRefs = useRef<Map<string, RefObject<HTMLElement | null>>>(new Map());

  const registerNavigableGroup = useCallback((id: string, ref: RefObject<HTMLElement | null>) => {
    groupRefs.current.set(id, ref);
  }, []);

  const unregisterNavigableGroup = useCallback((id: string) => {
    groupRefs.current.delete(id);
  }, []);

  const getNavigableGroup = useCallback((id: string): HTMLElement | null => {
    const ref = groupRefs.current.get(id);
    return ref?.current ?? null;
  }, []);

  const value = useMemo<FocusContextValue>(
    () => ({
      activeDescendantId,
      setActiveDescendantId,
      registerNavigableGroup,
      unregisterNavigableGroup,
      getNavigableGroup,
    }),
    [activeDescendantId, registerNavigableGroup, unregisterNavigableGroup, getNavigableGroup],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocusContext(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (!ctx) {
    throw new Error(
      'useFocusContext must be used within a <FocusProvider>. Wrap your component tree with <FocusProvider>.',
    );
  }
  return ctx;
}
