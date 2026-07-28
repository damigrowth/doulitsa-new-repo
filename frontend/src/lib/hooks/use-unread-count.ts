'use client';

import useSWR from 'swr';
import { getTotalUnreadCount } from '@/actions/messages/messages';
import { useSession } from '@/lib/auth/client';

/**
 * Custom hook to fetch and cache total unread message count
 * Uses SWR for client-side caching with optimized revalidation strategy
 *
 * Performance optimizations:
 * - 30-second refresh interval (prevents excessive API calls)
 * - Revalidates on window focus (free)
 * - 5-second deduping interval (prevents rapid duplicate requests)
 * - Shared cache across all hook instances
 */
export function useUnreadCount() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data, error, isLoading, mutate } = useSWR(
    // Only fetch if user is authenticated
    userId ? ['unread-count', userId] : null,
    async ([_, uid]) => {
      const count = await getTotalUnreadCount(uid);
      return count;
    },
    {
      // Revalidation strategy
      refreshInterval: 60000, // 60 seconds - reduced for egress optimization
      revalidateOnFocus: true, // Refresh when user returns to tab
      revalidateOnReconnect: true, // Refresh when connection restored
      dedupingInterval: 5000, // Prevent duplicate requests within 5s

      // Performance
      keepPreviousData: true, // Prevent UI flicker during revalidation

      // Error handling
      shouldRetryOnError: false, // Don't retry on error (prevents excessive calls)
      onError: (err) => {
        console.error('[useUnreadCount] Error fetching unread count:', err);
      },
    }
  );

  return {
    unreadCount: data ?? 0,
    isLoading,
    error,
    refresh: mutate, // Manual refresh function
  };
}
