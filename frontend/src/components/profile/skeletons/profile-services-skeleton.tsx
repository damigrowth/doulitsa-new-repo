import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfileServices component
 * Matches the services section with service cards
 */
export default function ProfileServicesSkeleton() {
  return (
    <section className='py-5 scroll-mt-2'>
      {/* Section header */}
      <Skeleton className='h-6 w-40 mb-5' />

      {/* Service cards */}
      <div className='space-y-6'>
        {[1, 2, 3].map((index) => (
          <Card key={index} className='rounded-lg border border-border'>
            <CardContent className='p-6'>
              <div className='flex gap-4'>
                {/* Service image skeleton */}
                <Skeleton className='h-24 w-24 rounded-lg flex-shrink-0' />

                {/* Service info */}
                <div className='flex-1 min-w-0'>
                  <Skeleton className='h-6 w-3/4 mb-2' />
                  <Skeleton className='h-4 w-full mb-2' />
                  <Skeleton className='h-4 w-5/6 mb-3' />

                  <div className='flex items-center gap-4 flex-wrap'>
                    <Skeleton className='h-4 w-24' />
                    <Skeleton className='h-4 w-20' />
                    <Skeleton className='h-4 w-28' />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load more button */}
      <div className='mt-6 text-center'>
        <Skeleton className='h-10 w-48 mx-auto rounded-lg' />
      </div>
    </section>
  );
}
