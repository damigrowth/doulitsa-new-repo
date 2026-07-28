import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfileMeta component
 * Matches the header with avatar, name, tagline, rating, and location
 */
export default function ProfileMetaSkeleton() {
  return (
    <section>
      <Card className='relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 border border-border rounded-xl shadow-lg mb-8'>
        {/* Main content */}
        <div className='relative z-10 p-8'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center gap-6'>
            {/* Avatar skeleton */}
            <Skeleton className='h-28 w-28 rounded-xl flex-shrink-0' />

            {/* Profile info */}
            <div className='flex-1 min-w-0 w-full'>
              {/* Name and verification */}
              <div className='flex flex-wrap items-center gap-2 mb-2'>
                <Skeleton className='h-6 w-48' />
                <Skeleton className='h-5 w-5 rounded-full' />
              </div>

              {/* Rating */}
              <div className='mb-4'>
                <Skeleton className='h-4 w-32' />
              </div>

              {/* Location info */}
              <div className='flex items-center gap-4 text-sm flex-wrap mb-4'>
                <div className='flex items-center gap-2'>
                  <Skeleton className='h-4 w-4 rounded' />
                  <Skeleton className='h-4 w-40' />
                </div>
                <div className='flex items-center gap-2'>
                  <Skeleton className='h-4 w-4 rounded' />
                  <Skeleton className='h-4 w-56' />
                </div>
              </div>

              {/* Social links */}
              <div className='flex gap-2'>
                <Skeleton className='h-8 w-8 rounded' />
                <Skeleton className='h-8 w-8 rounded' />
                <Skeleton className='h-8 w-8 rounded' />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
