import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ServiceFAQ component
 * Matches Card structure with accordion items
 */
export default function ServiceFAQSkeleton() {
  return (
    <Card className='rounded-2xl border-gray-100 shadow-sm'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Skeleton className='h-5 w-5 rounded-full' />
          <Skeleton className='h-6 w-48' />
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className='border border-border rounded-lg p-4 space-y-3'
          >
            {/* Question */}
            <div className='flex items-center justify-between'>
              <Skeleton className='h-5 w-3/4' />
              <Skeleton className='h-5 w-5 rounded' />
            </div>
            {/* Answer (visible on first item to show variation) */}
            {index === 0 && (
              <div className='space-y-2 pt-2'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-11/12' />
                <Skeleton className='h-4 w-10/12' />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
