import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfileBio component
 * Matches the card with title and formatted text lines
 */
export default function ProfileBioSkeleton() {
  return (
    <section>
      <Card className='rounded-lg border border-border'>
        <CardHeader className='pb-4'>
          <Skeleton className='h-6 w-24' />
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-11/12' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-10/12' />
            <Skeleton className='h-4 w-3/5' />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
