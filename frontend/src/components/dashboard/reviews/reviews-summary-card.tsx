import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface ReviewsSummaryCardProps {
  positiveCount: number;
  negativeCount: number;
}

export function ReviewsSummaryCard({
  positiveCount,
  negativeCount,
}: ReviewsSummaryCardProps) {
  const totalReviews = positiveCount + negativeCount;

  // Show empty state if no reviews
  if (totalReviews === 0) {
    return (
      <p className='text-muted-foreground'>Δεν έχετε λάβει καμία αξιολόγηση.</p>
    );
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <ThumbsUp className='h-5 w-5 text-green-500' />
        <span className='text-lg font-medium'>{positiveCount}</span>
        <span className='text-muted-foreground'>Θετικές</span>
      </div>
      <div className='flex items-center gap-2'>
        <ThumbsDown className='h-5 w-5 text-red-500' />
        <span className='text-lg font-medium'>{negativeCount}</span>
        <span className='text-muted-foreground'>Αρνητικές</span>
      </div>
    </div>
  );
}
