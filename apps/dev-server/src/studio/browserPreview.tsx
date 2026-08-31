import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadPackageFromFiles } from '@open-edu/core/browser';
import type { LoadedPackage } from '@open-edu/core/browser';
import type { StudioApi, StorageStatus } from './studioApi.js';
import {
  createBrowserCourseStore,
  buildFileIndex,
  type BrowserCourseStore,
  type BrowserCourseStoreError,
} from './browserCourseStore.js';
import {
  createBrowserStudioApi,
  createBrowserStudioSession,
  type BrowserStudioSession,
} from './browserStudioApi.js';

export interface BrowserStudioContextValue {
  api: StudioApi;
  store: BrowserCourseStore;
  session: BrowserStudioSession;
  activeCourseId: string | null;
  loadedPackage: LoadedPackage | null;
  isLoading: boolean;
  error: string | null;
  storageStatus: StorageStatus;
  reloadPreview(): Promise<void>;
  openCourse(id: string): Promise<void>;
}

const BrowserStudioContext = createContext<BrowserStudioContextValue | null>(null);

interface BrowserStudioProviderProps {
  children: ReactNode;
  store?: BrowserCourseStore;
}

export function BrowserStudioProvider({
  children,
  store: injectedStore,
}: BrowserStudioProviderProps) {
  const [store] = useState<BrowserCourseStore>(() => injectedStore ?? createBrowserCourseStore());
  const [session] = useState(() => createBrowserStudioSession());
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [loadedPackage, setLoadedPackage] = useState<LoadedPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({ available: true });

  const reloadPreview = useCallback(async () => {
    if (!session.activeCourseId) {
      setActiveCourseId(null);
      setLoadedPackage(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const course = await store.get(session.activeCourseId);
      if (!course) {
        setActiveCourseId(null);
        setLoadedPackage(null);
        setIsLoading(false);
        return;
      }
      const index = buildFileIndex(course.files);
      const source = {
        get: (path: string) => index.get(path),
        list: (prefix?: string) => {
          const keys = Array.from(index.keys()).sort();
          return prefix ? keys.filter((p) => p.startsWith(prefix)) : keys;
        },
      };
      const pkg = await loadPackageFromFiles(source, `browser://${course.id}`);
      setActiveCourseId(course.id);
      setLoadedPackage(pkg);
    } catch (err) {
      setLoadedPackage(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [store, session]);

  const api = useMemo(
    () =>
      createBrowserStudioApi({
        store,
        session,
        onPackageChanged: () => {
          void reloadPreview();
        },
      }),
    [store, session, reloadPreview],
  );

  const openCourse = useCallback(
    async (id: string) => {
      session.setActiveCourse(id);
      await reloadPreview();
    },
    [session, reloadPreview],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await api.getStorageStatus();
        const list = await store.list();
        if (cancelled) return;
        setStorageStatus(status);
        const latest = list[0];
        if (latest) {
          session.setActiveCourse(latest.id);
          await reloadPreview();
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        const code = (err as BrowserCourseStoreError).code;
        setStorageStatus({
          available: false,
          reason: code === 'quota-exceeded' ? 'quota-exceeded' : 'storage-unavailable',
        });
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, store, session, reloadPreview]);

  const value = useMemo<BrowserStudioContextValue>(
    () => ({
      api,
      store,
      session,
      activeCourseId,
      loadedPackage,
      isLoading,
      error,
      storageStatus,
      reloadPreview,
      openCourse,
    }),
    [
      api,
      store,
      session,
      activeCourseId,
      loadedPackage,
      isLoading,
      error,
      storageStatus,
      reloadPreview,
      openCourse,
    ],
  );

  return <BrowserStudioContext.Provider value={value}>{children}</BrowserStudioContext.Provider>;
}

export function useBrowserStudio(): BrowserStudioContextValue {
  const value = useContext(BrowserStudioContext);
  if (!value) {
    throw new Error('useBrowserStudio must be used within a BrowserStudioProvider');
  }
  return value;
}
