import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ServiceContact component
 * Matches profile contact card structure
 */
export default function ServiceContactSkeleton() {
  return (
    <Card className='mb-0 rounded-2xl border-gray-100 shadow-sm'>
      <CardContent className='p-6'>
        {/* Avatar and name */}
        <div className='flex items-center mb-4'>
          <Skeleton className='h-[72px] w-[72px] rounded-lg flex-shrink-0 mr-5' />
          <div className='flex-1 min-w-0 space-y-2'>
            <Skeleton className='h-5 w-32' />
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-4 w-20' />
          </div>
        </div>

        {/* Social links row */}
        <div className='flex items-center justify-end gap-3 mb-4'>
          <Skeleton className='h-4.5 w-4.5 rounded-full' />
          <Skeleton className='h-4.5 w-4.5 rounded-full' />
          <Skeleton className='h-4.5 w-4.5 rounded-full' />
        </div>

        {/* Separator */}
        <div className='opacity-80 my-4 h-px bg-border' />

        {/* Info rows */}
        <div className='flex items-center justify-between mb-6'>
          <div className='text-left space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-4 w-32' />
          </div>
          <div className='text-right space-y-2'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-4 w-28' />
          </div>
        </div>

        {/* Action button */}
        <div className='mt-8'>
          <Skeleton className='h-11 w-full rounded-lg' />
        </div>
      </CardContent>
    </Card>
  );
}
