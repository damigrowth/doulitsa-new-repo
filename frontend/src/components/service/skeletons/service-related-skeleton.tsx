import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ServiceRelated component
 * Matches full section structure with header and services grid
 */
export default function ServiceRelatedSkeleton() {
  return (
    <section className='py-16 bg-silver'>
      <div className='container mx-auto px-6'>
        {/* Header Section */}
        <div className='mb-12'>
          <Skeleton className='h-8 w-32 mb-2' />
          <Skeleton className='h-5 w-64' />
        </div>

        {/* Services Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6'>
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className='bg-white border border-gray-200 rounded-lg p-4 space-y-3'
            >
              {/* Service image */}
              <Skeleton className='aspect-video rounded-lg w-full' />

              {/* Service title */}
              <Skeleton className='h-5 w-full' />
              <Skeleton className='h-5 w-3/4' />

              {/* Avatar and name */}
              <div className='flex items-center gap-2 pt-2'>
                <Skeleton className='h-8 w-8 rounded-full flex-shrink-0' />
                <Skeleton className='h-4 w-24' />
              </div>

              {/* Price and rating */}
              <div className='flex items-center justify-between pt-2'>
                <Skeleton className='h-5 w-16' />
                <Skeleton className='h-4 w-12' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
