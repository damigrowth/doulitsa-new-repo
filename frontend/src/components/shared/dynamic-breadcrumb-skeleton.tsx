import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for DynamicBreadcrumb component
 * Matches the breadcrumb navigation trail with action buttons
 */
export default function DynamicBreadcrumbSkeleton() {
  return (
    <section className='py-4'>
      <div className='container mx-auto px-4'>
        <div className='flex flex-wrap items-center'>
          {/* Breadcrumb segments - left side */}
          <div className='w-full sm:w-8/12 lg:w-10/12'>
            <div className='mb-2 sm:mb-0'>
              <div className='flex items-center gap-2 text-sm'>
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-4 w-32' />
              </div>
            </div>
          </div>

          {/* Action buttons - right side */}
          <div className='w-full sm:w-4/12 lg:w-2/12'>
            <div className='flex items-center justify-end gap-2'>
              <Skeleton className='h-8 w-40 rounded-lg' />
              <Skeleton className='h-8 w-40 rounded-lg' />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
