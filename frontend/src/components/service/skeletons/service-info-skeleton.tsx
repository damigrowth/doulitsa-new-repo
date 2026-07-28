import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ServiceInfo component
 * Matches IconBox grid with coverage, duration, category info
 */
export default function ServiceInfoSkeleton() {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'>
      {/* Category IconBox */}
      <div className='sm:col-span-1 md:col-span-1'>
        <div className='flex items-start gap-4'>
          <Skeleton className='h-16 w-16 rounded-xl flex-shrink-0' />
          <div className='flex-1 min-w-0'>
            <Skeleton className='h-4 w-28 mb-2' />
            <Skeleton className='h-4 w-24' />
          </div>
        </div>
      </div>

      {/* Coverage IconBox */}
      <div className='sm:col-span-1 md:col-span-1'>
        <div className='flex items-start gap-4'>
          <Skeleton className='h-16 w-16 rounded-xl flex-shrink-0' />
          <div className='flex-1 min-w-0'>
            <Skeleton className='h-4 w-28 mb-2' />
            <Skeleton className='h-4 w-24' />
          </div>
        </div>
      </div>
      {/* Duration/Type IconBox */}
      <div className='sm:col-span-1 md:col-span-1'>
        <div className='flex items-start gap-4'>
          <Skeleton className='h-16 w-16 rounded-xl flex-shrink-0' />
          <div className='flex-1 min-w-0'>
            <Skeleton className='h-4 w-28 mb-2' />
            <Skeleton className='h-4 w-24' />
          </div>
        </div>
      </div>
    </div>
  );
}
