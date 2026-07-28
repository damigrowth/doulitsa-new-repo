interface ReviewsEmptyStateProps {
  message: string;
}

export function ReviewsEmptyState({ message }: ReviewsEmptyStateProps) {
  return (
    <div className='text-center py-12'>
      <p className='text-muted-foreground'>{message}</p>
    </div>
  );
}
