import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ServiceAbout component
 * Matches Card structure with description, tags, and features grid
 */
export default function ServiceAboutSkeleton() {
  return (
    <Card className='rounded-2xl border-gray-100 shadow-sm'>
      <CardHeader className='pb-4'>
        <CardTitle className='text-lg font-semibold'>
          <Skeleton className='h-5 w-32' />
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Description lines */}
        <div className='space-y-3 mb-14'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-11/12' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-10/12' />
          <Skeleton className='h-4 w-9/12' />
        </div>

        {/* Tags section */}
        <div className='pb-4'>
          <Skeleton className='h-5 w-24 mb-3' />
          <div className='flex flex-wrap gap-1'>
            <Skeleton className='h-7 w-20 rounded-xl' />
            <Skeleton className='h-7 w-24 rounded-xl' />
            <Skeleton className='h-7 w-28 rounded-xl' />
            <Skeleton className='h-7 w-22 rounded-xl' />
            <Skeleton className='h-7 w-26 rounded-xl' />
            <Skeleton className='h-7 w-24 rounded-xl' />
          </div>
        </div>

        {/* Features grid (3 columns) */}
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 py-5'>
          {[...Array(3)].map((_, index) => (
            <div key={index} className='flex items-start gap-4'>
              {/* Icon with wrapper */}
              <div className='flex-shrink-0'>
                <Skeleton className='h-12 w-12 rounded-xl' />
              </div>
              {/* Content */}
              <div className='flex-1 min-w-0'>
                <Skeleton className='h-4 w-24 mb-2' />
                <Skeleton className='h-3 w-16 rounded-full' />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
