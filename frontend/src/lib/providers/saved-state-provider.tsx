'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { getUserSavedState } from '@/actions/saved';

interface SavedStateContextValue {
  /** Check if an item is saved. */
  isSaved: (type: 'service' | 'profile', id: string | number) => boolean;
  /** Update local cache after a toggle (optimistic). */
  updateSavedState: (
    type: 'service' | 'profile',
    id: string | number,
    saved: boolean,
  ) => void;
  /** Signal that a consumer exists and fetch should happen. */
  requestFetch: () => void;
}

const SavedStateContext = createContext<SavedStateContextValue | null>(null);

export function SavedStateProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [savedServiceIds, setSavedServiceIds] = useState<Set<number>>(
    new Set(),
  );
  const [savedProfileIds, setSavedProfileIds] = useState<Set<string>>(
    new Set(),
  );
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchRequested, setFetchRequested] = useState(false);

  const fetchGuard = useRef(false);
  const pathnameRef = useRef(pathname);

  // Reset on route change — clear stale data but keep fetchRequested
  // so the fetch effect re-triggers via the pathname dependency
  useEffect(() => {
    if (pathname !== pathnameRef.current) {
      pathnameRef.current = pathname;
      fetchGuard.current = false;
      setHasFetched(false);
      setSavedServiceIds(new Set());
      setSavedProfileIds(new Set());
    }
  }, [pathname]);

  // Fetch when requested + user is logged in
  // pathname in deps ensures re-fetch after client-side navigation
  // (without it, React batching causes fetchRequested to stay true
  // across route changes, so the effect never re-runs)
  useEffect(() => {
    if (!fetchRequested || fetchGuard.current || !session?.user?.id) return;
    fetchGuard.current = true;

    const fetchPathname = pathnameRef.current;

    getUserSavedState(session.user.id)
      .then((savedState) => {
        // Discard if user navigated away
        if (pathnameRef.current !== fetchPathname) return;

        setSavedServiceIds(savedState.serviceIds);
        setSavedProfileIds(savedState.profileIds);
        setHasFetched(true);
      })
      .catch((error) => {
        console.error('Failed to fetch saved state:', error);
        fetchGuard.current = false;
      });
  }, [fetchRequested, session?.user?.id, pathname]);

  const requestFetch = useCallback(() => {
    setFetchRequested(true);
  }, []);

  const isSaved = useCallback(
    (type: 'service' | 'profile', id: string | number) => {
      if (!hasFetched) return false;

      if (type === 'service') {
        return savedServiceIds.has(typeof id === 'string' ? parseInt(id) : id);
      }
      return savedProfileIds.has(String(id));
    },
    [hasFetched, savedServiceIds, savedProfileIds],
  );

  const updateSavedState = useCallback(
    (type: 'service' | 'profile', id: string | number, saved: boolean) => {
      if (type === 'service') {
        setSavedServiceIds((prev) => {
          const next = new Set(prev);
          const numId = typeof id === 'string' ? parseInt(id) : id;
          if (saved) next.add(numId);
          else next.delete(numId);
          return next;
        });
      } else {
        setSavedProfileIds((prev) => {
          const next = new Set(prev);
          const strId = String(id);
          if (saved) next.add(strId);
          else next.delete(strId);
          return next;
        });
      }
    },
    [],
  );

  return (
    <SavedStateContext.Provider
      value={{ isSaved, updateSavedState, requestFetch }}
    >
      {children}
    </SavedStateContext.Provider>
  );
}

export function useSavedState() {
  const context = useContext(SavedStateContext);
  if (!context) {
    throw new Error('useSavedState must be used within a SavedStateProvider');
  }

  // Request fetch on mount (lazy — only pages with SaveButtons trigger it)
  const { requestFetch, ...rest } = context;
  useEffect(() => {
    requestFetch();
  }, [requestFetch]);

  return rest;
}
