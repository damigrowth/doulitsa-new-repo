import { Skeleton } from '@/components/ui/skeleton';

export function DashboardReviewCardSkeleton() {
  return (
    <div className='flex gap-4 pb-6 mb-6 border-b last:border-b-0 last:pb-0 last:mb-0'>
      {/* Avatar skeleton */}
      <Skeleton className='h-14 w-14 rounded-full flex-shrink-0' />

      {/* Content skeleton */}
      <div className='flex-1 space-y-2 min-w-0'>
        {/* Name skeleton - text-base = h-4 */}
        <Skeleton className='h-4 w-32' />

        {/* Service skeleton - text-sm = h-4 */}
        <Skeleton className='h-4 w-48' />

        {/* Rating + Time skeleton */}
        <div className='flex items-center gap-1'>
          {/* 5 stars skeleton with gap-1 */}
          <div className='flex items-center gap-1'>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className='h-4 w-4' />
            ))}
          </div>
          {/* Time skeleton with ml-2 */}
          <Skeleton className='h-4 w-24 ml-2' />
        </div>

        {/* Comment skeleton - multiple lines */}
        <div className='space-y-2 pt-1'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-3/4' />
        </div>
      </div>
    </div>
  );
}
