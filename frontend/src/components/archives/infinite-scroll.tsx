'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number; // Distance from bottom to trigger load
  className?: string;
  children?: React.ReactNode;
}

export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 100,
  className,
  children,
}: InfiniteScrollProps) {
  const [isManualMode, setIsManualMode] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // Handle intersection observer for automatic loading
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && hasMore && !isLoading && !isManualMode) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, isManualMode, onLoadMore]
  );

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: `${threshold}px`,
      threshold: 0.1,
    });

    intersectionObserverRef.current = observer;

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold]);

  // Handle manual load more button click
  const handleManualLoadMore = () => {
    if (hasMore && !isLoading) {
      onLoadMore();
    }
  };

  // Switch to manual mode after user scrolls up
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      // If user scrolls up significantly, switch to manual mode
      if (scrollTop < scrollHeight - clientHeight - 500) {
        setIsManualMode(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!hasMore) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No more results to load</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {children}

      {/* Loading indicator or load more button */}
      <div className="flex justify-center py-8">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading more results...</span>
          </div>
        ) : isManualMode ? (
          <Button
            onClick={handleManualLoadMore}
            variant="outline"
            disabled={!hasMore}
            className="px-6"
          >
            Load More Results
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Intersection observer target */}
      <div
        ref={observerRef}
        className="h-1"
        style={{ margin: `-${threshold}px 0` }}
      />
    </div>
  );
}

// Hook for infinite scroll state management
export function useInfiniteScroll<T>(
  initialItems: T[] = [],
  fetchMore: (page: number) => Promise<{ items: T[]; hasMore: boolean; total?: number }>,
  limit: number = 20
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState<number | undefined>();

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const result = await fetchMore(currentPage + 1);

      setItems(prev => [...prev, ...result.items]);
      setCurrentPage(prev => prev + 1);
      setHasMore(result.hasMore);

      if (result.total !== undefined) {
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, isLoading, hasMore, fetchMore]);

  const reset = useCallback((newItems: T[] = []) => {
    setItems(newItems);
    setCurrentPage(1);
    setHasMore(true);
    setIsLoading(false);
    setTotal(undefined);
  }, []);

  return {
    items,
    currentPage,
    hasMore,
    isLoading,
    total,
    loadMore,
    reset,
    setItems,
    setHasMore,
    setTotal,
  };
}