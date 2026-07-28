import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { DashboardReviewCardSkeleton } from './dashboard-review-card-skeleton';

interface ReviewsSectionSkeletonProps {
  title: string;
}

export function ReviewsSectionSkeleton({ title }: ReviewsSectionSkeletonProps) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-lg font-semibold'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Summary Statistics Skeleton */}
        <div className='space-y-2'>
          {/* Positive count - static icon and label, skeleton for number */}
          <div className='flex items-center gap-2'>
            <ThumbsUp className='h-5 w-5 text-green-500' />
            <Skeleton className='h-[28px] w-12' />
            <span className='text-muted-foreground'>Θετικές</span>
          </div>
          {/* Negative count - static icon and label, skeleton for number */}
          <div className='flex items-center gap-2'>
            <ThumbsDown className='h-5 w-5 text-red-500' />
            <Skeleton className='h-[28px] w-12' />
            <span className='text-muted-foreground'>Αρνητικές</span>
          </div>
        </div>

        {/* Recommendations Section Skeleton */}
        <div className='space-y-6'>
          {/* Section title - static, not loading */}
          <h2 className='text-lg font-semibold'>Συστάσεις</h2>

          {/* Review cards skeleton */}
          <div className='space-y-4'>
            {Array.from({ length: 1 }).map((_, i) => (
              <DashboardReviewCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
