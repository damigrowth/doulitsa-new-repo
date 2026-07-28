import Link from 'next/link';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils/formatting/date';
import type { ReviewWithAuthor } from '@/lib/types/reviews';

interface ReviewCardProps {
  review: ReviewWithAuthor;
  showService?: boolean;
}

export function ReviewCard({ review, showService = false }: ReviewCardProps) {
  const { formattedDate } = formatDate(review.createdAt, 'dd/MM/yy');
  const authorDisplayName =
    review.author.displayName ||
    review.author.name ||
    review.author.username ||
    'Χρήστης';
  const authorInitials = authorDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Rating: 5 = positive (thumbs up), 1 = negative (thumbs down)
  const isPositive = review.rating === 5;

  return (
    <div className='border-b border-gray-300 last:border-b-0'>
      <div className='py-6'>
        {/* Author Info */}
        <div className='flex items-start gap-4'>
          <div className='shrink-0'>
            <Avatar className='h-12 w-12'>
              <AvatarImage
                src={review.author.image || ''}
                alt={authorDisplayName}
              />
              <AvatarFallback>{authorInitials}</AvatarFallback>
            </Avatar>
          </div>

          <div className='flex-1 min-w-0'>
            {/* Author Name */}
            <div className='mb-2'>
              <span className='font-semibold text-gray-900'>
                {authorDisplayName}
              </span>
              {showService && review.service && (
                <Link
                  href={`/s/${review.service.slug}`}
                  className='block text-sm text-gray-600 hover:text-primary transition-colors mt-0.5'
                >
                  {review.service.title}
                </Link>
              )}
            </div>

            {/* Date */}
            <div className='text-sm text-gray-500 mb-3'>{formattedDate}</div>

            {/* Comment with thumbs icon */}
            {review.comment && (
              <div className='flex items-start gap-3'>
                <div className='shrink-0 mt-0.5'>
                  {isPositive ? (
                    <ThumbsUp className='h-5 w-5 text-green-600' />
                  ) : (
                    <ThumbsDown className='h-5 w-5 text-red-600' />
                  )}
                </div>
                <p className='text-gray-700 leading-relaxed flex-1'>
                  {review.comment}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
