import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewStarsProps {
  /** Rating value (1-5) */
  rating: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Gap between stars (Tailwind class) */
  gap?: string;
  /** Additional className */
  className?: string;
}

const sizeMap = {
  sm: 14,
  md: 16,
  lg: 18,
};

/**
 * Reusable read-only star rating display component for reviews
 * Simple filled/empty stars based on rounded rating value
 * Uses consistent yellow-400 color across the app
 */
export function ReviewStars({
  rating,
  size = 'md',
  gap = 'gap-0.5',
  className,
}: ReviewStarsProps) {
  const starSize = sizeMap[size];
  const roundedRating = Math.round(rating);

  return (
    <span className={cn('flex items-center', gap, className)}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= roundedRating;
        return (
          <Star
            key={starIndex}
            size={starSize}
            className={
              isFilled
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-300 text-gray-300'
            }
          />
        );
      })}
    </span>
  );
}
