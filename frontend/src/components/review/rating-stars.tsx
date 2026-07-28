'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showValue?: boolean;
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function RatingStars({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className,
  showValue = false,
}: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue !== null ? hoverValue : value;
  const starSize = sizeMap[size];
  const isInteractive = !readonly && !!onChange;

  const handleClick = (rating: number) => {
    if (isInteractive && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (isInteractive) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (isInteractive) {
      setHoverValue(null);
    }
  };

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <div className='flex items-center'>
        {[1, 2, 3, 4, 5].map((rating) => {
          const isFilled = rating <= displayValue;

          return (
            <button
              key={rating}
              type='button'
              onClick={() => handleClick(rating)}
              onMouseEnter={() => handleMouseEnter(rating)}
              onMouseLeave={handleMouseLeave}
              disabled={!isInteractive}
              className={cn(
                'transition-all duration-150',
                isInteractive && 'cursor-pointer hover:scale-110',
                !isInteractive && 'cursor-default',
              )}
              aria-label={`${rating} ${rating === 1 ? 'αστέρι' : 'αστέρια'}`}
            >
              <Star
                size={starSize}
                className={cn(
                  'transition-colors duration-150',
                  isFilled
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'fill-none text-gray-300',
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className='ml-2 text-sm font-semibold text-gray-700'>
          {displayValue.toFixed(1)}
        </span>
      )}
    </div>
  );
}
