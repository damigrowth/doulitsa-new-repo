import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfileFeatures component
 * Matches the grid layout with contact methods, payment methods, etc.
 */
export default function ProfileFeaturesSkeleton() {
  return (
    <section className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 py-5'>
      {/* Feature 1 */}
      <div className='flex items-start gap-4'>
        <div className='flex-shrink-0'>
          <Skeleton className='h-16 w-16 rounded-xl' />
        </div>
        <div className='flex-1 min-w-0'>
          <Skeleton className='h-4 w-28 mb-3' />
          <div className='flex flex-wrap gap-1.5'>
            <Skeleton className='h-7 w-20 rounded-xl' />
            <Skeleton className='h-7 w-24 rounded-xl' />
          </div>
        </div>
      </div>

      {/* Feature 2 */}
      <div className='flex items-start gap-4'>
        <div className='flex-shrink-0'>
          <Skeleton className='h-16 w-16 rounded-xl' />
        </div>
        <div className='flex-1 min-w-0'>
          <Skeleton className='h-4 w-32 mb-3' />
          <div className='flex flex-wrap gap-1.5'>
            <Skeleton className='h-7 w-22 rounded-xl' />
            <Skeleton className='h-7 w-26 rounded-xl' />
            <Skeleton className='h-7 w-20 rounded-xl' />
          </div>
        </div>
      </div>

      {/* Feature 3 */}
      <div className='flex items-start gap-4'>
        <div className='flex-shrink-0'>
          <Skeleton className='h-16 w-16 rounded-xl' />
        </div>
        <div className='flex-1 min-w-0'>
          <Skeleton className='h-4 w-36 mb-3' />
          <div className='flex flex-wrap gap-1.5'>
            <Skeleton className='h-7 w-28 rounded-xl' />
          </div>
        </div>
      </div>
    </section>
  );
}
