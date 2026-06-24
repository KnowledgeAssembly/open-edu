import { useState, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';

export type AnnouncementPriority = 'polite' | 'assertive';

export interface LiveRegionContextValue {
  announce: (message: string, priority?: AnnouncementPriority) => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

export function useLiveRegion(): LiveRegionContextValue {
  const ctx = useContext(LiveRegionContext);
  if (!ctx) {
    return { announce: () => {} };
  }
  return ctx;
}

interface Announcement {
  id: number;
  message: string;
  priority: AnnouncementPriority;
}

export interface LiveRegionProviderProps {
  children: ReactNode;
}

export function LiveRegionProvider({ children }: LiveRegionProviderProps): JSX.Element {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const counterRef = useRef(0);

  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    const id = counterRef.current++;
    setAnnouncements((prev) => [...prev.slice(-5), { id, message, priority }]);
    setTimeout(() => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }, 3000);
  }, []);

  const srOnly: Record<string, string | number> = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  };

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div data-testid="live-region-polite" aria-live="polite" className="sr-only" style={srOnly}>
        {announcements.filter(a => a.priority === 'polite').slice(-1).map(a => (
          <div key={a.id}>{a.message}</div>
        ))}
      </div>
      <div data-testid="live-region-assertive" aria-live="assertive" className="sr-only" style={srOnly}>
        {announcements.filter(a => a.priority === 'assertive').slice(-1).map(a => (
          <div key={a.id}>{a.message}</div>
        ))}
      </div>
    </LiveRegionContext.Provider>
  );
}
