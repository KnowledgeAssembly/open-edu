import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type AnnouncementPriority = 'polite' | 'assertive';

export interface AriaContextValue {
  announce: (message: string, priority?: AnnouncementPriority) => void;
  registerLandmark: (id: string, role: string, label: string) => void;
  unregisterLandmark: (id: string) => void;
  getLandmarks: () => Array<{ id: string; role: string; label: string }>;
}

const AriaContext = createContext<AriaContextValue | null>(null);

export interface AriaProviderProps {
  children: ReactNode;
}

export function AriaProvider({ children }: AriaProviderProps): JSX.Element {
  const [landmarks, setLandmarks] = useState<Map<string, { role: string; label: string }>>(
    () => new Map(),
  );
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    const container = priority === 'assertive' ? assertiveRef.current : politeRef.current;
    if (!container) return;
    container.textContent = '';
    requestAnimationFrame(() => {
      container.textContent = message;
    });
  }, []);

  const registerLandmark = useCallback((id: string, role: string, label: string) => {
    setLandmarks((prev) => {
      const next = new Map(prev);
      next.set(id, { role, label });
      return next;
    });
  }, []);

  const unregisterLandmark = useCallback((id: string) => {
    setLandmarks((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getLandmarks = useCallback(() => {
    return Array.from(landmarks.entries()).map(([id, { role, label }]) => ({ id, role, label }));
  }, [landmarks]);

  const value = useMemo<AriaContextValue>(
    () => ({ announce, registerLandmark, unregisterLandmark, getLandmarks }),
    [announce, registerLandmark, unregisterLandmark, getLandmarks],
  );

  return (
    <AriaContext.Provider value={value}>
      {children}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
    </AriaContext.Provider>
  );
}

export function useAriaContext(): AriaContextValue {
  const ctx = useContext(AriaContext);
  if (!ctx) {
    throw new Error(
      'useAriaContext must be used within an <AriaProvider>. Wrap your component tree with <AriaProvider>.',
    );
  }
  return ctx;
}
