import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfileInfo component (Sidebar)
 * Matches the sidebar with rate, location, coverage, experience, contact info
 */
export default function ProfileInfoSkeleton() {
  return (
    <Card className='rounded-lg bg-muted border border-border shadow-sm'>
      {/* Rate header */}
      <CardHeader className='pb-0'>
        <Skeleton className='h-8 w-28' />
      </CardHeader>

      <CardContent className='space-y-0'>
        <div>
          {/* Location */}
          <div className='flex items-center justify-between py-6 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded' />
              <Skeleton className='h-4 w-16' />
            </div>
            <Skeleton className='h-4 w-24' />
          </div>

          {/* Service Coverage */}
          <div className='flex items-center justify-between py-5 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded' />
              <Skeleton className='h-4 w-20' />
            </div>
            <div className='flex flex-wrap justify-end gap-1'>
              <Skeleton className='h-6 w-16 rounded-lg' />
              <Skeleton className='h-6 w-20 rounded-lg' />
            </div>
          </div>

          {/* Years of Experience */}
          <div className='flex items-center justify-between py-5 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded' />
              <Skeleton className='h-4 w-28' />
            </div>
            <Skeleton className='h-4 w-32' />
          </div>

          {/* Website */}
          <div className='flex items-center justify-between py-5 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded' />
              <Skeleton className='h-4 w-20' />
            </div>
            <Skeleton className='h-4 w-28' />
          </div>

          {/* Phone */}
          <div className='flex items-center justify-between py-5 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded' />
              <Skeleton className='h-4 w-18' />
            </div>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded-full' />
              <Skeleton className='h-4 w-4 rounded-full' />
              <Skeleton className='h-8 w-24 rounded-lg' />
            </div>
          </div>

          {/* Email */}
          <div className='flex items-center justify-between py-5 border-b border-border'>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-4 w-4 rounded' />
              <Skeleton className='h-4 w-12' />
            </div>
            <Skeleton className='h-8 w-32 rounded-lg' />
          </div>
        </div>

        {/* Contact Button */}
        <div className='pt-6'>
          <Skeleton className='h-10 w-full rounded-lg' />
        </div>
      </CardContent>
    </Card>
  );
}
