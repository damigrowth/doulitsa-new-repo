import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ServiceMeta component
 * Matches service title, avatar, display name, and rating
 */
export default function ServiceMetaSkeleton() {
  return (
    <div className='w-full mb-6 pb-6 border-b border-gray-200'>
      <div className='relative'>
        {/* Service Title - matches text-xl2 */}
        <h1 className='text-xl2 font-bold text-gray-900 leading-tight mb-6'>
          <Skeleton className='h-7 w-3/4' />
        </h1>

        {/* Meta Information */}
        <div className='flex flex-wrap items-center gap-4'>
          {/* User Avatar and Display Name */}
          <div className='flex items-center'>
            <Skeleton className='h-10 w-10 rounded-lg' />
            <Skeleton className='h-5 w-32 ml-3' />
            {/* Badges */}
            <div className='ml-1.5 flex gap-1'>
              <Skeleton className='h-5 w-5 rounded-full' />
            </div>
          </div>

          {/* Rating Display */}
          <div className='ml-auto sm:ml-0'>
            <Skeleton className='h-5 w-24' />
          </div>
        </div>
      </div>
    </div>
  );
}
