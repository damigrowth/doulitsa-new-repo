import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ServiceOrderFixed component
 * Matches pricing widget structure with addons and buy button
 */
export default function ServiceOrderSkeleton() {
  return (
    <Card className='mb-6 rounded-2xl border-gray-100 shadow-sm'>
      <CardContent className='p-6 flex flex-col'>
        {/* Addon items */}
        <div className='space-y-3 mb-4'>
          {[...Array(3)].map((_, index) => (
            <div key={index} className='flex items-center justify-between py-2'>
              <div className='flex items-center gap-2 flex-1'>
                <Skeleton className='h-4 w-4 rounded' />
                <Skeleton className='h-4 w-32' />
              </div>
              <Skeleton className='h-4 w-12' />
            </div>
          ))}
        </div>
        {/* Buy button */}
        <Skeleton className='h-11 w-full rounded-lg' />
      </CardContent>
    </Card>
  );
}
