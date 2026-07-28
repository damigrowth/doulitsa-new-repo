import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ServiceMedia component
 * Matches MediaCarousel structure: main image carousel + thumbnail strip below
 */
export default function ServiceMediaSkeleton() {
  return (
    <Card className='rounded-2xl border-gray-100 shadow-sm'>
      <CardHeader className='pb-4'>
        <CardTitle className='text-lg font-semibold'>
          <Skeleton className='h-5 w-28' />
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Main Carousel - Single image display */}
        <div className='relative w-full'>
          <Skeleton className='aspect-video rounded-lg w-full' />
        </div>

        {/* Thumbnail Navigation - Horizontal scroll of small thumbnails */}
        <div className='flex gap-2 overflow-x-auto py-2 px-1'>
          {[...Array(6)].map((_, index) => (
            <Skeleton
              key={index}
              className='h-20 w-20 flex-shrink-0 rounded-md'
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
