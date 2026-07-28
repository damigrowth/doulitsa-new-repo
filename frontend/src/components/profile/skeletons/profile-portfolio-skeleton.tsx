import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader for ProfilePortfolio component
 * Matches the card with title and portfolio content
 */
export default function ProfilePortfolioSkeleton() {
  return (
    <section>
      <Card className='rounded-lg border border-border'>
        <CardHeader className='pb-4'>
          <Skeleton className='h-6 w-28' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Skeleton className='h-40 w-full rounded-lg' />
            <div className='space-y-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-11/12' />
              <Skeleton className='h-4 w-4/5' />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
