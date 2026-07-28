import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfileTerms component
 * Matches the card with title and terms content
 */
export default function ProfileTermsSkeleton() {
  return (
    <section>
      <Card className='rounded-lg border border-border'>
        <CardHeader className='pb-4'>
          <Skeleton className='h-6 w-32' />
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-5/6' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-4/5' />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
