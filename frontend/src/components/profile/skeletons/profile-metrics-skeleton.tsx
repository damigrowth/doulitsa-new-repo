import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfileMetrics component
 * Matches the grid layout with category, subcategory, and service subdivisions
 */
export default function ProfileMetricsSkeleton() {
  return (
    <section className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'>
      {/* Category metric skeleton */}
      <div className='flex items-start gap-4'>
        <div className='flex-shrink-0'>
          <Skeleton className='h-16 w-16 rounded-xl' />
        </div>
        <div className='flex-1 min-w-0'>
          <Skeleton className='h-4 w-32 mb-2' />
          <Skeleton className='h-4 w-24' />
        </div>
      </div>

      {/* Service subdivisions skeleton */}
      <div className='flex items-start gap-4 sm:col-span-2'>
        <div className='flex-1 min-w-0'>
          <Skeleton className='h-4 w-24 mb-3' />
          <div className='flex flex-wrap gap-1.5'>
            <Skeleton className='h-7 w-20 rounded-xl' />
            <Skeleton className='h-7 w-24 rounded-xl' />
            <Skeleton className='h-7 w-28 rounded-xl' />
            <Skeleton className='h-7 w-22 rounded-xl' />
            <Skeleton className='h-7 w-26 rounded-xl' />
          </div>
        </div>
      </div>
    </section>
  );
}
