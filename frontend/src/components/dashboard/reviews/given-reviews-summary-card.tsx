import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface GivenReviewsSummaryCardProps {
  positiveCount: number;
  negativeCount: number;
}

export function GivenReviewsSummaryCard({
  positiveCount,
  negativeCount,
}: GivenReviewsSummaryCardProps) {
  const totalReviews = positiveCount + negativeCount;

  if (totalReviews === 0) {
    return (
      <p className='text-muted-foreground'>Δεν έχετε κάνει αξιολογήσεις.</p>
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
